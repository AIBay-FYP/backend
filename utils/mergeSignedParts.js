const { PDFDocument } = require('pdf-lib');
const axios = require('axios');

async function mergeSignedParts(consumerUrl, providerUrl) {
    const consumerBytes = (await axios.get(consumerUrl, { responseType: 'arraybuffer' })).data;
    const providerBytes = (await axios.get(providerUrl, { responseType: 'arraybuffer' })).data;

    const mergedPdf = await PDFDocument.create();

    const consumerPdf = await PDFDocument.load(consumerBytes);
    const providerPdf = await PDFDocument.load(providerBytes);

    const consumerPages = await mergedPdf.copyPages(consumerPdf, consumerPdf.getPageIndices());
    consumerPages.forEach(page => mergedPdf.addPage(page));

    const providerPages = await mergedPdf.copyPages(providerPdf, providerPdf.getPageIndices());
    providerPages.forEach(page => mergedPdf.addPage(page));

    const mergedBytes = await mergedPdf.save();

    const tempMergedPath = `merged-${Date.now()}.pdf`;
    fs.writeFileSync(tempMergedPath, mergedBytes);

    const uploadResult = await cloudinary.uploader.upload(tempMergedPath, {
        resource_type: 'raw',
        folder: 'merged-contracts',
        public_id: `final-contract-${Date.now()}`
    });

    fs.unlinkSync(tempMergedPath);

    return uploadResult.secure_url;
}
