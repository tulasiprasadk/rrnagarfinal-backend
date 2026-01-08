const db = require("../models");
const Notification = db.Notification;

/**
 * Create a new notification for admin
 * @param {string} type - notification type (e.g., "order_created")
 * @param {string} title
 * @param {string} message
 */
async function notifyAdmin(type, title, message) {
  try {
    await Notification.create({
      type,
      title,
      message,
      isRead: false,
    });
  } catch (err) {
    console.error("Notification error:", err);
  }
}

module.exports = {
  notifyAdmin,
};
