const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const bcrypt = require("bcrypt");
const { ObjectId } = require("mongodb");

function initPassport(db) {
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await db.collection("user").findOne({ username });
        if (!user) return done(null, false, { message: "아이디 DB에 없음" });

        const ok = await bcrypt.compare(password, user.password);
        if (!ok) return done(null, false, { message: "비번불일치" });

        return done(null, { _id: user._id, username: user.username });
      } catch (e) {
        return done(e);
      }
    })
  );

  passport.serializeUser((user, done) => {
    done(null, String(user._id));
  });

  passport.deserializeUser(async (id, done) => {
    try {
      const user = await db
        .collection("user")
        .findOne({ _id: new ObjectId(id) }, { projection: { password: 0 } }); // 비번은 제외
      if (!user) return done(null, false);
      done(null, user);
    } catch (e) {
      done(e);
    }
  });
}

module.exports = { initPassport };
