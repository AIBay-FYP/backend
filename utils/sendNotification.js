const admin = require("../firebaseAdmin");
const User = require("../models/user");


async function sendNotification({ token, title, body, data = {} }) {
  const message = {
    token,
    notification: {
      title,
      body,
    },
    data, // optional custom data
    android: {
      priority: "high",
    },
    apns: {
      payload: {
        aps: {
          sound: "default",
        },
      },
    },
  };

  try {
    const response = await admin.messaging().send(message);
    console.log("FCM push sent:", response);
    return response;
  } catch (error) {
    console.error("Error sending FCM push:", error);
  }
}
  
module.exports = sendNotification;