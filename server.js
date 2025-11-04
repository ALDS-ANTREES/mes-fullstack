require("dotenv").config();

const express = require("express");
const path = require("path");
const cors = require("cors");

const session = require("express-session");
const passport = require("passport");
const MongoStore = require("connect-mongo");

const { connectDB } = require("./database");

const app = express();
const dist = path.resolve(__dirname, "vite-project/dist");

app.use(
  cors({
    origin: "http://localhost:5173",
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
