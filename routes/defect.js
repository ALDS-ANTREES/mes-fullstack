const router = require("express").Router();
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const s3 = new S3Client({
  region: "ap-northeast-2",
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
  },
});

let db; // This will be set by server.js

// Endpoint to trigger the Python defect detection script
router.post("/start-detection", async (req, res) => {
  console.log("Received request to start detection...");

  const detectorPath = path.resolve(__dirname, "../fusebox-detector");
  const pythonExecutable = path.join(detectorPath, "venv/bin/python");
  const pythonScript = path.join(detectorPath, "fusebox_detector.py");

  const pythonProcess = spawn(pythonExecutable, [pythonScript], { cwd: detectorPath });

  pythonProcess.stdout.on("data", async (data) => {
    const output = data.toString();
    // Process each JSON object from the output stream
    output.split("\n").forEach(async (line) => {
      if (line) {
        try {
          const result = JSON.parse(line);
          console.log("Python script output:", result);

          if (result.error) {
            console.error("Python script error:", result.error);
            return;
          }

          let imageUrl = "";
          // If defective, upload the image to S3
          if (result.image_path) {
            const imagePath = path.resolve(detectorPath, result.image_path);
            if (fs.existsSync(imagePath)) {
              const fileStream = fs.createReadStream(imagePath);
              const uploadParams = {
                Bucket: process.env.S3_BUCKET_NAME,
                Key: `defects/${Date.now()}_${path.basename(imagePath)}`,
                Body: fileStream,
              };
              const command = new PutObjectCommand(uploadParams);
              await s3.send(command);
              imageUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${uploadParams.Key}`;
            }
          }

          // Save to database
          if (db) {
            await db.collection("defects").insertOne({
              device_id: result.device_id,
              value: result.value,
              defective: result.defective,
              image: imageUrl,
              details: result.details,
              timestamp: new Date(),
            });
            console.log("Saved defect data to DB");
          }
        } catch (e) {
          // This will catch non-JSON lines like "처리 시작..."
          console.log("Non-JSON output from script:", line);
        }
      }
    });
  });

  pythonProcess.stderr.on("data", (data) => {
    console.error(`Python script stderr: ${data}`);
  });

  pythonProcess.on("close", (code) => {
    console.log(`Python script exited with code ${code}`);
  });

  res.status(202).json({ message: "Detection process started." });
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
