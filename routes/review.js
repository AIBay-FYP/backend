const express = require("express");
const router = express.Router();
const Review = require("../models/Review");
const User = require("../models/user");
const mongoose = require("mongoose");

// @route   POST /reviews/:firebaseUID/:reviewedUserId
// @desc    Submit a new review and update user's average rating
router.post("/:firebaseUID/:reviewedUserId", async (req, res) => {
  const { firebaseUID, reviewedUserId } = req.params;
  const { BookingID, Rating, Comment } = req.body;

  console.log("Received review data:", {
    firebaseUID}, reviewedUserId, BookingID, Rating, Comment);


  try {
    // Get reviewer from FirebaseUID
    const reviewer = await User.findOne({ FirebaseUID: firebaseUID });
    if (!reviewer) return res.status(404).json({ message: "Reviewer not found" });

    // Get reviewed user
    const reviewedUser = await User.findOne({ FirebaseUID: reviewedUserId });
    if (!reviewedUser) return res.status(404).json({ message: "User to be reviewed not found" });


    // Count existing reviews
    const reviewCount = await Review.countDocuments();

    // Generate zero-padded ID: R001, R002, etc.
    const paddedId = String(reviewCount + 1).padStart(3, '0');
    const reviewID = `R${paddedId}`;

    // Create and save review
    const review = new Review({
      ReviewID: reviewID,
      BookingID: new mongoose.Types.ObjectId(BookingID),
      ReviewerID: reviewer._id,
      ReviewedUserID: reviewedUser._id,
      Rating,
      Comment,
    });

    await review.save();

    // Update reviewed user's rating
    const newTotalRatings = reviewedUser.TotalRatings + 1;
    const newRating = ((reviewedUser.Rating * reviewedUser.TotalRatings) + Rating) / newTotalRatings;

    reviewedUser.Rating = parseFloat(newRating.toFixed(2));
    reviewedUser.TotalRatings = newTotalRatings;

    await reviewedUser.save();

    res.status(201).json({
      message: "Review submitted and rating updated",
      review,
    });

  } catch (error) {
    console.error("Error submitting review:", error);
    res.status(500).json({ message: "Server error", error });
  }
});

// @route   GET /reviews/user/:userId
// @desc    Get all reviews for a specific user (userId is firebaseUID)
router.get("/user/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
    // Find the user by firebaseUID
    const user = await User.findOne({ FirebaseUID: userId });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Find reviews for this user
    const reviews = await Review.find({ ReviewedUserID: user._id })
      .populate("ReviewerID", "Name ProfilePicture")
      .sort({ Timestamp: -1 })
      .lean();

    // Prepare detailed review info
    const reviewDetails = reviews.map(r => ({
      reviewID: r.ReviewID,
      rating: r.Rating,
      comment: r.Comment,
      timestamp: r.Timestamp,
      reviewer: r.ReviewerID ? {
        name: r.ReviewerID.Name,
        profilePicture: r.ReviewerID.ProfilePicture,
        id: r.ReviewerID._id
      } : null,
      bookingID: r.BookingID
    }));

    console.log("Review details:", reviewDetails);
    res.status(200).json({
      user: {
        id: user._id,
        name: user.Name,
        profilePicture: user.ProfilePicture,
        rating: user.Rating,
        totalRatings: user.TotalRatings
      },
      reviews: reviewDetails
    });
  } catch (error) {
    console.error("Error fetching reviews:", error);
    res.status(500).json({ message: "Server error", error });
  }
});

module.exports = router;
