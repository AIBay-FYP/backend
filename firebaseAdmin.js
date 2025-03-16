const admin = require("firebase-admin");
const dotenv = require("dotenv");

dotenv.config();
console.log(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))

admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)),
});

module.exports = admin;
