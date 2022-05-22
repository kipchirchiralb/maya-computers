const express = require('express');
const mysql = require('mysql');
const app = express();
const connection = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "maya",
  });