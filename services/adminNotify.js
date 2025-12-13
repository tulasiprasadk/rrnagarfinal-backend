const { Notification } = require("../models");

async function adminNotify(type, title, message) {
  try {
    await Notification.create({
      type,
      title,
      message
    });
    console.log("ADMIN NOTIFY:", title);
  } catch (err) {
    console.error("ADMIN NOTIFY ERROR:", err);
  }
}

module.exports = adminNotify;
