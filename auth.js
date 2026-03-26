// ═══════════════════════════════════════════
//   middleware/auth.js
//   Verifies Firebase ID token from frontend
// ═══════════════════════════════════════════
'use strict';

const ADMIN_EMAILS = ['shusensei27@gmail.com'];

// ── Verify any logged-in user ────────────────
async function verifyToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token       = authHeader.split('Bearer ')[1];
    const decodedToken = await global.admin.auth().verifyIdToken(token);

    // Attach user info to request
    req.user = {
      uid:         decodedToken.uid,
      email:       decodedToken.email,
      name:        decodedToken.name,
      picture:     decodedToken.picture,
      isAdmin:     ADMIN_EMAILS.includes(decodedToken.email),
    };

    next();
  } catch (err) {
    console.error('Token verification failed:', err.message);
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// ── Verify admin only ────────────────────────
async function verifyAdmin(req, res, next) {
  await verifyToken(req, res, async () => {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  });
}

module.exports = { verifyToken, verifyAdmin };
