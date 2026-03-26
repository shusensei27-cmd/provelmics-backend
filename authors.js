// ═══════════════════════════════════════════
//   routes/authors.js
// ═══════════════════════════════════════════
'use strict';

const router = require('express').Router();

// GET all authors
router.get('/', async (_req, res) => {
  try {
    const snap    = await global.db.collection('authors').orderBy('penName').get();
    const authors = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json(authors);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single author
router.get('/:id', async (req, res) => {
  try {
    const snap = await global.db.collection('authors').doc(req.params.id).get();
    if (!snap.exists) return res.status(404).json({ error: 'Author not found' });
    res.json({ id: snap.id, ...snap.data() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET author's works
router.get('/:id/works', async (req, res) => {
  try {
    const snap  = await global.db
      .collection('stories')
      .where('authorId', '==', req.params.id)
      .where('status', '==', 'approved')
      .get();
    const works = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json(works);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
