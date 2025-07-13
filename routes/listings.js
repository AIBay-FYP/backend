const generateListingID = async () => {
  const count = await Listing.countDocuments();
  return `L${(count + 1).toString().padStart(3, "0")}`;
};

const express = require("express");
const router = express.Router();
const mongoose = require("mongoose"); 
const Listing = require("../models/Listings");
const ComplianceLog = require("../models/ComplianceLog");
const { updateDemandScore } = require("../utils/demandScore");
const { geocodeLocation, getDistanceInKm } = require('../utils/geo_utils');
const User = require("../models/user");
const DocumentVerification = require("../models/DocumentVerification");
const { listingCoordsCache } = require("../listingCache");

const generateDocumentID = async () => {
  const count = await DocumentVerification.countDocuments();
  return `D${(count + 1).toString().padStart(3, "0")}`;
};


// Function to generate LogID in CL00X format
async function generateLogID() {
  try {
    // Find the latest ComplianceLog document sorted by LogID in descending order
    const latestLog = await ComplianceLog.findOne()
      .sort({ LogID: -1 })
      .select('LogID');

    let newNumber = 1; // Default to 1 if no logs exist
    if (latestLog && latestLog.LogID) {
      // Extract the numeric part from LogID (e.g., '001' from 'CL001')
      const numericPart = parseInt(latestLog.LogID.replace('CL', ''), 10);
      newNumber = numericPart + 1;
    }

    // Format the number with leading zeros (e.g., 1 -> '001')
    const formattedNumber = newNumber.toString().padStart(3, '0');
    return `CL${formattedNumber}`;
  } catch (error) {
    throw new Error('Failed to generate LogID: ' + error.message);
  }
}

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
    await updateDemandScore(id, "view"); // Update demand score on view

    res.status(200).json(listing);
  } catch (err) {
    console.error("Error fetching listing by ID:", err);
    res.status(500).json({ message: "Server error" });
  }
});
// Search Listings API
router.get("/search", async (req, res) => {
  try {
    const { query, category, minPrice, maxPrice, location } = req.query;

    console.log("Received search query:", req.query);

    let filter = {};

    if (query) {
      filter.$or = [
        { title: { $regex: query, $options: "i" } },
        { description: { $regex: query, $options: "i" } },
        { keywords: { $in: query.split(" ") } },
      ];
    }

    if (category) {
      filter.category = category;
    }

    if (minPrice && maxPrice) {
      filter.$or = [
        { fixedPrice: { $gte: Number(minPrice), $lte: Number(maxPrice) } },
        { minPrice: { $gte: Number(minPrice) }, maxPrice: { $lte: Number(maxPrice) } }
      ];
    } else if (minPrice) {
      filter.$or = [
        { fixedPrice: { $gte: Number(minPrice) } },
        { minPrice: { $gte: Number(minPrice) } }
      ];
    } else if (maxPrice) {
      filter.$or = [
        { fixedPrice: { $lte: Number(maxPrice) } },
        { maxPrice: { $lte: Number(maxPrice) } }
      ];
    }

    if (location) {
      filter.location = { $regex: location, $options: "i" };
    }

    console.log("Final MongoDB Filter:", filter);

    const listings = await Listing.find(filter);  // <== CRASH LIKELY HERE

    res.json({ success: true, data: listings });
  } catch (error) {
    console.error("Search API Error:", error);  // <- Show the real error!
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
      Documents, // Array of document URLs
      Quantity,
    } = req.body;

    console.log("Creating new listing with data:", req.body);
    const ListingID = await generateListingID();

    // Fetch the user by FirebaseUID
    const user = await User.findOne({ FirebaseUID: ProviderID });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Create new listing with ComplianceStatus set to 'Under Review'
    let newListing = new Listing({
      ProviderID: user._id,
      ListingID,
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
      Quantity: Quantity || 1, // Default to 1 if not provided
    });

    console.log("New Listing:", newListing);

    // Save the listing
    await newListing.save();

    // Generate LogID in CL00X format
    const logID = await generateLogID();

    // Create a corresponding ComplianceLog entry
    const complianceLog = new ComplianceLog({
      LogID: logID,
      ViolationType: "None", // Default, as it's a new listing under review
      ListingID: newListing._id,
      LastReviewed: new Date(), // Current timestamp
      NotificationID: new mongoose.Types.ObjectId(), // Placeholder; replace with actual logic if needed
      Status: "Under Review", // Matches listing's ComplianceStatus
    });

    // Save the compliance log
    await complianceLog.save();

    // Create document verification entries for each uploaded document
    const documentPromises = Documents.map(async (docUrl) => {
      const documentID = await generateDocumentID(); // Generate a unique ID for the document

      // Save the document verification entry
      return new DocumentVerification({
        DocumentID: documentID,
        File: docUrl, // Use the document URL directly
        VerifiedBy: null, // Initially not verified
        Timestamp: new Date(),
        VerificationStatus: "Pending", // Default status
        ServiceID: newListing._id, // Reference to the newly created listing
        UserID: user._id, // Reference to the user who uploaded the listing
      }).save();
    });

    // Wait for all document verification entries to be created
    await Promise.all(documentPromises);

    return res.status(201).json({
      message: "Listing created successfully with compliance log and document verifications!",
      listing: newListing,
      complianceLog,
      documents: await DocumentVerification.find({ ServiceID: newListing._id }), // Return the created documents
    });
  } catch (error) {
    console.error("Error creating listing:", error);
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


// Get all listings
router.get("/", async (req, res) => {
  try {
    // Fetch listings with 'Approved' status in ComplianceLog
    const approvedListings = await Listing.aggregate([
      {
        $lookup: {
          from: "ComplianceLog", // Collection name for ComplianceLog
          localField: "_id",
          foreignField: "ListingID",
          as: "complianceLogs",
        },
      },
      {
        $match: {
          complianceLogs: {
            $elemMatch: { Status: "Approved" }, // Match at least one document in the array
          },
        },
      },
      {
        $project: {
          complianceLogs: 0, // Exclude the complianceLogs field
        },
      },
    ]);

    // Fetch listings not present in ComplianceLog
    const unloggedListings = await Listing.aggregate([
      {
        $lookup: {
          from: "ComplianceLog", // Collection name for ComplianceLog
          localField: "_id",
          foreignField: "ListingID",
          as: "complianceLogs",
        },
      },
      {
        $match: {
          complianceLogs: { $size: 0 }, // No matching ComplianceLog entries
        },
      },
      {
        $project: {
          complianceLogs: 0, // Exclude the complianceLogs field
        },
      },
    ]);

    // Combine both results
    const listings = [...approvedListings, ...unloggedListings];

    return res.status(200).json(listings);
  } catch (error) {
    console.error("Error fetching listings:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
});

// Get the most recent listings
router.get("/recent", async (req, res) => {
  try {
    // Helper to fetch recent listings for a given date window
    const fetchRecentListings = async (daysAgo) => {
      const sinceDate = new Date();
      sinceDate.setDate(sinceDate.getDate() - daysAgo);

      // Fetch recent listings with 'Approved' status in ComplianceLog
      const approvedListings = await Listing.aggregate([
        {
          $lookup: {
            from: "ComplianceLog",
            localField: "_id",
            foreignField: "ListingID",
            as: "complianceLogs",
          },
        },
        {
          $match: {
            complianceLogs: {
              $elemMatch: { Status: "Approved" },
            },
            DatePosted: { $gte: sinceDate },
          },
        },
        {
          $project: {
            complianceLogs: 0,
          },
        },
      ]);

      // Fetch recent listings not present in ComplianceLog
      const unloggedListings = await Listing.aggregate([
        {
          $lookup: {
            from: "ComplianceLog",
            localField: "_id",
            foreignField: "ListingID",
            as: "complianceLogs",
          },
        },
        {
          $match: {
            complianceLogs: { $size: 0 },
            DatePosted: { $gte: sinceDate },
          },
        },
        {
          $project: {
            complianceLogs: 0,
          },
        },
      ]);

      return [...approvedListings, ...unloggedListings];
    };

    // Try 7, then 14, then 30 days
    let recentListings = await fetchRecentListings(7);
    if (recentListings.length === 0) {
      recentListings = await fetchRecentListings(14);
    }
    if (recentListings.length === 0) {
      recentListings = await fetchRecentListings(30);
    }

    // Fallback: return 10 most recent listings if still empty
    if (recentListings.length === 0) {
      recentListings = await Listing.find({})
        .sort({ DatePosted: -1 })
        .limit(10)
        .lean();
    }

    return res.status(200).json(recentListings);
  } catch (error) {
    console.error("Error fetching recent listings:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
});

router.put('edit/:id', async (req, res) => {
  try {
    const {
      Title,
      Description,
      Location,
      FixedPrice,
      Quantity,
      RentalDays,
      SecurityFee,
      CancellationFee,
      MinPrice,
      MaxPrice,
      Availability
    } = req.body;

    const updated = await Listings.findByIdAndUpdate(
      req.params.id,
      {
        Title,
        Description,
        Location,
        FixedPrice,
        Quantity,
        RentalDays,
        SecurityFee,
        CancellationFee,
        MinPrice,
        MaxPrice,
        Availability
      },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: 'Listing not found' });
    }

    res.json({ message: 'Listing updated', listing: updated });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /listings/nearby?userId=<firebase_uid>
router.get('/nearby', async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ success: false, message: "FirebaseUID (userId) is required." });
    }

    const user = await User.findOne({ FirebaseUID: userId });
    if (!user?.Location) {
      return res.status(404).json({ success: false, message: "User or user location not found." });
    }

    const userCoords = await geocodeLocation(user.Location);
    if (!userCoords) {
      return res.status(400).json({ success: false, message: "Failed to geocode user location." });
    }

    const listings = await Listing.find({ Location: { $exists: true } });
    const nearbyListings = [];

    for (let listing of listings) {
      const cachedCoords = listingCoordsCache[listing._id.toString()];
      if (!cachedCoords) continue;

      const distance = getDistanceInKm(
        userCoords.lat, userCoords.lon,
        cachedCoords.lat, cachedCoords.lon
      );

      if (distance <= 5) { // 5 km radius
        nearbyListings.push({
          ...listing.toObject(),
          distanceInKm: distance
        });
      }
    }

    nearbyListings.sort((a, b) => b.DemandScore - a.DemandScore);

    res.json({ success: true, listings: nearbyListings });
  } catch (error) {
    console.error("❌ Error finding nearby listings:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
});


//Get listings by category
router.get("/:category", async (req, res) => {
  try {
    const category = decodeURIComponent(req.params.category);

    // Fetch listings by category with 'Approved' status in ComplianceLog
    const approvedListings = await Listing.aggregate([
      {
        $lookup: {
          from: "ComplianceLog",
          localField: "_id",
          foreignField: "ListingID",
          as: "complianceLogs",
        },
      },
      {
        $match: {
          complianceLogs: {
            $elemMatch: { Status: "Approved" }, // Match at least one document in the array
          },
          Category: category, // Match the category field in the Listing collection
        },
      },
      {
        $project: {
          complianceLogs: 0, // Exclude the complianceLogs field
        },
      },
    ]);

    // Fetch listings by category not present in ComplianceLog
    const unloggedListings = await Listing.aggregate([
      {
        $lookup: {
          from: "ComplianceLog",
          localField: "_id",
          foreignField: "ListingID",
          as: "complianceLogs",
        },
      },
      {
        $match: {
          complianceLogs: { $size: 0 },
          Category: category,
        },
      },

      {
        $project: {
          complianceLogs: 0, // Exclude the complianceLogs field
        },
      },
    ]);

    // Combine both results
    const listings = [...approvedListings, ...unloggedListings];

    return res.status(200).json(listings);
  } catch (error) {
    console.error("Error fetching listings by category:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
});


module.exports = router;