const express = require("express");
const router = express.Router();
const ComplianceSearch = require("../models/ComplianceSearch");
const User = require("../models/user");
const Notification = require("../models/Notification");

// Generate IDs
const generateSearchID = async () => {
  const count = await ComplianceSearch.countDocuments();
  return `CS${(count + 1).toString().padStart(3, "0")}`;
};
const generateNotificationID = async () => {
  const count = await Notification.countDocuments();
  return `N${(count + 1).toString().padStart(3, "0")}`;
};

// GET all compliance logs
router.get("/", async (req, res) => {
  try {
    const logs = await ComplianceSearch.find().sort({ date: -1 });
    res.json(logs);
  } catch (error) {
    console.error("Error fetching logs:", error);
    res.status(500).json({ error: error.message });
  }
});

// PUT / update status (by admin)
router.put("/", async (req, res) => {
  try {
    const { id, status } = req.body;
    if (!id || !status) return res.status(400).json({ error: "Missing id or status" });

    const updatedLog = await ComplianceSearch.findOneAndUpdate(
      { SearchID: id },
      { Status: status },
      { new: true }
    );

    if (!updatedLog) return res.status(404).json({ error: "Search log not found" });

    // Optionally notify user
    const user = await User.findOne({ Name: updatedLog.consumerName });
    if (user) {
      const NotificationID = await generateNotificationID();
      const message = `Your account status changed: ${status} due to search violation.`;
      const notification = new Notification({
        NotificationID,
        UserID: user._id,
        Message: message,
        Type: "Alert",
        ReadStatus: false
      });
      await notification.save();
    }

    res.json({ message: "Status updated", updatedLog });
  } catch (error) {
    console.error("Error updating status:", error);
    res.status(500).json({ error: error.message });
  }
});

// POST / log new search 
router.post("/", async (req, res) => {
  try {
    const { consumerFirebaseUID, searchQuery, consumerName } = req.body;
    if (!consumerFirebaseUID || !searchQuery) return res.status(400).json({ error: "Missing fields" });

    const user = await User.findOne({ FirebaseUID: consumerFirebaseUID });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    const SearchID = await generateSearchID();
    const now = new Date();
    const violationType = detectViolation(searchQuery);

    const log = new ComplianceSearch({
      SearchID,
      consumerFirebaseUID: user.FirebaseUID,
      consumerName,
      searchQuery,
      date: now,
      time: now.toLocaleTimeString(),
      violationType: violationType || undefined,
      Status: violationType ? "Notify Users" : undefined
    });

    await log.save();

    // If violation → notify user
    if (violationType) {
      const user = await User.findOne({ Name: consumerName });
      if (user) {
        const NotificationID = await generateNotificationID();
        const notification = new Notification({
          NotificationID,
          UserID: user._id,
          Message: `Your search "${searchQuery}" triggered a violation: ${violationType}`,
          Type: "Alert",
          ReadStatus: false
        });
        await notification.save();
        log.NotificationID = notification._id;
        await log.save();
      }
    }

    res.status(201).json({ message: "Search logged", log });
  } catch (error) {
    console.error("Error logging search:", error);
    res.status(500).json({ error: error.message });
  }
});

/// Example violation check
function detectViolation(query) {
  const restrictedWords = [
    "gun", "guns", "weapon", "drugs", "narcotics", "hack", "illegal product", 
    "forbidden", "bomb", "explosives", "pirated", "counterfeit", "gambling",
    "violence", "terrorism", "scam", "fraud", "phishing", "malware", "spyware"  
];
  const normalizedQuery = query.toLowerCase().replace(/\s+/g, ' ').trim();
  // Check if any restricted word appears in the query
  if (restrictedWords.some(word => normalizedQuery.includes(word))) {
    return "Restricted keywords";
  }
  return null;
}

module.exports = router;