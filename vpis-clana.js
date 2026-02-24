function handleVpisClanaPage() {
  const form = document.getElementById("vpis-clana-form");
  if (!form) return;

  const avatarInput = document.getElementById("avatar-input");
  const avatarImg = document.getElementById("avatar-img");
  const avatarDrop = document.getElementById("avatar-drop");
  const btnAvatarRemove = document.getElementById("btn-avatar-remove");
  const btnGenerateClanska = document.getElementById("btn-generate-clanska");

  const priimekEl = document.getElementById("priimek");
  const imeEl = document.getElementById("ime");
  const datumVpisaEl = document.getElementById("datumVpisa");
  const clanskaEl = document.getElementById("clanska");
  const emailEl = document.getElementById("email");
  const telefonEl = document.getElementById("telefon");

  // privzeto datum vpisa = danes
  if (datumVpisaEl && !datumVpisaEl.value) {
    datumVpisaEl.value = todayISO();
  }

  let avatarDataUrl = null;

  // --- Avatar: file -> dataURL
  function loadAvatarFile(file) {
    if (!file) return;
    if (!file.type?.startsWith("image/")) {
      alert("Prosim izberi sliko (JPG/PNG/WebP).");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      avatarDataUrl = ev.target.result;
      if (avatarImg) avatarImg.src = avatarDataUrl;
    };
    reader.readAsDataURL(file);
  }

  if (avatarInput) {
    avatarInput.addEventListener("change", (e) => {
      const file = e.target.files?.[0];
      loadAvatarFile(file);
    });
  }

  if (avatarDrop && avatarInput) {
    const openPicker = () => avatarInput.click();

    avatarDrop.addEventListener("click", openPicker);
    avatarDrop.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") openPicker();
    });

    avatarDrop.addEventListener("dragover", (e) => {
      e.preventDefault();
      avatarDrop.classList.add("dragover");
    });
    avatarDrop.addEventListener("dragleave", () => {
      avatarDrop.classList.remove("dragover");
    });
    avatarDrop.addEventListener("drop", (e) => {
      e.preventDefault();
      avatarDrop.classList.remove("dragover");
      const file = e.dataTransfer?.files?.[0];
      loadAvatarFile(file);
    });
  }

  if (btnAvatarRemove && avatarImg && avatarInput) {
    btnAvatarRemove.addEventListener("click", () => {
      avatarDataUrl = null;
      avatarImg.src = "https://via.placeholder.com/300x300.png?text=CLAN";
      avatarInput.value = "";
    });
  }

  // --- UX: formatiranje imen
  if (priimekEl) {
    priimekEl.addEventListener("blur", () => {
      priimekEl.value = String(priimekEl.value || "").trim().toUpperCase();
    });
  }
  if (imeEl) {
    imeEl.addEventListener("blur", () => {
      imeEl.value = toTitleCase(String(imeEl.value || "").trim());
    });
  }

  // --- Telefon: rahla normalizacija
  if (telefonEl) {
    telefonEl.addEventListener("blur", () => {
      telefonEl.value = normalizePhone(String(telefonEl.value || "").trim());
    });
  }

  // --- Predlagaj člansko (unikat)
  if (btnGenerateClanska && clanskaEl) {
    btnGenerateClanska.addEventListener("click", () => {
      clanskaEl.value = suggestUniqueClanska(getMembers());
      clanskaEl.focus();
    });
  }

  // --- Submit
  form.addEventListener("submit", (e) => {
    e.preventDefault();

    // preberemo podatke preko obstoječe funkcije (core.js)
    const data = readMemberForm(form);

    // dodatno: trim + normalize
    data.priimek = String(data.priimek || "").trim().toUpperCase();
    data.ime = toTitleCase(String(data.ime || "").trim());
    data.telefon = normalizePhone(String(data.telefon || "").trim());
    data.email = String(data.email || "").trim();
    data.clanska = String(data.clanska || "").trim();

    // če datum vpisa prazen -> danes
    if (!data.datumVpisa) data.datumVpisa = todayISO();

    // Validacije
    const err = validateMemberInput(data, getMembers());
    if (err) {
      alert(err);
      return;
    }

    const members = getMembers();
    const newId = members.length ? Math.max(...members.map((m) => m.id)) + 1 : 1;

    const member = {
      id: newId,
      zapSt: newId,
      arhiviran: false,
      avatar: avatarDataUrl,
      ...data,
    };

    members.push(member);
    saveMembers(members);

    addHistory(
      "Vpis člana",
      `Dodan član: ${member.ime} ${member.priimek} (št. ${member.clanska}).`
    );

    alert("Član uspešno dodan.");
    window.location.href = "seznam.html";
  });
}

/* =========================
   Helpers
========================= */

function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function toTitleCase(s) {
  // ohrani šumnike
  return s
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function normalizePhone(raw) {
  if (!raw) return "";
  // odstrani presledke/vezaje
  let s = raw.replaceAll(" ", "").replaceAll("-", "");
  // če uporabnik vpiše 00386 -> +386
  if (s.startsWith("00386")) s = "+386" + s.slice(5);
  // če uporabnik vpiše 386... -> +386...
  if (s.startsWith("386") && !s.startsWith("+386")) s = "+386" + s.slice(3);
  return s;
}

function suggestUniqueClanska(members) {
  const existing = new Set((members || []).map((m) => String(m.clanska || "").trim()));
  // 6-mestne
  for (let i = 0; i < 2000; i++) {
    const candidate = String(100000 + Math.floor(Math.random() * 900000));
    if (!existing.has(candidate)) return candidate;
  }
  // fallback: timestamp
  return String(Date.now()).slice(-6);
}

function validateMemberInput(data, members) {
  if (!data.priimek) return "Priimek je obvezen.";
  if (!data.ime) return "Ime je obvezno.";
  if (!data.status) return "Status je obvezen.";
  if (!data.spc) return "SPC (spol) je obvezen.";

  // članska: številčna 6–7
  const cl = String(data.clanska || "");
  if (!/^\d{6,7}$/.test(cl)) {
    return "Članska številka mora vsebovati 6–7 številk (brez črk).";
  }

  // duplikat članske
  const dup = (members || []).some((m) => String(m.clanska || "").trim() === cl);
  if (dup) {
    return "Članska številka že obstaja. Klikni 'Predlagaj člansko' ali vnesi drugo.";
  }

  // email (če je vpisan)
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    return "E-mail ni v pravilni obliki.";
  }

  return null;
}

/* =========================
   Page init
========================= */

document.addEventListener("DOMContentLoaded", () => {
  ensureDemoData();
  const user = requireAuth({ pageModuleKey: "vpis" });
  if (!user) return;

  initHeader(user);
  renderAppNav(user, "vpis");
  handleVpisClanaPage();
  startReminderWatcher();

  // aktivno leto (badge + footer)
  const leto = (typeof AktivnoLeto === "function") ? AktivnoLeto() : "";
  const badgeEl = document.getElementById("aktivno-leto");
  if (badgeEl) badgeEl.textContent = leto;

  const footerEl = document.getElementById("aktivno-leto-footer");
  if (footerEl) footerEl.textContent = leto;
});