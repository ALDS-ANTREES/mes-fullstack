require("dotenv").config();

const express = require("express");
const path = require("path");
const cors = require("cors");
const axios = require("axios");

const session = require("express-session");
const passport = require("passport");
const MongoStore = require("connect-mongo");

const { connectDB } = require("./database");

const app = express();
const dist = path.resolve(__dirname, "vite-project/dist");

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 60 * 60 * 1000 },
    store: MongoStore.create({
      mongoUrl: process.env.DB_URL,
      dbName: "session",
    }),
  })
);

app.use(passport.initialize());
app.use(passport.session());

(async () => {
  try {
    const client = await connectDB();
    const db = client.db(process.env.DB_NAME);
    app.locals.db = db;
    console.log("DB 연결 성공");

    const { initPassport } = require("./passport");
    initPassport(db);

    app.use(express.static(dist));

    app.use("/api/member", require("./routes/member.js"));
    app.use("/api", require("./routes/defect.js")(db)); // Mount defect router and inject db

    // 라즈베리파이 API 프록시 (CORS 문제 해결)
    const raspberryApiBaseUrl = process.env.RASPBERRY_PI_API_URL || 
      "https://unbetraying-thermosensitive-eve.ngrok-free.dev";
    
    // 시작 명령 프록시
    app.post("/api/raspberry/start", async (req, res) => {
      try {
        console.log("라즈베리파이 시작 명령 프록시 요청");
        const response = await axios.post(
          `${raspberryApiBaseUrl}/start`,
          {},
          {
            headers: {
              "Content-Type": "application/json",
              "ngrok-skip-browser-warning": "true"
            },
            timeout: 10000
          }
        );
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.json(response.data);
      } catch (error) {
        console.error("라즈베리파이 시작 명령 실패:", error.message);
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.status(error.response?.status || 500).json({
          error: "라즈베리파이 서버 요청 실패",
          message: error.message
        });
      }
    });

    // 종료 명령 프록시
    app.post("/api/raspberry/stop", async (req, res) => {
      try {
        console.log("라즈베리파이 종료 명령 프록시 요청");
        const response = await axios.post(
          `${raspberryApiBaseUrl}/stop`,
          {},
          {
            headers: {
              "Content-Type": "application/json",
              "ngrok-skip-browser-warning": "true"
            },
            timeout: 10000
          }
        );
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.json(response.data);
      } catch (error) {
        console.error("라즈베리파이 종료 명령 실패:", error.message);
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.status(error.response?.status || 500).json({
          error: "라즈베리파이 서버 요청 실패",
          message: error.message
        });
      }
    });

    // 라즈베리파이 스트림 프록시 (CORS 문제 해결)
    const raspberryStreamBaseUrl = process.env.RASPBERRY_PI_STREAM_URL || 
      "https://unbetraying-thermosensitive-eve.ngrok-free.dev";
    const raspberryStreamUrl = `${raspberryStreamBaseUrl}/video_feed`;
    
    // 스트림 프록시 라우트를 /api보다 먼저 정의 (라우팅 순서 중요!)
    // HEAD 요청 처리 (프론트엔드에서 접근 가능 여부 확인용)
    app.head("/stream/video_feed", (req, res) => {
      console.log("📡 HEAD 요청 받음: /stream/video_feed");
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type");
      res.setHeader("Content-Type", "multipart/x-mixed-replace; boundary=frame");
      res.status(200).end();
    });
    
    // 모든 HTTP 메서드에 대한 로깅 (디버깅용)
    app.use("/stream/video_feed", (req, res, next) => {
      if (req.method !== "HEAD" && req.method !== "OPTIONS") {
        console.log(`🔍 ${req.method} 요청 감지: /stream/video_feed`);
      }
      next();
    });
    
    // GET 요청 처리 (실제 스트림)
    app.get("/stream/video_feed", async (req, res) => {
      console.log("📹 스트림 프록시 GET 요청 받음");
      console.log("📍 대상 URL:", raspberryStreamUrl);
      console.log("📍 요청 헤더:", JSON.stringify(req.headers, null, 2));
      
      try {
        // CORS 헤더 설정 (먼저 설정해야 함)
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type");
        
        console.log("🔄 라즈베리파이 서버에 요청 전송 중...");
        console.log("📍 요청 URL:", raspberryStreamUrl);
        
        // 라즈베리파이 스트림을 프록시로 전달
        // ngrok 브라우저 경고 페이지 우회를 위한 헤더 추가
        const response = await axios({
          method: "GET",
          url: raspberryStreamUrl,
          responseType: "stream",
          headers: {
            "Accept": "multipart/x-mixed-replace, image/*, video/*, */*",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
            "Accept-Language": "en-US,en;q=0.9",
            "Accept-Encoding": "gzip, deflate, br",
            "Connection": "keep-alive",
            "Upgrade-Insecure-Requests": "1",
            "Sec-Fetch-Dest": "document",
            "Sec-Fetch-Mode": "navigate",
            "Sec-Fetch-Site": "none",
            "Cache-Control": "max-age=0",
            // ngrok 브라우저 경고 우회 헤더
            "ngrok-skip-browser-warning": "true"
          },
          timeout: 30000, // 30초 타임아웃 (초기 연결용)
          maxRedirects: 5,
          validateStatus: function (status) {
            // 2xx와 3xx 모두 허용 (리다이렉트 가능)
            return status >= 200 && status < 400;
          }
        });
        
        console.log("✅ 라즈베리파이 서버 응답 받음");
        console.log("📊 응답 상태:", response.status);
        console.log("📋 Content-Type:", response.headers["content-type"]);
        
        // ngrok 에러 코드 확인
        const ngrokErrorCode = response.headers["ngrok-error-code"];
        if (ngrokErrorCode) {
          console.error("❌ ngrok 에러 코드:", ngrokErrorCode);
          if (ngrokErrorCode === "ERR_NGROK_725") {
            console.error("❌ ngrok 대역폭 제한 초과!");
            if (!res.headersSent) {
              res.setHeader("Access-Control-Allow-Origin", "*");
              res.status(502).json({ 
                error: "ngrok 대역폭 제한 초과",
                code: "ERR_NGROK_725",
                message: "ngrok 무료 플랜의 대역폭 제한을 초과했습니다. ngrok 플랜을 업그레이드하거나 대역폭 제한이 해제될 때까지 기다려주세요."
              });
            }
            return;
          }
        }
        
        // Content-Type이 text/html이면 ngrok 브라우저 경고 페이지일 가능성
        const contentType = response.headers["content-type"];
        if (contentType && contentType.includes("text/html")) {
          console.warn("⚠️ HTML 응답 받음 - ngrok 브라우저 경고 페이지일 수 있음");
          console.warn("⚠️ 스트림이 아닌 HTML 페이지를 받았습니다");
          
          // HTML 응답의 일부를 읽어서 확인
          let htmlChunk = '';
          response.data.once('data', (chunk) => {
            htmlChunk = chunk.toString().substring(0, 500);
            console.warn("📄 응답 내용 (처음 500자):", htmlChunk);
            
            if (htmlChunk.includes('ngrok') || htmlChunk.includes('Visit Site')) {
              console.error("❌ ngrok 브라우저 경고 페이지를 받았습니다");
              if (!res.headersSent) {
                res.setHeader("Access-Control-Allow-Origin", "*");
                res.status(502).json({ 
                  error: "ngrok 브라우저 경고 페이지를 받았습니다",
                  message: "라즈베리파이 서버에 직접 접근할 수 없습니다. ngrok 설정을 확인하세요."
                });
              }
              return;
            }
          });
        }
        
        // Content-Type 헤더 전달
        if (contentType && !contentType.includes("text/html")) {
          res.setHeader("Content-Type", contentType);
        } else {
          res.setHeader("Content-Type", "multipart/x-mixed-replace; boundary=frame");
        }
        
        console.log("📤 스트림을 클라이언트로 전달 시작");
        
        // 스트림을 클라이언트로 전달
        response.data.pipe(res);
        
        // 스트림 데이터 전송 확인
        let bytesTransferred = 0;
        response.data.on("data", (chunk) => {
          bytesTransferred += chunk.length;
          if (bytesTransferred < 1000) {
            console.log("📦 데이터 전송 중:", bytesTransferred, "bytes");
          }
        });
        
        // 에러 처리
        response.data.on("error", (err) => {
          console.error("❌ 스트림 전달 에러:", err.message);
          if (!res.headersSent) {
            res.status(500).json({ error: "스트림 전달 중 에러 발생" });
          }
        });
        
        // 연결 종료 처리
        req.on("close", () => {
          console.log("🔌 클라이언트 연결 종료");
          if (response.data && typeof response.data.destroy === "function") {
            response.data.destroy();
          }
        });
        
        req.on("aborted", () => {
          console.log("⚠️ 클라이언트 요청 중단");
        });
      } catch (error) {
        console.error("❌ 스트림 프록시 에러 발생");
        console.error("에러 메시지:", error.message);
        console.error("에러 코드:", error.code);
        console.error("에러 응답 상태:", error.response?.status);
        console.error("에러 응답 상태 텍스트:", error.response?.statusText);
        
        // ngrok 에러 코드 확인
        const ngrokErrorCode = error.response?.headers?.["ngrok-error-code"];
        if (ngrokErrorCode) {
          console.error("❌ ngrok 에러 코드:", ngrokErrorCode);
          if (ngrokErrorCode === "ERR_NGROK_725") {
            console.error("❌ ngrok 대역폭 제한 초과!");
          }
        }
        
        // 응답 헤더를 안전하게 로깅 (circular structure 방지)
        if (error.response?.headers) {
          const safeHeaders = {};
          for (const [key, value] of Object.entries(error.response.headers)) {
            if (typeof value !== 'object' || value === null) {
              safeHeaders[key] = value;
            } else {
              safeHeaders[key] = '[Object]';
            }
          }
          console.error("에러 응답 헤더:", safeHeaders);
        }
        
        if (error.response?.data) {
          try {
            const dataStr = typeof error.response.data === 'string' 
              ? error.response.data.substring(0, 500)
              : String(error.response.data).substring(0, 500);
            console.error("에러 응답 데이터 (처음 500자):", dataStr);
          } catch (e) {
            console.error("에러 응답 데이터를 읽을 수 없음");
          }
        }
        console.error("에러 스택:", error.stack);
        
        if (!res.headersSent) {
          res.setHeader("Access-Control-Allow-Origin", "*");
          res.setHeader("Content-Type", "application/json");
          
          // ngrok 대역폭 제한 에러 처리
          const ngrokErrorCode = error.response?.headers?.["ngrok-error-code"];
          if (ngrokErrorCode === "ERR_NGROK_725") {
            res.status(502).json({ 
              error: "ngrok 대역폭 제한 초과",
              code: "ERR_NGROK_725",
              message: "ngrok 무료 플랜의 대역폭 제한을 초과했습니다. ngrok 플랜을 업그레이드하거나 대역폭 제한이 해제될 때까지 기다려주세요.",
              url: raspberryStreamUrl
            });
          } else {
            res.status(500).json({ 
              error: "스트림을 가져올 수 없습니다", 
              message: error.message,
              code: error.code,
              status: error.response?.status,
              statusText: error.response?.statusText,
              ngrokErrorCode: ngrokErrorCode,
              url: raspberryStreamUrl
            });
          }
        } else {
          console.error("⚠️ 응답 헤더가 이미 전송됨 - 에러 응답 불가");
        }
      }
    });
    
    // OPTIONS 요청 처리 (CORS preflight)
    app.options("/stream/video_feed", (req, res) => {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type");
      res.sendStatus(200);
    });

    app.get(/.*/, (req, res) => {
      res.sendFile(path.join(__dirname, "vite-project/dist/index.html"));
    });

    app.listen(process.env.PORT, () =>
      console.log(` http://localhost:${process.env.PORT}에서 서버 실행중`)
    );
  } catch (err) {
    console.error("서버 시작 실패: ", err);
    process.exit(1);
  }
})();
