require('dotenv').config(); 
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const { OAuth2Client } = require('google-auth-library');
const User = require('./models/User');
const path = require('path');

const app = express();
const client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);


app.use(express.static(path.join(__dirname, 'public')));

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.log(err));

// Set up session
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
}));

// Parse JSON and URL-encoded bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.get('/auth/google', (req, res) => {
  const url = client.generateAuthUrl({
    access_type: 'offline',
    scope: ['profile'],
  });
  res.redirect(url);
});

app.get('/auth/google/callback', async (req, res) => {
  try {
    const { tokens } = await client.getToken(req.query.code);
    client.setCredentials(tokens);
    
    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const googleId = payload['sub'];
    const username = payload['name'];

    let user = await User.findOne({ googleId });
    if (!user) {
      user = new User({ googleId, username });
      await user.save();
    }

    req.session.userId = user.id;
    res.redirect('/profile');
  } catch (error) {
    console.error('Error during authentication callback:', error);
    res.status(500).send('Authentication error');
  }
});

app.get('/profile', (req, res) => {
  if (!req.session.userId) {
    return res.redirect('/');
  }

  User.findById(req.session.userId)
    .then(user => {
      if (!user) {
        return res.redirect('/');
      }
      res.send(`Hello ${user.username}`);
    })
    .catch(err => res.status(500).send('Error retrieving user data'));
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
