const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const Listing = require("./models/Listings");
const authRoutes = require('./routes/auth');
const listings = require("./routes/listings");
const profileRoutes = require("./routes/profile");
const providerTabs = require("./routes/provider_tabs");
const user = require("./routes/user");
const topProviders = require("./routes/top_providers");
const category = require("./routes/category");
const booking = require("./routes/booking");
const purchase = require("./routes/purchase")
const notification = require("./routes/notification")
const provider_tabs = require("./routes/provider_tabs")
const dashboardRoutes = require('./routes/provider_dashboard');
const favorites = require("./routes/favorites")
const contracts = require("./routes/contract")
const reviews = require("./routes/review");
const dispute = require("./routes/dispute");
const feedbacks = require("./routes/feedbacks");
const complianceSearch = require("./routes/ComplianceSearches");
const { listingCoordsCache, initializeListingCoordsCache } = require("./listingCache");

dotenv.config();

const app = express();

app.use(express.json());
app.use(cors({ origin: "*" })); 

app.get("/", (req, res) => {
    res.send("API is running...");
});

app.use("/api", authRoutes);
app.use("/listings", listings);
app.use("/profile", profileRoutes);
app.use("/profile", providerTabs);
app.use("/user", user);
app.use("/providers", topProviders);
app.use("/category", category);
app.use("/booking", booking);
app.use("/purchase", purchase);
app.use("/notifications", notification);
app.use("/dashboard", dashboardRoutes);
app.use("/favorites", favorites);
app.use("/provider", provider_tabs);
app.use("/contract", contracts);
app.use('/reviews', reviews); 
app.use('/dispute', dispute); 
app.use('/feedbacks', feedbacks);
app.use("/complianceSearch", complianceSearch);


mongoose.connect(process.env.MONGO_URI)
.then(() => {
  console.log("MongoDB Connected");
  // initializeListingCoordsCache(); 
})
.catch((err) => console.error("MongoDB connection error:", err));

const PORT = process.env.PORT || 5000;
app.listen(PORT,'0.0.0.0', () => console.log(`Server running on port ${PORT}`));