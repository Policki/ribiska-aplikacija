document.addEventListener("DOMContentLoaded", () => {
  ensureDemoData();
  const user = requireAuth({ pageModuleKey: "obvescanje" });
  if (!user) return;

  initHeader(user);
  renderAppNav(user, "obvescanje");
  startReminderWatcher();

  const LS_GROUPS = STORAGE_KEYS.COMMUNICATION_GROUPS || "rd_communication_groups";
  const LS_LOG = STORAGE_KEYS.COMMUNICATION_LOG || "rd_communication_log";
  const LS_FEE_STATUS = "rd_fee_status_v1";
  const LS_RECAP_ACTIVE_YEAR = "rd_yearly_recap_active_year";

  const STATUS_OPTIONS = [
    ["AA", "AA - polnoletni polnopravni"],
    ["AM", "AM - mladinec"],
    ["AP", "AP - pripravnik"],
    ["AČ", "AČ - častni član"],
    ["ZAČ", "ZAČ - zaslužni član"],
    ["AŠI", "AŠI"],
    ["DAA", "DAA"],
    ["DAM", "DAM"],
  ];

  const QUICK_FILTERS = [
    { key: "all-active", label: "Vsi aktivni člani", sensitive: false },
    { key: "unpaid-fee", label: "Niso plačali članarine", sensitive: true },
    { key: "missing-recap", label: "Manjka letna rekapitulacija", sensitive: true },
    { key: "normal-card", label: "Vsi z navadno karto", sensitive: false },
    { key: "elrd-card", label: "Vsi z eLRD", sensitive: false },
    { key: "pripravniki", label: "Vsi pripravniki", sensitive: false },
    { key: "missing-exam", label: "Morajo opraviti ribiški izpit", sensitive: true },
    { key: "new-members", label: "Novi člani", sensitive: false },
    { key: "youth", label: "Mladinci", sensitive: false },
  ];

  const state = {
    channel: "email",
    selectedIds: new Set(),
    groupMemberIds: null,
  };

  const els = {
    providerTitle: document.getElementById("provider-title"),
    providerSubtitle: document.getElementById("provider-subtitle"),
    warning: document.getElementById("communication-permission-warning"),
    channelButtons: document.querySelectorAll("[data-channel]"),
    quickFilters: document.getElementById("quick-filters"),
    search: document.getElementById("comm-search"),
    status: document.getElementById("comm-status"),
    cardType: document.getElementById("comm-card-type"),
    feeFilter: document.getElementById("comm-fee-filter"),
    recapFilter: document.getElementById("comm-recap-filter"),
    examFilter: document.getElementById("comm-exam-filter"),
    memberFilter: document.getElementById("comm-member-filter"),
    contactFilter: document.getElementById("comm-contact-filter"),
    onlyPripravniki: document.getElementById("comm-only-pripravniki"),
    onlyYouth: document.getElementById("comm-only-youth"),
    onlyNormalCard: document.getElementById("comm-only-normal-card"),
    onlyElrd: document.getElementById("comm-only-elrd"),
    stats: document.getElementById("comm-stats"),
    recipientList: document.getElementById("comm-recipient-list"),
    selectAll: document.getElementById("btn-select-all-recipients"),
    clearRecipients: document.getElementById("btn-clear-recipients"),
    groupSelect: document.getElementById("comm-group-select"),
    applyGroup: document.getElementById("btn-apply-group"),
    groupName: document.getElementById("comm-group-name"),
    saveGroup: document.getElementById("btn-save-group"),
    groupsList: document.getElementById("comm-groups-list"),
    subject: document.getElementById("comm-subject"),
    message: document.getElementById("comm-message"),
    preview: document.getElementById("comm-preview-text"),
    saveDraft: document.getElementById("btn-save-message-draft"),
    exportRecipients: document.getElementById("btn-export-recipients"),
    log: document.getElementById("comm-log"),
  };

  buildStatusOptions();
  buildQuickFilters();
  bindEvents();
  applyChannelPermissions();
  renderGroups();
  render();
  renderLog();

  function isAdmin() {
    return user.username === "admin" || !!user.permissions?.canManageUsers;
  }

  function canUseChannel(channel) {
    if (isAdmin()) return true;
    if (channel === "email") return !!user.permissions?.canSendEmail;
    return !!user.permissions?.canSendSms;
  }

  function canUseSensitiveFilters() {
    return isAdmin() || !!user.permissions?.canUseSensitiveMessageFilters;
  }

  function allowedStatusSet() {
    if (isAdmin() || user.permissions?.canMessageAllStatuses) return null;
    const visible = getUserVisibleStatuses(user);
    return visible ? new Set(visible) : null;
  }

  function buildStatusOptions() {
    const allowed = allowedStatusSet();
    els.status.innerHTML = "";
    STATUS_OPTIONS.forEach(([key, label]) => {
      if (allowed && !allowed.has(key)) return;
      const option = document.createElement("option");
      option.value = key;
      option.textContent = label;
      els.status.appendChild(option);
    });
  }

  function buildQuickFilters() {
    els.quickFilters.innerHTML = "";
    QUICK_FILTERS.forEach((filter) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "communication-quick-card";
      button.dataset.quick = filter.key;
      button.disabled = filter.sensitive && !canUseSensitiveFilters();
      button.innerHTML = `
        <strong>${escapeHtml(filter.label)}</strong>
        <span>${filter.sensitive ? "občutljiv filter" : "hiter izbor"}</span>
      `;
      button.addEventListener("click", () => applyQuickFilter(filter.key));
      els.quickFilters.appendChild(button);
    });
  }

  function bindEvents() {
    els.channelButtons.forEach((button) => {
      button.addEventListener("click", () => {
        state.channel = button.dataset.channel;
        state.selectedIds.clear();
        state.groupMemberIds = null;
        applyChannelPermissions();
        render();
      });
    });

    [
      els.search,
      els.status,
      els.cardType,
      els.feeFilter,
      els.recapFilter,
      els.examFilter,
      els.memberFilter,
      els.contactFilter,
      els.onlyPripravniki,
      els.onlyYouth,
      els.onlyNormalCard,
      els.onlyElrd,
    ].forEach((el) => el?.addEventListener("input", () => {
      state.groupMemberIds = null;
      render();
    }));

    els.selectAll.addEventListener("click", () => {
      getFilteredMembers().forEach((member) => {
        if (getChannelContact(member, state.channel)) state.selectedIds.add(String(member.id));
      });
      render();
    });

    els.clearRecipients.addEventListener("click", () => {
      state.selectedIds.clear();
      render();
    });

    els.applyGroup.addEventListener("click", () => {
      const group = getGroups().find((item) => String(item.id) === els.groupSelect.value);
      if (!group) return;
      state.groupMemberIds = new Set((group.memberIds || []).map(String));
      state.selectedIds = new Set((group.memberIds || []).map(String));
      render();
    });

    els.saveGroup.addEventListener("click", saveCurrentGroup);
    els.saveDraft.addEventListener("click", saveDraft);
    els.exportRecipients.addEventListener("click", exportRecipients);

    document.querySelectorAll("[data-template]").forEach((button) => {
      button.addEventListener("click", () => applyTemplate(button.dataset.template));
    });

    els.subject.addEventListener("input", renderPreview);
    els.message.addEventListener("input", renderPreview);
  }

  function applyChannelPermissions() {
    els.channelButtons.forEach((button) => {
      button.classList.toggle("active", button.dataset.channel === state.channel);
    });

    if (state.channel === "email") {
      els.providerTitle.textContent = "SendGrid / Twilio";
      els.providerSubtitle.textContent = "";
    } else {
      els.providerTitle.textContent = "SMS Chef";
      els.providerSubtitle.textContent = "";
    }

    const allowed = canUseChannel(state.channel);
    els.warning.hidden = allowed;
    els.warning.textContent = allowed
      ? ""
      : `Za kanal ${state.channel === "email" ? "e-pošta" : "SMS"} nimate dovoljenja. Lahko pripravite filtre za pregled, ne morete pa shraniti osnutka pošiljanja.`;

    els.saveDraft.disabled = !allowed;

    const sensitiveAllowed = canUseSensitiveFilters();
    [els.feeFilter, els.recapFilter, els.examFilter].forEach((select) => {
      select.disabled = !sensitiveAllowed;
      if (!sensitiveAllowed) select.value = "all";
    });
  }

  function applyQuickFilter(key) {
    resetFilters(false);
    if (key === "unpaid-fee") els.feeFilter.value = "unpaid";
    if (key === "missing-recap") {
      els.cardType.value = "navadna";
      els.recapFilter.value = "missing-normal";
    }
    if (key === "normal-card") els.cardType.value = "navadna";
    if (key === "elrd-card") els.cardType.value = "elrd";
    if (key === "pripravniki") els.onlyPripravniki.checked = true;
    if (key === "missing-exam") els.examFilter.value = "missing";
    if (key === "new-members") els.memberFilter.value = "new-current-year";
    if (key === "youth") els.onlyYouth.checked = true;
    render();
  }

  function resetFilters(keepSearch = true) {
    if (!keepSearch) els.search.value = "";
    Array.from(els.status.options).forEach((option) => {
      option.selected = false;
    });
    els.cardType.value = "all";
    els.feeFilter.value = "all";
    els.recapFilter.value = "all";
    els.examFilter.value = "all";
    els.memberFilter.value = "active";
    els.contactFilter.value = "valid";
    els.onlyPripravniki.checked = false;
    els.onlyYouth.checked = false;
    els.onlyNormalCard.checked = false;
    els.onlyElrd.checked = false;
    state.groupMemberIds = null;
  }

  function getFilteredMembers() {
    const allowed = allowedStatusSet();
    const selectedStatuses = Array.from(els.status.selectedOptions).map((option) => option.value);
    const q = normalizeIdentityText(els.search.value);
    const feeYear = String(AktivnoLeto());
    const recapYear = getRecapActiveYear();

    return getMembers()
      .filter((member) => {
        if (state.groupMemberIds && !state.groupMemberIds.has(String(member.id))) return false;
        if (allowed && !allowed.has(member.status)) return false;
        if (selectedStatuses.length && !selectedStatuses.includes(member.status)) return false;
        if (!matchesMemberScope(member)) return false;
        if (q && !memberSearchText(member).includes(q)) return false;
        if (!matchesCardType(member, els.cardType.value)) return false;
        if (els.onlyNormalCard.checked && !isNormalCard(member)) return false;
        if (els.onlyElrd.checked && !isElrdCard(member)) return false;
        if (els.onlyPripravniki.checked && member.status !== "AP") return false;
        if (els.onlyYouth.checked && !["AM", "DAM"].includes(member.status)) return false;
        if (!matchesFee(member, els.feeFilter.value, feeYear)) return false;
        if (!matchesRecap(member, els.recapFilter.value, recapYear)) return false;
        if (!matchesExam(member, els.examFilter.value)) return false;
        if (!matchesContact(member, els.contactFilter.value)) return false;
        return true;
      })
      .sort((a, b) => (a.priimek || "").localeCompare(b.priimek || "", "sl") || (a.ime || "").localeCompare(b.ime || "", "sl"));
  }

  function matchesMemberScope(member) {
    const mode = els.memberFilter.value;
    if (mode === "active") return !member.arhiviran;
    if (mode === "archived") return !!member.arhiviran;
    if (mode === "all") return true;
    if (mode === "new-current-year") return !member.arhiviran && String(member.datumVpisa || "").startsWith(String(AktivnoLeto()));
    if (mode === "new-365") {
      const joined = new Date(member.datumVpisa || "");
      if (Number.isNaN(joined.getTime())) return false;
      return !member.arhiviran && Date.now() - joined.getTime() <= 365 * 24 * 60 * 60 * 1000;
    }
    return !member.arhiviran;
  }

  function matchesCardType(member, mode) {
    if (mode === "all") return true;
    if (mode === "navadna") return isNormalCard(member);
    if (mode === "elrd") return isElrdCard(member);
    return true;
  }

  function matchesFee(member, mode, year) {
    if (mode === "all") return true;
    if (!canUseSensitiveFilters()) return true;
    const status = getFeeState(member.id, year);
    const isPaid = status && status !== "UNPAID";
    return mode === "paid" ? isPaid : !isPaid;
  }

  function matchesRecap(member, mode, year) {
    if (mode === "all") return true;
    if (!canUseSensitiveFilters()) return true;
    const hasRecap = hasYearlyRecap(member, year);
    if (mode === "submitted") return hasRecap;
    if (mode === "missing-normal") return isNormalCard(member) && !hasRecap;
    return true;
  }

  function matchesExam(member, mode) {
    if (mode === "all") return true;
    if (!canUseSensitiveFilters()) return true;
    const passed = member.ribiskiIzpit === true;
    return mode === "passed" ? passed : !passed;
  }

  function matchesContact(member, mode) {
    if (mode === "all") return true;
    const hasContact = !!getChannelContact(member, state.channel);
    return mode === "valid" ? hasContact : !hasContact;
  }

  function render() {
    const rows = getFilteredMembers();
    const validRows = rows.filter((member) => getChannelContact(member, state.channel));
    state.selectedIds.forEach((id) => {
      if (!rows.some((member) => String(member.id) === id)) state.selectedIds.delete(id);
      const member = rows.find((item) => String(item.id) === id);
      if (member && !getChannelContact(member, state.channel)) state.selectedIds.delete(id);
    });

    els.stats.innerHTML = `
      <article><span>Najdenih</span><strong>${rows.length}</strong><small>po trenutnih filtrih</small></article>
      <article><span>Z ustreznim kontaktom</span><strong>${validRows.length}</strong><small>${state.channel === "email" ? "e-pošta" : "telefon"}</small></article>
      <article><span>Izbranih</span><strong>${state.selectedIds.size}</strong><small>za pripravo obvestila</small></article>
    `;

    renderRecipientList(rows);
    renderPreview();
  }

  function renderRecipientList(rows) {
    if (!rows.length) {
      els.recipientList.innerHTML = `<div class="empty-state">Ni prejemnikov za trenutne filtre.</div>`;
      return;
    }

    els.recipientList.innerHTML = rows
      .map((member) => {
        const id = String(member.id);
        const contact = getChannelContact(member, state.channel);
        const checked = state.selectedIds.has(id) ? "checked" : "";
        return `
          <label class="communication-recipient ${contact ? "" : "is-missing-contact"}">
            <input type="checkbox" data-recipient-id="${id}" ${checked} ${contact ? "" : "disabled"} />
            <span>
              <strong>${escapeHtml(member.priimek || "")} ${escapeHtml(member.ime || "")}</strong>
              <small>${escapeHtml(member.status || "-")} | ${escapeHtml(member.clanska || "brez članske")} | ${escapeHtml(formatCardType(member))}</small>
            </span>
            <em>${escapeHtml(contact || "manjka kontakt")}</em>
          </label>
        `;
      })
      .join("");

    els.recipientList.querySelectorAll("[data-recipient-id]").forEach((checkbox) => {
      checkbox.addEventListener("change", () => {
        if (checkbox.checked) state.selectedIds.add(checkbox.dataset.recipientId);
        else state.selectedIds.delete(checkbox.dataset.recipientId);
        render();
      });
    });
  }

  function saveCurrentGroup() {
    const name = String(els.groupName.value || "").trim();
    const memberIds = Array.from(state.selectedIds);
    if (!name) {
      alert("Vpišite ime skupine.");
      return;
    }
    if (!memberIds.length) {
      alert("Najprej izberite vsaj enega prejemnika.");
      return;
    }

    const groups = getGroups();
    groups.unshift({
      id: Date.now(),
      name,
      channel: state.channel,
      memberIds,
      createdAt: new Date().toISOString(),
      createdBy: user.username,
    });
    setJSON(LS_GROUPS, groups);
    els.groupName.value = "";
    renderGroups();
    addHistory("Obveščanje", `Ustvarjena skupina "${name}" (${memberIds.length} prejemnikov).`);
  }

  function renderGroups() {
    const groups = getGroups();
    els.groupSelect.innerHTML = `<option value="">Izberi shranjeno skupino</option>`;
    groups.forEach((group) => {
      const option = document.createElement("option");
      option.value = group.id;
      option.textContent = `${group.name} (${group.memberIds?.length || 0})`;
      els.groupSelect.appendChild(option);
    });

    els.groupsList.innerHTML = groups.length
      ? groups.slice(0, 8).map((group) => `
          <div class="communication-group-chip">
            <strong>${escapeHtml(group.name)}</strong>
            <span>${escapeHtml(group.channel === "sms" ? "SMS" : "E-pošta")} | ${group.memberIds?.length || 0} članov</span>
          </div>
        `).join("")
      : `<div class="small-hint">Ni še shranjenih skupin.</div>`;
  }

  function saveDraft() {
    if (!canUseChannel(state.channel)) {
      alert("Za ta kanal nimate dovoljenja.");
      return;
    }
    const recipients = getSelectedMembers();
    if (!recipients.length) {
      alert("Izberite vsaj enega prejemnika.");
      return;
    }
    const subject = String(els.subject.value || "").trim();
    const message = String(els.message.value || "").trim();
    if (!message) {
      alert("Vpišite besedilo sporočila.");
      return;
    }

    const log = getLog();
    log.unshift({
      id: Date.now(),
      channel: state.channel,
      subject,
      message,
      recipientIds: recipients.map((member) => member.id),
      recipientCount: recipients.length,
      provider: state.channel === "sms" ? "SMS Chef" : "SendGrid/Twilio",
      status: "prepared",
      createdBy: user.username,
      createdAt: new Date().toISOString(),
    });
    setJSON(LS_LOG, log);
    addHistory("Obveščanje", `Shranjen osnutek ${state.channel === "sms" ? "SMS" : "e-pošte"} za ${recipients.length} prejemnikov.`);
    renderLog();
    alert("Osnutek je shranjen v dnevnik.");
  }


  function renderLog() {
    const log = getLog();
    els.log.innerHTML = log.length
      ? log.slice(0, 12).map((entry) => `
          <div class="communication-log-item">
            <strong>${escapeHtml(entry.subject || "Brez zadeve")}</strong>
            <span>${escapeHtml(entry.channel === "sms" ? "SMS" : "E-pošta")} | ${entry.recipientCount || 0} prejemnikov | ${escapeHtml(formatDateTime(entry.createdAt))}</span>
            <small>${escapeHtml(entry.provider || "")} | shranjen osnutek</small>
          </div>
        `).join("")
      : `<div class="small-hint">Dnevnik je zaenkrat prazen.</div>`;
  }

  function renderPreview() {
    const first = getSelectedMembers()[0];
    const text = String(els.message.value || "").trim();
    if (!text) {
      els.preview.textContent = "Vpišite besedilo za predogled.";
      return;
    }
    els.preview.textContent = first ? personalize(text, first) : text;
  }

  function applyTemplate(type) {
    const templates = {
      fee: {
        subject: "Opomnik za plačilo članarine",
        message: "Pozdravljeni {ime},\n\nv evidenci RD Mozirje še nimamo označenega plačila članarine za aktivno leto. Prosimo, da plačilo uredite v najkrajšem času.\n\nLep pozdrav,\nRD Mozirje",
      },
      recap: {
        subject: "Oddaja letne rekapitulacije",
        message: "Pozdravljeni {ime},\n\nprosimo vas, da oddate letno rekapitulacijo ribolovnega uplena in ribolovnih dni za svojo dovolilnico.\n\nLep pozdrav,\nRD Mozirje",
      },
      event: {
        subject: "Obvestilo RD Mozirje",
        message: "Pozdravljeni {ime},\n\nobveščamo vas o prihajajoči aktivnosti RD Mozirje. Podrobnosti bodo posredovane v nadaljevanju.\n\nLep pozdrav,\nRD Mozirje",
      },
      exam: {
        subject: "Ribiški izpit",
        message: "Pozdravljeni {ime},\n\npo evidenci še nimate opravljenega ribiškega izpita. Prosimo, da spremljate obvestila glede naslednjih terminov.\n\nLep pozdrav,\nRD Mozirje",
      },
    };
    els.subject.value = templates[type]?.subject || "";
    els.message.value = templates[type]?.message || "";
    renderPreview();
  }

  function exportRecipients() {
    const rows = getSelectedMembers();
    if (!rows.length) {
      alert("Izberite prejemnike za izvoz.");
      return;
    }
    const csvRows = [
      ["Priimek", "Ime", "Status", "Članska", "E-pošta", "Telefon", "Tip karte"],
      ...rows.map((member) => [member.priimek || "", member.ime || "", member.status || "", member.clanska || "", member.email || "", member.telefon || "", formatCardType(member)]),
    ];
    const csv = `\ufeff${csvRows.map((row) => row.map(csvCell).join(";")).join("\r\n")}`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `prejemniki-${state.channel}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function getSelectedMembers() {
    const selected = state.selectedIds;
    return getMembers().filter((member) => selected.has(String(member.id)) && getChannelContact(member, state.channel));
  }

  function getGroups() {
    return getJSON(LS_GROUPS, []);
  }

  function getLog() {
    return getJSON(LS_LOG, []);
  }

  function getFeeState(memberId, year) {
    const all = getJSON(LS_FEE_STATUS, {});
    return all?.[year]?.[memberId]?.state || "UNPAID";
  }

  function getRecapActiveYear() {
    const stored = Number.parseInt(localStorage.getItem(LS_RECAP_ACTIVE_YEAR), 10);
    return Number.isFinite(stored) && stored >= 2026 ? stored : 2026;
  }

  function hasYearlyRecap(member, year) {
    const memberPermit = normalizePermit(member.clanska || member.licenseNumber || "");
    if (!memberPermit) return false;
    return getYearlyRecaps().some((recap) => Number(recap.year) === Number(year) && normalizePermit(recap.permitNumber) === memberPermit);
  }

  function isElrdCard(member) {
    const card = normalizeIdentityText(member.tipKarte || member.tipLetneKarte || member.letnaKarta || "");
    return card.includes("elrd") || card.includes("elektronska");
  }

  function isNormalCard(member) {
    return !isElrdCard(member);
  }

  function formatCardType(member) {
    return isElrdCard(member) ? "eLRD" : "Navadna";
  }

  function getChannelContact(member, channel) {
    if (channel === "email") return isValidEmail(member.email) ? member.email : "";
    return normalizePhone(member.telefon);
  }

  function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
  }

  function normalizePhone(value) {
    const raw = String(value || "").trim();
    const digits = raw.replace(/[^\d+]/g, "");
    if (!digits || digits.replace(/\D/g, "").length < 8) return "";
    return raw;
  }

  function normalizePermit(value) {
    return normalizeIdentityText(value).replace(/\s+/g, "");
  }

  function memberSearchText(member) {
    return normalizeIdentityText(`${member.priimek || ""} ${member.ime || ""} ${member.clanska || ""} ${member.email || ""} ${member.telefon || ""}`);
  }

  function personalize(text, member) {
    return text
      .replaceAll("{ime}", member.ime || "")
      .replaceAll("{priimek}", member.priimek || "")
      .replaceAll("{clanska}", member.clanska || "")
      .replaceAll("{status}", member.status || "");
  }

  function formatDateTime(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleString("sl-SI");
  }

  function csvCell(value) {
    const text = String(value ?? "");
    return `"${text.replaceAll('"', '""')}"`;
  }
});



