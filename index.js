const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const authRoutes = require('./routes/auth');

dotenv.config();

const app = express();

app.use(express.json());
app.use(cors({ origin: "*" })); 

app.get("/", (req, res) => {
    res.send("API is running...");
});

// const authRoutes = require("./routes/auth");

// auth route
app.use("/api", authRoutes);



mongoose.connect(process.env.MONGO_URI)
.then(() => console.log("MongoDB Connected"))
.catch((err) => console.error("MongoDB connection error:", err));


const PORT = process.env.PORT || 5000;
app.listen(PORT,'0.0.0.0', () => console.log(`Server running on port ${PORT}`));
