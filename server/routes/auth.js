const express = require('express');
const router = express.Router();
const passport = require('passport');

// Redirect to Google
router.get('/google', (req, res, next) => {
  if (!process.env.GOOGLE_CLIENT_ID) {
    return res.status(503).json({ error: 'Google auth not configured' });
  }
  passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
});

// Google callback
router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: `${process.env.CLIENT_URL || 'http://localhost:5173'}/?auth=failed` }),
  (req, res) => {
    const home = process.env.CLIENT_URL || 'http://localhost:5173';
    // Use JS redirect instead of 302 so the browser processes Set-Cookie before navigating
    res.send(`<!DOCTYPE html><html><head><title>Logging in...</title></head><body>
      <script>window.location.replace(${JSON.stringify(home)});</script>
    </body></html>`);
  }
);

// Get current user
router.get('/me', (req, res) => {
  if (!req.user) return res.json({ loggedIn: false });
  res.json({
    loggedIn: true,
    user: {
      id: req.user.id,
      displayName: req.user.display_name,
      email: req.user.email,
      verified: !!req.user.verified,
      pendingVerification: !!req.user.pending_verification,
    }
  });
});

// Logout
router.post('/logout', (req, res) => {
  req.logout((err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

module.exports = router;
