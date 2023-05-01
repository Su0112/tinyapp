const express = require("express");
const cookieParser = require("cookie-parser");
const app = express();
const PORT = 8080;
const bcrypt = require('bcrypt');
const session = require('express-session');



app.set("view engine", "ejs");

app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(session({
  secret: "your-secret-key",
  resave: false,
  saveUninitialized: true
}));

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
      filteredUrls[shortUrl] = urlDatabase[shortUrl];
    }
  }
  return filteredUrls;
}
//URLs
const urlDatabase = {
  "b2xVn2": "http://www.lighthouselabs.ca",
  "9sm5xK": "http://www.google.com"
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
//user by email
const getUserByEmail = function(email, users) {
  for (const userId in users) {
    if (users[userId].email === email) {
      return users[userId];
    }
  }
  return null;
};

app.post("/urls", (req, res) => {
  const longURL = req.body.longURL;
  const shortURL = generateRandomString();
  urlDatabase[shortURL] = { longURL: longURL, userID: req.cookies.user_id };
  res.redirect(`/urls/${shortURL}`, 302, { user: users[req.cookies.user_id] });
});
app.get("/", (req, res) => {
  res.send("Hello!");
});
app.get("/urls.json", (req, res) => {
  res.json(urlDatabase);
});


app.get("/urls", (req, res) => {
  const userId = req.session.user_id;
  const userURL = urlsForUser(userId, urlDatabase);
  const templateVars = {
    user_id: req.session.user_id,
    users: users,
    urls: userURL,
  };
  res.render("urls_index", templateVars);
});


app.get("/urls/new", (req, res) => {
  const userId = req.session.user_id;
  const userURL = urlsForUser(userId, urlDatabase);
  const templateVars = {
    user_id: req.session.user_id,
    users: users,
    urls: userURL,
  };
  res.render("urls_new", templateVars);
});
app.get("/urls/:id", (req, res) => {
  const user = users[req.cookies.user_id];
  const id = req.params.id;
  const longURL = urlDatabase[id].longURL;
  const templateVars = { user, id, longURL };
  res.render("urls_show", templateVars);
});


app.get("/u/:id", (req, res) => {
  const longURL = urlDatabase[req.params.id];
  res.redirect(longURL);
});

app.get('/register', (req, res) => {
  const user_id = req.session.user_id;
  res.render('register', { user_id });
});

app.post("/urls/:id/delete", (req, res) => {
  const shortURL = req.params.id;
  delete urlDatabase[shortURL];
  res.redirect("/urls");
});
app.post("/urls/:id", (req, res) => {
  const shortURL = req.params.id;
  const userID = req.cookies.user_id;
  if (userID !== urlDatabase[shortURL].userID) {
    return res.status(403).send("Access Denied");
  }
  urlDatabase[shortURL].longURL = req.body.longURL;
  res.redirect("/urls", 302, { user: users[req.cookies.user_id] });
});

app.get('/login', (req, res) => {
  const user_id = req.session.user_id;
  res.render('login', { user_id });
});
app.post("/login", (req, res) => {
  const email = req.body.email;
  const password = req.body.password;

  const user = getUserByEmail(email, users);
  if (!user) {
    return res.status(403).send("Invalid email or password");
  }

  if (!bcrypt.compareSync(password, user.password)) {
    return res.status(403).send("Invalid email or password");
  }

  res.cookie("user_id", user.id);
  res.redirect("/urls");
});


app.post("/register", (req, res) => {
  const email = req.body.email;
  const password = req.body.password;
  if (email === "" || password === "") {
    res.status(400).send("Error: Email and password cannot be empty");
  } else if (getUserByEmail(email, users)) {
    res.status(400).send("Error: Email exists");
  } else {
    const id = generateRandomString();
    const newUser = { id, email, password };
    users[id] = newUser;
    users[id] = { id: id, email: email, password: bcrypt.hashSync(password, 10) };
    req.session.user_id = id;
    res.cookie('user_id', id);
    res.redirect("/urls");
  }
  console.log(users);
});


app.post("/logout", (req, res) => {
  res.clearCookie("user_id");
  res.redirect("/login");
});



app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});