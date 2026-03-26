// ═══════════════════════════════════════════
//   routes/stories.js
//   Comics & Novels CRUD
// ═══════════════════════════════════════════
'use strict';

const router          = require('express').Router();
const { verifyToken } = require('../middleware/auth');

// ── GET all approved stories ─────────────────
// GET /api/stories?type=comic&genre=Action&sort=newest&limit=20
router.get('/', async (req, res) => {
  try {
    const { type, genre, sort = 'newest', limit = 20, search } = req.query;
    let query = global.db.collection('stories').where('status', '==', 'approved');

    if (type)  query = query.where('type', '==', type);
    if (genre) query = query.where('genre', 'array-contains', genre);

    // Sorting
    switch (sort) {
      case 'oldest': query = query.orderBy('createdAt', 'asc');  break;
      case 'rating': query = query.orderBy('rating.average', 'desc'); break;
      case 'az':     query = query.orderBy('title', 'asc');      break;
      case 'za':     query = query.orderBy('title', 'desc');     break;
      default:       query = query.orderBy('createdAt', 'desc'); break; // newest
    }

    query = query.limit(parseInt(limit));
    const snap = await query.get();
    let stories = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    // Client-side search filter (Firestore full-text is limited)
    if (search) {
      const q = search.toLowerCase();
      stories = stories.filter(s =>
        s.title?.toLowerCase().includes(q) ||
        s.description?.toLowerCase().includes(q) ||
        s.genre?.some(g => g.toLowerCase().includes(q))
      );
    }

    res.json(stories);
  } catch (err) {
    console.error('Get stories error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── GET single story ─────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const snap = await global.db.collection('stories').doc(req.params.id).get();
    if (!snap.exists) return res.status(404).json({ error: 'Story not found' });
    res.json({ id: snap.id, ...snap.data() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST upload novel (user) ──────────────────
// Only novels can be uploaded by users. Comics are added by admin.
router.post('/upload', verifyToken, async (req, res) => {
  try {
    const { title, description, genre, chapters, cover, music } = req.body;

    if (!title || !genre || !chapters?.length) {
      return res.status(400).json({ error: 'title, genre, and chapters are required' });
    }

    const story = {
      title,
      description   : description || '',
      type          : 'novel',
      genre         : Array.isArray(genre) ? genre : [genre],
      chapters      : chapters || [],
      cover         : cover || '',
      music         : music || { enabled: false, playlist: [] },
      status        : 'pending',   // Needs admin approval
      authorId      : req.user.uid,
      authorName    : req.user.name,
      rating        : { average: 0, votes: 0 },
      createdAt     : new Date().toISOString(),
      updatedAt     : new Date().toISOString(),
    };

    const ref = await global.db.collection('stories').add(story);
    res.json({ success: true, id: ref.id, message: 'Novel submitted for review' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUT update story (owner or admin) ────────
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const snap = await global.db.collection('stories').doc(req.params.id).get();
    if (!snap.exists) return res.status(404).json({ error: 'Story not found' });

    const story = snap.data();
    const isOwner = story.authorId === req.user.uid;
    if (!isOwner && !req.user.isAdmin) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const updates = { ...req.body, updatedAt: new Date().toISOString() };
    // Non-admins cannot change status
    if (!req.user.isAdmin) delete updates.status;

    await global.db.collection('stories').doc(req.params.id).update(updates);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE story (owner or admin) ────────────
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const snap = await global.db.collection('stories').doc(req.params.id).get();
    if (!snap.exists) return res.status(404).json({ error: 'Story not found' });

    const story = snap.data();
    if (story.authorId !== req.user.uid && !req.user.isAdmin) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await global.db.collection('stories').doc(req.params.id).delete();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
