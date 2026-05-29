const express = require('express');
const router = express.Router();
const Drawing = require('../models/Drawing');

// POST - Submit drawing
router.post('/submit', async (req, res) => {
  try {
    const { title, authorName, message, imageData } = req.body;

    if (!title || !authorName || !imageData) {
      return res.status(400).json({ 
        success: false, 
        message: 'Judul, nama, dan gambar wajib diisi!' 
      });
    }

    // Validate base64 image
    if (!imageData.startsWith('data:image/')) {
      return res.status(400).json({ 
        success: false, 
        message: 'Format gambar tidak valid!' 
      });
    }

    // Check size (max ~2MB base64)
    if (imageData.length > 2.8 * 1024 * 1024) {
      return res.status(400).json({ 
        success: false, 
        message: 'Ukuran gambar terlalu besar! Maksimal 2MB.' 
      });
    }

    const drawing = new Drawing({
      title: title.trim(),
      authorName: authorName.trim(),
      message: message ? message.trim() : '',
      imageData
    });

    await drawing.save();

    res.json({ 
      success: true, 
      message: 'Gambar berhasil dikirim ke admin! Terima kasih 🎨',
      id: drawing._id
    });

  } catch (error) {
    console.error('Submit error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Terjadi kesalahan server. Coba lagi!' 
    });
  }
});

// GET - Public gallery (approved only)
router.get('/gallery', async (req, res) => {
  try {
    const drawings = await Drawing.find({ status: 'approved' })
      .select('-imageData')
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({ success: true, drawings });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal memuat galeri' });
  }
});

module.exports = router;
