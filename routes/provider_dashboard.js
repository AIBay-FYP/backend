// const express = require('express');
// const router = express.Router();

// const Listing = require('../models/Listings');
// const Purchase = require('../models/Purchase');
// const Booking = require('../models/Booking');
// const Payment = require('../models/Payment');

// router.post('/', async (req, res) => {
//   try {
//     const { userId } = req.body; // User's ObjectId from body

//     if (!userId) {
//       return res.status(400).json({ message: 'User ID is required' });
//     }

//     // 1. Total Products: Listings where ProviderID = userId
//     const totalProducts = await Listing.countDocuments({ ProviderID: userId });

//     // 2. Total Sales: Purchases where ProviderID = userId, Status = Completed, EscrowStatus = Released or Completed
//     const totalSales = await Purchase.countDocuments({
//       ProviderID: userId,
//       Status: "Completed",
//       EscrowStatus: { $in: ["Released", "Completed"] }
//     });

//     // 3. Total Rents:
//     // - Find all rental listings owned by the user
//     const rentalListings = await Listing.find({ ProviderID: userId, ServiceType: "Rental" }).select('_id');
//     const rentalListingIds = rentalListings.map(listing => listing._id);

//     // - Find all bookings for those listings
//     const relatedBookings = await Booking.find({
//       ListingID: { $in: rentalListingIds },
//       Status: "Confirmed"
//     }).select('_id');
//     const relatedBookingIds = relatedBookings.map(booking => booking._id);

//     // - Count confirmed payments for those bookings
//     const totalRents = await Payment.countDocuments({
//       BookingID: { $in: relatedBookingIds },
//       Status: "Completed"
//     });

//     return res.status(200).json({
//       totalProducts,
//       totalSales,
//       totalRents
//     });

//   } catch (error) {
//     console.error('Dashboard Fetch Error:', error);
//     return res.status(500).json({ message: 'Server Error' });
//   }
// });

// module.exports = router;




//with earnings


// const express = require('express');
// const router = express.Router();

// const Listing = require('../models/Listings');
// const Purchase = require('../models/Purchase');
// const Booking = require('../models/Booking');
// const Payment = require('../models/Payment');

// router.post('/', async (req, res) => {
//   try {
//     const { userId } = req.body;

//     if (!userId) {
//       return res.status(400).json({ message: 'User ID is required' });
//     }

//     // 1. Total Products
//     const totalProducts = await Listing.countDocuments({ ProviderID: userId });

//     // 2. Total Sales
//     const totalSales = await Purchase.countDocuments({
//       ProviderID: userId,
//       Status: "Completed",
//       EscrowStatus: { $in: ["Released", "Completed"] }
//     });

//     // Calculate Total Sales Earnings
//     const salesEarningsResult = await Purchase.aggregate([
//       {
//         $match: {
//           ProviderID: userId,
//           Status: "Completed",
//           EscrowStatus: { $in: ["Released", "Completed"] }
//         }
//       },
//       {
//         $group: {
//           _id: null,
//           totalSalesAmount: { $sum: "$Price" }
//         }
//       }
//     ]);
//     const totalSalesAmount = salesEarningsResult[0]?.totalSalesAmount || 0;

//     // 3. Total Rents
//     const rentalListings = await Listing.find({ ProviderID: userId, ServiceType: "Rental" }).select('_id');
//     const rentalListingIds = rentalListings.map(listing => listing._id);

//     const relatedBookings = await Booking.find({
//       ListingID: { $in: rentalListingIds },
//       Status: "Confirmed"
//     }).select('_id');
//     const relatedBookingIds = relatedBookings.map(booking => booking._id);

//     const totalRents = await Payment.countDocuments({
//       BookingID: { $in: relatedBookingIds },
//       Status: "Completed"
//     });

//     // Calculate Total Rental Earnings
//     const rentalEarningsResult = await Payment.aggregate([
//       {
//         $match: {
//           BookingID: { $in: relatedBookingIds },
//           Status: "Completed"
//         }
//       },
//       {
//         $group: {
//           _id: null,
//           totalRentalAmount: { $sum: "$Amount" }
//         }
//       }
//     ]);
//     const totalRentalAmount = rentalEarningsResult[0]?.totalRentalAmount || 0;

//     // 4. Total Earnings
//     const totalEarnings = totalSalesAmount + totalRentalAmount;

//     return res.status(200).json({
//       totalProducts,
//       totalSales,
//       totalRents,
//       totalEarnings
//     });

//   } catch (error) {
//     console.error('Dashboard Fetch Error:', error);
//     return res.status(500).json({ message: 'Server Error' });
//   }
// });

// module.exports = router;



//with booked dates


// const express = require('express');
// const router = express.Router();

// const Listing = require('../models/Listings');
// const Purchase = require('../models/Purchase');
// const Booking = require('../models/Booking');
// const Payment = require('../models/Payment');

// // Endpoint to fetch user dashboard data
// router.post('/', async (req, res) => {
//   try {
//     const { userId } = req.body;

//     if (!userId) {
//       return res.status(400).json({ message: 'User ID is required' });
//     }

//     // 1. Total Products
//     const totalProducts = await Listing.countDocuments({ ProviderID: userId });

//     // 2. Total Sales
//     const totalSales = await Purchase.countDocuments({
//       ProviderID: userId,
//       Status: "Completed",
//       EscrowStatus: { $in: ["Released", "Completed"] }
//     });

//     // Calculate Total Sales Earnings
//     const salesEarningsResult = await Purchase.aggregate([
//       {
//         $match: {
//           ProviderID: userId,
//           Status: "Completed",
//           EscrowStatus: { $in: ["Released", "Completed"] }
//         }
//       },
//       {
//         $group: {
//           _id: null,
//           totalSalesAmount: { $sum: "$Price" }
//         }
//       }
//     ]);
//     const totalSalesAmount = salesEarningsResult[0]?.totalSalesAmount || 0;

//     // 3. Total Rents
//     const rentalListings = await Listing.find({ ProviderID: userId, ServiceType: "Rental" }).select('_id');
//     const rentalListingIds = rentalListings.map(listing => listing._id);

//     const relatedBookings = await Booking.find({
//       ListingID: { $in: rentalListingIds },
//       Status: "Confirmed"
//     }).select('_id');

//     const relatedBookingIds = relatedBookings.map(booking => booking._id);

//     const totalRents = await Payment.countDocuments({
//       BookingID: { $in: relatedBookingIds },
//       Status: "Completed"
//     });

//     // Calculate Total Rental Earnings
//     const rentalEarningsResult = await Payment.aggregate([
//       {
//         $match: {
//           BookingID: { $in: relatedBookingIds },
//           Status: "Completed"
//         }
//       },
//       {
//         $group: {
//           _id: null,
//           totalRentalAmount: { $sum: "$Amount" }
//         }
//       }
//     ]);
//     const totalRentalAmount = rentalEarningsResult[0]?.totalRentalAmount || 0;

//     // 4. Total Earnings
//     const totalEarnings = totalSalesAmount + totalRentalAmount;

//     // Fetch booked dates for the user
//     const bookedDatesResult = await Booking.aggregate([
//       {
//         $match: {
//           ProviderID: userId,
//           Status: "Confirmed"
//         }
//       },
//       {
//         $project: {
//           startDate: 1,
//           endDate: 1
//         }
//       }
//     ]);

//     // Format booked dates to return as an array of Date objects
//     const bookedDates = bookedDatesResult.map(booking => {
//       return {
//         startDate: booking.startDate,
//         endDate: booking.endDate,
//       };
//     });

//     return res.status(200).json({
//       totalProducts,
//       totalSales,
//       totalRents,
//       totalEarnings,
//       bookedDates,  // Add booked dates to the response
//     });

//   } catch (error) {
//     console.error('Dashboard Fetch Error:', error);
//     return res.status(500).json({ message: 'Server Error' });
//   }
// });

// module.exports = router;


//arning chart

const express = require('express');
const router = express.Router();

const Listing = require('../models/Listings');
const Purchase = require('../models/Purchase');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const User = require('../models/user');

// Endpoint to fetch user dashboard data
router.post('/', async (req, res) => {
  try {
    const { userId } = req.body;
    const user = await User.findOne({ FirebaseUID: userId });
    
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    // 1. Total Products
    const totalProducts = await Listing.countDocuments({ ProviderID: user._id });

    // 2. Total Sales
    const totalSales = await Purchase.countDocuments({
      ProviderID: user._id,
      Status: "Completed",
      EscrowStatus: { $in: ["Released", "Completed"] }
    });

    // Calculate Total Sales Earnings
    const salesEarningsResult = await Purchase.aggregate([
      {
        $match: {
          ProviderID: user._id,
          Status: "Completed",
          EscrowStatus: { $in: ["Released", "Completed"] }
        }
      },
      {
        $group: {
          _id: null,
          totalSalesAmount: { $sum: "$Price" }
        }
      }
    ]);
    const totalSalesAmount = salesEarningsResult[0]?.totalSalesAmount || 0;

    // 3. Total Rents
    const rentalListings = await Listing.find({ ProviderID: user._id, ServiceType: "Rental" }).select('_id');
    const rentalListingIds = rentalListings.map(listing => listing._id);

    const relatedBookings = await Booking.find({
      ListingID: { $in: rentalListingIds },
      Status: "Confirmed"
    }).select('_id');

    const relatedBookingIds = relatedBookings.map(booking => booking._id);

    const totalRents = await Payment.countDocuments({
      BookingID: { $in: relatedBookingIds },
      Status: "Completed"
    });

    // Calculate Total Rental Earnings
    const rentalEarningsResult = await Payment.aggregate([
      {
        $match: {
          BookingID: { $in: relatedBookingIds },
          Status: "Completed"
        }
      },
      {
        $group: {
          _id: null,
          totalRentalAmount: { $sum: "$Amount" }
        }
      }
    ]);
    const totalRentalAmount = rentalEarningsResult[0]?.totalRentalAmount || 0;

    // 4. Total Earnings
    const totalEarnings = totalSalesAmount + totalRentalAmount;

    // 5. Monthly Earnings (for chart)
    // Sales Earnings by Month
    const monthlySalesEarnings = await Purchase.aggregate([
      {
        $match: {
          ProviderID: user._id,
          Status: "Completed",
          EscrowStatus: { $in: ["Released", "Completed"] }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" }
          },
          salesAmount: { $sum: "$Price" }
        }
      },
      {
        $sort: {
          "_id.year": 1,
          "_id.month": 1
        }
      }
    ]);

    // Rental Earnings by Month
    const monthlyRentalEarnings = await Payment.aggregate([
      {
        $match: {
          BookingID: { $in: relatedBookingIds },
          Status: "Completed"
        }
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" }
          },
          rentalAmount: { $sum: "$Amount" }
        }
      },
      {
        $sort: {
          "_id.year": 1,
          "_id.month": 1
        }
      }
    ]);

    // Combine sales and rental earnings by month
    const monthlyEarnings = [];
    const earningsMap = {};

    // Process sales earnings
    monthlySalesEarnings.forEach(({ _id, salesAmount }) => {
      const key = `${_id.year}-${_id.month}`;
      earningsMap[key] = {
        year: _id.year,
        month: _id.month,
        salesAmount,
        rentalAmount: 0,
        totalAmount: salesAmount
      };
    });

    // Process rental earnings and combine
    monthlyRentalEarnings.forEach(({ _id, rentalAmount }) => {
      const key = `${_id.year}-${_id.month}`;
      if (earningsMap[key]) {
        earningsMap[key].rentalAmount = rentalAmount;
        earningsMap[key].totalAmount += rentalAmount;
      } else {
        earningsMap[key] = {
          year: _id.year,
          month: _id.month,
          salesAmount: 0,
          rentalAmount,
          totalAmount: rentalAmount
        };
      }
    });

    // Convert earnings map to array
    Object.values(earningsMap).forEach(earning => {
      monthlyEarnings.push({
        year: earning.year,
        month: earning.month,
        salesAmount: earning.salesAmount,
        rentalAmount: earning.rentalAmount,
        totalAmount: earning.totalAmount
      });
    });

    // Sort monthly earnings by year and month
    monthlyEarnings.sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.month - b.month;
    });

    // Fetch booked dates for the user
    const bookedDatesResult = await Booking.aggregate([
      {
        $match: {
          ProviderID: user._id,
          Status: "Confirmed"
        }
      },
      {
        $project: {
          startDate: 1,
          endDate: 1
        }
      }
    ]);

    // Format booked dates to return as an array of Date objects
    const bookedDates = bookedDatesResult.map(booking => {
      return {
        startDate: booking.startDate,
        endDate: booking.endDate,
      };
    });

    return res.status(200).json({
      totalProducts,
      totalSales,
      totalRents,
      totalEarnings,
      bookedDates,
      monthlyEarnings // Add monthly earnings to the response
    });

  } catch (error) {
    console.error('Dashboard Fetch Error:', error);
    return res.status(500).json({ message: 'Server Error' });
  }
});

module.exports = router;