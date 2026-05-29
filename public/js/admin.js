// ── Admin Panel JS ────────────────────────────────────────────────────────────

let currentFilter = 'all';
let currentPage = 1;
let currentDrawingId = null;

// ── Auth ──────────────────────────────────────────────────────────────────────

async function checkAuth() {
  const res = await fetch('/api/admin/check');
  const data = await res.json();
  if (data.isAdmin) {
    showDashboard(data.username);
  }
  // else: login screen stays visible
}

async function doLogin() {
  const username = document.getElementById('loginUser').value.trim();
  const password = document.getElementById('loginPass').value;
  const errEl = document.getElementById('loginError');

  if (!username || !password) {
    errEl.textContent = 'Isi username dan password!';
    return;
  }

  const btn = document.querySelector('.login-btn');
  btn.disabled = true;
  btn.textContent = 'Masuk...';
  errEl.textContent = '';

  try {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();

    if (data.success) {
      showDashboard(username);
    } else {
      errEl.textContent = data.message || 'Login gagal!';
    }
  } catch (err) {
    errEl.textContent = 'Koneksi gagal. Coba lagi.';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Masuk';
  }
}

function showDashboard(username) {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('dashboard').classList.remove('hidden');
  document.getElementById('adminUser').textContent = username;
  loadStats();
  loadDrawings();
}

async function doLogout() {
  await fetch('/api/admin/logout', { method: 'POST' });
  location.reload();
}

// ── Stats ─────────────────────────────────────────────────────────────────────

async function loadStats() {
  try {
    const res = await fetch('/api/admin/stats');
    const data = await res.json();
    if (data.success) {
      const s = data.stats;
      document.getElementById('statTotal').textContent = s.total;
      document.getElementById('statPending').textContent = s.pending;
      document.getElementById('statApproved').textContent = s.approved;
      document.getElementById('statRejected').textContent = s.rejected;
      document.getElementById('badgeAll').textContent = s.total;
      document.getElementById('badgePending').textContent = s.pending;
      document.getElementById('badgeApproved').textContent = s.approved;
      document.getElementById('badgeRejected').textContent = s.rejected;
    }
  } catch (err) { console.error(err); }
}

// ── Drawings List ─────────────────────────────────────────────────────────────

function filterDrawings(status) {
  currentFilter = status;
  currentPage = 1;

  // Update nav active
  document.querySelectorAll('.sn-btn').forEach(b => b.classList.remove('active'));
  const btn = document.getElementById('filter' + status.charAt(0).toUpperCase() + status.slice(1));
  if (btn) btn.classList.add('active');

  const titles = { all: 'Semua Gambar', pending: 'Menunggu Review', approved: 'Disetujui', rejected: 'Ditolak' };
  document.getElementById('pageTitle').textContent = titles[status] || 'Gambar';

  loadDrawings();
}

async function loadDrawings(page = 1) {
  currentPage = page;
  const grid = document.getElementById('drawingGrid');
  grid.innerHTML = `<div class="loading-state"><div class="spinner"></div><span>Memuat...</span></div>`;

  const params = new URLSearchParams({ page, limit: 20 });
  if (currentFilter !== 'all') params.set('status', currentFilter);

  try {
    const res = await fetch(`/api/admin/drawings?${params}`);
    const data = await res.json();

    if (!data.success) throw new Error(data.message);

    document.getElementById('pageCount').textContent = `${data.total} karya`;

    if (data.drawings.length === 0) {
      grid.innerHTML = `<div class="empty-state"><span>📭</span><span>Tidak ada gambar ditemukan</span></div>`;
      document.getElementById('pagination').innerHTML = '';
      return;
    }

    grid.innerHTML = data.drawings.map(d => `
      <div class="drawing-card" onclick="openDrawing('${d._id}')">
        <div style="width:100%;aspect-ratio:4/3;background:#1e1e26;display:flex;align-items:center;justify-content:center;color:#505060;font-size:12px;font-family:'DM Mono',monospace;">
          Klik untuk lihat
        </div>
        <div class="drawing-card-info">
          <div class="card-title">${escapeHtml(d.title)}</div>
          <div class="card-meta">
            <span>${escapeHtml(d.authorName)} · ${formatDate(d.createdAt)}</span>
            <span class="card-status status-${d.status}">${statusLabel(d.status)}</span>
          </div>
        </div>
      </div>
    `).join('');

    // Pagination
    renderPagination(data.pages, data.currentPage);

  } catch (err) {
    grid.innerHTML = `<div class="empty-state"><span>⚠️</span><span>Gagal memuat data</span></div>`;
  }
}

function renderPagination(total, current) {
  const pag = document.getElementById('pagination');
  if (total <= 1) { pag.innerHTML = ''; return; }

  let html = '';
  if (current > 1) html += `<button class="page-btn" onclick="loadDrawings(${current - 1})">← Prev</button>`;

  for (let i = 1; i <= total; i++) {
    if (i === 1 || i === total || Math.abs(i - current) <= 2) {
      html += `<button class="page-btn ${i === current ? 'active' : ''}" onclick="loadDrawings(${i})">${i}</button>`;
    } else if (Math.abs(i - current) === 3) {
      html += `<span style="padding:7px 6px;color:var(--text3)">...</span>`;
    }
  }

  if (current < total) html += `<button class="page-btn" onclick="loadDrawings(${current + 1})">Next →</button>`;
  pag.innerHTML = html;
}

// ── Drawing Detail Modal ───────────────────────────────────────────────────────

async function openDrawing(id) {
  currentDrawingId = id;
  document.getElementById('detailModal').classList.add('open');

  // Load image
  try {
    const res = await fetch(`/api/admin/drawings/${id}`);
    const data = await res.json();

    if (!data.success) throw new Error(data.message);

    const d = data.drawing;
    document.getElementById('modalTitle').textContent = escapeHtml(d.title);
    document.getElementById('modalImg').src = d.imageData;
    document.getElementById('modalDrawTitle').textContent = d.title;
    document.getElementById('modalAuthor').textContent = d.authorName;
    document.getElementById('modalMessage').textContent = d.message || '—';
    document.getElementById('modalDate').textContent = formatDateFull(d.createdAt);
    document.getElementById('modalStatus').innerHTML = `<span class="card-status status-${d.status}">${statusLabel(d.status)}</span>`;
    document.getElementById('adminNote').value = d.adminNote || '';

  } catch (err) {
    showToast('Gagal memuat detail gambar', 'error');
    closeModal();
  }
}

function closeModal() {
  document.getElementById('detailModal').classList.remove('open');
  currentDrawingId = null;
}

document.getElementById('detailModal').addEventListener('click', function(e) {
  if (e.target === this) closeModal();
});

async function updateStatus(status) {
  if (!currentDrawingId) return;
  const adminNote = document.getElementById('adminNote').value.trim();

  try {
    const res = await fetch(`/api/admin/drawings/${currentDrawingId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, adminNote })
    });
    const data = await res.json();

    if (data.success) {
      showToast(data.message, 'success');
      closeModal();
      loadDrawings(currentPage);
      loadStats();
    } else {
      showToast(data.message, 'error');
    }
  } catch (err) {
    showToast('Gagal mengubah status', 'error');
  }
}

async function deleteDrawing() {
  if (!currentDrawingId) return;
  if (!confirm('Yakin ingin menghapus gambar ini? Tindakan tidak bisa dibatalkan.')) return;

  try {
    const res = await fetch(`/api/admin/drawings/${currentDrawingId}`, { method: 'DELETE' });
    const data = await res.json();

    if (data.success) {
      showToast('Gambar berhasil dihapus', 'success');
      closeModal();
      loadDrawings(currentPage);
      loadStats();
    } else {
      showToast(data.message, 'error');
    }
  } catch (err) {
    showToast('Gagal menghapus gambar', 'error');
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function statusLabel(s) {
  return { pending: '⏳ Pending', approved: '✓ Disetujui', rejected: '✕ Ditolak' }[s] || s;
}

function escapeHtml(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDateFull(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function showToast(msg, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = 'toast show ' + type;
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('show'), 3000);
}

// ── Init ──────────────────────────────────────────────────────────────────────

checkAuth();
