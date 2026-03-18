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
  const postaEl = document.getElementById("posta");
  const krajEl = document.getElementById("kraj");
  const ribiskiIzpitEl = document.getElementById("ribiskiIzpit");
  const datumIzpitaEl = document.getElementById("datumRibiskegaIzpita");

  if (datumVpisaEl && !datumVpisaEl.value) {
    datumVpisaEl.value = todayISO();
  }

  let avatarDataUrl = null;

  function loadAvatarFile(file) {
    if (!file) return;
    if (!file.type?.startsWith("image/")) {
      alert("Prosim izberi sliko (JPG/PNG/WebP).");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      alert("Slika je prevelika. Največ 2 MB.");
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
      loadAvatarFile(e.target.files?.[0]);
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
      loadAvatarFile(e.dataTransfer?.files?.[0]);
    });
  }

  if (btnAvatarRemove && avatarImg && avatarInput) {
    btnAvatarRemove.addEventListener("click", () => {
      avatarDataUrl = null;
      avatarImg.src = "https://via.placeholder.com/300x300.png?text=CLAN";
      avatarInput.value = "";
    });
  }

  priimekEl?.addEventListener("blur", () => {
    priimekEl.value = String(priimekEl.value || "").trim().toUpperCase();
  });

  imeEl?.addEventListener("blur", () => {
    imeEl.value = toTitleCase(String(imeEl.value || "").trim());
  });

  telefonEl?.addEventListener("blur", () => {
    telefonEl.value = normalizePhone(String(telefonEl.value || "").trim());
  });

  if (postaEl && krajEl && typeof window.bindPostaKrajAuto === "function") {
    window.bindPostaKrajAuto(postaEl, krajEl);
  }

  btnGenerateClanska?.addEventListener("click", () => {
    if (!clanskaEl) return;
    clanskaEl.value = suggestUniqueClanska(getMembers());
    clanskaEl.focus();
  });

  function syncIzpitUI() {
    if (!ribiskiIzpitEl || !datumIzpitaEl) return;
    const enabled = ribiskiIzpitEl.checked;
    datumIzpitaEl.disabled = !enabled;
    if (!enabled) datumIzpitaEl.value = "";
  }

  ribiskiIzpitEl?.addEventListener("change", syncIzpitUI);
  syncIzpitUI();

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const data = readMemberForm(form);
    data.priimek = String(data.priimek || "").trim().toUpperCase();
    data.ime = toTitleCase(String(data.ime || "").trim());
    data.telefon = normalizePhone(String(data.telefon || "").trim());
    data.email = String(data.email || "").trim();
    data.posta = normalizePosta(String(data.posta || "").trim());
    data.clanska = String(data.clanska || "").trim();

    if (!data.datumVpisa) data.datumVpisa = todayISO();
    if (!data.ribiskiIzpit) data.datumRibiskegaIzpita = "";

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
      izkaznicaUrejena: data.potrebujeIzkaznico ? false : undefined,
      ...data,
    };

    members.push(member);
    saveMembers(members);

    addHistory("Vpis člana", `Dodan član: ${member.ime} ${member.priimek} (št. ${member.clanska}).`);

    alert("Član uspešno dodan.");
    window.location.href = "seznam.html";
  });
}

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
  if (s.startsWith("00386")) s = `+386${s.slice(5)}`;
  if (s.startsWith("386") && !s.startsWith("+386")) s = `+386${s.slice(3)}`;
  return s;
}

function normalizePosta(raw) {
  return String(raw || "").replace(/\D/g, "").slice(0, 4);
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
    return "Članska številka mora vsebovati 6-7 številk.";
  }

  const dup = (members || []).some((m) => String(m.clanska || "").trim() === cl);
  if (dup) {
    return "Članska številka že obstaja. Uporabi predlog ali vnesi drugo.";
  }

  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    return "E-mail ni v pravilni obliki.";
  }

  if (data.posta && !/^\d{4}$/.test(String(data.posta))) {
    return "Št. pošte mora vsebovati 4 številke.";
  }

  return null;
}

document.addEventListener("DOMContentLoaded", () => {
  ensureDemoData();
  const user = requireAuth({ pageModuleKey: "vpis" });
  if (!user) return;

  initHeader(user);
  renderAppNav(user, "vpis");
  handleVpisClanaPage();
  startReminderWatcher();

  const badgeEl = document.getElementById("aktivno-leto");
  if (badgeEl && typeof AktivnoLeto === "function") {
    badgeEl.textContent = AktivnoLeto();
  }
});
