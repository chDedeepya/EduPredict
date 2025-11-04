const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { authenticateToken, authorizeOwnerOrAdmin } = require('../middleware/authMiddleware');

router.get('/:id/dashboard', authenticateToken, authorizeOwnerOrAdmin, async (req, res) => {
  try {
    const userData = await User.findById(req.params.id).populate('courses');
    res.json({ success: true, userData });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
