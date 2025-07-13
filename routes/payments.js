// routes/payment.routes.js
const express = require("express");
const router = express.Router();
const Payment = require("../models/Payment");
const Booking = require("../models/Booking");
const Purchase = require("../models/Purchase");
const User = require("../models/user");
const Contract = require("../models/contract");
const Transaction = require("../models/Transaction");
const sendNotification = require("../utils/sendNotification");
const { v4: uuidv4 } = require("uuid");

// POST /api/payments/initiate
router.post("/initiate", async (req, res) => {
  const {
    consumerUID,
    providerUID,
    amount,
    platformFee,
    securityFee,
    cancellationFee,
    contractId,
    purchaseId,
    isRental,
    paymentMethod = "Escrow"
  } = req.body;

  try {
    // Find contract and get bookingId
    let bookingId = null;
    if(purchaseId==null){
        const contract = await Contract.findOne({ ContractID: contractId });
        if (!contract) {
          return res.status(404).json({ success: false, error: "Contract not found" });
        }
        bookingId = contract.BookingID;
    }

    // Find users by firebaseUID and get their ObjectId
    const consumer = await User.findOne({ FirebaseUID: consumerUID });
    const provider = await User.findOne({ FirebaseUID: providerUID });
    if (!consumer || !provider) {
      return res.status(404).json({ success: false, error: "Consumer or Provider not found" });
    }

    const payment = await Payment.create({
      PaymentID: uuidv4(),
      ConsumerID: consumer._id,
      ProviderID: provider._id,
      Amount: amount,
      PlatformFee: platformFee,
      SecurityFee: securityFee,
      CancellationFee: cancellationFee,
      BookingID: isRental ? bookingId : null,
      PurchaseID: isRental ? null : purchaseId,
      IsRental: isRental,
      PaymentMethod: paymentMethod,
      Status: "Completed"
    });

    payment.save();
    console.log("Payment initiated:", payment);

    if (isRental) {
      await Booking.findByIdAndUpdate(bookingId, { EscrowStatus: "Completed" });
    } else {
      await Purchase.findByIdAndUpdate(purchaseId, { EscrowStatus: "Completed" });
    }

    res.status(200).json({ success: true, payment });
  } catch (error) {
    console.error("Error initiating payment:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// POST /api/payments/release
router.post("/release", async (req, res) => {
  const { paymentId } = req.body;

  try {
    const payment = await Payment.findOne({ PaymentID: paymentId });
    if (!payment || payment.Status !== "Completed") {
      return res.status(400).json({ success: false, error: "Invalid or already released payment" });
    }

    const netAmount = payment.Amount - payment.PlatformFee;
    console.log("Releasing payment to provider:", payment.ProviderID, "Net Amount:", netAmount);
    await User.findByIdAndUpdate(payment.ProviderID, {
      $inc: { WalletBalance: netAmount }
    });

    payment.Status = "Released";
    payment.ReleasedAt = new Date();
    await payment.save();

    if (payment.IsRental) {
      await Booking.findByIdAndUpdate(payment.BookingID, {
        EscrowStatus: "Released",
        Status: "Completed"
      });
    } else {
      await Purchase.findByIdAndUpdate(payment.PurchaseID, {
        EscrowStatus: "Released",
        Status: "Completed"
      });
    }

    res.status(200).json({ success: true, message: "Payment released to provider." });
  } catch (error) {
    console.error("Error releasing payment:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// POST /api/payments/refund
router.post("/refund", async (req, res) => {
  const { paymentId } = req.body;

  try {
    const payment = await Payment.findOne({ PaymentID: paymentId });
    if (!payment) {
      return res.status(404).json({ success: false, error: "Payment not found" });
    }
    if (payment.Status !== "RefundPending") {
      return res.status(400).json({ success: false, error: "Refund not allowed for this payment" });
    }

    // Refund amount = Amount - SecurityFee
    const refundAmount = payment.Amount - payment.SecurityFee;

    // Credit refund to consumer wallet
    await User.findByIdAndUpdate(payment.ConsumerID, {
      $inc: { WalletBalance: refundAmount }
    });

    // Update payment status
    payment.Status = "Refunded";
    await payment.save();

    // Log transaction
    await Transaction.create({
      TransactionID: `TR-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      UserID: payment.ConsumerID,
      Amount: refundAmount,
      Type: "Refund",
      PaymentID: payment._id,
      Description: "Refund processed excluding security fee"
    });

    // Send notifications
    const consumer = await User.findById(payment.ConsumerID);
    const provider = await User.findById(payment.ProviderID);

    // In-app notification
    const Notification = require("../models/Notification");
    await new Notification({
      NotificationID: `N${Date.now()}`,
      UserID: consumer._id,
      Message: `Refund of Rs.${refundAmount} processed for your payment.`,
      Type: "Refund",
      ReadStatus: false,
      Timestamp: new Date()
    }).save();
    await new Notification({
      NotificationID: `N${Date.now()}`,
      UserID: provider._id,
      Message: `Refund of Rs.${refundAmount} has been processed for the consumer.`,
      Type: "Refund",
      ReadStatus: false,
      Timestamp: new Date()
    }).save();

    // FCM notifications
    if (consumer.fcm_token) {
      await sendNotification({
        token: consumer.fcm_token,
        title: "Refund Processed",
        body: `Refund of Rs.${refundAmount} processed for your payment.`,
        data: { type: "Refund", paymentId: payment.PaymentID }
      });
    }
    if (provider.fcm_token) {
      await sendNotification({
        token: provider.fcm_token,
        title: "Refund Processed",
        body: `Refund of Rs.${refundAmount} has been processed for the consumer.`,
        data: { type: "Refund", paymentId: payment.PaymentID }
      });
    }

    res.status(200).json({ success: true, message: "Refund processed", refundAmount });
  } catch (error) {
    console.error("Error processing refund:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// POST /api/payments/withdraw
router.post("/withdraw", async (req, res) => {
  const { userId, amount } = req.body;

  try {
    const user = await User.findOne({FirebaseUID: userId});
    if (!user) return res.status(404).json({ success: false, error: "User not found" });

    if (user.WalletBalance < amount) {
      return res.status(400).json({ success: false, error: "Insufficient wallet balance" });
    }

    // Deduct amount from wallet
    user.WalletBalance -= amount;
    await user.save();

    // Log transaction
    await Transaction.create({
      TransactionID: `TR-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      UserID: user._id,
      Amount: amount,
      Type: "Withdraw",
      Description: "User withdrawal"
    });

    // In-app notification
    const Notification = require("../models/Notification");
    await new Notification({
      NotificationID: `N${Date.now()}`,
      UserID: user._id,
      Message: `Withdrawal of Rs.${amount} processed from your wallet.`,
      Type: "Withdraw",
      ReadStatus: false,
      Timestamp: new Date()
    }).save();

    // FCM notification
    if (user.fcm_token) {
      await sendNotification({
        token: user.fcm_token,
        title: "Withdrawal Processed",
        body: `Withdrawal of Rs.${amount} processed from your wallet.`,
        data: { type: "Withdraw" }
      });
    }

    res.status(200).json({ success: true, message: "Withdrawal processed", amount });
  } catch (error) {
    console.error("Error processing withdrawal:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// GET /api/user/wallet/:id
router.get("/user/wallet/:id", async (req, res) => {
  try {
    console.log("Wallet route called for user id:", req.params.id);

    // Try to find user by FirebaseUID first, then by ObjectId if not found
    let user = await User.findOne({ FirebaseUID: req.params.id }).select("WalletBalance _id");
    if (!user) {
      console.log("User not found by FirebaseUID, trying ObjectId...");
      user = await User.findById(req.params.id).select("WalletBalance _id");
    }
    if (!user) {
      console.error("User not found for id:", req.params.id);
      return res.status(404).json({ success: false, error: "User not found" });
    }
    console.log("User found:", user);

    // Calculate total payments released to this user (provider)
    const totalPayments = await Payment.aggregate([
      {
        $match: {
          ProviderID: user._id,
          Status: { $in: ["Released", "Completed"] } // Include both Released and Completed
        }
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$Amount" }
        }
      }
    ]);
    console.log("Total payments aggregation result:", totalPayments);

    const totalReleased = totalPayments[0]?.totalAmount || 0;
    console.log("Total released amount:", totalReleased);

    // Fetch all payment records made to this user (provider)
    const paymentRecords = await Payment.find({
      ProviderID: user._id,
      Status: { $in: ["Released", "Completed"] } // Include both Released and Completed
    }).sort({ ReleasedAt: -1, CreatedAt: -1 });
    console.log("Payment records found:", paymentRecords.length);

    res.status(200).json({
      success: true,
      walletBalance: user.WalletBalance,
      totalPaymentsReleased: totalReleased,
      paymentRecords
    });
  } catch (error) {
    console.error("Wallet route error:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// GET /api/payments/contract/:contractId
router.get("/contract/:contractId", async (req, res) => {
  try {
    const { contractId } = req.params;

    const contract = await Contract.findOne({ ContractID: contractId });
    let payment = null;

    if (contract) {
      // Ensure BookingID is ObjectId
      payment = await Payment.findOne({ BookingID: contract.BookingID });
      console.log("Looking for Payment with BookingID:", contract.BookingID);
    } else {
      const purchase = await Purchase.findOne({ ContractID: contractId });
      if (purchase) {
        payment = await Payment.findOne({ PurchaseID: purchase._id });
        console.log("Looking for Payment with PurchaseID:", purchase._id);
      }
    }
    console.log("Payment found:", payment);

    if (!payment) {
      return res.status(404).json({ success: false, message: "No payment found for this contract." });
    }

    res.status(200).json({ success: true, payment });
  } catch (error) {
    console.error("Error fetching payment for contract:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// GET /api/transactions/user/:userId
router.get("/transactions/user/:userId", async (req, res) => {
  try {
    let user = await User.findOne({FirebaseUID: req.params.userId});
    const transactions = await Transaction.find({ UserID: user.id }).sort({ Timestamp: -1 });
    res.status(200).json({ success: true, transactions });
  } catch (error) {
    console.error("Error fetching transactions:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

module.exports = router;
