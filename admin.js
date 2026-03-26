// ═══════════════════════════════════════════
//   routes/admin.js
//   Admin-only routes
//   Only shusensei27@gmail.com can access
// ═══════════════════════════════════════════
'use strict';

const router             = require('express').Router();
const { verifyAdmin }    = require('../middleware/auth');

// All routes here require admin

// GET /api/admin/pending — get all pending stories
router.get('/pending', verifyAdmin, async (req, res) => {
  try {
    const snap = await global.db
      .collection('stories')
      .where('status', '==', 'pending')
      .orderBy('createdAt', 'desc')
      .get();

    const stories = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json(stories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/admin/stories/:id/approve
router.patch('/stories/:id/approve', verifyAdmin, async (req, res) => {
  try {
    await global.db.collection('stories').doc(req.params.id).update({
      status     : 'approved',
      approvedAt : new Date().toISOString(),
      approvedBy : req.user.email,
    });
    res.json({ success: true, message: 'Story approved' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/admin/stories/:id/reject
router.patch('/stories/:id/reject', verifyAdmin, async (req, res) => {
  try {
    const { reason = 'No reason provided' } = req.body;
    await global.db.collection('stories').doc(req.params.id).update({
      status       : 'rejected',
      rejectedAt   : new Date().toISOString(),
      rejectedBy   : req.user.email,
      rejectReason : reason,
    });
    res.json({ success: true, message: 'Story rejected' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/stories — admin adds comic/novel directly (approved)
router.post('/stories', verifyAdmin, async (req, res) => {
  try {
    const story = {
      ...req.body,
      status    : 'approved',
      createdAt : new Date().toISOString(),
      updatedAt : new Date().toISOString(),
      addedBy   : req.user.email,
      rating    : req.body.rating || { average: 0, votes: 0 },
    };
    const ref = await global.db.collection('stories').add(story);
    res.json({ success: true, id: ref.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/admin/stories/:id
router.delete('/stories/:id', verifyAdmin, async (req, res) => {
  try {
    await global.db.collection('stories').doc(req.params.id).delete();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/users — list all users
router.get('/users', verifyAdmin, async (req, res) => {
  try {
    const snap  = await global.db.collection('users').orderBy('createdAt', 'desc').get();
    const users = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/authors — add author
router.post('/authors', verifyAdmin, async (req, res) => {
  try {
    const author = {
      ...req.body,
      rating    : req.body.rating || { average: 0, votes: 0 },
      createdAt : new Date().toISOString(),
    };
    const ref = await global.db.collection('authors').add(author);
    res.json({ success: true, id: ref.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/admin/authors/:id
router.delete('/authors/:id', verifyAdmin, async (req, res) => {
  try {
    await global.db.collection('authors').doc(req.params.id).delete();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
