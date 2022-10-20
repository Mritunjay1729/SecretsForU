//jshint esversion:6

require('dotenv').config()
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const findOrCreate = require("mongoose-findorcreate"); //For Google auth2.0

//Just testing with a series of encryptions/hash functions
// const encrypt = require("mongoose-encryption");
// const md5 = require("md5")
// const bcrypt = require("bcrypt");
// const rounds = 10;

const app = express();
const port = 3000;

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({
  extended: true
}));

app.use(session({
  secret: process.env.SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: {}
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/userDB", {
  useNewUrlParser: true
}).then(function() {
  console.log("Successfully connected to userDB");
});

//Create a Schema
const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  googleId: String,
  facebookId: String,
  secret: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate); //For Google auth2.0

// //Add encryption to our schema
// userSchema.plugin(encrypt, {secret: process.env.SECRET, encryptedFields: ['password']});

//Create a Model
const User = mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(user, done) {
  done(null, user);
});

//Authentication using Google
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

//Authentication using Facebook
passport.use(new FacebookStrategy({
    clientID: process.env.APP_ID,
    clientSecret: process.env.APP_SECRET,
    callbackURL: "http://localhost:3000/auth/facebook/secrets"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);
    User.findOrCreate({ facebookId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));


app.get("/", function(req, res) {
  res.render("home");
});

//Third-party authentication route
//Google
app.get("/auth/google",
  passport.authenticate('google', { scope: ['profile'] }));

//Google OAuth2.0(Third Party) redirect UJYB6wFSJE3G00nEivR5rgWp8c2xXvJ3OPWPhmuteU0IKj8nKbG3DrjiOmLwpnHGYWAVwA69zmTm
app.get("/auth/google/secrets",
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    res.redirect('/secrets');
  });


//Facebook
app.get('/auth/facebook',
  passport.authenticate('facebook', {scope: ['public_profile', 'email']}));

app.get('/auth/facebook/secrets',
  passport.authenticate('facebook', {
    successRedirect: '/secrets',
    failureRedirect: '/login'
  }));

app.get("/register", function(req, res) {
    res.render("register");
  });

app.post("/register", function(req, res) {
  User.register({username: req.body.username}, req.body.password, function(err, user) {
    if(err) {
      console.log(err);
      res.redirect("/register");
    }else{
      passport.authenticate("local")(req, res, function() {
        res.redirect("/secrets");
      });
    }
  });
});

app.get("/login", function(req, res) {
  res.render("login");
});

app.post('/login', passport.authenticate('local'), function(req, res) {
    res.redirect('/secrets');
});

app.get("/logout", function(req, res) {
  req.logout();
  res.redirect("/");
});

app.get("/secrets", function(req, res) {
  if(req.isAuthenticated()) {
    //If Authenticated, go to secrets page
    User.find({"secret": {$ne : null}}, function(err, foundUsers) {
      if(err) {
        console.log(err);
      } else {
        res.render("secrets", {usersWithSecrets : foundUsers});
      }
    });
  }else{
    //If not authenticated, redirect to login page
    res.redirect("/login");
  }
})

app.get("/submit", function(req, res) {
  if(req.isAuthenticated()) {
    res.render("submit");
  }else{
    res.redirect("/login");
  }
});

app.post("/submit", function(req, res) {
  const submittedSecret = req.body.secret;

  User.findOne({_id: req.user._id}, function(err, foundUser) {
    if(err){
      console.log(err);
    }else{
      if(foundUser){
        foundUser.secret = submittedSecret;
        foundUser.save();
        res.redirect("secrets");
      }else{
        console.log("User does not exist!");
        res.redirect("/login");
      }
    }
  })
});


//This is function meant for bcrypt - We have updated to Passport hashing, salting and authentication
// app.post("/login", function(req, res) {
//   const username = req.body.username;
//   User.findOne({email: username}, function(err, foundUser) {
//     if (err)
//       res.send(err);
//     else {
//       if (foundUser) {
//         bcrypt.compare(req.body.password, foundUser.password, function(err, ans) {
//           if (ans){
//             res.render("secrets");
//           }else
//             res.send("Password does not match the user password for " + foundUser.email);
//         });
//       } else {
//         res.send("User does not exist!");
//       }
//     }
//   });
// });


//This is function meant for bcrypt - We have updated to Passport hashing, salting and authentication
// app.post("/register", function(req, res) {
//   bcrypt.hash(req.body.password, rounds, function(err, hash) {
//     if (err)
//       console.log(err);
//     else {
//       const newUser = new User({
//         email: req.body.username,
//         password: hash
//       });
//       newUser.save(function(err) {
//         if (!err) {
//           console.log("New user " + req.body.username + " created Successfully!");
//           res.render("secrets");
//         } else {
//           console.log(err);
//           console.log("User Creation Failed!");
//         }
//       });
//     }
//   });
// });

app.listen(port, function() {
  console.log("Server running at port " + port);
});
