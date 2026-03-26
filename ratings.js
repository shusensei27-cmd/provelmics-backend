// ═══════════════════════════════════════════
//   routes/ratings.js
//   Real-time rating — stories & authors
// ═══════════════════════════════════════════
'use strict';

const router          = require('express').Router();
const { verifyToken } = require('../middleware/auth');

// POST /api/ratings/story/:id
// User votes on a story. Can re-vote (updates previous vote).
router.post('/story/:id', verifyToken, async (req, res) => {
  try {
    const { star } = req.body;
    if (!star || star < 1 || star > 5) {
      return res.status(400).json({ error: 'star must be 1-5' });
    }

    const uid     = req.user.uid;
    const storyId = req.params.id;
    const db      = global.db;

    // Vote doc stores each user's vote
    const voteRef  = db.collection('votes').doc(`story_${storyId}_${uid}`);
    const storyRef = db.collection('stories').doc(storyId);

    await db.runTransaction(async t => {
      const voteSnap  = await t.get(voteRef);
      const storySnap = await t.get(storyRef);

      if (!storySnap.exists) throw new Error('Story not found');

      const { average = 0, votes = 0 } = storySnap.data().rating || {};
      let totalScore = average * votes;
      let totalVotes = votes;

      if (voteSnap.exists) {
        // Subtract old vote
        totalScore -= voteSnap.data().star;
        totalVotes -= 1;
      }

      // Add new vote
      totalScore += star;
      totalVotes += 1;

      const newAverage = +(totalScore / totalVotes).toFixed(1);

      t.set(voteRef, { uid, storyId, star, votedAt: new Date().toISOString() });
      t.update(storyRef, { 'rating.average': newAverage, 'rating.votes': totalVotes });
    });

    const updated = await storyRef.get();
    res.json({ success: true, rating: updated.data().rating });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/ratings/story/:id/my — get user's existing vote
router.get('/story/:id/my', verifyToken, async (req, res) => {
  try {
    const snap = await global.db
      .collection('votes')
      .doc(`story_${req.params.id}_${req.user.uid}`)
      .get();
    res.json({ star: snap.exists ? snap.data().star : null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ratings/author/:id
router.post('/author/:id', verifyToken, async (req, res) => {
  try {
    const { star } = req.body;
    if (!star || star < 1 || star > 5) {
      return res.status(400).json({ error: 'star must be 1-5' });
    }

    const uid      = req.user.uid;
    const authorId = req.params.id;
    const db       = global.db;

    const voteRef   = db.collection('votes').doc(`author_${authorId}_${uid}`);
    const authorRef = db.collection('authors').doc(authorId);

    await db.runTransaction(async t => {
      const voteSnap   = await t.get(voteRef);
      const authorSnap = await t.get(authorRef);

      if (!authorSnap.exists) throw new Error('Author not found');

      const { average = 0, votes = 0 } = authorSnap.data().rating || {};
      let totalScore = average * votes;
      let totalVotes = votes;

      if (voteSnap.exists) {
        totalScore -= voteSnap.data().star;
        totalVotes -= 1;
      }

      totalScore += star;
      totalVotes += 1;

      const newAverage = +(totalScore / totalVotes).toFixed(1);

      t.set(voteRef, { uid, authorId, star, votedAt: new Date().toISOString() });
      t.update(authorRef, { 'rating.average': newAverage, 'rating.votes': totalVotes });
    });

    const updated = await authorRef.get();
    res.json({ success: true, rating: updated.data().rating });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
