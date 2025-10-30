const router = require("express").Router();

let db; // This will be set by server.js

// Endpoint to receive device data and determine defect status
router.post("/defects", async (req, res) => {
  const { device_id, value } = req.body;
  const defective = value > 100; // Defect criteria

  try {
    if (!db) {
      return res.status(500).json({ message: "Database not connected" });
    }
    await db.collection("defects").insertOne({
      device_id,
      value,
      defective,
      timestamp: new Date(),
    });

    res.status(200).json({
      message: "데이터 측정이 완료되었습니다.",
      defective,
    });
  } catch (err) {
    console.error("Error processing defect data:", err);
    res.status(500).json({ message: "Server Error" });
  }
});

// Endpoint to get the latest defect inspection data
router.get("/defects/latest", async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ message: "Database not connected" });
    }
    const latestDefects = await db
      .collection("defects")
      .find()
      .sort({ timestamp: -1 })
      .toArray();

    res.status(200).json(latestDefects);
  } catch (err) {
    console.error("Error fetching latest defects:", err);
    res.status(500).json({ message: "Server Error" });
  }
});

// Endpoint to get defect statistics
router.get("/defects/stats", async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ message: "Database not connected" });
    }
    const totalCount = await db.collection("defects").countDocuments();
    const normalCount = await db
      .collection("defects")
      .countDocuments({ defective: false });

    res.status(200).json({ totalCount, normalCount });
  } catch (err) {
    console.error("Error fetching defect stats:", err);
    res.status(500).json({ message: "Server Error" });
  }
});

// Endpoint to clear all defect data
router.post("/defects/clear", async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ message: "Database not connected" });
    }
    await db.collection("defects").deleteMany({});
    res.status(200).json({ message: "Defect data cleared successfully." });
  } catch (err) {
    console.error("Error clearing defect data:", err);
    res.status(500).json({ message: "Server Error" });
  }
});

module.exports = (injectedDb) => {
  db = injectedDb;
  return router;
};
