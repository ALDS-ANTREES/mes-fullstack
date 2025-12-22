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

          let imageUrl = "";
          
          // 불량인 경우 이미지 업로드
          if (result.defective && result.image_path) {
            try {
              // 원본 이미지 경로
              const originalImagePath = path.resolve(detectorPath, result.image_path);
              
              // 주석 이미지 경로 (불량인 경우 result 폴더에 저장됨)
              const baseName = path.basename(result.image_path, '.jpg');
              const annotatedImagePath = path.resolve(detectorPath, `result/diff_bbox_${baseName}.png`);
              
              // 주석 이미지가 있으면 그것을, 없으면 원본을 업로드
              const imageToUpload = fs.existsSync(annotatedImagePath) 
                ? annotatedImagePath 
                : originalImagePath;
              
              if (fs.existsSync(imageToUpload)) {
                const uploadKey = `defects/${Date.now()}_${path.basename(imageToUpload)}`;
                try {
                  const fileStream = fs.createReadStream(imageToUpload);
                  const uploadParams = {
                    Bucket: process.env.S3_BUCKET_NAME,
                    Key: uploadKey,
                    Body: fileStream,
                    ContentType: imageToUpload.endsWith('.png') ? 'image/png' : 'image/jpeg',
                  };
                  const command = new PutObjectCommand(uploadParams);
                  await s3.send(command);
                  imageUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION || 'ap-northeast-2'}.amazonaws.com/${uploadKey}`;
                  console.log("Image uploaded to S3 successfully:", imageUrl);
                } catch (uploadError) {
                  console.error("S3 upload failed:", uploadError.message);
                  console.error("Upload error details:", {
                    bucket: process.env.S3_BUCKET_NAME,
                    key: uploadKey,
                    error: uploadError.name,
                    code: uploadError.$metadata?.httpStatusCode,
                    message: uploadError.message,
                  });
                }
              } else {
                console.error("Image file not found:", imageToUpload);
                console.error("Tried paths:", {
                  original: originalImagePath,
                  annotated: annotatedImagePath,
                  originalExists: fs.existsSync(originalImagePath),
                  annotatedExists: fs.existsSync(annotatedImagePath),
                });
              }
            } catch (imageError) {
              console.error("Error processing image upload:", imageError.message);
            }
          }

          // Save to database
          if (db) {
            try {
              await db.collection("defects").insertOne({
                device_id: result.device_id,
                value: result.value,
                defective: result.defective,
                image: imageUrl,
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
