// ================== Auth / UI ==================
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const userInfo = document.getElementById('userInfo');
const usernameLabel = document.getElementById('usernameLabel');
const loginModal = document.getElementById('loginModal');
const usernameInput = document.getElementById('usernameInput');
const confirmLogin = document.getElementById('confirmLogin');

// ================== Wheel ==================
const spinBtn = document.getElementById('spinBtn');
const wheelCanvas = document.getElementById('wheelCanvas');
Wheel.drawWheel(wheelCanvas);

// Kontroller
const speedSelect = document.getElementById('speedSelect');
const tickSoundChk = document.getElementById('tickSoundChk');
const flashChk = document.getElementById('flashChk');

// Varsayılanları aktar
Wheel.setOptions({
  speed: speedSelect?.value || 'normal',
  tick: !!tickSoundChk?.checked,
  flash: !!flashChk?.checked
});

// Değişiklikleri dinle
speedSelect?.addEventListener('change', () =>
  Wheel.setOptions({ speed: speedSelect.value })
);
tickSoundChk?.addEventListener('change', () =>
  Wheel.setOptions({ tick: tickSoundChk.checked })
);
flashChk?.addEventListener('change', () =>
  Wheel.setOptions({ flash: flashChk.checked })
);

// Popup
const popup = document.getElementById('popup');
const popupTitle = document.getElementById('popupTitle');
const popupMsg = document.getElementById('popupMsg');
const popupClose = document.getElementById('popupClose');
popupClose?.addEventListener('click', () => popup.close());

// ================== Local auth helpers ==================
function getUsername() { return localStorage.getItem('username'); }
function setUsername(u) { localStorage.setItem('username', u); }
function clearSession() { localStorage.removeItem('username'); }

function refreshAuthUI() {
  const u = getUsername();
  if (!u) {
    loginBtn?.classList.remove('hidden');
    userInfo?.classList.add('hidden');
  } else {
    loginBtn?.classList.add('hidden');
    userInfo?.classList.remove('hidden');
    if (usernameLabel) usernameLabel.textContent = '@' + u;
  }
}

loginBtn?.addEventListener('click', () => loginModal?.showModal());
confirmLogin?.addEventListener('click', (e) => {
  e.preventDefault();
  const raw = (usernameInput?.value || '').trim().replace(/^@/, '');
  if (raw) { setUsername(raw); refreshAuthUI(); }
  loginModal?.close();
});
logoutBtn?.addEventListener('click', () => { clearSession(); refreshAuthUI(); });

// ================== Spin flow ==================
spinBtn?.addEventListener('click', async () => {
  const u = getUsername();
  if (!u) { loginModal?.showModal(); return; }

  if (!window.EDGE_BASE) {
    popupTitle.textContent = "Hata";
    popupMsg.textContent = "EDGE_BASE tanımlı değil (supabaseClient.js kontrol et).";
    popup.showModal();
    return;
  }
  if (!window.SUPABASE_ANON_KEY) {
    popupTitle.textContent = "Hata";
    popupMsg.textContent = "Anon key tanımlı değil (supabaseClient.js kontrol et).";
    popup.showModal();
    return;
  }

  spinBtn.disabled = true;

  try {
    // Supabase Edge Function çağrısı (Authorization eklendi)
    const resp = await fetch(`${window.EDGE_BASE}/spin`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${window.SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({ username: u })
    });

    const text = await resp.text(); // debug için görebil
    if (!resp.ok) {
      throw new Error(`Spin isteği başarısız (HTTP ${resp.status}): ${text}`);
    }

    const data = JSON.parse(text);
    // Beklenen: { ok:true, result:{ key:'points_10'|'points_20'|'points_50'|'pass', points:number } }
    if (!data?.ok || !data?.result?.key) {
      throw new Error(`Geçersiz yanıt: ${text}`);
    }

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
    popupMsg.textContent = String(err?.message || err);
    popup.showModal();
    spinBtn.disabled = false;
  }
});

refreshAuthUI();

// ================== Helpers ==================
// result.key -> doğru dilimin index'i
function pickIndexForResult(resultKey) {
  // Wheel.WHEEL_SEGMENTS: [{ key: 'points_10', label: '+10', color: ... }, ...]
  const matches = Wheel.WHEEL_SEGMENTS
    .map((seg, i) => [seg.key, i])
    .filter(([k]) => k === resultKey)
    .map(([_, i]) => i);

  // Hiç eşleşme yoksa 0'a dön (fallback)
  if (!matches.length) return 0;

  // Aynı tipten birden fazla dilim varsa rastgele birini seç
  return matches[Math.floor(Math.random() * matches.length)];
}
