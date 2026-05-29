// ── App Logic ─────────────────────────────────────────────────────────────────

// ── Section Switching ─────────────────────────────────────────────────────────

function showSection(name) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

  document.getElementById('section' + name.charAt(0).toUpperCase() + name.slice(1)).classList.add('active');
  document.getElementById('nav' + name.charAt(0).toUpperCase() + name.slice(1)).classList.add('active');

  if (name === 'gallery') loadGallery();
}

// ── Toast ─────────────────────────────────────────────────────────────────────

function showToast(msg, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = 'toast show ' + type;
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => { toast.classList.remove('show'); }, 3000);
}

// ── Submit Modal ──────────────────────────────────────────────────────────────

function openSubmitModal() {
  // Check if canvas has content
  const imgData = canvas.toDataURL('image/png');

  // Check if canvas is still blank
  const tempCtx = document.createElement('canvas').getContext('2d');
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = canvas.width;
  tempCanvas.height = canvas.height;
  const tc = tempCanvas.getContext('2d');
  tc.fillStyle = '#ffffff';
  tc.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
  if (canvas.toDataURL() === tempCanvas.toDataURL()) {
    showToast('Buat gambar dulu yuk! 🎨', 'error');
    return;
  }

  document.getElementById('previewImg').src = imgData;
  document.getElementById('submitModal').classList.add('open');
}

function closeSubmitModal() {
  document.getElementById('submitModal').classList.remove('open');
}

async function submitDrawing() {
  const title = document.getElementById('drawingTitle').value.trim();
  const authorName = document.getElementById('authorName').value.trim();
  const message = document.getElementById('drawingMessage').value.trim();
  const imageData = canvas.toDataURL('image/png');

  if (!title) { showToast('Judul wajib diisi!', 'error'); return; }
  if (!authorName) { showToast('Nama wajib diisi!', 'error'); return; }

  const btn = document.getElementById('submitBtn');
  btn.disabled = true;
  btn.innerHTML = '<div class="spinner" style="width:16px;height:16px;border-width:2px"></div> Mengirim...';

  try {
    const res = await fetch('/api/drawing/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, authorName, message, imageData })
    });

    const data = await res.json();

    if (data.success) {
      showToast(data.message, 'success');
      closeSubmitModal();
      // Clear form
      document.getElementById('drawingTitle').value = '';
      document.getElementById('authorName').value = '';
      document.getElementById('drawingMessage').value = '';
      // Clear canvas
      clearCanvas();
    } else {
      showToast(data.message || 'Gagal mengirim gambar', 'error');
    }

  } catch (err) {
    showToast('Koneksi gagal. Coba lagi!', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg> Kirim Sekarang`;
  }
}

// Close modal on overlay click
document.getElementById('submitModal').addEventListener('click', function(e) {
  if (e.target === this) closeSubmitModal();
});

// ── Gallery ───────────────────────────────────────────────────────────────────

async function loadGallery() {
  const grid = document.getElementById('galleryGrid');
  grid.innerHTML = `<div class="gallery-loading"><div class="spinner"></div><span>Memuat karya...</span></div>`;

  try {
    const res = await fetch('/api/drawing/gallery');
    const data = await res.json();

    if (!data.success || data.drawings.length === 0) {
      grid.innerHTML = `<div class="gallery-empty">Belum ada karya yang disetujui 🎨</div>`;
      return;
    }

    grid.innerHTML = data.drawings.map(d => `
      <div class="gallery-card">
        <div class="gallery-img-placeholder" style="width:100%;aspect-ratio:4/3;background:#e5e5e5;display:flex;align-items:center;justify-content:center;color:#999;font-size:12px">
          Karya terkirim ✓
        </div>
        <div class="gallery-info">
          <div class="gallery-title">${escapeHtml(d.title)}</div>
          <div class="gallery-author">oleh ${escapeHtml(d.authorName)} · ${formatDate(d.createdAt)}</div>
        </div>
      </div>
    `).join('');

  } catch (err) {
    grid.innerHTML = `<div class="gallery-empty">Gagal memuat galeri. Refresh halaman.</div>`;
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function escapeHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}
