const express = require("express");
const router = express.Router();
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
const fs = require('fs').promises; // Use promises for async file operations
const path = require('path');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const cloudinary = require('cloudinary').v2;
const Contract = require('../models/contract');
const Notification = require('../models/Notification');
const dotenv = require('dotenv');
const Booking = require("../models/Booking");
const { default: mongoose } = require("mongoose");

dotenv.config();

cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const generateContractID = async () => {
    const count = await Contract.countDocuments();
    return `C${(count + 1).toString().padStart(3, '0')}`; // e.g., C001, C002
};


router.get('/contracts/:contractId', async (req, res) => {
    const { contractId } = req.params;

    const contract = await Contract.findOne({ ContractID: contractId });
    if (!contract) {
        return res.status(404).json({ success: false, message: 'Contract not found' });
    }

    res.status(200).json({ success: true, contract });
});

router.get('/booking/:bookingId', async (req, res) => {
  try {
    const { bookingId } = req.params;
    console.log('Booking ID:', bookingId);

    // Find the booking and populate the ListingID to access ServiceType
    const booking = await Booking.findOne({ 
      _id: new mongoose.Types.ObjectId(bookingId)
    }).populate('ListingID', 'ServiceType');  // <- Correct casing here

    console.log('Booking found:', booking);

    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found." });
    }

    // Access populated ServiceType with correct casing
    const serviceType = (booking.ListingID?.ServiceType || '').trim().toLowerCase();
    console.log('Service Type:', serviceType);

    if (serviceType !== 'rent') {
      return res.status(404).json({ success: false, message: "This is not a rental booking." });
    }

    // Find the contract linked to this booking
    const contract = await Contract.findOne({ BookingID: booking._id });

    if (!contract) {
      return res.status(404).json({ success: false, message: "No contract found for this booking." });
    }

    console.log('Contract found:', contract);

    return res.status(200).json({
      success: true,
      contract
    });

  } catch (error) {
    console.error('Error fetching contract for booking:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

router.post('/generate-contract', async (req, res) => {
    const {
        provider_name,
        consumer_name,
        product_name,
        product_description,
        condition,
        category,
        start_date,
        end_date,
        rental_days,
        final_price,
        security_fee,
        cancellation_fee,
        currency,
        is_negotiable,
        custom_requirements,
        jurisdiction,
        decided_terms,
        generation_date,
        booking_id
    } = req.body;

    // Strict input validation
    const requiredFields = [
        provider_name, consumer_name, product_name, product_description,
        condition, category, start_date, end_date, rental_days,
        final_price, security_fee, cancellation_fee, currency,
        custom_requirements, jurisdiction, decided_terms, generation_date, booking_id
    ];

    if (requiredFields.some(field => field === undefined || field === null || field === '')) {
        return res.status(400).json({ success: false, message: 'All contract fields are required' });
    }

    // Validate data types and formats
    if (isNaN(rental_days) || rental_days <= 0) {
        return res.status(400).json({ success: false, message: 'Invalid rental_days: must be a positive number' });
    }
    if (isNaN(final_price) || final_price < 0) {
        return res.status(400).json({ success: false, message: 'Invalid final_price: must be a non-negative number' });
    }
    if (isNaN(security_fee) || security_fee < 0) {
        return res.status(400).json({ success: false, message: 'Invalid security_fee: must be a non-negative number' });
    }
    if (isNaN(cancellation_fee) || cancellation_fee < 0) {
        return res.status(400).json({ success: false, message: 'Invalid cancellation_fee: must be a non-negative number' });
    }
    if (typeof is_negotiable !== 'boolean') {
        return res.status(400).json({ success: false, message: 'Invalid is_negotiable: must be a boolean' });
    }

    try {
        const templatePath = path.resolve(__dirname, '..', 'templates', 'contract-template.docx');

        // Verify template file exists
        await fs.access(templatePath, fs.constants.R_OK);

        const content = await fs.readFile(templatePath, 'binary');
        const zip = new PizZip(content);
        const doc = new Docxtemplater(zip, {
            paragraphLoop: true,
            linebreaks: true,
            errorLogging: true // Enable detailed error logging
        });

        doc.setData({
            provider_name,
            consumer_name,
            product_name,
            product_description,
            condition,
            category,
            start_date,
            end_date,
            rental_days,
            final_price,
            security_fee,
            cancellation_fee,
            currency,
            is_negotiable: is_negotiable ? 'Yes' : 'No', // Convert boolean to string for template
            custom_requirements,
            jurisdiction,
            decided_terms,
            generation_date
        });

        // Render the document
        try {
            doc.render();
        } catch (renderError) {
            console.error('Template rendering error:', renderError);
            throw new Error(`Failed to render template: ${renderError.message}`);
        }

        const buffer = doc.getZip().generate({ type: 'nodebuffer' });
        const tempPath = path.resolve(__dirname, `temp-contract-${Date.now()}.docx`);

        try {
            await fs.writeFile(tempPath, buffer);

            const uploadResult = await cloudinary.uploader.upload(tempPath, {
                resource_type: 'raw',
                folder: 'contracts',
                public_id: `contract-${consumer_name.replace(/\s+/g, '-')}-${Date.now()}`
            });

            const newContractId = await generateContractID();
            const contractRecord = new Contract({
                ContractID: newContractId,
                BookingID: booking_id,
                Terms: 'Generated and ready to sign',
                DocumentURL: uploadResult.secure_url,
                Timestamp: new Date().toISOString(),
                Status: 'Pending',
                DisputeNature: '',
                Price: final_price,
                ResolutionAction: '',
                ConsumerApproved: false,
                ProviderApproved: false
            });

            await contractRecord.save();

            res.json({ success: true, contractUrl: uploadResult.secure_url, contractId: newContractId });
        } finally {
            // Ensure temporary file is deleted
            try {
                await fs.unlink(tempPath);
            } catch (unlinkError) {
                console.warn('Failed to delete temporary file:', unlinkError);
            }
        }
    } catch (error) {
        console.error('Error in generate-contract:', error);
        if (error.message.includes('Failed to render template')) {
            res.status(500).json({
                success: false,
                message: 'Failed to generate contract due to template error. Please check the template format.'
            });
        } else if (error.code === 'ENOENT') {
            res.status(500).json({
                success: false,
                message: 'Template file not found. Please ensure contract-template.docx exists in the templates directory.'
            });
        } else {
            res.status(500).json({
                success: false,
                message: `Failed to generate contract: ${error.message}`
            });
        }
    }
});

router.post('/upload-signed', upload.single('signedFile'), async (req, res) => {
    const { contractId, role } = req.body;

    if (!req.file || !contractId || !['consumer', 'provider'].includes(role)) {
        return res.status(400).json({ success: false, message: 'Missing file, contractId, or valid role' });
    }

    try {
        const uploadResult = await cloudinary.uploader.upload(req.file.path, {
            resource_type: 'raw',
            folder: 'signed-contracts',
            public_id: `signed-${role}-${req.file.originalname.replace(/\s+/g, '-')}-${Date.now()}`
        });

        try {
            await fs.unlink(req.file.path);
        } catch (unlinkError) {
            console.warn('Failed to delete uploaded file:', unlinkError);
        }

        const contract = await Contract.findOne({ ContractID: contractId });

        if (!contract) {
            return res.status(404).json({ success: false, message: 'Contract not found' });
        }

        const updates = {
            [`${role.charAt(0).toUpperCase() + role.slice(1)}Approved`]: true,
            [`${role}SignedUrl`]: uploadResult.secure_url
        };

        if ((role === 'consumer' && contract.ProviderApproved) || (role === 'provider' && contract.ConsumerApproved)) {
            updates.Status = 'Ongoing';
            updates.Terms = 'Both parties have signed the contract';
        } else {
            updates.Status = 'Partially Signed';
            updates.Terms = 'Waiting for the other party to sign';
        }

        await Contract.updateOne({ ContractID: contractId }, { $set: updates });

        // Assuming contract has providerId and consumerId fields
        const userId = role === 'provider' ? contract.providerId : contract.consumerId;

        const notification = new Notification({
            NotificationID: `N${Date.now()}`,
            UserID: userId || contract.BookingID, // Fallback to BookingID if userId not available
            Message: `The contract ${contractId} has been signed by the ${role}.`,
            Type: 'Contract'
        });

        await notification.save();

        res.json({ success: true, signedFileUrl: uploadResult.secure_url });
    } catch (error) {
        console.error('Error in upload-signed:', error);
        res.status(500).json({ success: false, message: `Failed to upload signed contract: ${error.message}` });
    }
});


// GET /contracts/:contractId/status
router.get('/contracts/:contractId/status', async (req, res) => {
  const { contractId } = req.params;
  console.log('Fetching contract status for ID:', contractId);

  try {
    const contract = await Contract.findOne({ ContractID: contractId });
    console.log('Fetched contract:', contract);
    if (!contract) {
      return res.status(404).json({
        success: false,
        message: 'Contract not found'
      });
    }

    // Optional: populate Booking for date logic if needed
    const booking = await Booking.findById(contract.BookingID);

    return res.status(200).json({
      success: true,
      contractId: contract.ContractID,
      status: contract.Status,
      consumerSigned: contract.ConsumerApproved,
      providerSigned: contract.ProviderApproved,
      documentUrl: contract.DocumentURL,
      consumerSignedUrl: contract.ConsumerSignedUrl,
      providerSignedUrl: contract.ProviderSignedUrl,
      finalMergedUrl: contract.FinalMergedUrl,
      dateCreated: contract.createdAt || contract.Timestamp,
      lastUpdated: contract.updatedAt || contract.Timestamp,
      bookingDates: {
        startDate: booking?.StartDate,
        endDate: booking?.EndDate,
        price: booking?.Price
      }
    });
  } catch (error) {
    console.error('Error fetching contract status:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

module.exports = router;