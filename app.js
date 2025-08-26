const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const userInfo = document.getElementById('userInfo');
const usernameLabel = document.getElementById('usernameLabel');
const loginModal = document.getElementById('loginModal');
const usernameInput = document.getElementById('usernameInput');
const confirmLogin = document.getElementById('confirmLogin');

const spinBtn = document.getElementById('spinBtn');
const wheelCanvas = document.getElementById('wheelCanvas');
Wheel.drawWheel(wheelCanvas);

// Kontroller
const speedSelect = document.getElementById('speedSelect');
const tickSoundChk = document.getElementById('tickSoundChk');
const flashChk = document.getElementById('flashChk');

Wheel.setOptions({ speed: speedSelect.value, tick: tickSoundChk.checked, flash: flashChk.checked });

speedSelect?.addEventListener('change', () => Wheel.setOptions({ speed: speedSelect.value }));
tickSoundChk?.addEventListener('change', () => Wheel.setOptions({ tick: tickSoundChk.checked }));
flashChk?.addEventListener('change', () => Wheel.setOptions({ flash: flashChk.checked }));

const popup = document.getElementById('popup');
const popupTitle = document.getElementById('popupTitle');
const popupMsg = document.getElementById('popupMsg');
const popupClose = document.getElementById('popupClose');

function getUsername() { return localStorage.getItem('username'); }
function setUsername(u) { localStorage.setItem('username', u); }
function clearSession() { localStorage.removeItem('username'); }

function refreshAuthUI() {
  const u = getUsername();
  if (!u) {
    loginBtn.classList.remove('hidden');
    userInfo.classList.add('hidden');
  } else {
    loginBtn.classList.add('hidden');
    userInfo.classList.remove('hidden');
    usernameLabel.textContent = '@' + u;
  }
}

loginBtn.addEventListener('click', () => loginModal.showModal());
confirmLogin.addEventListener('click', (e) => {
  e.preventDefault();
  const raw = usernameInput.value.trim().replace(/^@/, '');
  if (raw) { setUsername(raw); refreshAuthUI(); }
  loginModal.close();
});
logoutBtn.addEventListener('click', () => { clearSession(); refreshAuthUI(); });

popupClose.addEventListener('click', () => popup.close());

// ✅ Spin işlemi
spinBtn.addEventListener('click', async () => {
  const u = getUsername();
  if (!u) { loginModal.showModal(); return; }
  spinBtn.disabled = true;

  try {
    // Supabase Edge Function çağrısı
    const resp = await fetch(`${window.EDGE_BASE}/spin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: u })
    });

    if (!resp.ok) throw new Error("Spin isteği başarısız");

    const data = await resp.json();
    console.log("Spin sonucu:", data);

    // Backend’den gelen key’e göre doğru dilimi bul
    const idx = pickIndexForResult(data.result.key);

    Wheel.spinWheelToIndex(wheelCanvas, idx, () => {
      popupTitle.textContent = "Sonuç";
      popupMsg.textContent = "Kazandın: " + Wheel.WHEEL_SEGMENTS[idx].label;
      popup.showModal();
      spinBtn.disabled = false;
    });

  } catch (err) {
    console.error("Spin hatası:", err);
    popupTitle.textContent = "Hata";
    popupMsg.textContent = err.message;
    popup.showModal();
    spinBtn.disabled = false;
  }
});

refreshAuthUI();


// ✅ Yardımcı: result.key → doğru dilim
function pickIndexForResult(resultKey) {
  const matches = Wheel.WHEEL_SEGMENTS
    .map((seg, i) => [seg.key, i])
    .filter(([k]) => k === resultKey)
    .map(([_, i]) => i);

  return matches[Math.floor(Math.random() * matches.length)];
}
