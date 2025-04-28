const express = require('express');
const router = express.Router();
const Cart = require('../models/Cart');

// Add a new item to cart or favourites
router.post('/cart/add', async (req, res) => {
  const { userId, listing } = req.body;

  if (!userId || !listing || !listing.ListingId) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  try {
    let cart = await Cart.findOne({ userId });

    if (cart) {
      const alreadyInCart = cart.items.find(
        item => item.ListingId === listing.ListingId && item.Type === listing.Type
      );

      if (alreadyInCart) {
        return res.status(409).json({ message: "Item already in this list" });
      }

      cart.items.push({ ...listing, addedAt: new Date() });
      cart.lastUpdated = new Date();
      await cart.save();
    } else {
      cart = new Cart({
        userId,
        items: [{ ...listing, addedAt: new Date() }],
        lastUpdated: new Date()
      });
      await cart.save();
    }

    res.status(200).json({ message: "Item added successfully" });
  } catch (err) {
    console.error('Error adding to cart:', err);
    res.status(500).json({ message: "Server error" });
  }
});

// Get all cart/favourites items for a user
router.get('/cart/:userId', async (req, res) => {
  try {
    const cart = await Cart.findOne({ userId: req.params.userId });

    if (!cart) {
      return res.status(404).json({ message: "Cart not found", items: [] });
    }

    res.status(200).json(cart);
  } catch (err) {
    console.error('Error fetching cart:', err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
