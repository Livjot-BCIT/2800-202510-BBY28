// // require("./utils.js");

// require('dotenv').config();
// const express = require('express');
// const session = require('express-session');
// const MongoStore = require('connect-mongo');
// const bcrypt = require('bcrypt');
// const saltRounds = 12;

// const port = process.env.PORT || 3000;

// const app = express();

// const Joi = require("joi");


// /* Secret information section */
// const mongodb_host = process.env.MONGODB_HOST;
// const mongodb_user = process.env.MONGODB_USER;
// const mongodb_password = process.env.MONGODB_PASSWORD;
// const mongodb_database = process.env.MONGODB_DATABASE;
// const mongodb_session_secret = process.env.MONGODB_SESSION_SECRET;

// const node_session_secret = process.env.NODE_SESSION_SECRET;

//Realized that this stuff is not needed in this file,
//but I'll keep it in here for reference

//Logging in
function login() {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
}

//Signing up
async function signup() {
    const firstName = document.getElementById("firstName").value;
    const lastName = document.getElementById("lastName").value;
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    const response = await fetch("/signup", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ firstName, lastName, email, password }),
    });

    if (response.ok) {
        alert("Signup successful!");
    } else {
        const errorMessage = await response.text();
        alert(`Signup failed: ${errorMessage}`);
    }
}