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

//     // 5. Monthly Earnings (for chart)
//     // Sales Earnings by Month
//     const monthlySalesEarnings = await Purchase.aggregate([
//       {
//         $match: {
//           ProviderID: userId,
//           Status: "Completed",
//           EscrowStatus: { $in: ["Released", "Completed"] }
//         }
//       },
//       {
//         $group: {
//           _id: {
//             year: { $year: "$createdAt" },
//             month: { $month: "$createdAt" }
//           },
//           salesAmount: { $sum: "$Price" }
//         }
//       },
//       {
//         $sort: {
//           "_id.year": 1,
//           "_id.month": 1
//         }
//       }
//     ]);

//     // Rental Earnings by Month
//     const monthlyRentalEarnings = await Payment.aggregate([
//       {
//         $match: {
//           BookingID: { $in: relatedBookingIds },
//           Status: "Completed"
//         }
//       },
//       {
//         $group: {
//           _id: {
//             year: { $year: "$createdAt" },
//             month: { $month: "$createdAt" }
//           },
//           rentalAmount: { $sum: "$Amount" }
//         }
//       },
//       {
//         $sort: {
//           "_id.year": 1,
//           "_id.month": 1
//         }
//       }
//     ]);

//     // Combine sales and rental earnings by month
//     const monthlyEarnings = [];
//     const earningsMap = {};

//     // Process sales earnings
//     monthlySalesEarnings.forEach(({ _id, salesAmount }) => {
//       const key = `${_id.year}-${_id.month}`;
//       earningsMap[key] = {
//         year: _id.year,
//         month: _id.month,
//         salesAmount,
//         rentalAmount: 0,
//         totalAmount: salesAmount
//       };
//     });

//     // Process rental earnings and combine
//     monthlyRentalEarnings.forEach(({ _id, rentalAmount }) => {
//       const key = `${_id.year}-${_id.month}`;
//       if (earningsMap[key]) {
//         earningsMap[key].rentalAmount = rentalAmount;
//         earningsMap[key].totalAmount += rentalAmount;
//       } else {
//         earningsMap[key] = {
//           year: _id.year,
//           month: _id.month,
//           salesAmount: 0,
//           rentalAmount,
//           totalAmount: rentalAmount
//         };
//       }
//     });

//     // Convert earnings map to array
//     Object.values(earningsMap).forEach(earning => {
//       monthlyEarnings.push({
//         year: earning.year,
//         month: earning.month,
//         salesAmount: earning.salesAmount,
//         rentalAmount: earning.rentalAmount,
//         totalAmount: earning.totalAmount
//       });
//     });

//     // Sort monthly earnings by year and month
//     monthlyEarnings.sort((a, b) => {
//       if (a.year !== b.year) return a.year - b.year;
//       return a.month - b.month;
//     });

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
//       bookedDates,
//       monthlyEarnings // Add monthly earnings to the response
//     });

//   } catch (error) {
//     console.error('Dashboard Fetch Error:', error);
//     return res.status(500).json({ message: 'Server Error' });
//   }
// });

// module.exports = router;


const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

const User = require('../models/user');
const Listing = require('../models/Listings');
const Purchase = require('../models/Purchase');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');

// Endpoint to fetch user dashboard data
router.post('/', async (req, res) => {
  try {
    const { userId } = req.body;
    console.log('Dashboard request received for Firebase UID:', userId);

    if (!userId) {
      return res.status(400).json({ message: 'Firebase UID is required' });
    }

    // Fetch user’s _id from User collection using FirebaseUID
    const user = await User.findOne({ FirebaseUID: userId }).select('_id');
    if (!user) {
      console.log('User not found for Firebase UID:', userId);
      return res.status(404).json({ message: 'User not found' });
    }
    const userObjectId = user._id;
    console.log('User ObjectId:', userObjectId);

    // 1. Total Products
    const totalProducts = await Listing.countDocuments({ ProviderID: userObjectId });
    console.log('Total products:', totalProducts);

    // 2. Total Sales
    const totalSales = await Purchase.countDocuments({
      ProviderID: userObjectId,
      Status: 'Completed',
      EscrowStatus: { $in: ['Released', 'Completed'] }
    });
    console.log('Total sales:', totalSales);

    // Calculate Total Sales Earnings
    const salesEarningsResult = await Purchase.aggregate([
      {
        $match: {
          ProviderID: userObjectId,
          Status: 'Completed',
          EscrowStatus: { $in: ['Released', 'Completed'] }
        }
      },
      {
        $group: {
          _id: null,
          totalSalesAmount: { $sum: '$Price' }
        }
      }
    ]);
    console.log('Sales earnings result:', salesEarningsResult);
    const totalSalesAmount = salesEarningsResult[0]?.totalSalesAmount || 0;
    console.log('Total sales amount:', totalSalesAmount);

    // 3. Total Rents
    const rentalListings = await Listing.find({ ProviderID: userObjectId, ServiceType: 'Rental' }).select('_id');
    const rentalListingIds = rentalListings.map(listing => listing._id);
    console.log('Rental listing IDs:', rentalListingIds);

    const relatedBookings = await Booking.find({
      ListingID: { $in: rentalListingIds },
      Status: 'Confirmed'
    }).select('_id');
    const relatedBookingIds = relatedBookings.map(booking => booking._id);
    console.log('Related booking IDs:', relatedBookingIds);

    const totalRents = await Payment.countDocuments({
      BookingID: { $in: relatedBookingIds },
      Status: 'Completed'
    });
    console.log('Total rents:', totalRents);

    // Calculate Total Rental Earnings
    const rentalEarningsResult = await Payment.aggregate([
      {
        $match: {
          BookingID: { $in: relatedBookingIds },
          Status: 'Completed'
        }
      },
      {
        $group: {
          _id: null,
          totalRentalAmount: { $sum: '$Amount' }
        }
      }
    ]);
    console.log('Rental earnings result:', rentalEarningsResult);
    const totalRentalAmount = rentalEarningsResult[0]?.totalRentalAmount || 0;
    console.log('Total rental amount:', totalRentalAmount);

    // 4. Total Earnings
    const totalEarnings = totalSalesAmount + totalRentalAmount;
    console.log('Total earnings:', totalEarnings);

    // 5. Monthly Earnings (for chart)
    // Sales Earnings by Month (using DateCompleted)
    const monthlySalesEarnings = await Purchase.aggregate([
      {
        $match: {
          ProviderID: userObjectId,
          Status: 'Completed',
          EscrowStatus: { $in: ['Released', 'Completed'] },
          DatePurchased: { $exists: true } // Ensure DateCompleted exists
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$DatePurchased' },
            month: { $month: '$DatePurchased' }
          },
          salesAmount: { $sum: '$Price' }
        }
      },
      {
        $sort: {
          '_id.year': 1,
          '_id.month': 1
        }
      }
    ]);
    console.log('Monthly sales earnings:', monthlySalesEarnings);

    // Rental Earnings by Month (using Timestamp)
    const monthlyRentalEarnings = await Payment.aggregate([
      {
        $match: {
          BookingID: { $in: relatedBookingIds },
          Status: 'Completed',
          Timestamp: { $exists: true } // Ensure Timestamp exists
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$Timestamp' },
            month: { $month: '$Timestamp' }
          },
          rentalAmount: { $sum: '$Amount' }
        }
      },
      {
        $sort: {
          '_id.year': 1,
          '_id.month': 1
        }
      }
    ]);
    console.log('Monthly rental earnings:', monthlyRentalEarnings);

    // Combine sales and rental earnings by month
    const monthlyEarnings = [];
    const earningsMap = {};

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

    Object.values(earningsMap).forEach(earning => {
      monthlyEarnings.push({
        year: earning.year,
        month: earning.month,
        salesAmount: earning.salesAmount,
        rentalAmount: earning.rentalAmount,
        totalAmount: earning.totalAmount
      });
    });

    monthlyEarnings.sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.month - b.month;
    });
    console.log('Monthly earnings:', monthlyEarnings);

    // Fetch booked dates for the user
    const bookedDatesResult = await Booking.aggregate([
      {
        $match: {
          ProviderID: userObjectId,
          Status: 'Confirmed'
        }
      },
      {
        $project: {
          startDate: '$StartDate', // Match Booking schema
          endDate: '$EndDate'
        }
      }
    ]);
    console.log('Booked dates result:', bookedDatesResult);

    const bookedDates = bookedDatesResult.map(booking => ({
      startDate: booking.startDate,
      endDate: booking.endDate
    }));
    console.log('Booked dates:', bookedDates);

    return res.status(200).json({
      totalProducts,
      totalSales,
      totalRents,
      totalEarnings,
      bookedDates,
      monthlyEarnings
    });
  } catch (error) {
    console.error('Dashboard Fetch Error:', error);
    return res.status(500).json({ message: 'Server Error' });
  }
});

module.exports = router;