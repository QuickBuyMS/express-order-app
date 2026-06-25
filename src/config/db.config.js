// const mysql = require("mysql2/promise");
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();
// const mysql = require("mysql");
// require("dotenv").config();

const db = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  database: process.env.DB_NAME || "QuickBuy",
  port: Number(process.env.DB_PORT) || 3306,
  password: process.env.DB_PASSWORD || "",
});

db.getConnection((err) => {
  if (err) {
    console.error("Database connection failed:", err.stack);
    return;
  }
  console.log("Connected to MySQL as id", db.threadId);
});

export default db;