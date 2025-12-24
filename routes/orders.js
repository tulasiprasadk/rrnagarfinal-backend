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

// MIDDLEWARE – Require Login
function requireLogin(req, res, next) {
  if (!req.session.customerId) {
    return res.status(401).json({ error: "Not logged in" });
  }
  next();
}

// CREATE ORDER (Supports Address + Payment Fields)
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

    // Validate product
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

    // Get supplier from many-to-many relationship
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

    // Validate address
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

    // Calculate Total Price
    const totalAmount = Number(product.price) * Number(qty);

    // Create the Order
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


// LIST ORDERS FOR LOGGED-IN CUSTOMER
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

// GET ORDER DETAILS (with Address + Product + Supplier)
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

// GET INVOICE (PDF Download)
router.get("/:id/invoice", requireLogin, async (req, res) => {
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
          attributes: ["name", "phone", "addressLine", "city", "state", "pincode"]
        }
      ]
    });

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    // For now, generate a simple text/HTML invoice
    // In production, you'd use a library like pdfkit or puppeteer
    const invoiceHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
          .container { max-width: 800px; margin: 0 auto; border: 1px solid #ddd; padding: 30px; }
          .header { border-bottom: 3px solid #c8102e; padding-bottom: 20px; margin-bottom: 30px; }
          .company-name { font-size: 28px; font-weight: bold; color: #c8102e; }
          .invoice-title { font-size: 24px; margin: 20px 0 0 0; }
          .invoice-info { display: flex; justify-content: space-between; margin: 20px 0; }
          .info-section { flex: 1; }
          .info-section label { font-weight: bold; color: #666; }
          .info-section p { margin: 5px 0; }
          .order-items { width: 100%; border-collapse: collapse; margin: 30px 0; }
          .order-items th { background: #ffd500; padding: 10px; text-align: left; font-weight: bold; }
          .order-items td { padding: 12px; border-bottom: 1px solid #eee; }
          .totals { float: right; width: 300px; margin: 30px 0; }
          .total-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
          .total-row.final { border-bottom: 3px solid #c8102e; font-weight: bold; font-size: 16px; }
          .address-section { background: #f9f9f9; padding: 15px; margin: 30px 0; border-radius: 5px; }
          .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #999; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="company-name">RR Nagar</div>
            <h2 class="invoice-title">Invoice</h2>
          </div>

          <div class="invoice-info">
            <div class="info-section">
              <label>Invoice #:</label>
              <p>${order.id}</p>
              <label>Date:</label>
              <p>${new Date(order.createdAt).toLocaleDateString('en-IN')}</p>
              <label>Status:</label>
              <p style="color: #c8102e; font-weight: bold;">${order.status.toUpperCase()}</p>
            </div>
            <div class="info-section">
              <label>Payment Status:</label>
              <p style="color: #c8102e; font-weight: bold;">${order.paymentStatus.toUpperCase()}</p>
              <label>Order Type:</label>
              <p>${order.type ? order.type.charAt(0).toUpperCase() + order.type.slice(1) : 'Delivery'}</p>
            </div>
          </div>

          <div class="address-section">
            <label style="font-weight: bold; display: block; margin-bottom: 10px;">Delivery Address:</label>
            <p><strong>${order.customerName || 'Customer'}</strong></p>
            <p>${order.customerAddress || (order.Address ? 
              order.Address.addressLine + ', ' + order.Address.city + ', ' + order.Address.state + ' - ' + order.Address.pincode
              : 'Address not provided')}</p>
            <p>📞 ${order.customerPhone || 'Phone not provided'}</p>
          </div>

          <table class="order-items">
            <thead>
              <tr>
                <th>Product</th>
                <th>Supplier</th>
                <th>Price</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <strong>${order.Product ? order.Product.title || order.Product.name : 'Product'}</strong>
                </td>
                <td>${order.Supplier ? order.Supplier.shopName : 'Supplier'}</td>
                <td>₹${order.totalAmount}</td>
              </tr>
            </tbody>
          </table>

          <div class="totals">
            <div class="total-row">
              <span>Subtotal:</span>
              <span>₹${order.totalAmount - (order.platformFee || 0)}</span>
            </div>
            ${order.platformFee ? `
            <div class="total-row">
              <span>Platform Fee:</span>
              <span>₹${order.platformFee}</span>
            </div>
            ` : ''}
            <div class="total-row final">
              <span>Total Amount:</span>
              <span>₹${order.totalAmount}</span>
            </div>
          </div>

          <div style="clear: both;"></div>

          <div class="footer">
            <p>Thank you for your business!</p>
            <p>RR Nagar - Your trusted local marketplace</p>
            <p>For support, contact us at support@rrnagar.com</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Send as HTML (for now, user can print to PDF)
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="Invoice-${order.id}.html"`);
    res.send(invoiceHTML);

  } catch (err) {
    console.error("INVOICE GENERATION ERROR:", err);
    res.status(500).json({ error: "Failed to generate invoice" });
  }
});

module.exports = router;
