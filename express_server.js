const express = require("express");
const app = express();
const PORT = 8080;
const bcrypt = require('bcryptjs');
const cookieSession = require('cookie-session');
const { getUserByEmail } = require('./helpers');

app.use(cookieSession({
  name: 'session',
  keys: ["key1"],
  maxAge: 24 * 60 * 60 * 1000
}));

app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: true }));

//generate random string
function generateRandomString() {
  let genRes = '';
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const charsLength = chars.length;
  for (let i = 0; i < 6; i++) {
    genRes += chars.charAt(Math.floor(Math.random() * charsLength));
  }
  return genRes;
}
//urls for users
function urlsForUser(id, urlDatabase) {
  const filteredUrls = {};
  for (const shortUrl in urlDatabase) {
    if (urlDatabase[shortUrl].userID === id) {
      filteredUrls[shortUrl] = urlDatabase[shortUrl].longURL;
    }
  }
  return filteredUrls;
}
//URLs
const urlDatabase = {
  b6UTxQ: {
    longURL: "https://www.tsn.ca",
    userID: "aJ48lW",
  },
  i3BoGr: {
    longURL: "https://www.google.ca",
    userID: "aJ48lW",
  },
};
//users
const users = {
  userRandomID: {
    id: "userRandomID",
    email: "user@example.com",
    password: "purple-monkey-dinosaur",
  },
  user2RandomID: {
    id: "user2RandomID",
    email: "user2@example.com",
    password: "dishwasher-funk",
  },
};

//POST
app.post("/urls", (req, res) => {
  const longURL = req.body.longURL;
  const shortURL = generateRandomString();
  urlDatabase[shortURL] = { longURL: longURL, userID: req.session.user_id };
  res.redirect(`/urls/${shortURL}`, 302, { user: users[req.session.user_id] });
});

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
app.post('/urls', (req, res) => {
  if (!req.session.user_id) {
    return res.send("Please login");
  }

  if (!isValidUrl(req.body.longURL)) {
    return res.status(400).send('Invalid URL');
  }
  const shortURL = generateRandomString();
  const userID = req.session.user_id;
  urlDatabase[shortURL] = { longURL: req.body.longURL, userID };
  res.redirect(`/urls/${shortURL}`);
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
  const templateVars = {
    user: users[req.session.user_id],
    id: req.params.id,
    longURL: urlDatabase[req.params.id].longURL,
  };
  res.render("urls_show", templateVars);
});
app.post("/urls/:id", (req, res) => {
  const shortURL = req.params.id;
  const userID = req.session.user_id;
  if (userID !== urlDatabase[shortURL].userID) {
    return res.status(403).send("Access Denied");
  }
  urlDatabase[shortURL].longURL = req.body.longURL;
  res.redirect("/urls", 302, { user: users[req.session.user_id] });
});
// edit page
app.get("/u/:id", (req, res) => {
  const id = req.params.id;
  const longURL = urlDatabase[id];
  if (longURL) {
    res.redirect(longURL);
  } else {
    res.status(404).send("<h1>404 Not Found</h1><p>The requested URL does not exist.</p>");
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