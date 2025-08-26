const WHEEL_SEGMENTS = [
  { key: 'promocode',  label: 'Promocode' },
  { key: 'points',     label: '+ Puan' },
  { key: 'pass',       label: 'Pass' },
  { key: 'extra_spin', label: 'Ekstra Spin' },
];

function drawWheel(canvas) {
  const ctx = canvas.getContext('2d');
  const { width, height } = canvas;
  const cx = width / 2, cy = height / 2, r = cx - 10;

  const n = WHEEL_SEGMENTS.length;
  for (let i = 0; i < n; i++) {
    const start = (i / n) * 2 * Math.PI;
    const end   = ((i + 1) / n) * 2 * Math.PI;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, start, end);
    ctx.closePath();
    ctx.fillStyle = i % 2 ? "#0ea5e9" : "#9333ea";
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = "bold 14px sans-serif";
    ctx.fillText(WHEEL_SEGMENTS[i].label, cx + Math.cos(start+(end-start)/2)*r*0.6, cy + Math.sin(start+(end-start)/2)*r*0.6);
  }
}

function spinWheelToIndex(canvas, index, onDone) {
  const n = WHEEL_SEGMENTS.length;
  const segmentAngle = 360 / n;
  const target = 360 * 5 + segmentAngle * index + segmentAngle/2;
  gsap.to(canvas, { duration: 3, rotate: -target, ease: "power4.inOut", onComplete: onDone });
}

window.Wheel = { drawWheel, spinWheelToIndex, WHEEL_SEGMENTS };
