const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
require('dotenv').config();
const app = express();
const secretKey = process.env.SECRET_KEY;

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
        const createExpensesTable = `
        CREATE TABLE IF NOT EXISTS Categories (
            expense_id INT PRIMARY KEY AUTO_INCREMENT,
            user_id INT,
            expenseName VARCHAR(255) NOT NULL,
            category VARCHAR(200) NOT NULL,
            amount DECIMAL(10,2) NOT NULL,
            date DATE NOT NULL, 
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES Users(user_id)
        )
    `;
    pool.query(createExpensesTable, (err) => {
        if (err) {
            console.error("Error creating Categories table", err);
            return;
        }
        console.log("Expenses table created successfully");
    })
        //categories
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

//verify token
//authentication token
const verifyToken = (req, res , next)=>{
    const authHeader = req.headers['authorization'];
    if(!authHeader) return res.status(401).json({message: 'Access Denied'});
    const token = authHeader.split(' ')[1];
    if(!token) return res.status(401).json('access Denied');

    jwt.verify(token , secretKey,(err, user)=>{
        if(err) return res.status(403).json('Invalid Token');
        req.user_id = user.id;
        next();
    })
};

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
            const hashingTimes = bcrypt.genSaltSync(10);
            const hashedPassword = bcrypt.hashSync(password, hashingTimes);

            pool.query(createUser, [username, email, hashedPassword],  (err, result)=>{
                if(err) return res.status(500).json({message: "Something went wrong during creation", error: err.message});
                return res.status(201).json({message: "user created successfully", result: result});
    });
        });
    
    }catch(err){
        return res.status(500).json({message: "Something went wrong now" , error: err.message});
    }
});

//login endpoint
app.post('/endpoints/auth/login', (req, res)=>{
    try{
        const {email, password} = req.body;
        if(!email || !password){
            return res.status(400).json({message: "All fields are required"});
        }
        const userDetails = `SELECT * FROM Users    WHERE email = ?`;
        pool.query(userDetails, [email], (err, result)=>{
            if(err) return res.status(500).json({message: "Something went wrong", error: err.message});
            if(result.length === 0) return res.status(404).json({message: "User not found"});
            const isPasswordValid = bcrypt.compareSync(password, result[0].password);
            if(!isPasswordValid){
                return res.status(400).json({message: "Incorrect email or password"});
            }
           
            const userData = result[0];
           const token =  jwt.sign({
                id: userData.id,
                username: userData.username,
            },
            secretKey,
            {expiresIn: '1h'},
           
        )
         return res.status(201).json({message: "Login succesfull", userToken: token});
        });
    }catch(e){
        return res.status(500).json({message: "Internal server error " , error: err.message});
    }
});

//endpoint for adding an expense
app.post('/endpoints/expenses/addexpense',verifyToken, (req, res)=>{
try{
    const  {expenseName , category , amount , date} = req.body;
    if(!expenseName || !category ||!amount || !date){
        return res.status(400).json({message: "All fields are required"});
    }
    const createExpense = `INSERT INTO Expenses (user_id,expenseName, category, amount , date) VALUES (?,?,?,?,?)`;
    const values = [req.user_id,expenseName, category, amount, date];
    pool.query(createExpense, values, (err, result)=>{
        if(err)  return res.status(500).json({message: "Something went wrong" , error: err.message}); 
       return res.status(201).json({message: "Expense Added Successfully", data: result});
    });
}catch(e){
    return res.status(500).json({message: "Internal server error " , error: err.message}); 
}
});

//app listening port
app.listen(5000, (err)=>{
    console.log("Server running on port 5000");
});

