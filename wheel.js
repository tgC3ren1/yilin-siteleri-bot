// ---------- REALISTIC 12-SEGMENT WHEEL (Canvas + GSAP) ----------
// Backend anahtarlarıyla uyumlu: promocode, points, pass, extra_spin

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

// Marka paleti (12 renk) — istersen burayı kendi renklerinle değiştir
const PALETTE = [
  '#0ea5e9', '#6ee7b7', '#f59e0b', '#a78bfa',
  '#22d3ee', '#34d399', '#fb923c', '#c084fc',
  '#38bdf8', '#86efac', '#fbbf24', '#d8b4fe'
];

let currentRotation = 0;          // derece
let tickIndex = -1;               // tick tetiklemek için
let options = { speed: 'normal', tick: true, flash: true };
let centerLogo = null;            // Image (logo.png / logo.svg varsa)
let lastDraw = { cx: 0, cy: 0, R: 0 }; // highlight için

// Kısa "klik" sesi (gömülü)
const tickAudio = new Audio(
  "data:audio/wav;base64,UklGRoQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABYAAAChAAAAPwAAACoAAABtZGF0YUEAAACAgYCBgYGBgYCAgICAgYGBgYGBgYGBgYGBgYGBgICAgICAgYGBgYGBgYGAf39/f39/f4GBgYGBgYGBgYCAgICAgICAgIGBgYGBgYGBgYGBgYGBgYGBgICAgICAgIGBgYGBgYGBgYGBgYGBgYGAg=="
);

// İsteğe bağlı merkez logo
(function loadLogo(){
  const img = new Image();
  img.onload = () => { centerLogo = img; };
  img.onerror = () => { centerLogo = null; };
  img.src = 'logo.png'; // repo köküne logo.png koyarsan otomatik gelir
})();

function setOptions(next) {
  options = { ...options, ...next };
}

function drawSegmentText(ctx, text, cx, cy, radius, angle) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);

  ctx.font = '700 18px Inter, Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Kontrast için stroke + fill
  ctx.lineWidth = 4;
  ctx.strokeStyle = 'rgba(0,0,0,.45)';
  ctx.fillStyle = '#fff';

  // Yazıyı segmentin ortasına yakın konumda çiz
  const r = radius * 0.70;
  ctx.strokeText(text.toUpperCase(), 0, -r);
  ctx.fillText(text.toUpperCase(), 0, -r);

  ctx.restore();
}

function drawWheel(canvas) {
  const ctx = canvas.getContext('2d');
  const { width, height } = canvas;
  const cx = width / 2, cy = height / 2;
  const R = Math.min(cx, cy) - 20;
  lastDraw = { cx, cy, R };

  ctx.clearRect(0, 0, width, height);

  // Arka gölge
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, R + 12, 0, Math.PI * 2);
  ctx.shadowColor = 'rgba(0,0,0,.45)';
  ctx.shadowBlur = 30;
  ctx.fillStyle = '#0b142c';
  ctx.fill();
  ctx.restore();

  // Dış metal halka
  const ringGrad = ctx.createLinearGradient(0, 0, width, height);
  ringGrad.addColorStop(0, '#4d5e7a');
  ringGrad.addColorStop(0.5, '#9aa8c1');
  ringGrad.addColorStop(1, '#3f4c65');
  ctx.beginPath();
  ctx.arc(cx, cy, R + 8, 0, Math.PI * 2);
  ctx.lineWidth = 16;
  ctx.strokeStyle = ringGrad;
  ctx.stroke();

  // 12 segment
  const n = WHEEL_SEGMENTS.length;
  for (let i = 0; i < n; i++) {
    const start = (i / n) * Math.PI * 2 + (Math.PI / n);
    const end   = ((i + 1) / n) * Math.PI * 2 + (Math.PI / n);

    // Düz ama doygun renk + hafif radial parlama
    const segGrad = ctx.createRadialGradient(cx, cy, R*0.15, cx, cy, R);
    segGrad.addColorStop(0, shade(PALETTE[i], 0.15));
    segGrad.addColorStop(1, PALETTE[i]);

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, R, start, end);
    ctx.closePath();
    ctx.fillStyle = segGrad;
    ctx.fill();

    // Ayraç çizgisi
    ctx.save();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255,255,255,.35)';
    ctx.beginPath();
    ctx.arc(cx, cy, R, start, start);
    ctx.stroke();
    ctx.restore();

    // Metin
    const mid = start + (end - start) / 2;
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
  ctx.fillStyle = glossGrad;
  ctx.fill();
  ctx.restore();

  // Merkez hub / logo
  ctx.save();
  if (centerLogo) {
    const rr = 36;
    ctx.beginPath();
    ctx.arc(cx, cy, rr, 0, Math.PI*2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(centerLogo, cx - rr, cy - rr, rr*2, rr*2);
    ctx.restore();

    // İnce çerçeve
    ctx.beginPath();
    ctx.arc(cx, cy, rr + 2, 0, Math.PI*2);
    ctx.strokeStyle = 'rgba(255,255,255,.85)';
    ctx.lineWidth = 2;
    ctx.stroke();
  } else {
    const hubGrad = ctx.createRadialGradient(cx, cy, 4, cx, cy, 26);
    hubGrad.addColorStop(0, '#d9e2f8');
    hubGrad.addColorStop(1, '#7e8ea8');
    ctx.beginPath();
    ctx.arc(cx, cy, 22, 0, Math.PI * 2);
    ctx.fillStyle = hubGrad;
    ctx.shadowColor = 'rgba(0,0,0,.4)';
    ctx.shadowBlur = 8;
    ctx.fill();
    ctx.restore();
  }
}

// Küçük renk gölge helper'ı
function shade(hex, amt = 0.15) {
  const c = hex.replace('#','');
  const n = parseInt(c,16);
  let r = (n>>16)&255, g = (n>>8)&255, b = n&255;
  r = Math.min(255, Math.floor(r + (255-r)*amt));
  g = Math.min(255, Math.floor(g + (255-g)*amt));
  b = Math.min(255, Math.floor(b + (255-b)*amt));
  return `rgb(${r},${g},${b})`;
}

// Kazanan dilimi kısa parlama ile vurgula
function flashWinner(canvas, index) {
  if (!options.flash) return;
  const ctx = canvas.getContext('2d');
  const { cx, cy, R } = lastDraw;
  const n = WHEEL_SEGMENTS.length;
  const start = (index / n) * Math.PI * 2 + (Math.PI / n);
  const end   = ((index + 1) / n) * Math.PI * 2 + (Math.PI / n);

  let alpha = { v: 0 };
  const tl = gsap.timeline();
  for (let i=0;i<3;i++){
    tl.to(alpha, { v: 0.85, duration: 0.12, onUpdate: draw, ease: "power2.out" })
      .to(alpha, { v: 0,    duration: 0.22, onUpdate: draw, ease: "power2.in"  });
  }

  function draw() {
    drawWheel(canvas); // önce normal çiz
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, R, start, end);
    ctx.closePath();
    ctx.fillStyle = `rgba(255,255,255,${alpha.v})`;
    ctx.shadowColor = 'rgba(255,255,255,.9)';
    ctx.shadowBlur = 30;
    ctx.fill();
    ctx.restore();
  }
}

function spinWheelToIndex(canvas, index, onDone) {
  const n = WHEEL_SEGMENTS.length;
  const segmentAngle = 360 / n;

  const dur =
    options.speed === 'fast'   ? 2.4 :
    options.speed === 'slow'   ? 5.0 :
                                 3.6;

  const targetAngle = 360 * 6 + (segmentAngle * index) + (segmentAngle/2);
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
