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
  const detailView = document.getElementById("member-detail-view");

  // pošta/kraj
  const postaEl = document.getElementById("posta");
  const krajEl = document.getElementById("kraj");

  // ✅ NOVO: izpit + izkaznica (pričakujem, da dodaš inpute v HTML)
  const ribiskiIzpitEl = document.getElementById("ribiskiIzpit");
  const datumIzpitaEl = document.getElementById("datumRibiskegaIzpita");
  const potrebujeIzkaznicoEl = document.getElementById("potrebujeIzkaznico");
  const telefonVpisanEl = document.getElementById("telefonVpisan");
  const izkaznicaUrejenaEl = document.getElementById("izkaznicaUrejena");

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
  form.tipKarte.value = normalizeTipKarteForForm(member.tipKarte || member.tipLetneKarte || member.letnaKarta || "");
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
  if (telefonVpisanEl) telefonVpisanEl.checked = member.telefonVpisan === true || !member.telefon;
  if (izkaznicaUrejenaEl) izkaznicaUrejenaEl.checked = member.izkaznicaUrejena === true;

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

    form.ime?.addEventListener("blur", () => {
      form.ime.value = toTitleCaseLocal(form.ime.value);
    });

    form.naslov?.addEventListener("blur", () => {
      form.naslov.value = normalizeWhitespace(form.naslov.value);
    });

    form.kraj?.addEventListener("blur", () => {
      form.kraj.value = toTitleCaseLocal(form.kraj.value);
    });

    form.email?.addEventListener("blur", () => {
      form.email.value = String(form.email.value || "").trim().toLocaleLowerCase("sl-SI");
    });

    form.telefon?.addEventListener("blur", () => {
      form.telefon.value = normalizePhoneLocal(form.telefon.value);
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

  function syncIzkaznicaUI() {
    if (!potrebujeIzkaznicoEl || !izkaznicaUrejenaEl) return;
    izkaznicaUrejenaEl.disabled = !potrebujeIzkaznicoEl.checked;
    if (!potrebujeIzkaznicoEl.checked) izkaznicaUrejenaEl.checked = false;
  }
  if (!isViewMode) potrebujeIzkaznicoEl?.addEventListener("change", syncIzkaznicaUI);
  syncIzkaznicaUI();

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
    form.hidden = true;
    if (detailView) {
      detailView.hidden = false;
      renderMemberProfile(member);
    }
    return;
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const data = readMemberForm(form);
    // normalizacija pošte (če imaš normalizePosta globalno, jo uporabi; sicer fallback)
    const normalizePostaLocal = (raw) => String(raw || "").replace(/\D/g, "").slice(0, 4);
    data.priimek = String(data.priimek || "").trim().toLocaleUpperCase("sl-SI");
    data.ime = toTitleCaseLocal(data.ime);
    data.naslov = normalizeWhitespace(data.naslov);
    data.kraj = toTitleCaseLocal(data.kraj);
    data.email = String(data.email || "").trim().toLocaleLowerCase("sl-SI");
    data.posta = normalizePostaLocal(data.posta);
    data.telefon = normalizePhoneLocal(data.telefon);
    data.clanska = String(data.clanska || "").trim();
    data.tipKarte = normalizeTipKarteForSave(data.tipKarte);
    data.telefonVpisan = telefonVpisanEl ? !!telefonVpisanEl.checked : member.telefonVpisan === true;
    data.izkaznicaUrejena = izkaznicaUrejenaEl ? !!izkaznicaUrejenaEl.checked : member.izkaznicaUrejena === true;

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

    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      alert("E-mail ni v pravilni obliki.");
      return;
    }

    if (data.clanska && !/^\d{6,7}$/.test(data.clanska)) {
      alert("Članska številka mora vsebovati 6-7 številk ali pa naj ostane prazna.");
      return;
    }

    const list = getMembers();
    const idx = list.findIndex((m) => m.id === id);
    if (idx === -1) return;

    if (data.clanska) {
      const duplicate = list.some((m) => m.id !== id && String(m.clanska || "").trim() === data.clanska);
      if (duplicate) {
        alert("Ta članska številka je že uporabljena pri drugem članu.");
        return;
      }
    }

    // ✅ če je nekdo NA NOVO označil "potrebuje izkaznico" -> naj gre v naročilo
    const prevNeeds = list[idx].potrebujeIzkaznico === true;
    const nextNeeds = data.potrebujeIzkaznico === true;
    const prevPhone = normalizePhoneLocal(list[idx].telefon);
    const nextPhone = data.telefon;

    const previousStatus = String(list[idx].status || "").trim();
    const previousClanska = String(list[idx].clanska || "").trim();

    list[idx] = {
      ...list[idx],
      ...data,
      avatar: avatarDataUrl,
    };

    if (previousStatus !== String(data.status || "").trim()) {
      list[idx].statusHistory = Array.isArray(list[idx].statusHistory) ? list[idx].statusHistory : [];
      list[idx].statusHistory.push({
        date: new Date().toISOString(),
        from: previousStatus || "",
        to: data.status || "",
        note: "Sprememba pri urejanju člana",
      });
    }

    if (previousClanska !== String(data.clanska || "").trim()) {
      list[idx].membershipHistory = Array.isArray(list[idx].membershipHistory) ? list[idx].membershipHistory : [];
      list[idx].membershipHistory.push({
        date: new Date().toISOString(),
        type: "clanska",
        text: data.clanska ? `Vpisana članska številka ${data.clanska}` : "Članska številka odstranjena",
      });
    }

    // če je na novo označil potrebuje izkaznico, poskrbi da se pojavi v naročilu
    if (!prevNeeds && nextNeeds) {
      list[idx].izkaznicaUrejena = false;
    }

    if (!nextPhone) {
      list[idx].telefonVpisan = true;
    } else if (nextPhone !== prevPhone && !telefonVpisanEl?.checked) {
      list[idx].telefonVpisan = false;
    }

    if (telefonVpisanEl) list[idx].telefonVpisan = !!telefonVpisanEl.checked || !nextPhone;

    // če izpit ni označen, pobriši datum
    if (list[idx].ribiskiIzpit !== true) {
      list[idx].datumRibiskegaIzpita = "";
    }

    if (list[idx].potrebujeIzkaznico !== true) {
      list[idx].izkaznicaUrejena = undefined;
    }

    saveMembers(list);
    addHistory("Urejanje člana", `Posodobljen član: ${list[idx].priimek} ${list[idx].ime}.`);
    alert("Podatki člana posodobljeni.");
    window.location.href = "seznam.html";
  });
}

function normalizeWhitespace(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function toTitleCaseLocal(value) {
  return normalizeWhitespace(value)
    .toLocaleLowerCase("sl-SI")
    .replace(/(^|[\s-])(\S)/g, (match, prefix, char) => `${prefix}${char.toLocaleUpperCase("sl-SI")}`);
}

function normalizePhoneLocal(raw) {
  let s = String(raw || "").replaceAll(" ", "").replaceAll("-", "").trim();
  if (s.startsWith("00386")) s = `+386${s.slice(5)}`;
  if (s.startsWith("386") && !s.startsWith("+386")) s = `+386${s.slice(3)}`;
  return s;
}

function normalizeTipKarteForForm(value) {
  const raw = String(value || "").trim().toLocaleLowerCase("sl-SI");
  if (!raw) return "";
  if (raw === "letna" || raw === "navadna") return "navadna";
  if (raw === "dnevna" || raw === "elrd" || raw.includes("elektronska")) return "eLRD";
  return value;
}

function normalizeTipKarteForSave(value) {
  const raw = String(value || "").trim().toLocaleLowerCase("sl-SI");
  if (!raw) return "";
  if (raw === "elrd" || raw.includes("elektronska")) return "eLRD";
  return "navadna";
}

function renderMemberProfile(member) {
  const currentUser = getCurrentUser();
  const canEdit = currentUser?.username === "admin" || currentUser?.permissions?.canEditMembers === true;
  const activeYear = typeof AktivnoLeto === "function" ? AktivnoLeto() : currentYear();
  const annualLicense = findAnnualLicenseForMember(member, activeYear);
  const licenseHistory = getAnnualLicensesForMember(member);

  setProfileText("profile-full-name", `${member.priimek || ""} ${member.ime || ""}`.trim() || "Član");
  const avatar = document.getElementById("profile-avatar-img");
  if (avatar) avatar.src = member.avatar || "https://via.placeholder.com/300x300.png?text=CLAN";

  const editLink = document.getElementById("profile-edit-link");
  if (editLink) {
    editLink.href = `urejanje-clana.html?id=${member.id}`;
    editLink.hidden = !canEdit;
  }

  const badges = document.getElementById("profile-basic-badges");
  if (badges) {
    badges.innerHTML = [
      profileBadge(member.status || "Brez statusa"),
      profileBadge(member.clanska ? `Članska ${member.clanska}` : "Brez članske številke", member.clanska ? "" : "warn"),
      profileBadge(member.arhiviran ? "Arhiviran" : "Aktiven", member.arhiviran ? "warn" : "ok"),
      profileBadge(formatCardType(member.tipKarte), ""),
    ].join("");
  }

  setProfileText(
    "profile-short-summary",
    `Prvi vpis: ${formatDateSI(member.datumVpisa) || "ni podatka"} | Starost: ${formatAge(member)} | Letna karta ${activeYear}: ${annualLicense ? annualLicense.stKarte : "ni zapisa"}`
  );

  const kpi = document.getElementById("profile-kpi-grid");
  if (kpi) {
    const awards = getMemberAwards(member.id);
    const functions = getMemberFunctions(member.id);
    kpi.innerHTML = [
      profileKpi("Status", member.status || "-"),
      profileKpi("Članska", member.clanska || "čaka"),
      profileKpi("Letna karta", annualLicense ? annualLicense.stKarte : "ni zapisa"),
      profileKpi("Priznanja", awards.length),
      profileKpi("Funkcije", functions.length),
      profileKpi("Ribiški izpit", member.ribiskiIzpit ? "opravljen" : "ni označen"),
    ].join("");
  }

  renderProfileList("profile-personal", [
    ["Ime", member.ime],
    ["Priimek", member.priimek],
    ["Datum rojstva", formatDateSI(member.datumRojstva)],
    ["Spol", member.spc],
    ["Naslov", [member.naslov, member.posta, member.kraj].filter(Boolean).join(", ")],
    ["Telefon", member.telefon],
    ["E-pošta", member.email],
  ]);

  renderProfileList("profile-license", [
    ["Tip letne karte", formatCardType(member.tipKarte)],
    [`Št. letne karte ${activeYear}`, annualLicense ? annualLicense.stKarte : "Ni zapisa za izbrano leto"],
    ["Vrsta letne karte", annualLicense ? licenseTypeLabel(annualLicense.vrstaKarte) : "-"],
    ["Revir 0", annualLicense?.revir0],
    ["Revir 1", annualLicense?.revir1],
    ["Revir 2", annualLicense?.revir2],
    ["Zgodovina letnih kart", formatLicenseHistory(licenseHistory)],
    ["Članska številka", member.clanska || "Čaka na prijavo v sistem"],
  ]);

  renderProfileList("profile-exam", [
    ["Opravljen ribiški izpit", member.ribiskiIzpit ? "Da" : "Ne"],
    ["Datum izpita", formatDateSI(member.datumRibiskegaIzpita)],
    ["Status pripravnika", member.status === "AP" ? "Pripravnik" : "-"],
  ]);

  renderTimeline("profile-history", buildMembershipTimeline(member));
  renderTimeline("profile-awards", getMemberAwards(member.id).map((item) => ({
    date: item.date,
    title: awardLabel(item.awardKey),
    text: "Priznanje člana",
  })));
  renderTimeline("profile-functions", getMemberFunctions(member.id));
}

function setProfileText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = String(value || "");
}

function profileBadge(text, tone = "") {
  return `<span class="member-profile-badge ${tone ? `is-${tone}` : ""}">${escapeHtml(text || "-")}</span>`;
}

function profileKpi(label, value) {
  return `
    <article class="member-profile-kpi">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
    </article>
  `;
}

function renderProfileList(id, rows) {
  const host = document.getElementById(id);
  if (!host) return;
  host.innerHTML = rows
    .map(([label, value]) => `
      <div class="member-profile-list-row">
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(value || "-")}</strong>
      </div>
    `)
    .join("");
}

function renderTimeline(id, rows) {
  const host = document.getElementById(id);
  if (!host) return;
  if (!rows.length) {
    host.innerHTML = `<div class="member-profile-empty">Ni zabeleženih podatkov.</div>`;
    return;
  }
  host.innerHTML = rows
    .slice()
    .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")))
    .map((item) => `
      <article class="member-profile-timeline-item">
        <time>${escapeHtml(formatDateSI(item.date) || item.date || "-")}</time>
        <strong>${escapeHtml(item.title || "-")}</strong>
        <span>${escapeHtml(item.text || "")}</span>
      </article>
    `)
    .join("");
}

function buildMembershipTimeline(member) {
  const rows = [];
  if (member.datumVpisa) rows.push({ date: member.datumVpisa, title: "Prvi vpis", text: "Prvič zabeležen v evidenci članov." });
  if (member.ponovniVpisOd) rows.push({ date: member.ponovniVpisOd, title: "Ponovni vpis", text: "Član je bil ponovno vrnjen med aktivne." });
  if (member.datumArhiva) rows.push({ date: member.datumArhiva, title: "Prekinitev članstva", text: `Arhiviran${member.arhivLeto ? ` v letu ${member.arhivLeto}` : ""}.` });
  (member.statusHistory || []).forEach((item) => {
    rows.push({
      date: item.date,
      title: "Sprememba statusa",
      text: `${item.from || "-"} → ${item.to || "-"}`,
    });
  });
  (member.membershipHistory || []).forEach((item) => {
    rows.push({ date: item.date, title: "Evidenca članstva", text: item.text || item.type || "" });
  });
  if (!rows.length && member.status) rows.push({ date: member.datumVpisa || "", title: "Trenutni status", text: member.status });
  return rows;
}

function getMemberAwards(memberId) {
  return getJSON("rd_awards_history_v1", []).filter((item) => Number(item.memberId) === Number(memberId));
}

function awardLabel(key) {
  const labels = {
    ZNAK_MLADI_RIBIC: "Znak mladi ribič",
    ZNAK_RIBISKE_ZASLUGE: "Znak za ribiške zasluge",
    RED_III: "Red za ribiške zasluge III. stopnje",
    RED_II: "Red za ribiške zasluge II. stopnje",
    RED_I: "Red za ribiške zasluge I. stopnje",
    PLAKETA_RZS: "Plaketa RZS",
    PLAKETA_FRANKET: "Plaketa Ivana Franketa",
  };
  return labels[key] || key || "-";
}

function getMemberFunctions(memberId) {
  const mandates = getJSON("rd_official_mandates", []);
  const bodyLabels = {
    "upravni-odbor": "Upravni odbor",
    "disciplinski-tozilec": "Disciplinski tožilec",
    "disciplinsko-sodisce": "Disciplinsko sodišče",
  };

  return getOfficials()
    .filter((item) => Number(item.memberId) === Number(memberId))
    .map((item) => {
      const mandate =
        mandates.find((m) => Number(m.id) === Number(item.mandateId)) ||
        mandates.find((m) => Number(m.startYear) === Number(item.mandateStart) && Number(m.endYear) === Number(item.mandateEnd));
      const mandateText = mandate ? `${mandate.startYear}-${mandate.endYear}` : [item.mandateStart, item.mandateEnd].filter(Boolean).join("-");
      return {
        date: item.createdAt || `${item.mandateStart || ""}-01-01`,
        title: item.role || "Funkcija",
        text: `${bodyLabels[item.body] || item.body || "Organ"}${mandateText ? ` | mandat ${mandateText}` : ""}`,
      };
    });
}

function findAnnualLicenseForMember(member, year) {
  const list = getJSON("rd_licenses_active_v1", {})[year] || [];
  const byMemberId = list.find((item) => Number(item.memberId) === Number(member.id));
  if (byMemberId) return byMemberId;

  const nameMatch = (item) =>
    normalizeIdentityText(item.ime) === normalizeIdentityText(member.ime) &&
    normalizeIdentityText(item.priimek) === normalizeIdentityText(member.priimek);
  const byName = list.find(nameMatch);
  if (byName) return byName;
  if (member.clanska) {
    return list.find((item) => String(item.stKarte || "").trim() === String(member.clanska || "").trim()) || null;
  }
  return null;
}

function getAnnualLicensesForMember(member) {
  const active = getJSON("rd_licenses_active_v1", {});
  const archive = getJSON("rd_licenses_archive_v1", {});
  const rows = [];

  const collect = (map, sourceLabel) => {
    Object.entries(map || {}).forEach(([year, list]) => {
      (list || []).forEach((item) => {
        if (!licenseBelongsToMember(item, member)) return;
        rows.push({
          year,
          sourceLabel,
          stKarte: item.stKarte || "",
          vrstaKarte: item.vrstaKarte || "",
          revir0: item.revir0 || "",
          revir1: item.revir1 || "",
          revir2: item.revir2 || "",
        });
      });
    });
  };

  collect(active, "aktivno");
  collect(archive, "arhiv");

  return rows.sort((a, b) => Number(b.year) - Number(a.year));
}

function licenseBelongsToMember(item, member) {
  if (Number(item.memberId) === Number(member.id)) return true;
  const sameName =
    normalizeIdentityText(item.ime) === normalizeIdentityText(member.ime) &&
    normalizeIdentityText(item.priimek) === normalizeIdentityText(member.priimek);
  if (sameName) return true;
  if (member.clanska && String(item.stKarte || "").trim() === String(member.clanska || "").trim()) return true;
  return false;
}

function formatLicenseHistory(rows) {
  if (!rows.length) return "Ni zabeleženih letnih kart";
  return rows
    .map((row) => {
      const type = licenseTypeLabel(row.vrstaKarte);
      const source = row.sourceLabel === "arhiv" ? "arhiv" : "aktivno";
      return `${row.year}: ${row.stKarte || "-"} (${type}, ${source})`;
    })
    .join(" | ");
}

function licenseTypeLabel(value) {
  const raw = normalizeIdentityText(value);
  if (raw.includes("mlad")) return "Mladinska";
  if (raw.includes("tren")) return "Trening";
  if (raw.includes("cast")) return "Častna";
  return "Članska";
}

function formatCardType(value) {
  const raw = normalizeIdentityText(value);
  if (!raw) return "-";
  if (raw.includes("elrd") || raw.includes("elektronska")) return "eLRD";
  return "Navadna";
}

function formatAge(member) {
  const age = getAge(member.datumRojstva);
  return age === null ? "ni podatka" : `${age} let`;
}

function formatDateSI(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("sl-SI");
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
