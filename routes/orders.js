const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");

const { 
  Order, 
  Product, 
  Supplier, 
  Address,
  Notification 
} = require("../models");

// Configure multer for payment screenshots
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/payment/");
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + "-" + Math.round(Math.random() * 1e9) + path.extname(file.originalname);
    cb(null, uniqueName);
  },
});
const upload = multer({ storage });

/* ======================================
   MIDDLEWARE – Require Login
====================================== */
function requireLogin(req, res, next) {
  if (!req.session.customerId) {
    return res.status(401).json({ error: "Not logged in" });
  }
  next();
}

/* ===========================================================
   CREATE ORDER (Supports Address + Payment Fields)
=========================================================== */
router.post("/create", requireLogin, async (req, res) => {
  try {
    const {
      productId,
      qty,
      addressId,
      customerName,
      customerPhone,
      customerAddress,
      paymentUNR,
      paymentScreenshot
    } = req.body;

    // ------------------------------
    // Validate product
    // ------------------------------
    const product = await Product.findByPk(productId, {
      include: [{
        model: Supplier,
        as: 'suppliers',
        through: { 
          where: { isActive: true },
          attributes: ['price', 'stock', 'isActive']
        }
      }]
    });
    
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    // ------------------------------
    // Get supplier from many-to-many relationship
    // ------------------------------
    let supplier = null;
    let supplierId = null;
    
    // First check the many-to-many relationships
    if (product.suppliers && product.suppliers.length > 0) {
      // Use the first active supplier
      supplier = product.suppliers[0];
      supplierId = supplier.id;
      console.log(`Using supplier from junction table: ${supplier.name} (ID: ${supplierId})`);
    } 
    // Fallback to old supplierId field for backward compatibility
    else if (product.supplierId) {
      supplier = await Supplier.findByPk(product.supplierId);
      if (supplier) {
        supplierId = supplier.id;
        console.log(`Using supplier from legacy field: ${supplier.name} (ID: ${supplierId})`);
      } else {
        console.warn(`Legacy supplier ${product.supplierId} not found for product ${productId}`);
      }
    } else {
      console.warn(`No supplier assigned to product ${productId}`);
    }

    // ------------------------------
    // Validate address
    // ------------------------------
    let addressRecord = null;
    if (addressId) {
      addressRecord = await Address.findOne({
        where: {
          id: addressId,
          CustomerId: req.session.customerId
        }
      });

      if (!addressRecord) {
        return res.status(400).json({ error: "Invalid address ID" });
      }
    }

    // ------------------------------
    // Calculate Total Price
    // ------------------------------
    const totalAmount = Number(product.price) * Number(qty);

    // ------------------------------
    // Create the Order
    // ------------------------------
    const order = await Order.create({
      CustomerId: req.session.customerId,
      productId,
      qty,
      supplierId: supplierId, // May be null if no supplier assigned

      // Customer Info
      customerName,
      customerPhone,
      customerAddress,
      addressId,

      // Payment Info
      paymentUNR,
      paymentScreenshot,
      paymentStatus: "pending",

      totalAmount,
      status: "created"
    });

    // Create admin notification for new order
    try {
      await Notification.create({
        type: "order_created",
        title: "New Order Received",
        message: `Order #${order.id} from ${customerName} (${customerPhone}) - ₹${totalAmount}`,
        isRead: false
      });
    } catch (notifErr) {
      console.error("Notification creation failed:", notifErr);
    }

    res.json({
      success: true,
      orderId: order.id,
      message: "Order created successfully"
    });

  } catch (err) {
    console.error("ORDER CREATION ERROR:", err);
    res.status(500).json({ error: "Failed to create order" });
  }
});
router.put("/:id/unr", requireLogin, async (req, res) => {
  try {
    const { paymentUNR } = req.body;

    await Order.update(
      { paymentUNR },
      {
        where: {
          id: req.params.id,
          CustomerId: req.session.customerId,
        },
      }
    );

    res.json({ success: true });

  } catch (err) {
    console.error("UNR UPDATE ERROR:", err);
    res.status(500).json({ error: "Failed to update UNR" });
  }
});


/* ===========================================================
   LIST ORDERS FOR LOGGED-IN CUSTOMER
=========================================================== */
router.get("/", requireLogin, async (req, res) => {
  try {
    const orders = await Order.findAll({
      where: { CustomerId: req.session.customerId },
      order: [["createdAt", "DESC"]],
      include: [
        { model: Product },
        { model: Supplier },
        {
          model: Address,
          attributes: ["name", "phone", "addressLine", "city", "state", "pincode", "isDefault"]
        }
      ]
    });
    res.json(orders);
  } catch (err) {
    console.error("ORDER LIST ERROR:", err);
    res.status(500).json({ error: "Failed to load orders" });
  }
});

// Alias for legacy frontend call
router.get("/customer/orders", requireLogin, async (req, res) => {
  try {
    const orders = await Order.findAll({
      where: { CustomerId: req.session.customerId },
      order: [["createdAt", "DESC"]],
      include: [
        { model: Product },
        { model: Supplier },
        {
          model: Address,
          attributes: ["name", "phone", "addressLine", "city", "state", "pincode", "isDefault"]
        }
      ]
    });
    res.json(orders);
  } catch (err) {
    console.error("ORDER LIST ERROR:", err);
    res.status(500).json({ error: "Failed to load orders" });
  }
});

/* ===========================================================
   GET ORDER DETAILS (with Address + Product + Supplier)
=========================================================== */
router.get("/:id", requireLogin, async (req, res) => {
  try {
    const order = await Order.findOne({
      where: {
        id: req.params.id,
        CustomerId: req.session.customerId
      },
      include: [
        { model: Product },
        { model: Supplier },
        {
          model: Address,
          attributes: ["name", "phone", "addressLine", "city", "state", "pincode", "isDefault"]
        }
      ]
    });

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    res.json(order);

  } catch (err) {
    console.error("ORDER DETAILS ERROR:", err);
    res.status(500).json({ error: "Failed to load order details" });
  }
});
router.post("/submit-payment", upload.single("paymentScreenshot"), async (req, res) => {
  try {
    const customerId = req.session.customerId;
    if (!customerId) return res.status(401).json({ msg: "Not logged in" });

    if (!req.file) return res.status(400).json({ msg: "Screenshot missing" });

    if (!req.body.unr || req.body.unr.length < 6)
      return res.status(400).json({ msg: "Invalid UNR" });

    const orderId = req.body.orderId;
    if (!orderId) return res.status(400).json({ msg: "Missing orderId" });

    // update specific order info
    const screenshotPath = `/uploads/payment/${req.file.filename}`;

    const order = await Order.findOne({ where: { id: orderId, CustomerId: customerId } });
    if (!order) return res.status(404).json({ msg: "Order not found" });

    order.paymentStatus = "pending";
    order.paymentUNR = req.body.unr;
    order.paymentScreenshot = screenshotPath;
    await order.save();

    // notify admin to approve payment
    try {
      await Notification.create({
        type: "payment_submitted",
        title: "Payment Submitted",
        message: `Order #${order.id} payment submitted. UNR: ${order.paymentUNR}. Approve in Admin → Payments.`,
        isRead: false
      });
    } catch (notifErr) {
      console.error("Payment notification creation failed:", notifErr);
    }

    res.json({ msg: "Payment submitted" });

  } catch (err) {
    console.log(err);
    res.status(500).json({ msg: "Server error" });
  }
});


module.exports = router;
