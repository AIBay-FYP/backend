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


  router.patch('/location/:firebaseUID', async (req, res) => {
    const { firebaseUID } = req.params;
  
    try {
      const { location } = req.body;
  
      // Find user by FirebaseUID
      const user = await User.findOne({ FirebaseUID: firebaseUID });
  
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
  
      // Update the location field and updatedAt timestamp
      user.Location = location;
      user.updatedAt = new Date();
      
      const updatedUser = await user.save();
      console.log("UPDTED USER", updatedUser);
      res.json({ message: 'Location updated successfully', user: updatedUser });
    } catch (error) {
      console.error('Error updating location:', error);
      res.status(500).json({ message: 'Server error', error });
    }
  });

  
  module.exports = router;