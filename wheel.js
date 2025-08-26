// ---------- REALISTIC 12-SEGMENT WHEEL (Casino Style) ----------
// Backend anahtarlarıyla uyumlu: promocode / points / pass / extra_spin

const WHEEL_SEGMENTS = [
  { key: 'promocode',  label: 'Promocode' },
  { key: 'points',     label: '+ Puan'   },
  { key: 'pass',       label: 'Pass'     },
  { key: 'points',     label: '+ Puan'   },
  { key: 'extra_spin', label: 'Ekstra'   },
  { key: 'points',     label: '+ Puan'   },
  { key: 'promocode',  label: 'Promocode'},
  { key: 'points',     label: '+ Puan'   },
  { key: 'pass',       label: 'Pass'     },
  { key: 'points',     label: '+ Puan'   },
  { key: 'extra_spin', label: 'Ekstra'   },
  { key: 'points',     label: '+ Puan'   },
];

// Doygun casino paleti
const PALETTE = [
  '#e63946','#ffb703','#8ecae6','#8338ec',
  '#fb5607','#06d6a0','#ff006e','#3a86ff',
  '#f77f00','#7209b7','#118ab2','#ffd60a'
];

let currentRotation = 0;                   // deg (GSAP rotate)
let tickIndex = -1;
let options = { speed: 'normal', tick: true, flash: true };
let centerLogo = null;
let hidpiApplied = false;
let lastDraw = { cx: 0, cy: 0, R: 0 };

// Kısa "klik" sesi
const tickAudio = new Audio(
  "data:audio/wav;base64,UklGRoQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABYAAAChAAAAPwAAACoAAABtZGF0YUEAAACAgYCBgYGBgYCAgICAgYGBgYGBgYGBgYGBgYGBgICAgICAgYGBgYGBgYGAf39/f39/f4GBgYGBgYGBgYCAgICAgICAgIGBgYGBgYGBgYGBgYGBgYGBgICAgICAgIGBgYGBgYGBgYGBgYGBgYGAg=="
);

// Opsiyonel merkez logo (repo köküne logo.png koyarsan)
(function loadLogo(){
  const img = new Image();
  img.onload  = () => (centerLogo = img);
  img.onerror = () => (centerLogo = null);
  img.src = 'logo.png';
})();

function setOptions(next) { options = { ...options, ...next }; }

// ---- Yardımcılar ----
function setupHiDPI(canvas) {
  const dpr = window.devicePixelRatio || 1;
  const cssW = canvas.getAttribute('width')  ? parseInt(canvas.getAttribute('width'),10)  : canvas.clientWidth;
  const cssH = canvas.getAttribute('height') ? parseInt(canvas.getAttribute('height'),10) : canvas.clientHeight;
  canvas.width  = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);   // artık çizimler CSS pikselinde
  canvas._dpr = dpr;
  canvas._cssW = cssW;
  canvas._cssH = cssH;
  hidpiApplied = true;
}

function lighten(hex, amt=0.2){
  const c = hex.replace('#',''); const n=parseInt(c,16);
  let r=(n>>16)&255, g=(n>>8)&255, b=n&255;
  r=Math.min(255, Math.floor(r+(255-r)*amt));
  g=Math.min(255, Math.floor(g+(255-g)*amt));
  b=Math.min(255, Math.floor(b+(255-b)*amt));
  return `rgb(${r},${g},${b})`;
}
function darken(hex, amt=0.25){
  const c = hex.replace('#',''); const n=parseInt(c,16);
  let r=(n>>16)&255, g=(n>>8)&255, b=n&255;
  r=Math.max(0, Math.floor(r*(1-amt)));
  g=Math.max(0, Math.floor(g*(1-amt)));
  b=Math.max(0, Math.floor(b*(1-amt)));
  return `rgb(${r},${g},${b})`;
}

function drawSegmentText(ctx, text, cx, cy, radius, midAngleRad) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(midAngleRad - Math.PI/2);    // 12 yönüne hizalı
  const r = radius * 0.55;                // merkeze daha yakın → okunaklı

  ctx.font = '700 22px Inter, Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Siyah dış hat + parlak beyaz
  ctx.lineWidth = 5;
  ctx.strokeStyle = 'rgba(0,0,0,.65)';
  ctx.fillStyle = '#fff';
  ctx.strokeText(text.toUpperCase(), 0, -r);
  ctx.fillText(text.toUpperCase(), 0, -r);

  ctx.restore();
}

// ---- Çizim ----
function drawWheel(canvas) {
  if (!hidpiApplied) setupHiDPI(canvas);

  const ctx = canvas.getContext('2d');
  const cssW = canvas._cssW || canvas.width;
  const cssH = canvas._cssH || canvas.height;
  const cx = cssW / 2, cy = cssH / 2;
  const R  = Math.min(cx, cy) - 22;
  lastDraw = { cx, cy, R };

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Arka gölge
  ctx.save();
  ctx.beginPath(); ctx.arc(cx, cy, R + 14, 0, Math.PI*2);
  ctx.shadowColor = 'rgba(0,0,0,.45)'; ctx.shadowBlur = 30;
  ctx.fillStyle = '#0b142c'; ctx.fill(); ctx.restore();

  // Altın dış çerçeve
  const ringGrad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  ringGrad.addColorStop(0,   '#ffd700');
  ringGrad.addColorStop(0.5, '#ffb703');
  ringGrad.addColorStop(1,   '#e09f3e');
  ctx.beginPath(); ctx.arc(cx, cy, R + 10, 0, Math.PI*2);
  ctx.lineWidth = 20; ctx.strokeStyle = ringGrad; ctx.stroke();

  // Başlangıç açısı: tepe (12 o'clock)
  const n = WHEEL_SEGMENTS.length;
  const base = -Math.PI/2;

  for (let i = 0; i < n; i++) {
    const start = base + (i / n) * Math.PI * 2;
    const end   = base + ((i + 1) / n) * Math.PI * 2;
    const mid   = (start + end) / 2;

    // Parlak gövde + koyu kenar
    const segGrad = ctx.createRadialGradient(cx, cy, R*0.2, cx, cy, R);
    segGrad.addColorStop(0, lighten(PALETTE[i], 0.2));
    segGrad.addColorStop(1, darken(PALETTE[i], 0.25));

    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, R, start, end); ctx.closePath();
    ctx.fillStyle = segGrad; ctx.fill();

    // İnce ayraç
    ctx.save(); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,255,255,.35)';
    ctx.beginPath(); ctx.arc(cx, cy, R, start, start); ctx.stroke(); ctx.restore();

    drawSegmentText(ctx, WHEEL_SEGMENTS[i].label, cx, cy, R, mid);
  }

  // Cam parlama
  ctx.save();
  const glossGrad = ctx.createLinearGradient(0, cy - R, 0, cy + R);
  glossGrad.addColorStop(0, 'rgba(255,255,255,.22)');
  glossGrad.addColorStop(0.45, 'rgba(255,255,255,.06)');
  glossGrad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.beginPath();
  ctx.arc(cx, cy, R, -Math.PI, 0);
  ctx.lineTo(cx + R, cy);
  ctx.arc(cx, cy, R, 0, Math.PI, true);
  ctx.closePath();
  ctx.fillStyle = glossGrad; ctx.fill();
  ctx.restore();

  // Merkez logo / metal hub
  ctx.save();
  if (centerLogo) {
    const rr = 36;
    ctx.beginPath(); ctx.arc(cx, cy, rr, 0, Math.PI*2); ctx.clip();
    ctx.drawImage(centerLogo, cx - rr, cy - rr, rr*2, rr*2);
    ctx.restore();
    ctx.beginPath(); ctx.arc(cx, cy, rr + 2, 0, Math.PI*2);
    ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 2; ctx.stroke();
  } else {
    const hubGrad = ctx.createRadialGradient(cx, cy, 4, cx, cy, 26);
    hubGrad.addColorStop(0, '#d9e2f8'); hubGrad.addColorStop(1, '#7e8ea8');
    ctx.beginPath(); ctx.arc(cx, cy, 22, 0, Math.PI*2);
    ctx.fillStyle = hubGrad; ctx.shadowColor = 'rgba(0,0,0,.4)'; ctx.shadowBlur = 8; ctx.fill();
    ctx.restore();
  }
}

// Kazanan dilimde kısa parlama
function flashWinner(canvas, index) {
  if (!options.flash) return;
  const ctx = canvas.getContext('2d');
  const { cx, cy, R } = lastDraw;
  const n = WHEEL_SEGMENTS.length;
  const base = -Math.PI/2;
  const start = base + (index / n) * Math.PI * 2;
  const end   = base + ((index + 1) / n) * Math.PI * 2;

  let alpha = { v: 0 };
  const tl = gsap.timeline();
  for (let i=0;i<3;i++){
    tl.to(alpha, { v: 0.85, duration: 0.12, onUpdate: draw, ease: "power2.out" })
      .to(alpha, { v: 0,    duration: 0.22, onUpdate: draw, ease: "power2.in"  });
  }
  function draw() {
    drawWheel(canvas);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, R, start, end); ctx.closePath();
    ctx.fillStyle = `rgba(255,255,255,${alpha.v})`;
    ctx.shadowColor = 'rgba(255,255,255,.9)'; ctx.shadowBlur = 30; ctx.fill();
    ctx.restore();
  }
}

// Dönüş (iğne üstte → hedef açı segment merkezi)
function spinWheelToIndex(canvas, index, onDone) {
  const n = WHEEL_SEGMENTS.length;
  const segmentAngle = 360 / n;

  const dur =
    options.speed === 'fast' ? 2.4 :
    options.speed === 'slow' ? 5.0 : 3.6;

  const targetAngle = 360 * 6 + (segmentAngle * index) + (segmentAngle / 2);
  tickIndex = Math.floor((currentRotation % 360) / segmentAngle);

  gsap.to(canvas, {
    duration: dur,
    ease: "power4.inOut",
    rotate: -targetAngle,
    onUpdate: function () {
      const r = Math.abs(this.targets()[0]._gsap.rotation);
      currentRotation = r;
      if (!options.tick) return;
      const idx = Math.floor(((r % 360) / segmentAngle));
      if (idx !== tickIndex) {
        tickIndex = idx;
        try { tickAudio.currentTime = 0; tickAudio.play(); } catch {}
      }
    },
    onComplete: () => {
      if (options.flash) flashWinner(canvas, index);
      if (onDone) onDone();
    },
  });
}

window.Wheel = { drawWheel, spinWheelToIndex, WHEEL_SEGMENTS, setOptions };
