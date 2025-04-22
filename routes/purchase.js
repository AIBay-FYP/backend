const express = require("express");
const router = express.Router();
const User = require("../models/user");
const Listing = require("../models/Listings");
const Purchase = require("../models/Purchase");
const Notification = require("../models/Notification");
const Cart = require("../models/Cart")

router.post("/now", async (req, res) => {
  try {
    const { firebaseUID, listingID } = req.body;

    // Validate inputs
    if (!firebaseUID || !listingID) {
      return res.status(400).json({ message: "Missing firebaseUID or listingID" });
    }

    // Find user
    const user = await User.findOne({ FirebaseUID: firebaseUID });
    if (!user) return res.status(404).json({ message: "User not found" });

    // Find listing
    const listing = await Listing.findById(listingID);
    if (!listing) return res.status(404).json({ message: "Listing not found" });

    // Ensure it's a for-sale service (not rental)
    if (listing.ServiceType !== "Sale") {
      return res.status(400).json({ message: "This listing is not available for sale." });
    }

    // Create new purchase
    const purchaseID = `P-${Date.now()}`;
    const newPurchase = new Purchase({
      PurchaseID: purchaseID,
      ConsumerID: user._id,
      ProviderID: listing.ProviderID,
      ListingID: listing._id,
      Price: listing.FixedPrice,
      Currency: listing.Currency || "PKR",
      Status: "Pending",
      EscrowStatus: "Pending",
      ConsumerCompleted: false,
      ProviderCompleted: false,
      DatePurchased: new Date()
    });

    await newPurchase.save();

    // Notify the provider
    await new Notification({
      NotificationID: `N-${Date.now()}`,
      UserID: listing.ProviderID,
      Message: `You have a new purchase request for: ${listing.Title}`,
      Type: "Info",
      ReadStatus: false,
      Timestamp: new Date()
    }).save();

    res.status(201).json({ message: "Purchase created successfully", purchase: newPurchase });
  } catch (error) {
    console.error("Instant purchase error:", error);
    res.status(500).json({ message: "Server error", error });
  }
});

router.post("/checkout", async (req, res) => {
    try {
      const { firebaseUID } = req.body;
  
      // 1. Get the consumer
      const user = await User.findOne({ FirebaseUID: firebaseUID });
      if (!user) return res.status(404).json({ message: "User not found" });
  
      // 2. Get user's cart
      const cart = await Cart.findOne({ ConsumerID: user._id });
      if (!cart || cart.Items.length === 0) {
        return res.status(400).json({ message: "Cart is empty" });
      }
  
      // 3. Check that all items are from the same provider
      const providerIDSet = new Set(cart.Items.map(item => item.ProviderID.toString()));
      if (providerIDSet.size > 1) {
        return res.status(400).json({ message: "All items must be from the same provider to checkout." });
      }
  
      const providerID = cart.Items[0].ProviderID;
  
      // 4. Create a Purchase entry for each item
      const purchases = [];
  
      for (const item of cart.Items) {
        const listing = await Listing.findById(item.ListingID);
        if (!listing) continue;
  
        const newPurchase = new Purchase({
          PurchaseID: `PUR-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
          ConsumerID: user._id,
          ProviderID: item.ProviderID,
          ListingID: item.ListingID,
          Price: item.Price,
          Currency: item.Currency || "PKR",
          Status: "Pending",
          EscrowStatus: "Pending",
          DatePurchased: new Date()
        });
  
        await newPurchase.save();
        purchases.push(newPurchase);
  
        // 5. Notify provider
        await new Notification({
          NotificationID: `N-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
          UserID: item.ProviderID,
          Message: `A new purchase has been made for your listing: ${listing.Title}`,
          Type: "Alert",
          ReadStatus: false,
          Timestamp: new Date()
        }).save();
      }
  
      // 6. Clear the cart
      cart.Items = [];
      cart.LastUpdated = new Date();
      await cart.save();
  
      res.status(200).json({
        message: "Checkout successful",
        purchases
      });
  
    } catch (error) {
      console.error("Checkout error:", error);
      res.status(500).json({ message: "Server error", error });
    }
});

router.patch("/complete-provider", async (req, res) => {
    try {
      const { purchaseID } = req.body;
  
      if (!purchaseID) {
        return res.status(400).json({ message: "Purchase ID is required" });
      }
  
      // Find purchase
      const purchase = await Purchase.findOne({ PurchaseID: purchaseID });
      if (!purchase) {
        return res.status(404).json({ message: "Purchase not found" });
      }
  
      // Check if the purchase is already marked complete
      if (purchase.ProviderCompleted) {
        return res.status(400).json({ message: "Purchase is already marked as complete by provider" });
      }
  
      // Mark provider completion
      purchase.ProviderCompleted = true;
      await purchase.save();
  
      // If both consumer and provider completed, release escrow
      if (purchase.ConsumerCompleted) {
        purchase.EscrowStatus = "Released";
        purchase.Status = "Completed";
        await purchase.save();
      }
  
      // Notify the consumer
      await new Notification({
        NotificationID: `N-${Date.now()}`,
        UserID: purchase.ConsumerID,
        Message: `Your purchase for listing ${purchase.ListingID} has been marked as completed by the provider.`,
        Type: "Info",
        ReadStatus: false,
        Timestamp: new Date()
      }).save();
  
      res.status(200).json({ message: "Provider marked as complete", purchase });
  
    } catch (error) {
      console.error("Error completing purchase by provider:", error);
      res.status(500).json({ message: "Server error", error });
    }
});
  
router.patch("/complete-consumer", async (req, res) => {
    try {
      const { purchaseID } = req.body;
  
      if (!purchaseID) {
        return res.status(400).json({ message: "Purchase ID is required" });
      }
  
      // Find purchase
      const purchase = await Purchase.findOne({ PurchaseID: purchaseID });
      if (!purchase) {
        return res.status(404).json({ message: "Purchase not found" });
      }
  
      // Check if the purchase is already marked complete
      if (purchase.ConsumerCompleted) {
        return res.status(400).json({ message: "Purchase is already marked as complete by consumer" });
      }
  
      // Mark consumer completion
      purchase.ConsumerCompleted = true;
      await purchase.save();
  
      // If both consumer and provider completed, release escrow
      if (purchase.ProviderCompleted) {
        purchase.EscrowStatus = "Released";
        purchase.Status = "Completed";
        await purchase.save();
      }
  
      // Notify the provider
      await new Notification({
        NotificationID: `N-${Date.now()}`,
        UserID: purchase.ProviderID,
        Message: `Your purchase for listing ${purchase.ListingID} has been confirmed as complete by the consumer.`,
        Type: "Info",
        ReadStatus: false,
        Timestamp: new Date()
      }).save();
  
      res.status(200).json({ message: "Consumer marked as complete", purchase });
  
    } catch (error) {
      console.error("Error completing purchase by consumer:", error);
      res.status(500).json({ message: "Server error", error });
    }
});  

module.exports = router;