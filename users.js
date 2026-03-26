// ═══════════════════════════════════════════
//   routes/users.js
//   Bookmarks, profile update, read history
// ═══════════════════════════════════════════
'use strict';

const router          = require('express').Router();
const { verifyToken } = require('../middleware/auth');

// All user routes require auth

// GET /api/users/bookmarks
router.get('/bookmarks', verifyToken, async (req, res) => {
  try {
    const snap = await global.db.collection('users').doc(req.user.uid).get();
    res.json(snap.exists ? (snap.data().bookmarks || []) : []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/users/bookmarks/:storyId — toggle bookmark
router.post('/bookmarks/:storyId', verifyToken, async (req, res) => {
  try {
    const userRef  = global.db.collection('users').doc(req.user.uid);
    const snap     = await userRef.get();
    const bookmarks = snap.data()?.bookmarks || [];
    const sid      = req.params.storyId;

    let added;
    if (bookmarks.includes(sid)) {
      // Remove
      await userRef.update({
        bookmarks: global.admin.firestore.FieldValue.arrayRemove(sid),
      });
      added = false;
    } else {
      // Add
      await userRef.update({
        bookmarks: global.admin.firestore.FieldValue.arrayUnion(sid),
      });
      added = true;
    }

    res.json({ success: true, bookmarked: added });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/users/profile — update bio or photo
router.put('/profile', verifyToken, async (req, res) => {
  try {
    const { bio, photoURL } = req.body;
    const updates = {};
    if (bio      !== undefined) updates.bio      = bio;
    if (photoURL !== undefined) updates.photoURL = photoURL;

    await global.db.collection('users').doc(req.user.uid).update(updates);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/users/history — save reading progress
router.post('/history', verifyToken, async (req, res) => {
  try {
    const { storyId, chapterId } = req.body;
    if (!storyId || !chapterId) {
      return res.status(400).json({ error: 'storyId and chapterId required' });
    }

    await global.db.collection('users').doc(req.user.uid).update({
      [`readHistory.${storyId}`]: {
        chapterId,
        readAt: new Date().toISOString(),
      },
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/users/history
router.get('/history', verifyToken, async (req, res) => {
  try {
    const snap = await global.db.collection('users').doc(req.user.uid).get();
    res.json(snap.exists ? (snap.data().readHistory || {}) : {});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
