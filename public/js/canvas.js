// ── Canvas Drawing Engine ─────────────────────────────────────────────────────

const canvas = document.getElementById('drawingCanvas');
const ctx = canvas.getContext('2d');

let isDrawing = false;
let currentTool = 'pen';
let currentColor = '#1a1a2e';
let brushSize = 8;
let opacity = 1;
let startX, startY;
let undoStack = [];
let snapshot;
let hasStarted = false;

// Fill canvas white on init
ctx.fillStyle = '#ffffff';
ctx.fillRect(0, 0, canvas.width, canvas.height);

// Save initial state
saveState();

// ── State Management ──────────────────────────────────────────────────────────

function saveState() {
  undoStack.push(canvas.toDataURL());
  if (undoStack.length > 30) undoStack.shift();
}

function undoLast() {
  if (undoStack.length <= 1) {
    showToast('Tidak ada yang bisa di-undo', 'error');
    return;
  }
  undoStack.pop();
  const img = new Image();
  img.src = undoStack[undoStack.length - 1];
  img.onload = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
  };
}

// ── Tool Setup ────────────────────────────────────────────────────────────────

function setTool(tool) {
  currentTool = tool;
  document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
  const btn = document.getElementById('tool' + tool.charAt(0).toUpperCase() + tool.slice(1));
  if (btn) btn.classList.add('active');

  // Update cursor
  const cursors = {
    pen: 'crosshair',
    brush: 'crosshair',
    marker: 'crosshair',
    line: 'crosshair',
    rect: 'crosshair',
    circle: 'crosshair',
    fill: 'cell',
    eraser: 'cell'
  };
  canvas.style.cursor = cursors[tool] || 'crosshair';
}

function setColor(hex) {
  currentColor = hex;
  document.querySelectorAll('.color-swatch').forEach(s => {
    s.classList.toggle('active', s.style.background === hex || s.onclick?.toString().includes(hex));
  });
  document.getElementById('currentSwatch').style.background = hex;
  document.getElementById('currentColorHex').textContent = hex;
  document.getElementById('customColor').value = hex;
  updateSizePreview();
}

function updateBrushSize(val) {
  brushSize = parseInt(val);
  document.getElementById('brushSizeVal').textContent = val + 'px';
  updateSizePreview();
}

function updateOpacity(val) {
  opacity = parseInt(val) / 100;
  document.getElementById('opacityVal').textContent = val + '%';
}

function updateSizePreview() {
  const pc = document.getElementById('sizePreview');
  const pctx = pc.getContext('2d');
  pctx.clearRect(0, 0, 60, 60);
  pctx.beginPath();
  pctx.arc(30, 30, Math.min(brushSize / 2, 28), 0, Math.PI * 2);
  pctx.fillStyle = currentColor;
  pctx.fill();
}

function clearCanvas() {
  saveState();
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  showToast('Canvas dibersihkan');
}

// Init preview
updateSizePreview();
setColor('#1a1a2e');

// ── Drawing Logic ─────────────────────────────────────────────────────────────

function getPos(e) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;
  return {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top) * scaleY
  };
}

function applyBrushStyle(toolCtx, size = brushSize) {
  const alpha = opacity;
  if (currentTool === 'eraser') {
    toolCtx.globalCompositeOperation = 'destination-out';
    toolCtx.strokeStyle = `rgba(0,0,0,${alpha})`;
  } else if (currentTool === 'marker') {
    toolCtx.globalCompositeOperation = 'source-over';
    const c = hexToRgb(currentColor);
    toolCtx.strokeStyle = `rgba(${c.r},${c.g},${c.b},0.5)`;
  } else {
    toolCtx.globalCompositeOperation = 'source-over';
    const c = hexToRgb(currentColor);
    toolCtx.strokeStyle = `rgba(${c.r},${c.g},${c.b},${alpha})`;
    toolCtx.fillStyle = `rgba(${c.r},${c.g},${c.b},${alpha})`;
  }
  toolCtx.lineWidth = size;
  toolCtx.lineCap = 'round';
  toolCtx.lineJoin = 'round';
}

canvas.addEventListener('mousedown', startDraw);
canvas.addEventListener('mousemove', draw);
canvas.addEventListener('mouseup', stopDraw);
canvas.addEventListener('mouseleave', stopDraw);
canvas.addEventListener('touchstart', e => { e.preventDefault(); startDraw(e); }, { passive: false });
canvas.addEventListener('touchmove', e => { e.preventDefault(); draw(e); }, { passive: false });
canvas.addEventListener('touchend', e => { e.preventDefault(); stopDraw(e); });

function startDraw(e) {
  isDrawing = true;
  const pos = getPos(e);
  startX = pos.x;
  startY = pos.y;

  // Mark canvas as started
  if (!hasStarted) {
    hasStarted = true;
    canvas.parentElement.classList.add('started');
  }

  if (currentTool === 'fill') {
    floodFill(Math.round(startX), Math.round(startY), currentColor);
    return;
  }

  // Save snapshot for shape tools
  if (['line', 'rect', 'circle'].includes(currentTool)) {
    snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
  }

  ctx.beginPath();
  ctx.moveTo(startX, startY);
  applyBrushStyle(ctx);
}

function draw(e) {
  if (!isDrawing) return;
  const pos = getPos(e);

  if (['line', 'rect', 'circle'].includes(currentTool)) {
    ctx.putImageData(snapshot, 0, 0);
    applyBrushStyle(ctx);
    ctx.beginPath();

    if (currentTool === 'line') {
      ctx.moveTo(startX, startY);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    } else if (currentTool === 'rect') {
      const w = pos.x - startX, h = pos.y - startY;
      ctx.strokeRect(startX, startY, w, h);
    } else if (currentTool === 'circle') {
      const rx = Math.abs(pos.x - startX) / 2;
      const ry = Math.abs(pos.y - startY) / 2;
      const cx = startX + (pos.x - startX) / 2;
      const cy = startY + (pos.y - startY) / 2;
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    return;
  }

  // Brush tools
  applyBrushStyle(ctx);
  const size = currentTool === 'brush' ? brushSize * 2 : brushSize;
  ctx.lineWidth = size;
  ctx.lineTo(pos.x, pos.y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(pos.x, pos.y);
}

function stopDraw() {
  if (!isDrawing) return;
  isDrawing = false;
  ctx.globalCompositeOperation = 'source-over';
  saveState();
}

// ── Flood Fill ────────────────────────────────────────────────────────────────

function floodFill(x, y, fillHex) {
  saveState();
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;
  const fillRgb = hexToRgb(fillHex);

  const idx = (x + y * canvas.width) * 4;
  const targetR = data[idx], targetG = data[idx + 1], targetB = data[idx + 2], targetA = data[idx + 3];

  if (targetR === fillRgb.r && targetG === fillRgb.g && targetB === fillRgb.b) return;

  const stack = [[x, y]];
  const visited = new Set();

  while (stack.length > 0) {
    const [cx, cy] = stack.pop();
    const key = cx + ',' + cy;
    if (visited.has(key)) continue;
    if (cx < 0 || cx >= canvas.width || cy < 0 || cy >= canvas.height) continue;

    const i = (cx + cy * canvas.width) * 4;
    if (Math.abs(data[i] - targetR) > 30 || Math.abs(data[i+1] - targetG) > 30 || Math.abs(data[i+2] - targetB) > 30) continue;

    visited.add(key);
    data[i] = fillRgb.r;
    data[i + 1] = fillRgb.g;
    data[i + 2] = fillRgb.b;
    data[i + 3] = 255;

    stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
  }

  ctx.putImageData(imgData, 0, 0);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
}

// Keyboard shortcut: Ctrl+Z = Undo
document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
    e.preventDefault();
    undoLast();
  }
});
