const express = require("express");
const router = express.Router();
const User = require("../models/user");

router.get('/:firebaseUID', async (req, res) => {
    const { firebaseUID } = req.params;
  
    try {
      const user = await User.findOne({ FirebaseUID: firebaseUID });
  
      if (user) {
        console.log('User found:', user);
        res.status(200).json(user);
      } else {
        // User not found
        res.status(404).json({ message: 'User not found' });
      }
    } catch (error) {
      console.error('Error fetching user:', error);
      res.status(500).json({ message: 'Server error', error });
    }
  });


  module.exports = router;