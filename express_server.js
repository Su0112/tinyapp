//requires
const express = require("express");
const bcrypt = require('bcryptjs');
const cookieSession = require('cookie-session');
const { getUserByEmail, generateRandomString, urlsForUser } = require('./helpers');
const { urlDatabase, users } = require('./database');
//initialization
const PORT = 8080;
const app = express();
//configuration
app.set("view engine", "ejs");
//middleware
// Parsing URL-encoded bodies
app.use(express.urlencoded({ extended: true }));
app.use(cookieSession({
  name: 'session',
  keys: ["key1"],
  // Setting the maximum age for the session cookie
  maxAge: 24 * 60 * 60 * 1000
}));

//routes
// HOME
app.get("/", (req, res) => {
  const userId = req.session.user_id;
  if (userId) {
    return res.redirect("/urls");
  }
  res.redirect("/login");
});
// landing page
app.get("/urls", (req, res) => {
  const userId = req.session.user_id;
  // Retrieve URLs for the current user
  if (!userId) {
    // Return an error if the user is not logged in
    return res.status(401).send("You must be logged in to view this page.");
  }
  const userURL = urlsForUser(userId, urlDatabase);
  const templateVars = {
    user: users[userId],
    urls: userURL,
  };
  // Render the urls_index with the template variables
  res.render("urls_index", templateVars);
});
app.post("/urls", (req, res) => {
  const id = generateRandomString();
  const longURL = req.body.longURL;
  const userID = req.session.user_id;
  if (userID) {
    urlDatabase[id] = {
      longURL,
      userID,
    };
    res.redirect(`/urls/${id}`);
  } else {
    res
      .status(400)
      .send(
        "Register or login!"
      );
  }
});

// URLS JSON
app.get("/urls.json", (req, res) => {
  // Return the URL database as JSON
  res.json(urlDatabase);
});

// URLS new page
app.get("/urls/new", (req, res) => {
  const userId = req.session.user_id;
  if (!userId) {
    return res.redirect("/login");
  }
  const userURL = urlsForUser(userId, urlDatabase);
  const templateVars = {
    user: users[userId],
    urls: userURL,
  };
  if (userId) {
    // Render the urls_new with the template variables
    res.render("urls_new", templateVars);
  } else {
    res.redirect("/login");
  }
});

// URLS generated id
app.get("/urls/:id", (req, res) => {
  if (urlDatabase[req.params.id].userID !== req.session.user_id) {
    // Check if the URL belongs to the current user, otherwise return an error
    return res.status(403).send("This URL is not yours!");
  }
  const templateVars = {
    user: users[req.session.user_id],
    id: req.params.id,
    longURL: urlDatabase[req.params.id].longURL,
    userID: urlDatabase[req.params.id].userID,
    urls: urlDatabase,
  };
  res.render("urls_show", templateVars);
});
app.post("/urls/:id", (req, res) => {
  const shortURL = req.params.id;
  const longURL = req.body.longURL;
  const userID = req.session.user_id;
  if (!userID) {
    // Return an error if the user is not logged in
    return res.status(401).send("Login to perform this action!");
  }
  if (!urlDatabase.hasOwnProperty(shortURL)) {
    // Return an error if the shortURL is not found in the urlDatabase
    return res.status(404).send("The URL does not exist!");
  }

  const url = urlDatabase[shortURL];
  if (url.userID !== userID) {
    // Return an error if the user doesn't have permission to edit the URL
    res.status(403).send("No permission to edit this URL");
  }
  urlDatabase[shortURL].longURL = longURL;
  res.redirect("/urls");
});
// edit page
app.get("/u/:id", (req, res) => {
  const id = req.params.id;
  const item = urlDatabase[id];

  if (!item) {
    // Return an error if the URL doesn't exist
    return res.status(404).send("<h1>404 Not Found</h1><p>The requested URL does not exist.</p>");
  } else {
    const longURL = item.longURL;
    res.redirect(longURL);
  }
});

// Delete
app.post("/urls/:id/delete", (req, res) => {
  const shortURL = req.params.id;
  const userID = req.session.user_id;
  if (!userID) {
    // Return an error if the user is not logged in
    return res.status(401).send("Login to perform this action!");
  }
  if (!urlDatabase.hasOwnProperty(shortURL)) {
    // Return an error if the shortURL is not found in the urlDatabase
    return res.status(404).send("URL does not exist!");
  }
  const url = urlDatabase[shortURL];
  if (url.userID !== userID) {
    // Return an error if the user is not authorized to delete the URL
    return res.status(403).send("You have no permission to delete this URL.");
  }
  // Delete the URL from the database
  delete urlDatabase[shortURL];
  res.redirect("/urls");
});

// Register
app.get('/register', (req, res) => {
  const user_id = req.session.user_id;
  if (user_id && users[user_id]) {
    // If the user is already logged in, redirect to the URLs page
    res.redirect('/urls');
  } else {
    res.render('register', { user: undefined });
  }
});
app.post("/register", (req, res) => {
  const email = req.body.email;
  const password = req.body.password;

  if (email === "" || password === "") {
    // Return an error if the email or password is empty
    return res.status(400).send("Error: Email and password cannot be empty");
  }

  if (getUserByEmail(email, users)) {
    // Return an error if the email already exists in the user database
    return res.status(400).send("Error: Email exists");
  }
  const id = generateRandomString();
  users[id] = {
    id: id,
    email: email,
    // Hash the password using bcrypt before storing it
    password: bcrypt.hashSync(password, 10)
  };
  req.session.user_id = id;
  res.redirect("/urls");
});

// Login
app.get('/login', (req, res) => {
  const user_id = req.session.user_id;
  if (user_id && users[user_id]) {
    // If the user is already logged in, redirect to the URLs page
    res.redirect('/urls');
  } else {
    res.render('login', { user: undefined });
  }
});
app.post("/login", (req, res) => {
  const email = req.body.email;
  const password = req.body.password;
  if (email === "" || password === "") {
    // Return an error if the email or password is empty
    return res.status(400).send("Error: Email and password cannot be empty");
  }
  const user = getUserByEmail(email, users);
  if (!user) {
    // Return an error if the email doesn't exist in the user database
    return res.status(403).send("Invalid email or password");
  }
  if (!bcrypt.compareSync(password, user.password)) {
    // Return an error if the password doesn't match the hashed password in the database
    return res.status(403).send("Invalid email or password");
  }
  req.session.user_id = user.id;
  res.redirect("/urls");
});

// Logout
app.post("/logout", (req, res) => {
  // Clear the session
  req.session = null;
  res.redirect("/login");
});

// Listen
app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});