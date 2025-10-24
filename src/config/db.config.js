// const mysql = require("mysql2/promise");
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();
// const mysql = require("mysql");
// require("dotenv").config();

const db = mysql.createPool({
  host: "localhost",
  user: "root",
  database: "QuickBuy",
  port: "3306",
  password: "",
  socketPath: '/opt/lampp/var/mysql/mysql.sock' // important for XAMPP
});

db.getConnection((err) => {
  if (err) {
    console.error("Database connection failed:", err.stack);
    return;
  }
  console.log("Connected to MySQL as id", db.threadId);
});

export default db;