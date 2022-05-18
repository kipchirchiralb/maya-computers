const express = require("express");
const mysql = require("mysql");
const bcrypt = require("bcrypt");
const session = require("express-session");
const path = require('path')
const app = express();

const tryMpesa = require('./daraja-implementation.js')

const PORT = process.env.PORT || 3000;
const connection = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "maya",
});

require('./sqltables')
// process.env.NEW_ENV_VAR= 'new env var'

// console.log(process.env.NEW_ENV_VAR)
// const env = require('./sqltables')
// console.log(env.truth)
// console.log(env.lie)

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



let user = []

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
let cart

let cartItemId = 0
app.get("/", (req, res)=> {
  connection.query(
    "SELECT * FROM products ORDER BY price DESC",
    (error,products)=>{
        if(res.locals.isLoggedIn){
          connection.query(
            `SELECT * FROM cart WHERE userId =${req.session.userId}`,
            (error,cartData)=>{
              res.render("index.ejs", {products: products, cart: cartData});
            }
          )
        }else{
          res.render("index.ejs", {products: products, cart: cart});
        }
      }
  )
});
app.get('/signin', (req,res)=>{
  if(res.locals.isLoggedIn){
    res.redirect(`/customer/account/${req.session.userId}`)
  }else{
    let userData=cleanUserData
    res.render('signin.ejs', {userData: userData, cart:cart})
  }  
})
app.get('/signup', (req,res)=>{
  if(res.locals.isLoggedIn){
    res.redirect(`/customer/account/${req.session.userId}`)
  }else{
    let userData=cleanUserData
    res.render('signup.ejs', {userData: userData, cart:cart})
  }  
})
app.post("/signin", (req, res) => {
  discount=0
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
                        user = results[0]
                        if(!userData.isAdmin){
                          connection.query(
                            `SELECT * FROM cart WHERE userId = ${req.session.userId}`,
                            (error,cartResults)=>{
                              cart = cartResults
                              res.redirect('/')
                            }
                          )
                        }else{
                          res.redirect('/admin-panel')
                        }
                    } else {
                        userData.errorMessage = "Incorrect Password";
                        userData.loginError = true;
                        res.render("signin.ejs", {userData: userData, cart:cart});
                    }
                });
            } else {
                userData.errorMessage = "This email is not registered";
                userData.loginError = true;
                res.render("signin.ejs", {userData: userData, cart:cart});
            }
        }
    );
});
app.post("/signup", (req, res) => {
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
                            res.render("signin.ejs", {userData: userData});
                        } else {
                            userData = cleanUserData;
                            userData.success = true
                            res.render('signin.ejs', {userData: userData, cart:cart})
                        }
                    }
                );
                } else {
                    userData.errorMessage = "This email is already registered.";
                    userData.signupError = true
                    res.render("signup.ejs", {userData: userData, cart:cart});
                 }
        });
    });
    } else {
        userData.errorMessage = "Password & Confirm Password  must match.";
        userData.signupError= true
        res.render("signup.ejs", {userData: userData, cart:cart});
    }
});
app.get('/adress/form',(req,res)=>{
  if(res.locals.isLoggedIn){
    connection.query(
      `SELECT * FROM addresses WHERE userId=${req.session.userId}`,
      (error,userAddress)=>{
        if(userAddress.length > 0){
          res.render('addressupdate.ejs', {userAddress: userAddress[0], cart: cart})
        }else{
          res.render('address.ejs', {cart:cart})
        }
      }
    )
    
  }else(
    res.redirect('/signin')
  )
})

app.post('/adress/form', (req,res)=>{
  connection.query(
    `INSERT INTO addresses (userId, county, town, additional) VALUES(${req.session.userId},'${req.body.county}','${req.body.town}','${req.body.additional}')`,
    (error,result)=>{
      if(!error){
        res.redirect(`/customer/account/${req.session.userId}`)
      }else{
        console.log(error)
      }
    }
  )
})
app.post('/address/update', (req,res)=>{
  connection.query(
    `UPDATE addresses SET county='${req.body.county}', town='${req.body.town}', additional='${req.body.additional}' WHERE userId=${req.session.userId}`,
    (error, result)=>{
      if(!error) {
        res.redirect(`/customer/account/${req.session.userId}`)
      }else{
        console.log(error)
      }
    }
  )
})
app.get('/contact/update', (req, res) => {
  connection.query(
    `SELECT * FROM users WHERE id=${req.session.userId}`,
    (err, user) => {
      res.render('contactupdate.ejs', {cart: cart, user: user[0]})
    }
  )
})
app.post('/contact/update', (req, res) => {
  if(res.locals.isLoggedIn){
    connection.query(
      `UPDATE users SET email= '${req.body.email}', phone=${req.body.phone} WHERE id=${req.session.userId}`,
      (error, results) => {
        if(error){
          console.log(error)
        }
        res.redirect(`/customer/account/${req.session.userId}`)
      }
    )
  }else{
    res.redirect('/signin')
  }
})

// ******** CUSTOMER ROUTEs
app.get('/customer/account/:userId', (req,res)=>{
  discount=0
  if(res.locals.isLoggedIn){
    if(req.session.userId==req.params.userId){
      connection.query(
        `SELECT * FROM users WHERE id = ${Number(req.params.userId)}`,
        (error,userD)=>{
          connection.query(
            `SELECT * FROM addresses WHERE userId = ${Number(req.params.userId)}`,
            (error,address)=>{
              user = userD
              res.render('account.ejs', {cart:cart, user: userD[0], address: address})
            }
          )

        }
      )
    }else{
      let errorMessage = "You can not access someone else's account"
      res.render("404.ejs", { errorMessage: errorMessage, cart:cart });
    } 
  }else{
    res.redirect('/signin')
  }
})

let discount=0
let couponIsValid
app.get('/customer/cart/:userId', (req,res)=>{
  if(res.locals.isLoggedIn){
    if(req.session.userId==req.params.userId){
      connection.query(
        `SELECT * FROM products`,
        (error,products)=>{
          connection.query(
            `SELECT * FROM cart WHERE userId= ${req.session.userId}`,
            (error, results)=>{
              cart= results
              // console.log(error)
              res.render('cart.ejs', {cart:results, products: products, discount: discount, couponIsValid: couponIsValid})
            }
          )
        }
      )
    }else{
      let errorMessage = "You can not access someone else's cart"
      res.render("404.ejs", { errorMessage: errorMessage, cart:cart });
    } 
  }else{
    res.redirect('/signin')
  }
})
let coupons = {
  NOAH: 300,
  ALB: 500,
  ROBIN: 200,
  ALPHA: 2000,
}
app.post('/customer/cart/:userId/coupon', (req, res)=>{
  let customerCoupon = req.body.coupon
  if(customerCoupon==='ALB'){
    discount =500
    couponIsValid = true
  }else if(customerCoupon==='ROBIN'){
    discount =200
    couponIsValid = true
  }else if(customerCoupon==='NOAH'){
    discount =1000
    couponIsValid = true
  }else{
    couponIsValid = false
    discount =10
  }
  if(couponIsValid){
    res.redirect(`/customer/cart/${req.params.userId}`)
  }else{
    res.redirect(`/customer/cart/${req.params.userId}`)
  }
})
app.post('/customer/cart/remove-one/:id', (req,res)=>{
  connection.query(
    `UPDATE cart SET quantity= quantity-1 WHERE id= ${parseInt(req.params.id)}`,
    (error,results)=>{
      res.redirect(`/customer/cart/${req.session.userId}`)
    }
  )
})
app.post('/customer/cart/add-one/:id', (req,res)=>{
  connection.query(
    `UPDATE cart SET quantity= quantity+1 WHERE id= ${parseInt(req.params.id)}`,
    (error,results)=>{
      res.redirect(`/customer/cart/${req.session.userId}`)
    }
  )
})
app.post('/customer/cart/remove-item/:id', (req,res)=>{
  connection.query(
    `DELETE FROM cart WHERE id= ${parseInt(req.params.id)}`,
    (error,results)=>{
      res.redirect(`/customer/cart/${req.session.userId}`)
    }
  )
})
app.post('/customer/cart/remove-all', (req,res)=>{
  connection.query(
    `DELETE FROM cart WHERE userId= ${req.session.userId}`,
    (error,result)=>{
      res.redirect(`/customer/cart/${req.session.userId}`)
    }
  )
})


app.get('/customer/checkout/:id/:amount', (req,res)=>{
  discount=0
  if(res.locals.isLoggedIn){
    connection.query(
      `SELECT * FROM users WHERE id= ${req.session.userId}`,
      (error, userResult)=>{
        user = userResult[0]
        connection.query(
          `SELECT * FROM addresses WHERE userId = ${req.session.userId}`,
          (error, address)=>{
            res.render('checkout.ejs', {cart: cart, user: userResult[0], amount: req.params.amount, address: address})
          }
        )
      }
    )
  }else{
    res.redirect('/signin')
  }
})

// *************MPESA INTERGRATION
app.get('/customer/payment/validate', (req,res)=>{
  res.render('paymentvalidation.ejs')
})
app.get('/customer/orders/:userId', (req,res)=>{
  if(res.locals.isLoggedIn){
    if(req.session.userId==req.params.userId){
      connection.query(
        `SELECT * FROM products`,
        (error,products)=>{
          connection.query(
            `SELECT * FROM orders WHERE userId = ${req.session.userId}`,
            (error, orders)=>{
              res.render('orders.ejs', {cart:cart, products: products,orders: orders});
            }
          )
        }
      )
    }else{
      let errorMessage = "You can not access someone else's orders"
      res.render("404.ejs", { errorMessage: errorMessage, cart:cart });
    } 
  }else{
    res.redirect('/signin')
  }
})
app.post('/customer/order/:id', (req,res)=>{
  if(res.locals.isLoggedIn){
    connection.query(
      `SELECT * FROM cart WHERE userId = ${req.session.userId} `,
      (error,uCart)=>{
        uCart.forEach(cartItem=>{
          connection.query(
              `INSERT INTO orders (productId, userId, quantity, price, paymentOption, deliveryMethod) VALUES (${cartItem.productId},${req.session.userId},${cartItem.quantity}, ${Number(req.body.amount)}, '${req.body.payment}', '${req.body.delivery}')`,
              (error, result)=>{
                if(!error){
                 console.log('success')
                }else{
                  console.log(error)
                }
              }
            )
        })
        connection.query(
          `DELETE FROM cart WHERE userId = ${req.session.userId}`,
         (err, result)=>{
            res.redirect(`/customer/orders/${req.session.userId}`)
         }
        )
      }
    )
  }else{
    res.redirect('/signin')
  }
 
})
app.get('/customer/history/:userId', (req,res)=>{
  if(res.locals.isLoggedIn){
    if(req.session.userId==req.params.userId){
      connection.query(
        `SELECT * FROM products`,
        (error,products)=>{
          res.render('history.ejs', {cart:cart, products: products})
        }
      )
    }else{
      let errorMessage = "You can not access someone else's purchase history"
      res.render("404.ejs", { errorMessage: errorMessage, cart:cart });
    } 
  }else{
    res.redirect('/signin')
  }
})
app.get('/customer/messages/:userId', (req,res)=>{
  if(res.locals.isLoggedIn){
    if(req.session.userId==req.params.userId){
      connection.query(
        `SELECT * FROM products`,
        (error,products)=>{
          res.render('messages.ejs', {cart:cart, products: products})
        }
      )
    }else{
      let errorMessage = "You can not access someone else's messages"
      res.render("404.ejs", { errorMessage: errorMessage, cart:cart });
    } 
  }else{
    res.redirect('/signin')
  }
})
app.get('/customer/reviews/:userId', (req,res)=>{
  if(res.locals.isLoggedIn){
    if(req.session.userId==req.params.userId){
      connection.query(
        `SELECT * FROM products`,
        (error,products)=>{
          res.render('reviews.ejs', {cart:cart, products: products})
        }
      )
    }else{
      let errorMessage = "You can not access someone else's reviews"
      res.render("404.ejs", { errorMessage: errorMessage, cart:cart });
    } 
  }else{
    res.redirect('/signin')
  }
})

// ********* Admin Panel & roles
app.get('/admin-panel', (req,res)=>{
  if(req.session.isAdmin){
    connection.query(
      'SELECT * FROM products',
      (error, products)=>{
        connection.query(
          'SELECT * FROM orders ORDER BY orderDate DESC',
          (error, orders)=>{
            res.render('admin-panel.ejs', {products: products, orders: orders})
          }
        )
      }
    )
  }else{
    res.redirect('/signin')
  }
})
app.get('/admin/update/product/:pId', (req,res)=>{
  connection.query(
    `SELECT * FROM products WHERE id= ${Number(req.params.pId)}`,
    (error, product)=>{
      res.render('update-product.ejs', {product: product[0]})
    }
  )
})
app.post('/admin/mark/soldout/:pId', (req,res)=>{
  if(req.session.isAdmin){
    connection.query(
      `UPDATE products SET status="SOLD-OUT", quantity = 0 WHERE id=${req.params.pId} `,
      (error, results)=>{
        res.redirect('/admin-panel')
      }
    )
  }else{
    res.redirect('/signin')
  }
})
app.post('/admin/sell/single/:pId', (req,res)=>{
  if(req.session.isAdmin){
    connection.query(
      `UPDATE products SET quantity=quantity-1 WHERE id=${req.params.pId} `,
      (error, results)=>{
        connection.query(
          `SELECT quantity FROM products WHERE id=${req.params.pId}`,
          (error, product)=>{
            if(product[0].quantity==0){
              connection.query(
                `UPDATE products SET status = "SOLD-OUT" WHERE id=${req.params.pId}`,
                (error, result)=>{
                  res.redirect('/admin-panel')
                }
              )
            }else{
              res.redirect('/admin-panel')
            }
          }
        )
      }
    )
  }else{
    res.redirect('/signin')
  }
})


app.post('/admin/mark/paid/:oId', (req,res)=>{
  connection.query(
    `UPDATE orders SET paymentStatus = "SETTLED" WHERE id = ${Number(req.params.oId)} `,
    (error,results)=>{
      res.redirect('/admin-panel')
    }
  )
})
app.post('/admin/mark/delivered/:oId', (req,res)=>{
  connection.query(
    `UPDATE orders SET orderStatus = "DELIVERED" WHERE id = ${Number(req.params.oId)} `,
    (error,results)=>{
      res.redirect('/admin-panel')
    }
  )
})
app.post('/admin/mark/ready/:oId', (req,res)=>{
  connection.query(
    `UPDATE orders SET orderStatus = "READY" WHERE id = ${Number(req.params.oId)} `,
    (error,results)=>{
      res.redirect('/admin-panel')
    }
  )
})

// ******** PRODUCTS ROUTES
// *********products/new-product - get and post
app.get('/products/new-product', (req,res)=>{
  if(req.session.isAdmin){
    res.render('new-product.ejs', {successMessage: false, cart:cart})
  }else{
    let errorMessage = "Only Administrators can acess this page"
    res.render('404.ejs', {errorMessage: errorMessage, cart:cart})
  }
})
app.post('/products/new-product',upload.array('images',6),(req,res)=>{

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
    `SELECT * FROM products WHERE name LIKE '%${req.body.searchterm}%' OR specifications LIKE '%${req.body.searchterm}%'`,
    (error, products)=>{
      if(error){
        console.log(error)
      }else{
        res.render('search.ejs', {category: req.body.searchterm ,products: products, cart:cart})
      }
    }
  )
})

// ********** SINGLE PRODUCT 
app.get('/product/:id', (req,res)=>{
  connection.query(
    `SELECT * FROM products WHERE id = ${req.params.id}`,
    (error, product)=>{
      if(product.length>0){
        res.render('product.ejs', {cart:cart, product:product[0]} )
      }else{
        let errorMessage = "product Not Found"
        res.render("404.ejs", { errorMessage: errorMessage, cart:cart });
      }
    }
  )
})

// ****************ADD PRODUCT TO CART
app.post('/add-to-cart', (req,res)=>{
  if(res.locals.isLoggedIn){
    if(cart.length>0 && cart.some(cartItem=>cartItem.productId==req.query.pId && cartItem.userId==req.session.userId)){ 
      connection.query(
        `UPDATE cart SET quantity = quantity+1 WHERE productId = ${parseInt(req.query.pId)}`,
        (error,result)=>{
          res.redirect(`${req.query.location.replace(',','/')}`)
        }
      )
    }else{
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
    }
    
  }else{
    res.redirect('/signin')
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
