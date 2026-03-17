require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const session = require('express-session');
const path = require('path');
const { initDb } = require('./db');
const { scrapeMenu } = require('./scraper');
const menuRouter = require('./routes/menu');
const votesRouter = require('./routes/votes');
const feedbackRouter = require('./routes/feedback');
const { router: photosRouter } = require('./routes/photos');
const profileRouter = require('./routes/profile');
const adminRouter = require('./routes/admin');
const newsRouter = require('./routes/news');
const { setupSocketHandlers } = require('./socket');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const isProd = process.env.NODE_ENV === 'production';
const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || 'mane-dish-secret-key',
  resave: false,
  saveUninitialized: true,
  cookie: {
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000
  }
});
app.use(sessionMiddleware);

// Share session with Socket.io so sockets can read session.isAdmin
io.use((socket, next) => sessionMiddleware(socket.request, socket.request.res || {}, next));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Session username middleware
app.use((req, res, next) => {
  if (!req.session.username) {
    const adjectives = ['Hungry', 'Happy', 'Roaring', 'Golden', 'Brave', 'Swift', 'Mighty', 'Proud'];
    const nouns = ['Lion', 'Fan', 'Student', 'Hawk', 'Spirit', 'Diner', 'Chef', 'Foodie'];
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const num = Math.floor(Math.random() * 9000) + 1000;
    req.session.username = `${adj}${noun}#${num}`;
  }
  if (!req.session.votes) req.session.votes = {};

  // Check if user has an approved name change in the DB
  try {
    const db = require('./db').getDb();
    const profile = db.prepare('SELECT current_username FROM user_profiles WHERE session_id = ? AND verified = 1').get(req.session.id);
    if (profile && profile.current_username && profile.current_username !== req.session.username) {
      req.session.username = profile.current_username;
    }
  } catch (e) {}

  next();
});

// Make io available to routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Routes
app.use('/api/menu', menuRouter);
app.use('/api/votes', votesRouter);
app.use('/api/feedback', feedbackRouter);
app.use('/api/photos', photosRouter);
app.use('/api/profile', profileRouter);
app.use('/api/admin', adminRouter);
app.use('/api/news', newsRouter);

app.get('/api/session', (req, res) => {
  res.json({ username: req.session.username });
});

// Socket.io
setupSocketHandlers(io, sessionMiddleware);

// No cron job needed — scraping is triggered automatically when users visit
// the menu page and the cached data is older than SCRAPE_INTERVAL_MINUTES.

// Initialize DB and start server
initDb();

// Initial menu scrape on startup
(async () => {
  try {
    const db = require('./db').getDb();
    const existing = db.prepare('SELECT COUNT(*) as count FROM menu_items').get();
    if (existing.count === 0) {
      console.log('[STARTUP] No menu data found, scraping...');
      await scrapeMenu();
    }
  } catch (err) {
    console.error('[STARTUP] Initial scrape failed:', err.message);
  }
})();

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
