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
    'CREATE TABLE if not exists products(id INT NOT NULL AUTO_INCREMENT, category VARCHAR(20), images TEXT, price INT(10), rating FLOAT, reviews INT DEFAULT 0, quantity INT DEFAULT 1, datePosted DATETIME DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (id))', 
    (error,result)=>{
        if(error){
            console.log(error)
        }
    }
)

connection.query(
    'CREATE TABLE if not exists cart(id INT NOT NULL AUTO_INCREMENT, userId INT , productId INT, PRIMARY KEY (id), FOREIGN KEY (userId) REFERENCES users(id), FOREIGN KEY (productId) REFERENCES products(id))',
    (error,result)=>{
        if(error){
            console.log(error)
        }
    }
)

