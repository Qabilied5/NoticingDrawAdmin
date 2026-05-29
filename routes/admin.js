const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const Drawing = require('../models/Drawing');

// Auth middleware
const requireAuth = (req, res, next) => {
  if (req.session && req.session.isAdmin) {
    return next();
  }
  res.status(401).json({ success: false, message: 'Unauthorized' });
};

// POST - Admin login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const adminUser = process.env.ADMIN_USERNAME || 'admin';
  const adminPass = process.env.ADMIN_PASSWORD || 'admin123';

  if (username === adminUser && password === adminPass) {
    req.session.isAdmin = true;
    req.session.username = username;

    req.session.save((err) => {
      if (err) {
        return res.status(500).json({ success: false, message: 'Session error' });
      }
      res.json({ success: true, message: 'Login berhasil!' });
    });

  } else {
    res.status(401).json({ success: false, message: 'Username atau password salah!' });
  }
});

// POST - Admin logout
router.post('/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

// GET - Check auth status
router.get('/check', (req, res) => {
  res.json({ 
    isAdmin: !!(req.session && req.session.isAdmin),
    username: req.session ? req.session.username : null
  });
});

// GET - All drawings (admin)
router.get('/drawings', requireAuth, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = status ? { status } : {};
    
    const total = await Drawing.countDocuments(filter);
    const drawings = await Drawing.find(filter)
      .select('-imageData')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({ 
      success: true, 
      drawings,
      total,
      pages: Math.ceil(total / limit),
      currentPage: parseInt(page)
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal memuat data' });
  }
});

// GET - Single drawing with image
router.get('/drawings/:id', requireAuth, async (req, res) => {
  try {
    const drawing = await Drawing.findById(req.params.id);
    if (!drawing) {
      return res.status(404).json({ success: false, message: 'Gambar tidak ditemukan' });
    }
    res.json({ success: true, drawing });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal memuat gambar' });
  }
});

// PUT - Update drawing status
router.put('/drawings/:id/status', requireAuth, async (req, res) => {
  try {
    const { status, adminNote } = req.body;
    
    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status tidak valid' });
    }

    const drawing = await Drawing.findByIdAndUpdate(
      req.params.id,
      { status, adminNote: adminNote || '' },
      { new: true }
    ).select('-imageData');

    if (!drawing) {
      return res.status(404).json({ success: false, message: 'Gambar tidak ditemukan' });
    }

    res.json({ success: true, drawing, message: `Status diubah ke: ${status}` });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal mengubah status' });
  }
});

// DELETE - Delete drawing
router.delete('/drawings/:id', requireAuth, async (req, res) => {
  try {
    const drawing = await Drawing.findByIdAndDelete(req.params.id);
    if (!drawing) {
      return res.status(404).json({ success: false, message: 'Gambar tidak ditemukan' });
    }
    res.json({ success: true, message: 'Gambar berhasil dihapus' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal menghapus gambar' });
  }
});

// GET - Stats
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const [total, pending, approved, rejected] = await Promise.all([
      Drawing.countDocuments(),
      Drawing.countDocuments({ status: 'pending' }),
      Drawing.countDocuments({ status: 'approved' }),
      Drawing.countDocuments({ status: 'rejected' })
    ]);
    res.json({ success: true, stats: { total, pending, approved, rejected } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal memuat statistik' });
  }
});

module.exports = router;
