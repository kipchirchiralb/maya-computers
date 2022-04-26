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

//session manager
app.use((req, res, next) => {
  
  if (req.session.userId === undefined) {
    res.locals.isLoggedIn = false;
  } else {
    res.locals.isLoggedIn = true;
    res.locals.userId = req.session.userId;
    res.locals.username = req.session.username;
    res.locals.isAdmin = req.session.isAdmin;
  }
  next();
});



// *******multer setup

const multer = require('multer');
const { query } = require("express");
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
let cart = []
let cartItemId = 0
app.get("/", (req, res)=> {
  connection.query(
    "SELECT * FROM products ORDER BY price DESC",
    (error,products)=>{
      connection.query(
        'SELECT * FROM cart',
        (err, result)=>{
          cart = result
          res.render("index.ejs", {products: products, cart: cart});
        }
      )
      
    }
  )
});


// ***********getReg

app.get('/reg', (req,res)=>{
  if(res.locals.isLoggedIn){
    res.redirect("/profile")
  }else{
    let userData=cleanUserData
    res.render('reg.ejs', {userData: userData, cart:cart})
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
                        res.render("reg.ejs", {userData: userData, cart:cart});
                    }
                });
            } else {
                userData.errorMessage = "Email not registered";
                userData.loginError = true;
                res.render("reg.ejs", {userData: userData, cart:cart});
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
                            res.render('reg.ejs', {userData: userData, cart:cart})
                        }
                    }
                );
                } else {
                    userData.errorMessage = "Email already registered.";
                    userData.signupError = true
                    res.render("reg.ejs", {userData: userData, cart:cart});
                 }
        });
    });
    } else {
        userData.errorMessage = "Password & Confirm Password  must match.";
        userData.signupError= true
        res.render("reg.ejs", {userData: userData, cart:cart});
    }
});

// ******** profile
app.get('/profile', (req,res)=>{
  if(res.locals.isLoggedIn){
    connection.query(
      `SELECT * FROM users WHERE id = ${req.session.userId}`,
      (error, user)=>{
        res.render('profile.ejs', {user:user[0], cart:cart})
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
    res.render('new-product.ejs', {successMessage: false, cart:cart})
  }else{
    let errorMessage = "Only Administrators can acess this page"
    res.render('404.ejs', {errorMessage: errorMessage, cart:cart})
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
          res.render('new-product.ejs', {successMessage: true, cart:cart})
        }
      }
    )
  }else{
    let errorMessage = "Only Administrators can acess this page"
    res.render('404.ejs', {errorMessage: errorMessage, cart:cart})
  }
})
// ***********PRODUCT CATEGORIES
app.get('/products', (req,res)=>{

  if(req.query.category!=='topsales'){
    connection.query(
      `SELECT * FROM products WHERE category = '${req.query.category}' `,
      (error, products)=>{
        res.render('products.ejs', {category: req.query.category, products: products, cart:cart})
      }
    )
  }else if(req.query.category==='topsales'){
    connection.query(
      `SELECT * FROM products ORDER BY price DESC `,
      (error, products)=>{
        res.render('products.ejs', {category: req.query.category, products: products, cart:cart})
      }
    )
  }else{
    let errorMessage = "Page Not Found - contact admin"
    res.render("404.ejs", { errorMessage: errorMessage, cart:cart});
  }
})

//********* SEARCH PRODUCT */
app.post('/search', (req,res)=>{

  connection.query(
    `SELECT * FROM products WHERE name LIKE %${req.body.searchterm}% OR specifications LIKE %${req.body.searchterm}%`,
    (error, products)=>{
      if(error){
        console.log(error)
      }else{
        res.render('search.ejs', {products: products, cart:cart})
      }
    }
  )
})

// ********** SINGLE PRODUCT 
app.get('/product/:id', (req,res)=>{
  connection.query(
    `SELECT * FROM products WHERE id = ${req.params.id}`,
    (error, results)=>{
      res.render('product.ejs', {cart:cart} )
    }
  )
})

// ****************ADD PRODUCT TO CART
app.post('/add-to-cart', (req,res)=>{
 
  if(res.locals.isLoggedIn){
    connection.query(
    `INSERT INTO cart(userId, productId, productName) VALUES (${req.session.userId}, ${parseInt(req.query.pId)}, '${req.query.pName}')`,
    (error,results)=>{
      if(error){
        console.log(error)
      }
      let cartItem = {
        id: cartItemId++,
        userId: req.session.userId,
        pId: parseInt(req.query.pId),
        pName: req.query.pName
      }
      cart.push(cartItem)
      // find ways to redirect user to original location / or /products
      res.redirect(`${req.query.location.replace(',','/')}`)
    })
  }else{
    res.redirect('/reg')
  }
})


app.get("/about", (req, res) => {
    res.render("about-us.ejs",  {cart:cart});
  });

app.get("/logout", (req, res) => {
  req.session.destroy((error) => {
    res.redirect("/");
  });
});

app.all("*", (req, res) => {
  let errorMessage = "Page Not Found"
  res.render("404.ejs", { errorMessage: errorMessage, cart:cart });
});

app.listen(PORT, () => {
  console.log(`Server running on PORT ${PORT}`);
});
