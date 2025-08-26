// --------- 12 Segment Realistic Wheel (Top-aligned, HiDPI, Tick, Flash) ---------

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

const PALETTE = [
  '#0ea5e9','#6ee7b7','#f59e0b','#a78bfa',
  '#22d3ee','#34d399','#fb923c','#c084fc',
  '#38bdf8','#86efac','#fbbf24','#d8b4fe'
];

let currentRotation = 0;     // deg (GSAP rotate)
let tickIndex = -1;
let options = { speed: 'normal', tick: true, flash: true };
let centerLogo = null;
let lastDraw = { cx: 0, cy: 0, R: 0 };
let hidpiApplied = false;

// kısa klik sesi
const tickAudio = new Audio(
  "data:audio/wav;base64,UklGRoQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABYAAAChAAAAPwAAACoAAABtZGF0YUEAAACAgYCBgYGBgYCAgICAgYGBgYGBgYGBgYGBgYGBgICAgICAgYGBgYGBgYGAf39/f39/f4GBgYGBgYGBgYCAgICAgICAgIGBgYGBgYGBgYGBgYGBgYGBgICAgICAgIGBgYGBgYGBgYGBgYGBgYGAg=="
);

// logo (varsa)
(function loadLogo(){
  const img = new Image();
  img.onload = () => centerLogo = img;
  img.onerror = () => centerLogo = null;
  img.src = 'logo.png';
})();

function setOptions(next) { options = { ...options, ...next }; }

function setupHiDPI(canvas) {
  const dpr = window.devicePixelRatio || 1;
  // CSS boyutunu koruyup kaynak boyutu büyüt
  const cssW = canvas.getAttribute('width') ? parseInt(canvas.getAttribute('width'),10) : canvas.clientWidth;
  const cssH = canvas.getAttribute('height')? parseInt(canvas.getAttribute('height'),10): canvas.clientHeight;
  canvas.width  = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  hidpiApplied = true;
}

function drawSegmentText(ctx, text, cx, cy, radius, midAngleRad) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(midAngleRad);            // metni dilimin orta açısına döndür
  ctx.rotate(-Math.PI/2);             // yukarı doğru hizala (12 yönü)
  const r = radius * 0.66;

  ctx.font = '700 20px Inter, Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Kontrast: stroke + fill
  ctx.lineWidth = 4;
  ctx.strokeStyle = 'rgba(0,0,0,.45)';
  ctx.fillStyle = '#fff';
  ctx.strokeText(text.toUpperCase(), 0, -r);
  ctx.fillText(text.toUpperCase(), 0, -r);

  ctx.restore();
}

function shade(hex, amt = 0.15) {
  const c = hex.replace('#',''); const n = parseInt(c,16);
  let r=(n>>16)&255, g=(n>>8)&255, b=n&255;
  r = Math.min(255, Math.floor(r + (255-r)*amt));
  g = Math.min(255, Math.floor(g + (255-g)*amt));
  b = Math.min(255, Math.floor(b + (255-b)*amt));
  return `rgb(${r},${g},${b})`;
}

function drawWheel(canvas) {
  if (!hidpiApplied) setupHiDPI(canvas);

  const ctx = canvas.getContext('2d');
  const { width, height } = canvas;
  const cx = (width  / (window.devicePixelRatio||1)) / 2;
  const cy = (height / (window.devicePixelRatio||1)) / 2;
  const R  = Math.min(cx, cy) - 20;
  lastDraw = { cx, cy, R };

  ctx.clearRect(0, 0, width, height);

  // arka gölge
  ctx.save();
  ctx.beginPath(); ctx.arc(cx, cy, R + 12, 0, Math.PI*2);
  ctx.shadowColor = 'rgba(0,0,0,.45)'; ctx.shadowBlur = 30;
  ctx.fillStyle = '#0b142c'; ctx.fill(); ctx.restore();

  // dış metal halka
  const ringGrad = ctx.createLinearGradient(0, 0, width, height);
  ringGrad.addColorStop(0, '#4d5e7a'); ringGrad.addColorStop(0.5, '#9aa8c1'); ringGrad.addColorStop(1, '#3f4c65');
  ctx.beginPath(); ctx.arc(cx, cy, R + 8, 0, Math.PI*2);
  ctx.lineWidth = 16; ctx.strokeStyle = ringGrad; ctx.stroke();

  // *** ÖNEMLİ: Başlangıç açısı tepe (12 yönü) ***
  const n = WHEEL_SEGMENTS.length;
  const base = -Math.PI / 2;                // 12 o'clock
  for (let i = 0; i < n; i++) {
    const start = base + (i / n) * Math.PI * 2;
    const end   = base + ((i + 1) / n) * Math.PI * 2;
    const mid   = (start + end) / 2;

    const segGrad = ctx.createRadialGradient(cx, cy, R*0.15, cx, cy, R);
    segGrad.addColorStop(0, shade(PALETTE[i], 0.15));
    segGrad.addColorStop(1, PALETTE[i]);

    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, R, start, end); ctx.closePath();
    ctx.fillStyle = segGrad; ctx.fill();

    // ayraç
    ctx.save(); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,255,255,.35)';
    ctx.beginPath(); ctx.arc(cx, cy, R, start, start); ctx.stroke(); ctx.restore();

    drawSegmentText(ctx, WHEEL_SEGMENTS[i].label, cx, cy, R, mid);
  }

  // cam parlama
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

  // merkez logo / hub
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

function spinWheelToIndex(canvas, index, onDone) {
  const n = WHEEL_SEGMENTS.length;
  const segmentAngle = 360 / n;

  const dur =
    options.speed === 'fast' ? 2.4 :
    options.speed === 'slow' ? 5.0 : 3.6;

  // Başlangıç tepe yönlü olduğundan, hedef: segment merkezi + 0°
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
