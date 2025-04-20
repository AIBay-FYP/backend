const express = require("express");
const router = express.Router();
const mongoose = require("mongoose"); 
const Listing = require("../models/Listings");

// Get all listings
router.get("/", async (req, res) => {
  try {
    const listings = await Listing.find({});
    console.log("LSIITITI",listings);
    return res.status(200).json(listings);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Get listings by id
router.get("/id/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid listing ID" });
    }
    // Find the listing by ID and populate the 'ProviderID' field with 'name' and 'email'
    const listing = await Listing.findById(id).populate('ProviderID', 'name email');
    if (!listing) {
      return res.status(404).json({ message: "Listing not found" });
    }
    console.log("Listing found:", listing);
    // Return the listing with populated provider data
    res.status(200).json(listing);
  } catch (err) {
    console.error("Error fetching listing by ID:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Get listings by category
router.get("/:category", async (req, res) => {
  try {
    console.log("INSIDE CATEGORY")

      const category = decodeURIComponent(req.params.category); // Decode URL component
      console.log(category);
      const listings = await Listing.find({ Category: category }); // Filter by category
      console.log(listings);
      res.json(listings);
  } catch (error) {
      console.error("Error fetching listings:", error);
      res.status(500).json({ message: "Internal Server Error" });
  }
});

  // Search Listings API
  router.get("/search", async (req, res) => {
  try {
    const { query, category, minPrice, maxPrice, location } = req.query;

    let filter = {};

    // Full-text search on product name and description
    if (query) {
      filter.$or = [
        { title: { $regex: query, $options: "i" } }, // Case-insensitive title search
        { description: { $regex: query, $options: "i" } }, // Case-insensitive description search
        { keywords: { $in: query.split(" ") } }, // Matches any keyword in the array
      ];
    }

    // Filter by category
    if (category) {
      filter.category = category;
    }

    // Filter by price range
    if (minPrice && maxPrice) {
      filter.$or = [
        { fixedPrice: { $gte: minPrice, $lte: maxPrice } },
        { minPrice: { $gte: minPrice }, maxPrice: { $lte: maxPrice } }
      ];
    } else if (minPrice) {
      filter.$or = [
        { fixedPrice: { $gte: minPrice } },
        { minPrice: { $gte: minPrice } }
      ];
    } else if (maxPrice) {
      filter.$or = [
        { fixedPrice: { $lte: maxPrice } },
        { maxPrice: { $lte: maxPrice } }
      ];
    }

    // Filter by location 
    if (location) {
      filter.location = { $regex: location, $options: "i" };
    }

    // Execute the search
    const listings = await Listing.find(filter);

    res.json({ success: true, data: listings });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});


// Create a new listing
router.post("/", async (req, res) => {
  try {
    const {
      ProviderID,
      Title,
      Description,
      IsNegotiable,
      IsFixedPrice,
      Availability,
      Category,
      Photos,
      DemandScore,
      FAQs,
      ServiceType,
      DateCreated,
      DatePosted,
      Location,
      DaysAvailable,
      SecurityFee,
      CancellationFee,
      Keywords,
      MaxPrice,
      MinPrice,
      FixedPrice,
      RentalDays,
      Currency,
      Documents,
    } = req.body;

    let newListing = new Listing({
      ProviderID,
      Title,
      Description,
      IsNegotiable,
      IsFixedPrice,
      Availability,
      Category,
      Photos,
      DemandScore,
      FAQs,
      ServiceType,
      DateCreated,
      DatePosted,
      Location,
      DaysAvailable,
      SecurityFee,
      CancellationFee,
      Keywords,
      MaxPrice,
      MinPrice,
      FixedPrice,
      RentalDays,
      Currency,
      Documents,
    });

    await newListing.save();
    return res.status(201).json({ message: "Listing created successfully!", listing: newListing });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Update a listing
router.put("/:id", async (req, res) => {
  try {
    const updatedData = req.body;

    // Apply Business Logic
    if (updatedData.IsNegotiable) {
      updatedData.IsFixedPrice = false;
      updatedData.FixedPrice = 0;
    } else if (updatedData.IsFixedPrice) {
      updatedData.IsNegotiable = false;
      updatedData.MinPrice = 0;
      updatedData.MaxPrice = 0;
    }

    if (updatedData.ServiceType === "Sale") {
      updatedData.RentalDays = 0;
    }

    const updatedListing = await Listing.findByIdAndUpdate(req.params.id, updatedData, { new: true });

    if (!updatedListing) return res.status(404).json({ message: "Listing not found" });

    return res.status(200).json({ message: "Listing updated successfully!", listing: updatedListing });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

module.exports = router;