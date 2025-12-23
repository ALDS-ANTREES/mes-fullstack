const router = require("express").Router();
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const s3 = new S3Client({
  region: process.env.AWS_REGION || "ap-northeast-2",
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY || process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY,
  },
});

let db; // This will be set by server.js

// Endpoint to trigger the Python defect detection script
router.post("/start-detection", async (req, res) => {
  console.log("Received request to start detection...");

  try {
    const detectorPath = path.resolve(__dirname, "../fusebox-detector");
    const pythonExecutable = path.join(detectorPath, "venv/bin/python");
    const pythonScript = path.join(detectorPath, "fusebox_detector.py");

    // Python 실행 파일 존재 확인
    if (!fs.existsSync(pythonExecutable)) {
      console.error(`Python executable not found: ${pythonExecutable}`);
      return res.status(500).json({ 
        error: "Python executable not found",
        path: pythonExecutable 
      });
    }

    // Python 스크립트 파일 존재 확인
    if (!fs.existsSync(pythonScript)) {
      console.error(`Python script not found: ${pythonScript}`);
      return res.status(500).json({ 
        error: "Python script not found",
        path: pythonScript 
      });
    }

    // 환경 변수 확인
    if (!process.env.S3_BUCKET_NAME) {
      console.error("S3_BUCKET_NAME environment variable is not set");
      return res.status(500).json({ 
        error: "S3_BUCKET_NAME environment variable is not set" 
      });
    }

    const pythonProcess = spawn(pythonExecutable, [pythonScript], { 
      cwd: detectorPath 
    });

    pythonProcess.stdout.on("data", async (data) => {
      const output = data.toString();
      const lines = output.split("\n").filter(line => line.trim());
      
      // forEach 대신 for...of 사용 (비동기 처리 개선)
      for (const line of lines) {
        try {
          const result = JSON.parse(line);
          console.log("Python script output:", result);

          if (result.error) {
            console.error("Python script error:", result.error);
            continue;
          }

          // Save to database (이미지 없이)
          if (db) {
            try {
              await db.collection("defects").insertOne({
                device_id: result.device_id,
                value: result.value,
                defective: result.defective,
                details: result.details,
                timestamp: new Date(),
              });
              console.log("Saved defect data to DB:", result.device_id);
            } catch (dbError) {
              console.error("DB save failed:", dbError.message);
              console.error("Failed data:", {
                device_id: result.device_id,
                value: result.value,
                defective: result.defective,
              });
            }
          } else {
            console.error("Database connection not available");
          }
        } catch (parseError) {
          // JSON이 아닌 일반 메시지 (예: "처리 시작...")
          if (line.trim() && !line.includes("{")) {
            console.log("Non-JSON output from script:", line);
          }
        }
      }
    });

    pythonProcess.stderr.on("data", (data) => {
      const errorMessage = data.toString();
      console.error(`Python script stderr: ${errorMessage}`);
    });

    pythonProcess.on("error", (error) => {
      console.error("Failed to start Python process:", error.message);
      console.error("Error details:", {
        executable: pythonExecutable,
        script: pythonScript,
        error: error.name,
      });
    });

    pythonProcess.on("close", (code) => {
      if (code === 0) {
        console.log("Python script completed successfully");
      } else {
        console.error(`Python script exited with error code: ${code}`);
      }
    });

    res.status(202).json({ message: "Detection process started." });
  } catch (error) {
    console.error("Error in start-detection endpoint:", error.message);
    console.error("Error stack:", error.stack);
    res.status(500).json({ 
      error: "Internal server error",
      message: error.message 
    });
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

// Endpoint to receive defect data from Raspberry Pi
router.post("/defects", async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ message: "Database not connected" });
    }

    const { device_id, value, defective, image, details } = req.body;

    // 필수 필드 검증
    if (!device_id || defective === undefined) {
      return res.status(400).json({ 
        message: "Missing required fields: device_id and defective are required" 
      });
    }

    // 데이터베이스에 저장 (이미지 없이)
    const defectData = {
      device_id,
      value: value || null,
      defective: Boolean(defective),
      details: details || null,
      timestamp: new Date(),
    };

    await db.collection("defects").insertOne(defectData);
    console.log("Defect data saved to DB:", device_id, "Defective:", defective);

    res.status(200).json({ 
      message: "Defect data saved successfully",
      device_id,
      defective 
    });
  } catch (err) {
    console.error("Error saving defect data:", err);
    res.status(500).json({ 
      message: "Server Error",
      error: err.message 
    });
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
