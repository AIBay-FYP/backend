// const express = require("express");
// const router = express.Router();
// const mongoose = require("mongoose"); 
// const Listing = require("../models/Listings");
// const { updateDemandScore } = require("../utils/demandScore");
const User = require("../models/user");
const DocumentVerification = require("../models/DocumentVerification");

const generateListingID = async () => {
  const count = await Listing.countDocuments();
  return `L${(count + 1).toString().padStart(3, "0")}`;
};


// // Get all listings
// router.get("/", async (req, res) => {
//   try {
//     const listings = await Listing.find({});
//     console.log("LSIITITI",listings);
//     return res.status(200).json(listings);
//   } catch (error) {
//     return res.status(500).json({ error: error.message });
//   }
// });


// // get the most recent listings
// router.get("/recent", async (req, res) => {
//   try {
//     const sevenDaysAgo = new Date();
//     sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

//     const recentListings = await Listing.find({
//       DatePosted: { $gte: sevenDaysAgo }
//     }).sort({ DatePosted: -1 }); // Newest first

//     return res.status(200).json(recentListings);
//   } catch (error) {
//     return res.status(500).json({ error: error.message });
//   }
// });

// // Get listings by id
// router.get("/id/:id", async (req, res) => {
//   try {
//     const { id } = req.params;
//     if (!mongoose.Types.ObjectId.isValid(id)) {
//       return res.status(400).json({ message: "Invalid listing ID" });
//     }
//     // Find the listing by ID and populate the 'ProviderID' field with 'name' and 'email'
//     const listing = await Listing.findById(id).populate('ProviderID', 'name email');
//     if (!listing) {
//       return res.status(404).json({ message: "Listing not found" });
//     }
//     console.log("Listing found:", listing);
//     await updateDemandScore(id, "view"); // Update demand score on view

//     res.status(200).json(listing);
//   } catch (err) {
//     console.error("Error fetching listing by ID:", err);
//     res.status(500).json({ message: "Server error" });
//   }
// });

// // Get listings by category
// router.get("/:category", async (req, res) => {
//   try {
//     console.log("INSIDE CATEGORY")

//       const category = decodeURIComponent(req.params.category); // Decode URL component
//       console.log(category);
//       const listings = await Listing.find({ Category: category }); // Filter by category
//       console.log(listings);
//       res.json(listings);
//   } catch (error) {
//       console.error("Error fetching listings:", error);
//       res.status(500).json({ message: "Internal Server Error" });
//   }
// });

//   // Search Listings API
//   router.get("/search", async (req, res) => {
//   try {
//     const { query, category, minPrice, maxPrice, location } = req.query;

//     let filter = {};

//     // Full-text search on product name and description
//     if (query) {
//       filter.$or = [
//         { title: { $regex: query, $options: "i" } }, // Case-insensitive title search
//         { description: { $regex: query, $options: "i" } }, // Case-insensitive description search
//         { keywords: { $in: query.split(" ") } }, // Matches any keyword in the array
//       ].sort({ DemandScore: -1 });;
//     }

//     // Filter by category
//     if (category) {
//       filter.category = category;
//     }

//     // Filter by price range
//     if (minPrice && maxPrice) {
//       filter.$or = [
//         { fixedPrice: { $gte: minPrice, $lte: maxPrice } },
//         { minPrice: { $gte: minPrice }, maxPrice: { $lte: maxPrice } }
//       ];
//     } else if (minPrice) {
//       filter.$or = [
//         { fixedPrice: { $gte: minPrice } },
//         { minPrice: { $gte: minPrice } }
//       ];
//     } else if (maxPrice) {
//       filter.$or = [
//         { fixedPrice: { $lte: maxPrice } },
//         { maxPrice: { $lte: maxPrice } }
//       ];
//     }

//     // Filter by location 
//     if (location) {
//       filter.location = { $regex: location, $options: "i" };
//     }

//     // Execute the search
//     const listings = await Listing.find(filter);

//     res.json({ success: true, data: listings });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ success: false, message: "Server Error" });
//   }
// });


// // Create a new listing
// router.post("/", async (req, res) => {
//   try {
//     const {
//       ProviderID,
//       Title,
//       Description,
//       IsNegotiable,
//       IsFixedPrice,
//       Availability,
//       Category,
//       Photos,
//       DemandScore,
//       FAQs,
//       ServiceType,
//       DateCreated,
//       DatePosted,
//       Location,
//       DaysAvailable,
//       SecurityFee,
//       CancellationFee,
//       Keywords,
//       MaxPrice,
//       MinPrice,
//       FixedPrice,
//       RentalDays,
//       Currency,
//       Documents,
//     } = req.body;


//     const ListingID = await generateListingID();

//     const user = await User.findOne({ FirebaseUID: ProviderID });
//     let newListing = new Listing({
//       ProviderID: user._id,
//       ListingID,
//       Title,
//       Description,
//       IsNegotiable,
//       IsFixedPrice,
//       Availability,
//       Category,
//       Photos,
//       DemandScore,
//       FAQs,
//       ServiceType,
//       DateCreated,
//       DatePosted,
//       Location,
//       DaysAvailable,
//       SecurityFee,
//       CancellationFee,
//       Keywords,
//       MaxPrice,
//       MinPrice,
//       FixedPrice,
//       RentalDays,
//       Currency,
//       Documents,
//     });

//     console.log("New Listing:", newListing);
//     await newListing.save();
//     return res.status(201).json({ message: "Listing created successfully!", listing: newListing });
//   } catch (error) {
//     return res.status(500).json({ error: error.message });
//   }
// });

// // Update a listing
// router.put("/:id", async (req, res) => {
//   try {
//     const updatedData = req.body;

//     // Apply Business Logic
//     if (updatedData.IsNegotiable) {
//       updatedData.IsFixedPrice = false;
//       updatedData.FixedPrice = 0;
//     } else if (updatedData.IsFixedPrice) {
//       updatedData.IsNegotiable = false;
//       updatedData.MinPrice = 0;
//       updatedData.MaxPrice = 0;
//     }

//     if (updatedData.ServiceType === "Sale") {
//       updatedData.RentalDays = 0;
//     }

//     const updatedListing = await Listing.findByIdAndUpdate(req.params.id, updatedData, { new: true });

//     if (!updatedListing) return res.status(404).json({ message: "Listing not found" });

//     return res.status(200).json({ message: "Listing updated successfully!", listing: updatedListing });
//   } catch (error) {
//     return res.status(500).json({ error: error.message });
//   }
// });

// module.exports = router;





//ifrah

const express = require("express");
const router = express.Router();
const mongoose = require("mongoose"); 
const Listing = require("../models/Listings");
const ComplianceLog = require("../models/ComplianceLog");
const { updateDemandScore } = require("../utils/demandScore");
// const DocumentVerification = require("../models/DocumentVerification"); 

// const generateDocumentID = async () => {
//   try {
//     // Find the latest DocumentVerification document sorted by DocumentID in descending order
//     const latestDocument = await DocumentVerification.findOne()
//       .sort({ DocumentID: -1 })
//       .select("DocumentID");

//     let newNumber = 1; // Default to 1 if no documents exist
//     if (latestDocument && latestDocument.DocumentID) {
//       // Extract the numeric part from DocumentID (e.g., '001' from 'DOC001')
//       const numericPart = parseInt(latestDocument.DocumentID.replace("DOC", ""), 10);
//       newNumber = numericPart + 1;
//     }

//     // Format the number with leading zeros (e.g., 1 -> '001')
//     const formattedNumber = newNumber.toString().padStart(3, "0");
//     return `DOC${formattedNumber}`;
//   } catch (error) {
//     throw new Error("Failed to generate DocumentID: " + error.message);
//   }
// };

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

// // Get all listings
// router.get("/", async (req, res) => {
//   try {
//     const listings = await Listing.find({});
//     console.log("LSIITITI",listings);
//     return res.status(200).json(listings);
//   } catch (error) {
//     return res.status(500).json({ error: error.message });
//   }
// });

// // get the most recent listings
// router.get("/recent", async (req, res) => {
//   try {
//     const sevenDaysAgo = new Date();
//     sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

//     const recentListings = await Listing.find({
//       DatePosted: { $gte: sevenDaysAgo }
//     }).sort({ DatePosted: -1 }); // Newest first

//     return res.status(200).json(recentListings);
//   } catch (error) {
//     return res.status(500).json({ error: error.message });
//   }
// });

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

// Get listings by category
// router.get("/:category", async (req, res) => {
//   try {
//     console.log("INSIDE CATEGORY")

//       const category = decodeURIComponent(req.params.category); // Decode URL component
//       console.log(category);
//       const listings = await Listing.find({ Category: category }); // Filter by category
//       console.log(listings);
//       res.json(listings);
//   } catch (error) {
//       console.error("Error fetching listings:", error);
//       res.status(500).json({ message: "Internal Server Error" });
//   }
// });

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
      ].sort({ DemandScore: -1 });;
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
      Documents, // Array of document URLs
      Quantity,
    } = req.body;

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
      Quantity,
    });

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

module.exports = router;




// Update a listing by ID
router.put('/:id', async (req, res) => {
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
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

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
          DatePosted: { $gte: sevenDaysAgo },
        },
      },
      {
        $project: {
          complianceLogs: 0, // Exclude the complianceLogs field
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
          DatePosted: { $gte: sevenDaysAgo },
        },
      },

      {
        $project: {
          complianceLogs: 0, // Exclude the complianceLogs field
        },
      },
    ]);

    // Combine both results
    const recentListings = [...approvedListings, ...unloggedListings];

    return res.status(200).json(recentListings);
  } catch (error) {
    console.error("Error fetching recent listings:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
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