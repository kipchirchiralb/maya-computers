const express = require("express");
const mysql = require("mysql");
const bcrypt = require("bcrypt");
const session = require("express-session");
const app = express();



const PORT = process.env.PORT || 3000;
const connection = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "maya",
});

require('./sqltables')

app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(express.urlencoded({ extended: false }));

app.use(
  session({
    secret: "keyboard cat",
    resave: false,
    saveUninitialized: false,
  })
);


app.use((req, res, next) => {
  if (req.session.userId === undefined) {
    res.locals.isLoggedIn = false;
  } else {
    res.locals.isLoggedIn = true;
    res.locals.userId = req.session.userId;
    res.locals.profileImg = req.session.profileImage;
    res.locals.username = req.session.username.split(" ")[0];
  }
  next();
});

app.get("/", (req, res) => {
  res.render("index.ejs");
});

// ***********getReg
app.get('/reg', (req,res)=>{
    let userData = { 
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        confirmPassword: '',
        phone: 0,
        errorMessage: '',
        signupError: false,
        loginError: false,
        success: false,
        isAdmin: false
    }
    res.render('reg.ejs', {userData})
})

// ********* postLogin
app.post("/reg/login", (req, res) => {
    let userData = { 
        email: req.body.email,
        password: req.body.password,
        errorMessage: '',
        loginError: false,
        success: false,
        isAdmin: false
    }
    if(userData.email==='maya@mayacomputers.co.ke'){
        userData.isAdmin=true;
    }
    connection.query(
        "SELECT * FROM  users WHERE  email = ?",
        [userData.email],
        (error, results) => {
            if (results.length > 0) {
                bcrypt.compare(userData.password, results[0].password, (err, isEqual) => {
                    if (isEqual) {
                        req.session.userId = results[0].id;
                        req.session.username = results[0].firstName;
                        req.session.profileImg = results[0].profileImg;
                        res.redirect("/");
                    } else {
                        userData.errorMessage = "Email and password do not match";
                        userData.loginError = true
                        res.render("reg.ejs", {userData});
                    }
                });
            } else {
                userData.errorMessage = "Email not registered";
                userData.loginError = true;
                res.render("reg.ejs", {userData:userData});
            }
        }
    );
});

// ********* postSignup
app.post("/reg/signup", (req, res) => {
  let userData = { 
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      email: req.body.email,
      password: req.body.password,
      confirmPassword: req.body.confirmPassword,
      phone: req.body.phone,
      errorMessage: '',
      signupError: false,
      success: false,
      isAdmin: false
  }
  if(userData.password === userData.confirmPassword) {
    bcrypt.hash(userData.password, 5, (error, hash) => {
      connection.query(
          "SELECT email FROM users WHERE email = ?",
          [userData.email],
          (error, results) => {
            if (results.length === 0) {
                connection.query(
                    "INSERT INTO users (firstName,lastName,email, password,phone) VALUES (?,?,?,?,?)",
                    [userData.firstName, userData.lastName, userData.email, hash, userData.phone],
                    (error, results) => {
                        if (error) {
                            console.log(error);
                            userData.errorMessage ="Problems encountered when saving your data, Please contact admin";
                            userData.signupError = true
                            res.render("reg.ejs", {userData: userData});
                        } else {
                            userData.success = true
                            res.render('reg.ejs', {userData: userData})
                        }
                    }
                );
                } else {
                    userData.errorMessage = "Email already registered.";
                    userData.signupError = true
                    res.render("reg.ejs", {userData: userData});
                 }
        });
    });
    } else {
        userData.errorMessage = "Password & Confirm Password  must match.";
        userData.signupError= true
        res.render("reg.ejs", {userData: userData});
    }
});


app.get("/about", (req, res) => {
    res.render("about-us.ejs");
  });

app.get("/logout", (req, res) => {
  req.session.destroy((error) => {
    res.redirect("/");
  });
});

app.all("*", (req, res) => {
  res.render("404.ejs", { error: true });
});

app.listen(PORT, () => {
  console.log(`Server running on PORT ${PORT}`);
});
