const express = require("express");
const router = express.Router();
const Listing = require("../models/Listings");

// GET listings with filters
router.get("/", async (req, res) => {
  try {
    let query = {};

    if (req.query.category) {
      query.Category = req.query.category;
    }

    if (req.query.minPrice && req.query.maxPrice) {
      query.MinPrice = { $gte: parseInt(req.query.minPrice) };
      query.MaxPrice = { $lte: parseInt(req.query.maxPrice) };
    }

    if (req.query.location) {
      query.Location = req.query.location;
    }

    if (req.query.isNegotiable !== undefined) {
      query.IsNegotiable = req.query.isNegotiable === "true";
    }

    if (req.query.serviceType) {
      query.ServiceType = req.query.serviceType;
    }

    if (req.query.search) {
      query.$or = [
        { Title: { $regex: req.query.search, $options: "i" } },
        { Description: { $regex: req.query.search, $options: "i" } },
        { Keywords: { $in: [req.query.search] } },
      ];
    }

    let sort = {};
    if (req.query.sortBy) {
      if (req.query.sortBy === "price") {
        sort.MinPrice = 1;
      } else if (req.query.sortBy === "demandScore") {
        sort.DemandScore = -1;
      }
    }

    const listings = await Listing.find(query).sort(sort);
    res.json(listings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;