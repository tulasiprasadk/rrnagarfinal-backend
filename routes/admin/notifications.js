const express = require("express");
const router = express.Router();
const { Notification } = require("../../models");

/* Get all unread notifications */
router.get("/", async (req, res) => {
  const list = await Notification.findAll({
    where: { isRead: false },
    order: [["createdAt", "DESC"]]
  });
  res.json(list);
});

/* Mark all as read */
router.put("/mark-read", async (req, res) => {
  await Notification.update(
    { isRead: true },
    { where: {} }
  );

  res.json({ success: true });
});

module.exports = router;
