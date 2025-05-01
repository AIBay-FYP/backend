const admin = require("../firebaseAdmin");
const User = require("../models/user");
const sendNotification = async (token, title, body, data) => {
    const message = {
      token,
      notification: { title, body },
      data,
    };
    await admin.messaging().send(message);
  };
  
module.exports = sendNotification;