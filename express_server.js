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
app.use(express.urlencoded({ extended: true }));
app.use(cookieSession({
  name: 'session',
  keys: ["key1"],
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
  const userURL = urlsForUser(userId, urlDatabase);
  const templateVars = {
    user: users[userId],
    urls: userURL,
  };
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
    res.render("urls_new", templateVars);
  } else {
    res.redirect("/login");
  }
});

// URLS generated id
app.get("/urls/:id", (req, res) => {
  if (urlDatabase[req.params.id].userID !== req.session.user_id) {
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

  if (urlDatabase.hasOwnProperty(shortURL)) {
    const url = urlDatabase[shortURL];

    if (url.userID === userID) {
      urlDatabase[shortURL].longURL = longURL;
    } else {
      res.status(403).send("No permission to edit this URL");
    }
  }
  res.redirect("/urls");
});
// edit page
app.get("/u/:id", (req, res) => {
  const id = req.params.id;
  const item = urlDatabase[id];

  if (!item) {
    return res.status(404).send("<h1>404 Not Found</h1><p>The requested URL does not exist.</p>");
  } else {
    const longURL = item.longURL;
    res.redirect(longURL);
  }
});

// Delete
app.post("/urls/:id/delete", (req, res) => {
  const shortURL = req.params.id;
  delete urlDatabase[shortURL];
  res.redirect("/urls");
});

// Register
app.get('/register', (req, res) => {
  const user_id = req.session.user_id;
  if (user_id && users[user_id]) {
    res.redirect('/urls');
  } else {
    res.render('register', { user: undefined });
  }
});
app.post("/register", (req, res) => {
  const email = req.body.email;
  const password = req.body.password;

  if (email === "" || password === "") {
    return res.status(400).send("Error: Email and password cannot be empty");
  }

  if (getUserByEmail(email, users)) {
    return res.status(400).send("Error: Email exists");
  }
  const id = generateRandomString();
  users[id] = {
    id: id,
    email: email,
    password: bcrypt.hashSync(password, 10)
  };
  req.session.user_id = id;
  res.redirect("/urls");
});

// Login
app.get('/login', (req, res) => {
  const user_id = req.session.user_id;
  if (user_id && users[user_id]) {
    res.redirect('/urls');
  } else {
    res.render('login', { user: undefined });
  }
});
app.post("/login", (req, res) => {
  const email = req.body.email;
  const password = req.body.password;
  if (email === "" || password === "") {
    return res.status(400).send("Error: Email and password cannot be empty");
  }
  const user = getUserByEmail(email, users);
  if (!user) {
    return res.status(403).send("Invalid email or password");
  }
  if (!bcrypt.compareSync(password, user.password)) {
    return res.status(403).send("Invalid email or password");
  }
  req.session.user_id = user.id;
  res.redirect("/urls");
});

// Logout
app.post("/logout", (req, res) => {
  req.session = null;
  res.redirect("/login");
});

// Listen
app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});