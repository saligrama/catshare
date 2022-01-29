const { response } = require('express')
const { exec } = require("child_process");
var morgan = require('morgan')

const express = require('express')
const app = express()
app.use(express.static('public'))

// Logging
app.use(morgan('combined'))

// handle posts
app.use(require('body-parser').urlencoded({ extended: false }));

// my helpers
const auth_helper = require('./helper/auth.js'); 
const auth = require('./helper/auth.js');

// Front Page
app.get('/', (req,res) => {
  res.sendFile('/public/index.html', { root: __dirname });
})

// IDOR ENDPOINT
// let people = {
//   "test": {"age": 0, "location": "Unknown", birthday: "1/1", "ssn": "REDACTED"},
//   "miles": {"age": 20, "location": "Stanford, CA", birthday: "1/31", "ssn": "###-##-####"},
//   "matthew": {"age": 21, "location": "Stanford, CA", birthday: "11/12", "ssn": "###-##-####"},
//   "cooper": {"age": 21, "location": "Stanford, CA", birthday: "06/12", "ssn": "###-##-####"},
//   "admin": {"age": 45, "location": "UK", birthday: "12/06", "ssn": "###-##-####"}
// }
let people = {
  "test": {"age": 0, "location": "Unknown", birthday: "1/1", "ssn": "REDACTED"},
  "cooper": {"age": 21, "location": "Stanford, CA", birthday: "06/12", "ssn": "###-##-####"},
  "miles": {"age": 20, "location": "Stanford, CA", birthday: "1/31", "ssn": "###-##-####"},
  "matthew": {"age": 21, "location": "Stanford, CA", birthday: "11/12", "ssn": "###-##-####"},
  "admin": {"age": 45, "location": "UK", birthday: "12/06", "ssn": "###-##-####"}
}
function idor(_name, response) {
  _name = _name.toLowerCase()
  if (people[_name]){
    response.json(people[_name]) 
  }
  else {
    response.json("User Not Found")
  }
}
app.get('/idor/:name', (req, res) => {
    _name = req.params.name
    idor(_name, res) 
})
app.get('/idor', (req,res) => {
  _name = req.query.name
  if (_name) {
    idor(_name, res) 
  }
  else {
    res.json("Must include name query parameter")
  }
})

// XSS Endpoint
function xss(_name, response) {
  response.send("Welcome to the website " + _name)
}
app.get('/xss', (req,res) => {
  _name = req.query.name
  if (_name) {
    xss(_name, res) 
  }
  else {
    res.send("Must include name query parameter")
  }
})

// RCE Endpoint
function rce(file, res) {
  exec("cat allowed/" + file, (error, stdout, stderr) => {
    if (error) {
        // console.log(`error: ${error.message}`);
        res.send(error)
        return;
    }
    if (stderr) {
        // console.log(`stderr: ${stderr}`);
        res.send(stderr)
        return;
    }
    // console.log(`stdout: ${stdout}`);
    res.send(stdout)
  });
}
app.get('/rce/:file', (req, res) => {
  file = req.params.file
  rce(file, res) 
})
app.get('/rce', (req,res) => {
  file = req.query.file
  if (file) {
    rce(file, res) 
  }
  else {
    res.send("Must include file query parameter")
  }
})

// Auth Controls Endpoint
app.get('/auth', (req,res) => {
  let auth_cookie = auth_helper.getUserId(req,res);
  if (!auth_cookie) res.redirect(301, '/login');
  if (auth_cookie == "cooper" || auth_cookie == "admin")
  res.send("You are " + auth_cookie);
})

app.get('/login', (req,res) => {
  // TODO: if logged in, redirect
  try {
    if (auth_helper.getUserId(req,res)) res.redirect(301, '/auth')
  } catch {}
  res.sendFile('/public/login.html', { root: __dirname });
})

app.post('/login', (req,res) => {
  let username = req.body['username'];
  let password = req.body['password'];
  if (username == 'cooper' && password == 'cooper') {
    // set cookie
    auth_helper.sendUserIdCookie(username, res);
    res.redirect(301, '/auth')
  }
  else {
    res.sendFile('/public/login.html', { root: __dirname });
  }
})

app.get('/logout', (req, res) => {
  res.clearCookie('userId');
  res.redirect(301, '/login');
})

// START SERVER
const port = 80
app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`)
})
