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
  const telefonEl = document.getElementById("telefon");

  const postaEl = document.getElementById("posta"); // ✅ NEW
  const krajEl = document.getElementById("kraj");   // (že obstaja)

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

  // ✅ NEW: Pošta -> samodejni kraj
  let lastAutoKraj = ""; // da ne prepišemo ročnega vnosa po nepotrebnem

  function normalizePosta(raw) {
    return String(raw || "").replace(/\D/g, "").slice(0, 4);
  }

  // Slovar: dopolni po potrebi (ključ = "3330", vrednost = "Mozirje")
  const POSTA_TO_KRAJ = {
    "3330": "Mozirje",
    "3331": "Nazarje",
    // dodaj npr.:
    // "1000": "Ljubljana",
    // "2000": "Maribor",
  };

  function lookupKrajByPosta(posta) {
    const p = normalizePosta(posta);
    return POSTA_TO_KRAJ[p] || "";
  }

  function maybeAutofillKraj() {
    if (!postaEl || !krajEl) return;

    const p = normalizePosta(postaEl.value);
    postaEl.value = p; // lepo “očisti” vnos

    const found = lookupKrajByPosta(p);
    if (!found) return;

    const currentKraj = String(krajEl.value || "").trim();

    // Če je kraj prazen ALI je bil prej avtomatsko vnešen, ga lahko prepišemo
    if (!currentKraj || currentKraj === lastAutoKraj) {
      krajEl.value = found;
      lastAutoKraj = found;
    }
  }

  if (postaEl) {
    postaEl.addEventListener("input", () => {
      // sproti, ko doseže 4 cifre
      if (normalizePosta(postaEl.value).length === 4) {
        maybeAutofillKraj();
      }
    });

    postaEl.addEventListener("blur", () => {
      maybeAutofillKraj();
    });
  }

  // Če uporabnik ročno spremeni kraj, ne bomo več prepisovali
  if (krajEl) {
    krajEl.addEventListener("input", () => {
      const v = String(krajEl.value || "").trim();
      if (v && v !== lastAutoKraj) lastAutoKraj = "";
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

    const data = readMemberForm(form);

    data.priimek = String(data.priimek || "").trim().toUpperCase();
    data.ime = toTitleCase(String(data.ime || "").trim());
    data.telefon = normalizePhone(String(data.telefon || "").trim());
    data.email = String(data.email || "").trim();
    data.clanska = String(data.clanska || "").trim();

    // ✅ NEW: normalize posta
    data.posta = normalizePosta(data.posta);

    if (!data.datumVpisa) data.datumVpisa = todayISO();

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

    addHistory("Vpis člana", `Dodan član: ${member.ime} ${member.priimek} (št. ${member.clanska}).`);

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
  return s
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function normalizePhone(raw) {
  if (!raw) return "";
  let s = raw.replaceAll(" ", "").replaceAll("-", "");
  if (s.startsWith("00386")) s = "+386" + s.slice(5);
  if (s.startsWith("386") && !s.startsWith("+386")) s = "+386" + s.slice(3);
  return s;
}

function suggestUniqueClanska(members) {
  const existing = new Set((members || []).map((m) => String(m.clanska || "").trim()));
  for (let i = 0; i < 2000; i++) {
    const candidate = String(100000 + Math.floor(Math.random() * 900000));
    if (!existing.has(candidate)) return candidate;
  }
  return String(Date.now()).slice(-6);
}

function validateMemberInput(data, members) {
  if (!data.priimek) return "Priimek je obvezen.";
  if (!data.ime) return "Ime je obvezno.";
  if (!data.status) return "Status je obvezen.";
  if (!data.spc) return "SPC (spol) je obvezen.";

  const cl = String(data.clanska || "");
  if (!/^\d{6,7}$/.test(cl)) {
    return "Članska številka mora vsebovati 6–7 številk (brez črk).";
  }

  const dup = (members || []).some((m) => String(m.clanska || "").trim() === cl);
  if (dup) {
    return "Članska številka že obstaja. Klikni 'Predlagaj člansko' ali vnesi drugo.";
  }

  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    return "E-mail ni v pravilni obliki.";
  }

  // ✅ NEW: če je pošta vpisana, naj bo 4-mestna
  if (data.posta && !/^\d{4}$/.test(String(data.posta))) {
    return "Št. pošte mora vsebovati 4 številke.";
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

  const leto = (typeof AktivnoLeto === "function") ? AktivnoLeto() : "";
  const badgeEl = document.getElementById("aktivno-leto");
  if (badgeEl) badgeEl.textContent = leto;
});