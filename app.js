import * as dotenv from "dotenv";
import express from "express";
import mongoose from "mongoose";
import session from "express-session";
import passport from "passport";
import passportLocalMongoose from "passport-local-mongoose";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as FacebookStrategy } from "passport-facebook";
import findOrCreate from "mongoose-findorcreate";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.set("view engine", "ejs");

app.use(
  session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false,
  })
);

app.use(passport.initialize());
app.use(passport.session());

const connectDB = async () => {
  const conn = await mongoose.connect(process.env.MONGO_URI);
  console.log(
    `MongoDB Connected on: ${conn.connection.host}:${conn.connection.port}`
  );
};

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  googleId: String,
  facebookId: String,
  secret: String,
  username: { type: String, sparse: true },
  name: { type: String, sparse: true },
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser((user, done) => {
  console.log("serialized user");
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

//auth

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      callbackURL: process.env.CLIENT_REDIRECT,
      userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
    },
    function (accessToken, refreshToken, profile, cb) {
      User.findOrCreate({ googleId: profile.id })
        .then((foundUsers) => {
          if (foundUsers) {
            // console.dir(foundUsers);
            return foundUsers;
          } else {
            const newUser = new User({
              googleId: profile.id,
            });
            console.log("created user");
            return newUser.save();
          }
        })
        .then((user) => {
          return cb(null, user);
        })
        .catch((err) => {
          return cb(err);
        });
    }
  )
);

passport.use(
  new FacebookStrategy(
    {
      clientID: process.env.CLIENT_FB_ID,
      clientSecret: process.env.CLIENT_FB_SECRET,
      callbackURL: "http://localhost:3000/auth/facebook/secrets",
    },
    function (accessToken, refreshToken, profile, cb) {
      User.findOrCreate({ facebookId: profile.id })
        .then((foundUsers) => {
          if (foundUsers) {
            return foundUsers;
          } else {
            const newUser = new User({
              facebookId: profile.id,
            });
            console.log("created user");
            return newUser.save();
          }
        })
        .then((user) => {
          return cb(null, user);
        })
        .catch((err) => {
          console.log(err);
        });
    }
  )
);

//get

app.get("/", (req, res) => {
  res.render("home");
});

app.get(
  "/auth/google/",
  passport.authenticate("google", { scope: ["profile"] })
);

app.get(
  "/auth/google/secrets",
  passport.authenticate("google", { failureRedirect: "/login" }),
  function (req, res) {
    res.redirect("/secrets");
  }
);

app.get("/auth/facebook/", passport.authenticate("facebook"));

app.get(
  "/auth/facebook/secrets",
  passport.authenticate("facebook", { failureRedirect: "/login" }),
  function (req, res) {
    res.redirect("/secrets");
  }
);

app.get("/secrets", (req, res) => {
  User.find({ secret: { $ne: null } })
    .then((foundUsers) => res.render("secrets", { usersSecrets: foundUsers }))
    .catch((err) => {
      console.log(err);
    });
});

app.get("/register", (req, res) => {
  res.render("register");
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.get("/submit", (req, res) => {
  res.render("submit");
});

app.get("/logout", (req, res) => {
  req.logout((err) => {
    if (err) {
      console.log(err);
    } else {
      res.redirect("/");
    }
  });
});

//posts
app.post("/register", (req, res) => {
  User.register(
    { username: req.body.username },
    req.body.password,
    (err, user) => {
      if (err) {
        console.log(err);
        res.redirect("/register");
      } else {
        passport.authenticate("local")(req, res, () => {
          res.redirect("/secrets");
        });
      }
    }
  );
});

app.post("/login", (req, res) => {
  const user = new User({
    username: req.body.username,
    password: req.body.password,
  });

  req.logIn(user, (err) => {
    if (err) {
      console.log(err);
    } else {
      passport.authenticate("local")(req, res, () => {
        res.redirect("/secrets");
      });
    }
  });
});

connectDB().then(
  app.listen(port, () => {
    console.log(`Server started on ${port}`);
  })
);
