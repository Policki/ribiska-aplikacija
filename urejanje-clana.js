function handleUrejanjeClanaPage() {
  const params = new URLSearchParams(window.location.search);
  const id = Number(params.get("id"));
  const isViewMode = params.get("mode") === "view";
  if (!id) {
    alert("Manjkajoč ID člana.");
    window.location.href = "seznam.html";
    return;
  }

  const form = document.getElementById("urejanje-clana-form");
  if (!form) return;

  const avatarInput = document.getElementById("avatar-input");
  const avatarImg = document.getElementById("avatar-img");
  const avatarDrop = document.getElementById("avatar-drop");
  const btnAvatarRemove = document.getElementById("btn-avatar-remove");
  const avatarActions = document.getElementById("avatar-actions");

  const pillClanska = document.getElementById("pill-clanska");
  const pageModeTitle = document.getElementById("page-mode-title");
  const pageModeHint = document.getElementById("page-mode-hint");
  const btnSubmitMember = document.getElementById("btn-submit-member");
  const btnBackLink = document.getElementById("btn-back-link");

  // pošta/kraj
  const postaEl = document.getElementById("posta");
  const krajEl = document.getElementById("kraj");

  // ✅ NOVO: izpit + izkaznica (pričakujem, da dodaš inpute v HTML)
  const ribiskiIzpitEl = document.getElementById("ribiskiIzpit");
  const datumIzpitaEl = document.getElementById("datumRibiskegaIzpita");
  const potrebujeIzkaznicoEl = document.getElementById("potrebujeIzkaznico");

  let avatarDataUrl = null;

  const members = getMembers();
  const member = members.find((m) => m.id === id);
  if (!member) {
    alert("Član ni najden.");
    window.location.href = "seznam.html";
    return;
  }

  // fill form
  form.priimek.value = member.priimek || "";
  form.ime.value = member.ime || "";
  form.datumRojstva.value = member.datumRojstva || "";
  form.naslov.value = member.naslov || "";
  if (form.posta) form.posta.value = member.posta || "";
  form.kraj.value = member.kraj || "";
  form.telefon.value = member.telefon || "";
  form.email.value = member.email || "";
  form.tipKarte.value = member.tipKarte || "";
  form.datumVpisa.value = member.datumVpisa || "";
  form.status.value = member.status || "";
  form.spc.value = member.spc || "";
  form.clanska.value = member.clanska || "";

  if (pillClanska) pillClanska.textContent = member.clanska || "—";
  if (pageModeTitle) pageModeTitle.textContent = isViewMode ? "Podroben pogled člana" : "Urejanje člana";
  if (pageModeHint) {
    pageModeHint.textContent = isViewMode
      ? "Prikaz vseh podatkov člana brez možnosti urejanja."
      : "Uredi podatke, sliko ali status člana. Obvezna polja so označena z *.";
  }
  if (btnSubmitMember) btnSubmitMember.style.display = isViewMode ? "none" : "";
  if (btnBackLink) btnBackLink.textContent = isViewMode ? "ZAPRI" : "NAZAJ";

  // ✅ NOVO: fill izpit/izkaznica
  if (ribiskiIzpitEl) ribiskiIzpitEl.checked = member.ribiskiIzpit === true;
  if (datumIzpitaEl) datumIzpitaEl.value = member.datumRibiskegaIzpita || "";
  if (potrebujeIzkaznicoEl) potrebujeIzkaznicoEl.checked = member.potrebujeIzkaznico === true;

  // avatar
  avatarDataUrl = member.avatar || null;
  if (avatarDataUrl && avatarImg) avatarImg.src = avatarDataUrl;

  if (!isViewMode) {
    form.priimek.addEventListener("input", () => {
      const start = form.priimek.selectionStart;
      const end = form.priimek.selectionEnd;
      form.priimek.value = (form.priimek.value || "").toUpperCase();
      if (start !== null && end !== null) form.priimek.setSelectionRange(start, end);
    });
  }

  // =========================
  // ✅ POŠTA ↔ KRAJ
  // =========================
  // Pomembno: v tvoji prejšnji verziji si imel POSTA_TO_KRAJ narobe (kraj->pošta).
  // Tu tega slovarja ne držimo več. Uporabimo skupni helper:
  if (!isViewMode && postaEl && krajEl && typeof window.bindPostaKrajAuto === "function") {
    window.bindPostaKrajAuto(postaEl, krajEl);
  }

  // =========================
  // ✅ IZPIT UI
  // =========================
  function syncIzpitUI() {
    if (!ribiskiIzpitEl || !datumIzpitaEl) return;
    const on = !!ribiskiIzpitEl.checked;
    datumIzpitaEl.disabled = !on;
    if (!on) datumIzpitaEl.value = "";
  }
  if (!isViewMode) ribiskiIzpitEl?.addEventListener("change", syncIzpitUI);
  syncIzpitUI();

  // =========================
  // AVATAR HANDLERS
  // =========================
  if (!isViewMode && avatarDrop && avatarInput) {
    avatarDrop.addEventListener("click", () => avatarInput.click());

    avatarDrop.addEventListener("dragover", (e) => {
      e.preventDefault();
      avatarDrop.style.borderColor = "rgba(11,75,75,.7)";
    });
    avatarDrop.addEventListener("dragleave", () => {
      avatarDrop.style.borderColor = "rgba(11,75,75,.35)";
    });
    avatarDrop.addEventListener("drop", (e) => {
      e.preventDefault();
      avatarDrop.style.borderColor = "rgba(11,75,75,.35)";
      const file = e.dataTransfer.files?.[0];
      if (file) loadAvatarFile(file);
    });
  }

  if (!isViewMode && avatarInput) {
    avatarInput.addEventListener("change", (e) => {
      const file = e.target.files?.[0];
      if (file) loadAvatarFile(file);
    });
  }

  if (!isViewMode && btnAvatarRemove) {
    btnAvatarRemove.addEventListener("click", () => {
      avatarDataUrl = null;
      if (avatarImg) avatarImg.src = "https://via.placeholder.com/300x300.png?text=CLAN";
      if (avatarInput) avatarInput.value = "";
    });
  }

  function loadAvatarFile(file) {
    if (!file.type.startsWith("image/")) {
      alert("Prosimo izberi sliko (JPG/PNG/WebP).");
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

  // =========================
  // SUBMIT
  // =========================
  if (isViewMode) {
    if (avatarDrop) {
      avatarDrop.style.cursor = "default";
      avatarDrop.setAttribute("aria-disabled", "true");
    }
    if (avatarInput) avatarInput.disabled = true;
    if (avatarActions) avatarActions.style.display = "none";

    form.querySelectorAll("input, select, textarea, button").forEach((el) => {
      if (el.id === "btn-submit-member") return;
      if (el.tagName === "A") return;
      if (el.type === "checkbox" || el.type === "radio") {
        el.disabled = true;
      } else if (el.tagName === "SELECT" || el.tagName === "TEXTAREA" || el.tagName === "INPUT") {
        el.readOnly = true;
        el.disabled = true;
      }
    });
    return;
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const data = readMemberForm(form);
    const normalizePhoneLocal = (raw) => {
      let s = String(raw || "").replaceAll(" ", "").replaceAll("-", "");
      if (s.startsWith("00386")) s = `+386${s.slice(5)}`;
      if (s.startsWith("386") && !s.startsWith("+386")) s = `+386${s.slice(3)}`;
      return s;
    };

    // normalizacija pošte (če imaš normalizePosta globalno, jo uporabi; sicer fallback)
    const normalizePostaLocal = (raw) => String(raw || "").replace(/\D/g, "").slice(0, 4);
    data.posta = normalizePostaLocal(data.posta);
    data.telefon = normalizePhoneLocal(data.telefon);

    if (!data.priimek || !data.ime) {
      alert("Priimek in ime sta obvezna.");
      return;
    }
    if (!data.status || !data.spc) {
      alert("Status in SPC sta obvezna.");
      return;
    }

    // validacija pošte
    if (data.posta && !/^\d{4}$/.test(String(data.posta))) {
      alert("Št. pošte mora vsebovati 4 številke.");
      return;
    }

    const list = getMembers();
    const idx = list.findIndex((m) => m.id === id);
    if (idx === -1) return;

    // ✅ če je nekdo NA NOVO označil "potrebuje izkaznico" -> naj gre v naročilo
    const prevNeeds = list[idx].potrebujeIzkaznico === true;
    const nextNeeds = data.potrebujeIzkaznico === true;
    const prevPhone = normalizePhoneLocal(list[idx].telefon);
    const nextPhone = data.telefon;

    list[idx] = {
      ...list[idx],
      ...data,
      priimek: String(data.priimek || "").toUpperCase(),
      avatar: avatarDataUrl,
    };

    // če je na novo označil potrebuje izkaznico, poskrbi da se pojavi v naročilu
    if (!prevNeeds && nextNeeds) {
      list[idx].izkaznicaUrejena = false;
    }

    if (!nextPhone) {
      list[idx].telefonVpisan = true;
    } else if (nextPhone !== prevPhone) {
      list[idx].telefonVpisan = false;
    }

    // če izpit ni označen, pobriši datum
    if (list[idx].ribiskiIzpit !== true) {
      list[idx].datumRibiskegaIzpita = "";
    }

    saveMembers(list);
    addHistory("Urejanje člana", `Posodobljen član: ${list[idx].priimek} ${list[idx].ime}.`);
    alert("Podatki člana posodobljeni.");
    window.location.href = "seznam.html";
  });
}

document.addEventListener("DOMContentLoaded", () => {
  ensureDemoData();
  const user = requireAuth({ pageModuleKey: "seznam" });
  if (!user) return;

  initHeader(user);
  renderAppNav(user, "seznam");
  handleUrejanjeClanaPage();
  startReminderWatcher();

  const el = document.getElementById("aktivno-leto");
  if (el && typeof AktivnoLeto === "function") el.textContent = AktivnoLeto();
});
