// --- Realistic Prize Wheel (Canvas + GSAP) ---
const WHEEL_SEGMENTS = [
  { key: 'promocode',  label: 'Promocode' },
  { key: 'points',     label: '+ Puan' },
  { key: 'pass',       label: 'Pass' },
  { key: 'points',     label: '+ Puan' },
  { key: 'extra_spin', label: 'Ekstra Spin' },
  { key: 'points',     label: '+ Puan' },
  { key: 'pass',       label: 'Pass' },
  { key: 'points',     label: '+ Puan' },
];

let currentRotation = 0; // derece
let tickIndex = -1;      // tick tetiklemek için

// kısa "klik" sesi
const tickAudio = new Audio(
  "data:audio/wav;base64,UklGRoQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABYAAAChAAAAPwAAACoAAABtZGF0YUEAAACAgYCBgYGBgYCAgICAgYGBgYGBgYGBgYGBgYGBgICAgICAgYGBgYGBgYGAf39/f39/f4GBgYGBgYGBgYCAgICAgICAgIGBgYGBgYGBgYGBgYGBgYGBgICAgICAgIGBgYGBgYGBgYGBgYGBgYGAg=="
);

function drawCurvedText(ctx, text, cx, cy, radius, angle) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 16px Inter, Arial, sans-serif';
  ctx.rotate(-Math.PI / 2);
  ctx.save();
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    ctx.rotate((Math.PI * 2) / (text.length * 24));
    ctx.save();
    ctx.translate(0, -radius);
    ctx.fillText(ch, 0, 0);
    ctx.restore();
  }
  ctx.restore();
  ctx.restore();
}

function drawWheel(canvas) {
  const ctx = canvas.getContext('2d');
  const { width, height } = canvas;
  const cx = width / 2, cy = height / 2;
  const R = Math.min(cx, cy) - 20;

  ctx.clearRect(0, 0, width, height);

  // arka gölge
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, R + 12, 0, Math.PI * 2);
  ctx.shadowColor = 'rgba(0,0,0,.45)';
  ctx.shadowBlur = 30;
  ctx.fillStyle = '#0b142c';
  ctx.fill();
  ctx.restore();

  // dış metal halka
  const ringGrad = ctx.createLinearGradient(0, 0, width, height);
  ringGrad.addColorStop(0, '#4d5e7a');
  ringGrad.addColorStop(0.5, '#9aa8c1');
  ringGrad.addColorStop(1, '#3f4c65');
  ctx.beginPath();
  ctx.arc(cx, cy, R + 8, 0, Math.PI * 2);
  ctx.lineWidth = 16;
  ctx.strokeStyle = ringGrad;
  ctx.stroke();

  // segmentler
  const n = WHEEL_SEGMENTS.length;
  for (let i = 0; i < n; i++) {
    const start = (i / n) * Math.PI * 2 + (Math.PI / n);
    const end   = ((i + 1) / n) * Math.PI * 2 + (Math.PI / n);

    const hue = (i * (360 / n)) | 0;
    const segGrad = ctx.createRadialGradient(cx, cy, R*0.2, cx, cy, R);
    segGrad.addColorStop(0, `hsla(${(hue+18)%360}, 85%, 62%, .98)`);
    segGrad.addColorStop(1, `hsla(${(hue+340)%360}, 90%, 44%, .98)`);

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, R, start, end);
    ctx.closePath();
    ctx.fillStyle = segGrad;
    ctx.fill();

    // ayraç
    ctx.save();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255,255,255,.35)';
    ctx.beginPath();
    ctx.arc(cx, cy, R, start, start);
    ctx.stroke();
    ctx.restore();

    // kavisli yazı
    const mid = start + (end - start) / 2;
    drawCurvedText(ctx, WHEEL_SEGMENTS[i].label.toUpperCase(), cx, cy, R * 0.72, mid);
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
  ctx.fillStyle = glossGrad;
  ctx.fill();

  // merkez hub
  const hubGrad = ctx.createRadialGradient(cx, cy, 4, cx, cy, 26);
  hubGrad.addColorStop(0, '#d9e2f8');
  hubGrad.addColorStop(1, '#7e8ea8');
  ctx.beginPath();
  ctx.arc(cx, cy, 22, 0, Math.PI * 2);
  ctx.fillStyle = hubGrad;
  ctx.shadowColor = 'rgba(0,0,0,.4)';
  ctx.shadowBlur = 8;
  ctx.fill();
}

function spinWheelToIndex(canvas, index, onDone) {
  const n = WHEEL_SEGMENTS.length;
  const segmentAngle = 360 / n;
  const targetAngle = 360 * 6 + (segmentAngle * index) + (segmentAngle / 2);

  tickIndex = Math.floor((currentRotation % 360) / segmentAngle);

  gsap.to(canvas, {
    duration: 3.6,
    ease: "power4.inOut",
    rotate: -targetAngle,
    onUpdate: function () {
      const r = Math.abs(this.targets()[0]._gsap.rotation);
      currentRotation = r;
      const idx = Math.floor(((r % 360) / segmentAngle));
      if (idx !== tickIndex) {
        tickIndex = idx;
        try { tickAudio.currentTime = 0; tickAudio.play(); } catch {}
      }
    },
    onComplete: onDone,
  });
}

window.Wheel = { drawWheel, spinWheelToIndex, WHEEL_SEGMENTS };
