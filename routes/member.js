const router = require("express").Router();
const passport = require("passport");
const LocalStrategy = require("passport-local");
const bcrypt = require("bcrypt");
const { ObjectId } = require("mongodb");

let { connectDB } = require("../database.js");
let db;

connectDB()
  .then((client) => {
    console.log("DB연결성공");
    db = client.db(process.env.DB_NAME);
  })

  .catch((err) => {
    console.log(err);
  });

passport.use(
  new LocalStrategy(async (username, password, cb) => {
    let result = await db.collection("user").findOne({ username: username });
    if (!result) {
      return cb(null, false, { message: "아이디 DB에 없음" });
    }

    if (await bcrypt.compare(password, result.password)) {
      return cb(null, result);
    } else {
      return cb(null, false, { message: "비번불일치" });
    }
  })
);

passport.serializeUser((user, done) => {
  process.nextTick(() => {
    done(null, { id: user._id, username: user.username });
  });
});

passport.deserializeUser(async (user, done) => {
  let result = await db
    .collection("user")
    .findOne({ _id: new ObjectId(user.id) });

  delete result.password;

  process.nextTick(() => {
    done(null, result);
  });
});

// 회원가입 API
router.post("/sign-up", async (req, res) => {
  let hash = await bcrypt.hash(req.body.password, 10);

  try {
    if (req.body.username == "") {
      res.send("ID를 입력해주세요.");
    } else if (req.body.password == "") {
      res.send("비밀번호를 입력해주세요.");
    } else {
      await db
        .collection("user")
        .insertOne({ username: req.body.username, password: hash });
    }
    res.status(201).json({ message: "회원가입이 완료되었습니다!" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server Error" });
  }
});

// 로그인 API
router.post("/sign-in", async (req, res, next) => {
  passport.authenticate("local", (error, user, info) => {
    if (!user) {
      return res.status(401).json({ message: info?.message || "인증 실패" });
    }
    if (error) {
      console.error("Passport 에러: ", error);
      return res.status(500).json({ message: "Server Error" });
    }
    req.logIn(user, (err) => {
      if (err) {
        console.error("세션 저장 실패: ", err);
        return res.status(500).json({ message: "세션 저장 실패" });
      }

      const safeUser = {
        id: user._id,
        username: user.username,
        email: user.email,
      };
      return res
        .status(200)
        .json({ message: "로그인을 성공했습니다!", user: safeUser });
    });
  })(req, res, next);
});

// 로그인 상태 확인 API
router.get("/check-auth", (req, res) => {
  if (req.isAuthenticated()) {
    const safeUser = {
      id: req.user._id,
      username: req.user.username,
      email: req.user.email,
    };
    res.status(200).json({ isAuthenticated: true, user: safeUser });
  } else {
    res.status(200).json({ isAuthenticated: false });
  }
});

module.exports = router;
