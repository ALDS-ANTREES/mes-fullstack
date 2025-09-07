require("dotenv").config();

const express = require("express");
const path = require("path");

const { connectDB } = require("./database");

const app = express();
const dist = path.resolve(__dirname, "vite-project/dist");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

(async () => {
  try {
    const client = await connectDB();
    const db = client.db(process.env.DB_NAME);
    app.locals.db = db;
    console.log("DB 연결 성공");

    app.use(express.static(dist));

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
