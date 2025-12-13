const express = require("express");
const router = express.Router();
const { Order, Product, Supplier } = require("../models");
const adminNotify = require("../services/adminNotify");
const { sendNotificationToSupplier, sendNotificationToCustomer } = require("../utils/notify");

/* ============================================================
   GET ALL PENDING PAYMENTS
   GET /api/admin/payments
============================================================ */
router.get("/", async (req, res) => {
  try {
    const pending = await Order.findAll({
      where: { paymentStatus: "pending" },
      include: [Product, Supplier],
      order: [["id", "DESC"]],
    });

    res.json(pending);
  } catch (err) {
    console.error("Admin payment fetch error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ============================================================
   APPROVE PAYMENT
   POST /api/admin/payments/:id/approve
============================================================ */
router.post("/:id/approve", async (req, res) => {
  try {
    const order = await Order.findByPk(req.params.id, {
      include: [Product, Supplier]
    });

    if (!order) return res.status(404).json({ error: "Order not found" });

    order.paymentStatus = "approved";
    order.status = "paid";

    await order.save();

    // In-app admin notification
    await adminNotify(
      "payment_approved",
      "Payment Approved",
      `Order #${order.id} approved for ₹${order.totalAmount}`
    );

    // Supplier notification (email/SMS placeholder via admin email)
    try {
      if (order.SupplierId) {
        await sendNotificationToSupplier(order.SupplierId, "Payment Approved", {
          orderId: order.id,
          product: order.Product?.title || order.Product?.name,
          amount: order.totalAmount
        });
      }
    } catch (e) {
      console.error("Supplier notify failed", e);
    }

    // Customer notification (SMS if configured)
    try {
      if (order.customerPhone) {
        await sendNotificationToCustomer(
          order.customerPhone,
          `RR Nagar: Your order #${order.id} payment is approved. Delivery will be scheduled.`
        );
      }
    } catch (e) {
      console.error("Customer notify failed", e);
    }

    res.json({ ok: true, order });
  } catch (err) {
    console.error("Payment approve error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ============================================================
   REJECT PAYMENT
   POST /api/admin/payments/:id/reject
============================================================ */
router.post("/:id/reject", async (req, res) => {
  try {
    const order = await Order.findByPk(req.params.id);

    if (!order) return res.status(404).json({ error: "Order not found" });

    order.paymentStatus = "rejected";
    order.status = "payment_failed";

    await order.save();

    res.json({ ok: true, order });
  } catch (err) {
    console.error("Payment reject error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
