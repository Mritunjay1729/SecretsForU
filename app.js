//jshint esversion:6

require('dotenv').config()
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const encrypt = require("mongoose-encryption");

const app = express();
const port = 3000;

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({
  extended: true
}));

mongoose.connect("mongodb://localhost:27017/userDB", {
  useNewUrlParser: true
}).then(function(){
  console.log("Successfully connected to userDB");
});

//Create a Schema
const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, "Can't have a user without email!"]
  },
  password: {
    type: String,
    required: [true, "Password cannot be empty!"]
  }
});

//Add encryption to our schema
const secret = "This is going to be a lot of fun!";
userSchema.plugin(encrypt, {secret: secret, encryptedFields: ['password']});

//Create a Model
const User = mongoose.model("User", userSchema);

app.get("/", function(req, res){
  res.render("home");
});

app.get("/login", function(req, res) {
  res.render("login");
});

app.post("/login", function(req, res) {
  const username = req.body.username;
  const password = req.body.password;
  User.findOne({email: username}, function(err, foundUser){
    if(err)
      res.send(err);
    else{
      if(foundUser){
        if(foundUser.password === password){
          res.render("secrets");
        }else{
          res.send("Password does not match the user password for " + foundUser.email);
        }
      }else{
        res.send("User does not exist!");
      }
    }
  });
});

app.get("/register", function(req, res) {
  res.render("register");
});

app.post("/register", function(req, res) {
    const newUser = new User({
      email: req.body.username,
      password: req.body.password
    });
    newUser.save(function(err){
      if(!err){
        console.log("New user " + req.body.username + " created Successfully!");
        res.render("secrets");
      }else{
        console.log(err);
        console.log("User Creation Failed!");
      }
    });
});

app.listen(port, function() {
  console.log("Server running at port " + port);
});
