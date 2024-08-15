const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
require('dotenv').config();
const app = express();

// middleware 
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({extended: true}));
// app.use(cors.urlencoded({extended: true}));


// create connection to database 
const pool = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});

// connect to db
pool.connect((err)=>{
    if(err) return console.log(err);
    console.log('database connected ..........', pool.threadId);
    initdatabase();
});


const initdatabase = () => {
    pool.query("CREATE DATABASE IF NOT EXISTS PLP_STUDENTS", (err) => {
        if (err) {
            console.error("Error creating database", err);
            return;
        }
        console.log("Database PLP_STUDENTS successfully created/already exists");

        pool.query("USE PLP_STUDENTS", (err)=>{
            if(err) return console.log(err);
            console.log("Using database PLP_STUDENTS");
            const createUsersTable = `
            CREATE TABLE IF NOT EXISTS Users (
                user_id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(255) NOT NULL UNIQUE,
                email VARCHAR(255) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `;
        pool.query(createUsersTable, (err) => {
            if (err) {
                console.error("Error creating Users table", err);
                return;
            }
            console.log("Users table created successfully");
        });

        const createCategoriesTable = `
            CREATE TABLE IF NOT EXISTS Categories (
                category_id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT,
                category_name VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES Users(user_id)
            )
        `;
        pool.query(createCategoriesTable, (err) => {
            if (err) {
                console.error("Error creating Categories table", err);
                return;
            }
            console.log("Categories table created successfully");
        })
        });
    });}

//api endpoint to register user
app.post("/endpoints/auth/register", (req, res)=>{
    try{
        const {username , email, password} = req.body;
        if(!username || !email || !password){
            return res.status(400).json({message: "All fields are required"});
        }
        const confirmUser = `SELECT * FROM  Users WHERE email = ?`;
        pool.query(confirmUser, [email], (err, result)=>{
            if(err) return res.status(500).json({message: "Something went wrong user fetching", error: err.message});
            if(result.length>0) return res.status(409).json({message: "Email already in use"});
            const createUser = 'INSERT INTO Users (username, email, password) VALUES (?,?,?)';

            pool.query(createUser, [username, email, password],  (err, result)=>{
                if(err) return res.status(500).json({message: "Something went wrong during creation", error: err.message});
                return res.status(201).json({message: "user created successfully", result: result});
    });
        });
    
    }catch(err){
        return res.status(500).json({message: "Something went wrong now" , error: err.message});
    }
});

//app listening port
app.listen(5000, (err)=>{
    console.log("Server running on port 5000");
});
