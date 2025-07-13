const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

const User = require('../models/user');
const Listing = require('../models/Listings');
const Purchase = require('../models/Purchase');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');



router.post('/', async (req, res) => {
  try {
    const { userId } = req.body;
    console.log('Dashboard request received for Firebase UID:', userId);

    if (!userId) {
      return res.status(400).json({ message: 'Firebase UID is required' });
    }

    // Fetch user’s _id
    const user = await User.findOne({ FirebaseUID: userId }).select('_id');
    if (!user) {
      console.log('User not found for Firebase UID:', userId);
      return res.status(404).json({ message: 'User not found' });
    }
    const userObjectId = user._id;
    console.log('User ObjectId:', userObjectId);

    // Total Products
    const totalProducts = await Listing.countDocuments({ ProviderID: userObjectId });
    console.log('Total products:', totalProducts);

    // Total Sales
    const totalSales = await Purchase.countDocuments({
      ProviderID: userObjectId,
      Status: 'Completed',
      EscrowStatus: { $in: ['Released', 'Completed'] }
    });
    console.log('Total sales:', totalSales);

    // Sales Earnings
    const salesEarningsResult = await Purchase.aggregate([
      {
        $match: {
          ProviderID: userObjectId,
          Status: 'Completed',
          EscrowStatus: { $in: ['Released', 'Completed'] },
          Price: { $exists: true, $ne: null } // Ensure Price exists
        }
      },
      {
        $group: {
          _id: null,
          totalSalesAmount: { $sum: '$Price' }
        }
      }
    ]).catch(err => {
      console.error('Sales earnings aggregation error:', err);
      return [{ totalSalesAmount: 0 }]; // Fallback to 0
    });
    const totalSalesAmount = salesEarningsResult[0]?.totalSalesAmount || 0;
    console.log('Total sales amount:', totalSalesAmount);

    // Total Rents
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
      BookingID: { $in: relatedBookingIds.length ? relatedBookingIds : [mongoose.Types.ObjectId.createFromTime(0)] }, // Avoid empty $in
      Status: 'Completed'
    });
    console.log('Total rents:', totalRents);

    // Rental Earnings
    const rentalEarningsResult = await Payment.aggregate([
      {
        $match: {
          BookingID: { $in: relatedBookingIds.length ? relatedBookingIds : [mongoose.Types.ObjectId.createFromTime(0)] },
          Status: 'Completed',
          Amount: { $exists: true, $ne: null } // Ensure Amount exists
        }
      },
      {
        $group: {
          _id: null,
          totalRentalAmount: { $sum: '$Amount' }
        }
      }
    ]).catch(err => {
      console.error('Rental earnings aggregation error:', err);
      return [{ totalRentalAmount: 0 }]; // Fallback to 0
    });
    const totalRentalAmount = rentalEarningsResult[0]?.totalRentalAmount || 0;
    console.log('Total rental amount:', totalRentalAmount);

    // Total Earnings
    const totalEarnings = totalSalesAmount + totalRentalAmount;
    console.log('Total earnings:', totalEarnings);

    // Monthly Sales Earnings
    const monthlySalesEarnings = await Purchase.aggregate([
      {
        $match: {
          ProviderID: userObjectId,
          Status: 'Completed',
          EscrowStatus: { $in: ['Released', 'Completed'] },
          DatePurchased: { $type: 'date' },
          Price: { $exists: true, $ne: null }
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
    ]).catch(err => {
      console.error('Monthly sales earnings error:', err);
      return [];
    });
    console.log('Monthly sales earnings:', monthlySalesEarnings);

    // Monthly Rental Earnings
    const monthlyRentalEarnings = await Payment.aggregate([
      {
        $match: {
          BookingID: { $in: relatedBookingIds.length ? relatedBookingIds : [mongoose.Types.ObjectId.createFromTime(0)] },
          Status: 'Completed',
          Timestamp: { $type: 'date' },
          Amount: { $exists: true, $ne: null }
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
    ]).catch(err => {
      console.error('Monthly rental earnings error:', err);
      return [];
    });
    console.log('Monthly rental earnings:', monthlyRentalEarnings);

    // Combine Earnings
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

    // Booked Dates
    const bookedDatesResult = await Booking.aggregate([
      {
        $match: {
          ProviderID: userObjectId,
          Status: 'Confirmed',
          StartDate: { $type: 'date' },
          EndDate: { $type: 'date' }
        }
      },
      {
        $project: {
          startDate: '$StartDate',
          endDate: '$EndDate'
        }
      }
    ]).catch(err => {
      console.error('Booked dates aggregation error:', err);
      return [];
    });
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
    return res.status(500).json({ message: 'Server Error', error: error.message });
  }
});

module.exports = router;