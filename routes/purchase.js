const express = require("express");
const router = express.Router();
const User = require("../models/user");
const Listing = require("../models/Listings");
const Purchase = require("../models/Purchase");
const Notification = require("../models/Notification");
const Cart = require("../models/Cart");
const { default: mongoose } = require("mongoose");


const { updateDemandScore } = require("../utils/demandScore");

router.post("/now", async (req, res) => {
  try {
    const { firebaseUID, listingID } = req.body;

    if (!firebaseUID || !listingID) {
      return res.status(400).json({ message: "Missing firebaseUID or listingID" });
    }

    const user = await User.findOne({ FirebaseUID: firebaseUID });
    if (!user) return res.status(404).json({ message: "User not found" });

    const listing = await Listing.findById(listingID);
    if (!listing) return res.status(404).json({ message: "Listing not found" });

    if (listing.ServiceType !== "Sale") {
      return res.status(400).json({ message: "This listing is not available for sale." });
    }

    // Step 1: Add to Cart (if not already added)
    let cart = await Cart.findOne({ ConsumerID: user._id });
    if (!cart) {
      cart = new Cart({ ConsumerID: user._id, Items: [] });
    }

    const alreadyInCart = cart.Items.some(item => item.ListingID.toString() === listingID);
    if (!alreadyInCart) {
      cart.Items.push({
        ListingID: listing._id,
        ProviderID: listing.ProviderID,
        Price: listing.FixedPrice,
        Currency: listing.Currency || "PKR"
      });
      cart.LastUpdated = new Date();
      await cart.save();
    }

    // Step 2: Proceed to create the purchase instantly
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

     // Update demand score for the listing
     await updateDemandScore(listingID, "bookingRequest");

    // Notify the provider
    await new Notification({
      NotificationID: `N-${Date.now()}`,
      UserID: listing.ProviderID,
      Message: `You have a new purchase request for: ${listing.Title}`,
      Type: "Info",
      ReadStatus: false,
      Timestamp: new Date()
    }).save();

    res.status(201).json({
      message: "Purchase created successfully and added to cart (if not already present)",
      purchase: newPurchase
    });
  } catch (error) {
    console.error("Instant purchase error:", error);
    res.status(500).json({ message: "Server error", error });
  }
});


router.post("/checkout", async (req, res) => {
  try {
    const { firebaseUID, items } = req.body;
    
    // Validate inputs
    if (!firebaseUID || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid request. FirebaseUID and items array are required." 
      });
    }

    // 1. Get the consumer
    const user = await User.findOne({ FirebaseUID: firebaseUID });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    // 2. Check if items are all from the same provider
    const providerIds = new Set();
    for (const item of items) {
      if (!item.listingID) {
        return res.status(400).json({ 
          success: false, 
          message: "Each item must have a listingID" 
        });
      }
      
      const listing = await Listing.findById(item.listingID);
      if (!listing) {
        return res.status(400).json({ 
          success: false, 
          message: `Listing with ID ${item.listingID} not found` 
        });
      }
      
      providerIds.add(listing.ProviderID.toString());
    }
    
    if (providerIds.size > 1) {
      return res.status(400).json({ 
        success: false, 
        message: "All items must be from the same provider to checkout." 
      });
    }
    
    const providerID = Array.from(providerIds)[0];

    // 3. Create a Purchase entry for each item
    const purchases = [];
    
    for (const item of items) {
      const listing = await Listing.findById(item.listingID);
      if (!listing) continue;

      // Calculate the price based on quantity
      const itemPrice = item.price * (item.quantity || 1);

      const newPurchase = new Purchase({
        PurchaseID: `PUR-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        ConsumerID: user._id,
        ProviderID: providerID,
        ListingID: item.listingID,
        Quantity: item.quantity || 1,
        Price: itemPrice,
        SecurityFee: item.securityFee || 0,
        CancellationFee: item.cancellationFee || 0,
        Currency: "PKR",
        Status: "Pending",
        EscrowStatus: "Pending",
        DatePurchased: new Date()
      });

      await newPurchase.save();
      purchases.push(newPurchase);

      // Update demand score for the listing
      try {
        await updateDemandScore(item.listingID, "completedPurchase");
      } catch (e) {
        console.log("Error updating demand score:", e);
      }

      // 5. Notify provider
      try {
        await new Notification({
          NotificationID: `N-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
          UserID: providerID,
          Message: `A new purchase has been made for your listing: ${listing.Name || listing.Title}`,
          Type: "Alert",
          ReadStatus: false,
          Timestamp: new Date()
        }).save();
      } catch (e) {
        console.log("Error creating notification:", e);
      }
    }

    // 6. Clear items from the cart if they exist
    try {
      const cart = await Cart.findOne({ ConsumerID: user._id });
      if (cart) {
        console.log("Cart before removal:", cart.Items.map(item => item.ListingID.toString()));
        
        // Get the list of listing IDs purchased (normalize to strings)
        const purchasedListingIds = items.map(item => item.listingID.toString());
        console.log("Purchased listing IDs:", purchasedListingIds);
        
        // Filter out the purchased items with strict comparison
        const originalLength = cart.Items.length;
        cart.Items = cart.Items.filter(item => {
          const itemListingIdString = item.ListingID.toString();
          const shouldKeep = !purchasedListingIds.includes(itemListingIdString);
          console.log(`Item ${itemListingIdString}: keep=${shouldKeep}`);
          return shouldKeep;
        });
        
        console.log(`Removed ${originalLength - cart.Items.length} items from cart`);
        
        // Only save if there were changes
        if (originalLength !== cart.Items.length) {
          cart.LastUpdated = new Date();
          await cart.save();
          console.log("Cart saved after removing purchased items");
        } else {
          console.log("No items were removed from cart");
        }
      } else {
        console.log("No cart found to update");
      }
    } catch (e) {
      console.error("Error updating cart:", e.message, e.stack);
    }

    res.status(200).json({
      success: true,
      message: "Checkout successful",
      purchases
    });

  } catch (error) {
    console.error("Checkout error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error", 
      error: error.message 
    });
  }
});

router.post("/cart/add", async (req, res) => {
  try {
    const { firebaseUID, listingID } = req.body;
    console.log("Request body:", { firebaseUID, listingID });

    // Validate inputs
    if (!firebaseUID || !listingID) {
      return res.status(400).json({ message: "Missing firebaseUID or listingID" });
    }

    // Validate listingID is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(listingID)) {
      console.log("Invalid listingID format:", listingID);
      return res.status(400).json({ message: "Invalid listingID format" });
    }

    // Find the user
    const user = await User.findOne({ FirebaseUID: firebaseUID });
    if (!user) {
      console.log("User not found for firebaseUID:", firebaseUID);
      return res.status(404).json({ message: "User not found" });
    }
    console.log("User found:", user._id);

    // Find the listing
    const listing = await Listing.findById(listingID);
    if (!listing) {
      console.log("Listing not found for listingID:", listingID);
      return res.status(404).json({ message: "Listing not found" });
    }
    console.log("Listing found:", listing._id);

    if (listing.ServiceType !== "Sale") {
      console.log("Listing is not for sale:", listing.ServiceType);
      return res.status(400).json({ message: "This listing is not available for sale" });
    }

    // Find or create cart
    let cart = await Cart.findOne({ ConsumerID: user._id });
    if (!cart) {
      cart = new Cart({ ConsumerID: user._id, Items: [] });
      console.log("New cart created for user:", user._id);
    } else {
      console.log("Existing cart found:", cart._id, "Items:", cart.Items);
    }

    // Log the current cart items for debugging
    console.log("Current cart items:", cart.Items.map(item => ({
      ListingID: item.ListingID.toString(),
      ProviderID: item.ProviderID?.toString(),
      Price: item.Price,
      Currency: item.Currency,
    })));

    // Check if the item is already in the cart
    const alreadyInCart = cart.Items.some(
      (item) => item.ListingID.toString() === listingID
    );
    console.log("Item already in cart:", alreadyInCart, "Comparing listingID:", listingID);

    if (alreadyInCart) {
      console.log("Item already exists in cart, skipping add:", listingID);
      return res.status(400).json({ message: "Item is already in the cart" });
    }

    // Add item to cart
    const newItem = {
      ListingID: listing._id,
      ProviderID: listing.ProviderID,
      Price: listing.FixedPrice,
      Currency: listing.Currency || "PKR",
    };
    cart.Items.push(newItem);
    cart.LastUpdated = new Date();
    console.log("New item to be added:", newItem);

    // Save cart and handle potential errors
    try {
      await cart.save();
      console.log("Cart saved successfully:", {
        cartID: cart._id,
        items: cart.Items.map(item => item.ListingID.toString()),
      });
    } catch (saveError) {
      console.error("Error saving cart:", saveError);
      return res.status(500).json({ message: "Failed to save cart", error: saveError.message });
    }

    // Verify the cart in the database
    const updatedCart = await Cart.findOne({ ConsumerID: user._id });
    console.log("Cart in database after save:", {
      cartID: updatedCart._id,
      items: updatedCart.Items.map(item => item.ListingID.toString()),
    });

    res.status(201).json({
      message: "Item added to cart",
      cart: updatedCart,
    });
  } catch (error) {
    console.error("Add to cart error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.get("/cart/items", async (req, res) => {
  try {
    const { firebaseUID } = req.query;
    console.log("Query params:", req.query);

    console.log("Firebase UID:", firebaseUID);
    if (!firebaseUID) {
      return res.status(400).json({ message: "Missing firebaseUID" });
    }

    const user = await User.findOne({ FirebaseUID: firebaseUID });
    if (!user) return res.status(404).json({ message: "User not found" });

    const cart = await Cart.findOne({ ConsumerID: user._id }).populate("Items.ListingID");
    if (!cart) return res.status(200).json({ message: "Cart is empty", items: [] });

    res.status(200).json({ items: cart.Items });
  } catch (error) {
    console.error("Fetch cart items error:", error);
    res.status(500).json({ message: "Server error", error });
  }
});


router.delete("/cart/remove", async (req, res) => {
  try {
    const { firebaseUID, listingID } = req.body;
    console.log("Remove from cart request:", { firebaseUID, listingID });

    if (!firebaseUID || !listingID) {
      console.log("Missing required fields:", { firebaseUID, listingID });
      return res.status(400).json({ message: "Missing firebaseUID or listingID" });
    }

    const user = await User.findOne({ FirebaseUID: firebaseUID });
    if (!user) {
      console.log("User not found for firebaseUID:", firebaseUID);
      return res.status(404).json({ message: "User not found" });
    }
    console.log("User found:", user._id);

    const cart = await Cart.findOne({ ConsumerID: user._id });
    if (!cart) {
      console.log("Cart not found for user:", user._id);
      return res.status(404).json({ message: "Cart not found" });
    }
    console.log("Cart found:", cart._id, "Items:", cart.Items.map(item => item.ListingID.toString()));

    const initialLength = cart.Items.length;
    cart.Items = cart.Items.filter(item => item.ListingID.toString() !== listingID);

    if (cart.Items.length === initialLength) {
      console.log("Item not found in cart:", listingID);
      return res.status(404).json({ message: "Item not found in cart" });
    }

    cart.LastUpdated = new Date();
    await cart.save();
    console.log("Cart updated successfully:", {
      cartID: cart._id,
      items: cart.Items.map(item => item.ListingID.toString()),
    });

    res.status(200).json({ message: "Item removed from cart", cart });
  } catch (error) {
    console.error("Remove from cart error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.patch("/cart/update-quantity", async (req, res) => {
  try {
    const { firebaseUID, listingID, quantity } = req.body;
    console.log("Update cart quantity request:", { firebaseUID, listingID, quantity });

    // Validate inputs
    if (!firebaseUID || !listingID) {
      return res.status(400).json({ message: "Missing firebaseUID or listingID" });
    }

    // Make sure quantity is a number
    const numQuantity = parseInt(quantity, 10);
    if (isNaN(numQuantity) || numQuantity < 1) {
      return res.status(400).json({ message: "Quantity must be a positive integer" });
    }

    // Find the user
    const user = await User.findOne({ FirebaseUID: firebaseUID });
    if (!user) {
      console.log("User not found for firebaseUID:", firebaseUID);
      return res.status(404).json({ message: "User not found" });
    }

    // Find the cart
    const cart = await Cart.findOne({ ConsumerID: user._id });
    if (!cart) {
      console.log("Cart not found for user:", user._id);
      return res.status(404).json({ message: "Cart not found" });
    }

    // Find the item in the cart
    const itemIndex = cart.Items.findIndex(item => item.ListingID.toString() === listingID);
    if (itemIndex === -1) {
      console.log("Item not found in cart:", listingID);
      return res.status(404).json({ message: "Item not found in cart" });
    }

    // Get the listing to ensure we have the correct base price
    const listing = await Listing.findById(listingID);
    if (!listing) {
      return res.status(404).json({ message: "Listing not found" });
    }

    // Use the single item price from listing if first time, otherwise calculate from cart
    const basePrice = listing.FixedPrice;
    
    // Update the item directly with $set for better MongoDB compatibility
    const updateResult = await Cart.updateOne(
      { 
        ConsumerID: user._id, 
        "Items.ListingID": new mongoose.Types.ObjectId(listingID) 
      },
      { 
        $set: { 
          "Items.$.Quantity": numQuantity,
          "Items.$.Price": basePrice * numQuantity,
          LastUpdated: new Date()
        } 
      }
    );
    
    console.log("Update result:", updateResult);

    // Fetch the updated cart to return in response
    const updatedCart = await Cart.findOne({ ConsumerID: user._id });
    const updatedItem = updatedCart.Items.find(item => 
      item.ListingID.toString() === listingID
    );
    
    console.log("Updated cart item:", updatedItem);

    res.status(200).json({ 
      message: "Cart item quantity updated", 
      item: updatedItem,
      cart: updatedCart 
    });
    
  } catch (error) {
    console.error("Update cart quantity error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
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