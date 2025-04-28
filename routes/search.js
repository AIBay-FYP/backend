const express = require('express');
const router = express.Router();
const Listing = require('../models/Listings'); 

// Search API
router.get('/', async (req, res) => {
    try {
        const { query } = req.query;

        if (!query) {
            return res.status(400).json({ message: 'Query parameter is required' });
        }

        // Perform a case-insensitive search in Title, Description, or Keywords
        const listings = await Listing.find({
            $or: [
                { Title: { $regex: query, $options: 'i' } },
                { Description: { $regex: query, $options: 'i' } },
                { Keywords: { $elemMatch: { $regex: query, $options: 'i' } } }
            ]
        }).sort({ DemandScore: -1 }); // Sort by DemandScore descending

        res.status(200).json({ results: listings });

    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

module.exports = router;