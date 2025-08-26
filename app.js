// ======================= app.js (tam sürüm) =======================

// --- UI referansları
const loginBtn       = document.getElementById('loginBtn');
const logoutBtn      = document.getElementById('logoutBtn');
const userInfo       = document.getElementById('userInfo');
const usernameLabel  = document.getElementById('usernameLabel');
const loginModal     = document.getElementById('loginModal');
const usernameInput  = document.getElementById('usernameInput');
const confirmLogin   = document.getElementById('confirmLogin');

const spinBtn        = document.getElementById('spinBtn');
const wheelCanvas    = document.getElementById('wheelCanvas');

// Kontrol çubuğu
const speedSelect    = document.getElementById('speedSelect');
const tickSoundChk   = document.getElementById('tickSoundChk');
const flashChk       = document.getElementById('flashChk');

// Popup
const popup          = document.getElementById('popup');
const popupTitle     = document.getElementById('popupTitle');
const popupMsg       = document.getElementById('popupMsg');
const popupClose     = document.getElementById('popupClose');

// Profil metrikleri (varsa)
const todayStatusEl  = document.getElementById('todayStatus');
const totalSpinsEl   = document.getElementById('totalSpins');
const myPointsEl     = document.getElementById('myPoints');

// --- Basit oturum yardımcıları
function getUsername()  { return localStorage.getItem('username'); }
function setUsername(u) { localStorage.setItem('username', u); }
function clearSession() { localStorage.removeItem('username'); }

// --- Auth UI tazele
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

// --- Basit popup
function showPopup(title, msg) {
  popupTitle.textContent = title;
  popupMsg.textContent   = msg;
  popup.showModal();
}

// --- (Opsiyonel) profil metriklerini güncelle (backend ile doldurabilirsin)
async function updateProfile() {
  // Supabase ile veriyi çekip set edebilirsin. Şimdilik boş kalsın.
  // todayStatusEl && (todayStatusEl.textContent = '—');
  // totalSpinsEl  && (totalSpinsEl.textContent  = '0');
  // myPointsEl    && (myPointsEl.textContent    = '0');
}

// --- Wheel ilk çizim + kontroller
Wheel.drawWheel(wheelCanvas);
Wheel.setOptions({ speed: speedSelect?.value || 'normal', tick: !!tickSoundChk?.checked, flash: !!flashChk?.checked });

speedSelect?.addEventListener('change', () =>
  Wheel.setOptions({ speed: speedSelect.value })
);
tickSoundChk?.addEventListener('change', () =>
  Wheel.setOptions({ tick: tickSoundChk.checked })
);
flashChk?.addEventListener('change', () =>
  Wheel.setOptions({ flash: flashChk.checked })
);

// ================================================================
// Yardımcı: backend sonucu (key) → aynı tipten rastgele dilim index'i
// resultKey: 'pass' | 'points_10' | 'points_20' | 'points_50'
function pickIndexForResult(resultKey) {
  const matches = Wheel.WHEEL_SEGMENTS
    .map((seg, i) => [seg.key, i])
    .filter(([k]) => k === resultKey)
    .map(([, i]) => i);

  // Güvenlik: eşleşme yoksa rasgele bir dilime düş
  if (!matches.length) return Math.floor(Math.random() * Wheel.WHEEL_SEGMENTS.length);
  return matches[Math.floor(Math.random() * matches.length)];
}
// ================================================================

// --- Login/Logout
loginBtn.addEventListener('click', () => loginModal.showModal());
confirmLogin.addEventListener('click', (e) => {
  e.preventDefault();
  const raw = usernameInput.value.trim().replace(/^@/, '');
  if (raw) { setUsername(raw); refreshAuthUI(); updateProfile(); }
  loginModal.close();
});
logoutBtn.addEventListener('click', () => { clearSession(); refreshAuthUI(); updateProfile(); });
popupClose.addEventListener('click', () => popup.close());

// --- Spin akışı
spinBtn.addEventListener('click', async () => {
  const username = getUsername();
  if (!username) { loginModal.showModal(); return; }

  spinBtn.disabled = true;

  // Backend URL'lerini (varsa) supabaseClient.js içinde window.* olarak set ettiğini varsayıyorum:
  // window.EDGE_BASE = 'https://<your-supabase-edge>.functions.supabase.co';
  // /spin endpoint'i: { ok:true, result:{ key:'points_10'|'points_20'|'points_50'|'pass', points:number } }
  let result = null;

  try {
    if (window.EDGE_BASE) {
      const res = await fetch(`${window.EDGE_BASE}/spin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.message || 'Spin başarısız');
      result = data.result; // { key, points }
    } else {
      // ---- Fallback DEMO (backend yoksa) ----
      // %1 → +50, %6 → +20, %18 → +10, kalan PASS
      const r = Math.random();
      if      (r < 0.01) result = { key: 'points_50', points: 50 };
      else if (r < 0.07) result = { key: 'points_20', points: 20 };
      else if (r < 0.25) result = { key: 'points_10', points: 10 };
      else               result = { key: 'pass',      points: 0  };
    }

    // Hangi dilime çevireceğimizi seç
    const idx = pickIndexForResult(result.key);

    // Çevrilince popup + (opsiyonel) profil güncelle
    Wheel.spinWheelToIndex(wheelCanvas, idx, async () => {
      const label =
        result.key === 'pass'      ? 'PASS'
      : result.key === 'points_10' ? '+10 Puan'
      : result.key === 'points_20' ? '+20 Puan'
      : result.key === 'points_50' ? '+50 Puan'
      : result.key;

      showPopup('Sonuç', `Kazandın: ${label}`);
      await updateProfile();
      spinBtn.disabled = false;
    });

  } catch (err) {
    console.error(err);
    showPopup('Hata', (err && err.message) || 'Spin sırasında bir sorun oluştu.');
    spinBtn.disabled = false;
  }
});

// --- İlk yüklemede UI
refreshAuthUI();
updateProfile();
// ================================================================
// ===================== / app.js – bitti =========================
