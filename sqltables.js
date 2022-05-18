const mysql = require('mysql')
const connection = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "maya",
  });
  
connection.query(
    'CREATE TABLE if not exists users(id INT NOT NULL AUTO_INCREMENT, firstName VARCHAR(20),lastName VARCHAR(20), email VARCHAR(30),password VARCHAR(250),phone VARCHAR(20),dateRegistered DATETIME DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY(id))',
    (error, result)=>{
        if(error){
            console.log(error)
        }
        
    }
)

connection.query(
    'CREATE TABLE if not exists products(id INT NOT NULL AUTO_INCREMENT, category VARCHAR(20),name VARCHAR(150),specifications TEXT, images TEXT, price INT(10), rating INT DEFAULT 0, reviews INT DEFAULT 0, quantity INT DEFAULT 1, datePosted DATETIME DEFAULT CURRENT_TIMESTAMP,status VARCHAR(25) DEFAULT "IN-STOCK", PRIMARY KEY (id))',
    (error,result)=>{
        if(error){
            console.log(error)
        }
    }
)

connection.query(
    'CREATE TABLE if not exists cart(id INT NOT NULL AUTO_INCREMENT, userId INT, productId INT, productName VARCHAR(115),quantity INT DEFAULT 1, PRIMARY KEY (id), FOREIGN KEY (userId) REFERENCES users(id), FOREIGN KEY (productId) REFERENCES products(id))',
    (error,result)=>{
        if(error){
            console.log(error)
        }
    }
)

connection.query(
    "CREATE TABLE if not exists orders(id INT NOT NULL AUTO_INCREMENT, productId INT,userId INT, quantity INT(3),price INT(10),paymentOption VARCHAR(40),paymentStatus VARCHAR(30) DEFAULT 'PENDING',deliveryMethod VARCHAR(40),orderStatus VARCHAR(30) DEFAULT 'PROCESSING',orderDate DATETIME DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (id), FOREIGN KEY (userId) REFERENCES users(id), FOREIGN KEY (productId) REFERENCES products(id))"
)

connection.query(
    "CREATE TABLE if not exists addresses(id INT NOT NULL AUTO_INCREMENT,userId INT, county VARCHAR(50),town VARCHAR(50), additional VARCHAR(255), PRIMARY KEY (id), FOREIGN KEY (userId) REFERENCES users(id))"
)
