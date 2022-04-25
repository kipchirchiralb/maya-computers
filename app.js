const express = require("express");
const mysql = require("mysql");
const bcrypt = require("bcrypt");
const session = require("express-session");
const path = require('path')
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
    res.locals.username = req.session.username;
    res.locals.isAdmin = req.session.isAdmin
  }
  next();
});

// *******multer setup

const multer = require('multer')
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname,'/public/images/productImages'))
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, file.fieldname + '-' + uniqueSuffix)
  }
})
const upload = multer({ storage: storage })
// ******multer ready for use



let cleanUserData = { 
  firstName: '',
  lastName: '',
  email: '',
  loginEmail: '',
  password: '',
  loginPassword: '',
  confirmPassword: '',
  phone: '',
  errorMessage: '',
  signupError: false,
  loginError: false,
  success: false,
  isAdmin: false
}
app.get("/", (req, res)=> {
  connection.query(
    "SELECT * FROM products",
    (error,products)=>{
      console.log(products[0].category)
      res.render("index.ejs", {products: products});
    }
  )
});

// ***********getReg

app.get('/reg', (req,res)=>{
  if(res.locals.isLoggedIn){
    res.redirect("/profile")
  }else{
    let userData=cleanUserData
    res.render('reg.ejs', {userData: userData})
  }
   
})

// ********* postLogin

app.post("/reg/login", (req, res) => {
    let userData = { 
        loginEmail: req.body.email,
        loginPassword: req.body.password,
        lastName: '',
        phone: '',
        errorMessage: '',
        loginError: false,
        signupError: false,
        success: false,
        isAdmin: false
    }
    if(userData.loginEmail==='maya@mayacomputers.co.ke'){
        userData.isAdmin=true;
    }
    connection.query(
        "SELECT * FROM  users WHERE  email = ?",
        [userData.loginEmail],
        (error, results) => {
            if (results.length > 0) {
                bcrypt.compare(userData.loginPassword, results[0].password, (err, isEqual) => {
                    if (isEqual) {
                        req.session.userId = results[0].id;
                        req.session.username = results[0].firstName;
                        req.session.isAdmin = userData.isAdmin
                        // if USER isAdmin-provide more data
                        res.redirect('/')
                    } else {
                        userData.errorMessage = "Email and password do not match";
                        userData.loginError = true;
                        res.render("reg.ejs", {userData: userData});
                    }
                });
            } else {
                userData.errorMessage = "Email not registered";
                userData.loginError = true;
                res.render("reg.ejs", {userData: userData});
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
                            userData = cleanUserData;
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

// ******** profile
app.get('/profile', (req,res)=>{
  if(res.locals.isLoggedIn){
    connection.query(
      `SELECT * FROM users WHERE id = ${req.session.userId}`,
      (error, user)=>{
        res.render('profile.ejs', {user:user[0]})
      }
    ) 
  }else{
    res.redirect('/reg')
  }
})

// ******** PRODUCTS ROUTES
// *********products/new-product - get and post
app.get('/products/new-product', (req,res)=>{
  // CORECT THIS WHEN DONE TESTING- REMOVE !
  if(req.session.isAdmin){
    res.render('new-product.ejs', {successMessage: false})
  }else{
    let errorMessage = "Only Administrators can acess this page"
    res.render('404.ejs', {errorMessage: errorMessage})
  }
})
app.post('/products/new-product',upload.array('images',6),(req,res)=>{
  // CORECT THIS WHEN DONE TESTING- REMOVE !
  if(req.session.isAdmin){
    let product = {
      category: req.body.category,
      name: req.body.name,
      specifications: req.body.specifications,
      price: parseInt(req.body.price),
      quantity: parseInt(req.body.quantity),
      images: req.files.map(file=>file.filename).join(',')
    }
    // console.log(req.files.map(file=>file.mimetype.split('/')[1]))
    connection.query(
      `INSERT INTO products (category, name, images, specifications, price, quantity) VALUES ('${product.category}','${product.name}','${product.images}','${product.specifications}',${product.price},${product.quantity})`,
      (error, results)=>{
        if(error){
          console.log(error)
        }else{
          res.render('new-product.ejs', {successMessage: true,})
        }
      }
    )
  }else{
    let errorMessage = "Only Administrators can acess this page"
    res.render('404.ejs', {errorMessage: errorMessage})
  }
})



// *********products/laptops
// *********products/printers
// *********products/desktops
// *********products/accessories
// *********products/supplies


app.get("/about", (req, res) => {
    res.render("about-us.ejs");
  });

app.get("/logout", (req, res) => {
  req.session.destroy((error) => {
    res.redirect("/");
  });
});

app.all("*", (req, res) => {
  let errorMessage = "Page Not Found"
  res.render("404.ejs", { errorMessage: errorMessage });
});

app.listen(PORT, () => {
  console.log(`Server running on PORT ${PORT}`);
});
