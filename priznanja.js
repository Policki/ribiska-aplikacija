function handlePriznanjaPage() {
  // -----------------------------
  // LocalStorage ključi (lokalno, ne v core.js)
  // -----------------------------
  const LS_AWARDS = "rd_awards_history_v1";
  const LS_PROPOSALS = "rd_awards_proposals_v1";
  const LS_PLAQUE_PROPOSALS = "rd_awards_plaque_proposals_v1";

  // -----------------------------
  // DOM
  // -----------------------------
  const selectMember = document.getElementById("award-member");
  const selectAwardType = document.getElementById("award-type");
  const inputDate = document.getElementById("award-date");
  const form = document.getElementById("award-form");
  const btnReset = document.getElementById("btn-award-reset");

  const tbodyAwards = document.getElementById("awards-tbody");
  const toggleArchived = document.getElementById("toggle-archived");

  const btnGenerate = document.getElementById("btn-generate");
  const btnApproveSelected = document.getElementById("btn-approve-selected");
  const tbodyProposals = document.getElementById("proposals-tbody");

  const btnGeneratePlaques = document.getElementById("btn-generate-plaques");
  const btnApproveSelectedPlaques = document.getElementById("btn-approve-selected-plaques");
  const tbodyPlaques = document.getElementById("plaques-tbody");

  const aktivnoLetoEl = document.getElementById("aktivno-leto");
  if (aktivnoLetoEl) aktivnoLetoEl.textContent = AktivnoLeto();

  if (!selectMember || !selectAwardType || !inputDate || !form) return;

  // -----------------------------
  // KATALOG PRIZNANJ (ključ -> naziv)
  // -----------------------------
  const AWARDS = {
    ZNAK_MLADI_RIBIC: { label: "Znak mladi ribič", kind: "znak" },
    ZNAK_RIBISKE_ZASLUGE: { label: "Znak za ribiške zasluge", kind: "znak" },
    RED_III: { label: "Red za ribiške zasluge III. stopnje", kind: "red" },
    RED_II: { label: "Red za ribiške zasluge II. stopnje", kind: "red" },
    RED_I: { label: "Red za ribiške zasluge I. stopnje", kind: "red" },
    PLAKETA_RZS: { label: "Plaketa RZS", kind: "plaketa" },
    PLAKETA_FRANKET: { label: "Plaketa Ivana Franketa", kind: "plaketa" },
  };

  // “Navadna” progresija do Red I
  const LADDER = [
    "ZNAK_MLADI_RIBIC",
    "ZNAK_RIBISKE_ZASLUGE",
    "RED_III",
    "RED_II",
    "RED_I",
  ];

  // ločen trak plaket
  const PLAQUE_LADDER = ["PLAKETA_RZS", "PLAKETA_FRANKET"];

  const nowISO = () => new Date().toISOString().slice(0, 10);
  const safe = (v) => (v == null ? "" : String(v));
  const fmtDateSI = (iso) => (iso ? new Date(iso).toLocaleDateString("sl-SI") : "-");

  function getJSONLocal(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  }
  function setJSONLocal(key, val) {
    localStorage.setItem(key, JSON.stringify(val));
  }

  function getAwardsHistory() {
    return getJSONLocal(LS_AWARDS, []);
  }
  function saveAwardsHistory(list) {
    setJSONLocal(LS_AWARDS, list);
  }

  function getProposals() {
    return getJSONLocal(LS_PROPOSALS, []);
  }
  function saveProposals(list) {
    setJSONLocal(LS_PROPOSALS, list);
  }

  function getPlaqueProposals() {
    return getJSONLocal(LS_PLAQUE_PROPOSALS, []);
  }
  function savePlaqueProposals(list) {
    setJSONLocal(LS_PLAQUE_PROPOSALS, list);
  }

  // -----------------------------
  // Člani (aktivni / arhiv)
  // -----------------------------
  function getMembersForView() {
    const includeArchived = !!toggleArchived?.checked;
    return getMembers().filter((m) => (includeArchived ? true : !m.arhiviran));
  }

  function getActiveMembersOnly() {
    return getMembers().filter((m) => !m.arhiviran);
  }

  function fillMemberSelect(selectedId) {
    const members = getActiveMembersOnly()
      .slice()
      .sort((a, b) => {
        const pa = (a.priimek || "").localeCompare(b.priimek || "", "sl");
        if (pa !== 0) return pa;
        return (a.ime || "").localeCompare(b.ime || "", "sl");
      });

    selectMember.innerHTML = "";
    members.forEach((m) => {
      const opt = document.createElement("option");
      opt.value = m.id;
      opt.textContent = `${m.priimek} ${m.ime} (št. ${m.clanska})`;
      if (selectedId && Number(selectedId) === m.id) opt.selected = true;
      selectMember.appendChild(opt);
    });
  }

  // -----------------------------
  // AWARDS: izračuni (zadnje priznanje, filter, rank)
  // -----------------------------
  function awardLabel(key) {
    return AWARDS[key]?.label || key || "-";
  }

  function awardBadge(key) {
    const kind = AWARDS[key]?.kind || "neutral";
    return `<span class="award-badge award-badge--${kind}">${awardLabel(key)}</span>`;
  }

  function memberLabel(member) {
    if (!member) return "(član ne obstaja)";
    return `${safe(member.priimek)} ${safe(member.ime)}`.trim();
  }

  function emptyRow(colspan, title, hint) {
    return `
      <tr>
        <td colspan="${colspan}" class="awards-empty-cell">
          <div class="awards-empty">
            <strong>${title}</strong>
            <span>${hint}</span>
          </div>
        </td>
      </tr>
    `;
  }

  function historyForMember(memberId) {
    const all = getAwardsHistory().filter((a) => a.memberId === memberId);
    all.sort((x, y) => (x.date || "").localeCompare(y.date || "")); // naraščajoče
    return all;
  }

  function lastAwardForMember(memberId) {
    const list = historyForMember(memberId);
    if (!list.length) return null;
    return list[list.length - 1];
  }

  function lastAwardOfTypeForMember(memberId, awardKey) {
    const list = historyForMember(memberId).filter((a) => a.awardKey === awardKey);
    if (!list.length) return null;
    return list[list.length - 1];
  }

  function bestLadderIndex(memberId) {
    // najvišje doseženo v LADDER (ignorira plakete)
    const hist = historyForMember(memberId);
    let best = -1;
    hist.forEach((h) => {
      const i = LADDER.indexOf(h.awardKey);
      if (i > best) best = i;
    });
    return best;
  }

  function yearsSince(dateISO) {
    if (!dateISO) return null;
    const d = new Date(dateISO);
    if (Number.isNaN(d.getTime())) return null;
    const now = new Date();
    let years = now.getFullYear() - d.getFullYear();
    const m = now.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < d.getDate())) years--;
    return years;
  }

  function addYears(dateISO, years) {
    const d = new Date(dateISO);
    d.setFullYear(d.getFullYear() + years);
    return d.toISOString().slice(0, 10);
  }

  function isDateOnOrBefore(aISO, bISO) {
    // a <= b
    return (aISO || "") <= (bISO || "");
  }

  // -----------------------------
  // ELIGIBILITY pravila
  // -----------------------------
  function eligibleForMladiRibic(member) {
    // AM in 3 leta od vpisa
    if (!member || member.arhiviran) return false;
    if (member.status !== "AM") return false;
    if (!member.datumVpisa) return false;
    const due = addYears(member.datumVpisa, 3);
    return isDateOnOrBefore(due, nowISO());
  }

  function eligibleForZnakZasluge(member) {
    // 5 let od vpisa (ne od zadnjega priznanja)
    if (!member || member.arhiviran) return false;
    if (!member.datumVpisa) return false;
    const due = addYears(member.datumVpisa, 5);
    return isDateOnOrBefore(due, nowISO());
  }

  function eligibleByLastAward5Years(memberId) {
    // 5 let od zadnjega priznanja (karkoli)
    const last = lastAwardForMember(memberId);
    if (!last?.date) return true; // če ni nič, ne blokiramo (nato se presodi po drugih pogojih)
    const due = addYears(last.date, 5);
    return isDateOnOrBefore(due, nowISO());
  }

  function nextNormalAwardCandidate(member) {
    // Vrne {awardKey, note, lastAward} ali null
    // Upošteva: aktivni, do Red I, 5-letno pravilo po zadnjem priznanju,
    // izjeme: mladi ribič (3 leta od vpisa) in znak zasluge (5 let od vpisa).
    if (!member || member.arhiviran) return null;

    const idx = bestLadderIndex(member.id);
    const last = lastAwardForMember(member.id);

    // Če ima že RED_I, navadnih predlogov ne delamo
    if (idx >= LADDER.indexOf("RED_I")) return null;

    // 1) Če AM in še nima mladi ribič, preveri mladi ribič (ne rabi 5 let od zadnjega)
    if (eligibleForMladiRibic(member)) {
      const already = !!lastAwardOfTypeForMember(member.id, "ZNAK_MLADI_RIBIC");
      if (!already) {
        return {
          awardKey: "ZNAK_MLADI_RIBIC",
          note: "AM + 3 leta od vpisa",
          lastAward: last,
        };
      }
    }

    // 2) Znak za ribiške zasluge: 5 let od vpisa (ne rabi 5 let od zadnjega)
    if (eligibleForZnakZasluge(member)) {
      const already = !!lastAwardOfTypeForMember(member.id, "ZNAK_RIBISKE_ZASLUGE");
      if (!already) {
        return {
          awardKey: "ZNAK_RIBISKE_ZASLUGE",
          note: "5 let od vpisa (izjema)",
          lastAward: last,
        };
      }
    }

    // 3) Ostalo po lestvici: 5 let od zadnjega priznanja
    if (!eligibleByLastAward5Years(member.id)) return null;

    // naslednje priznanje po “najvišjem”
    const nextIndex = idx + 1;
    const nextKey = LADDER[nextIndex] || null;
    if (!nextKey) return null;

    // preskoči “mladi ribič” če ni več relevantno (npr. odrasel ali že ima) – a to smo že zgoraj
    if (nextKey === "ZNAK_MLADI_RIBIC") {
      // če je na tem mestu in ni eligible, poskusi naslednjega
      const alt = LADDER[nextIndex + 1];
      if (!alt) return null;
      return {
        awardKey: alt,
        note: "5 let od zadnjega priznanja",
        lastAward: last,
      };
    }

    // za red III/II/I
    return {
      awardKey: nextKey,
      note: "5 let od zadnjega priznanja",
      lastAward: last,
    };
  }

  function nextPlaqueCandidate(member) {
    // Ločeno: po Red I -> Plaketa RZS, po RZS -> Franket, obvezno 5 let od relevantnega pogoja
    if (!member || member.arhiviran) return null;

    const redI = lastAwardOfTypeForMember(member.id, "RED_I");
    if (!redI?.date) return null;

    const plaketaRZS = lastAwardOfTypeForMember(member.id, "PLAKETA_RZS");
    const franket = lastAwardOfTypeForMember(member.id, "PLAKETA_FRANKET");

    // če ima že Franket -> konec
    if (franket?.date) return null;

    // kandidat za Franket (če ima RZS in 5 let)
    if (plaketaRZS?.date) {
      const due = addYears(plaketaRZS.date, 5);
      if (isDateOnOrBefore(due, nowISO())) {
        return {
          awardKey: "PLAKETA_FRANKET",
          condKey: "PLAKETA_RZS",
          condDate: plaketaRZS.date,
          note: "5 let od plakete RZS",
        };
      }
      return null;
    }

    // kandidat za Plaketa RZS (če je Red I star vsaj 5 let)
    const dueRZS = addYears(redI.date, 5);
    if (isDateOnOrBefore(dueRZS, nowISO())) {
      return {
        awardKey: "PLAKETA_RZS",
        condKey: "RED_I",
        condDate: redI.date,
        note: "5 let od Red I",
      };
    }

    return null;
  }

  // -----------------------------
  // Vnos priznanja (manual)
  // -----------------------------
  function addAward(memberId, awardKey, dateISO) {
    const hist = getAwardsHistory();
    hist.push({
      id: Date.now(),
      memberId,
      awardKey,
      date: dateISO,
    });
    saveAwardsHistory(hist);

    // zaradi kompatibilnosti s starim prikazom (če kje uporabljaš lastAwardName/Year)
    const members = getMembers();
    const idx = members.findIndex((m) => m.id === memberId);
    if (idx !== -1) {
      members[idx].lastAwardName = awardLabel(awardKey);
      members[idx].lastAwardYear = dateISO ? String(new Date(dateISO).getFullYear()) : "";
      saveMembers(members);
    }
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const memberId = Number(selectMember.value);
    const awardKey = selectAwardType.value;
    const dateISO = inputDate.value;

    if (!memberId || !awardKey || !dateISO) {
      alert("Izberi člana, priznanje in datum.");
      return;
    }

    addAward(memberId, awardKey, dateISO);

    const member = getMembers().find((m) => m.id === memberId);
    const name = member ? `${member.ime} ${member.priimek}` : "neznan član";
    addHistory("Priznanja", `Dodano priznanje: ${name} – ${awardLabel(awardKey)} (${dateISO}).`);

    form.reset();
    inputDate.value = nowISO();
    renderAll();
  });

  btnReset?.addEventListener("click", () => {
    form.reset();
    inputDate.value = nowISO();
  });

  // -----------------------------
  // Generiranje predlogov (navadni)
  // -----------------------------
  function upsertProposal(member, next) {
    const list = getProposals();

    // ne delaj duplikata za istega člana, če že ima pending
    const existing = list.find((p) => p.memberId === member.id && p.status === "pending");
    if (existing) return;

    list.push({
      id: Date.now() + Math.floor(Math.random() * 9999),
      createdAt: new Date().toISOString(),
      status: "pending",
      memberId: member.id,
      proposedAwardKey: next.awardKey,
      lastAwardKey: next.lastAward?.awardKey || null,
      lastAwardDate: next.lastAward?.date || null,
      note: next.note || "",
    });

    saveProposals(list);
  }

  function generateProposals() {
    const members = getActiveMembersOnly();

    members.forEach((m) => {
      const next = nextNormalAwardCandidate(m);
      if (!next) return;
      upsertProposal(m, next);
    });

    renderProposals();
  }

  btnGenerate?.addEventListener("click", () => {
    generateProposals();
  });

  function approveSelectedProposals() {
    const checks = Array.from(document.querySelectorAll('[data-proposal-check="1"]'));
    const ids = checks.filter((c) => c.checked).map((c) => Number(c.dataset.id));
    if (!ids.length) {
      alert("Najprej označi predloge (✓), ki jih želiš potrditi.");
      return;
    }

    const proposals = getProposals();
    const toApprove = proposals.filter((p) => p.status === "pending" && ids.includes(p.id));

    if (!toApprove.length) return;

    toApprove.forEach((p) => {
      // pri potrditvi vpišemo priznanje na današnji datum (lahko spremeniš po potrebi)
      addAward(p.memberId, p.proposedAwardKey, nowISO());

      const mem = getMembers().find((m) => m.id === p.memberId);
      const name = mem ? `${mem.ime} ${mem.priimek}` : "neznan član";
      addHistory(
        "Priznanja",
        `Potrjen predlog: ${name} – ${awardLabel(p.proposedAwardKey)} (${nowISO()}).`
      );

      p.status = "approved";
      p.approvedAt = new Date().toISOString();
    });

    saveProposals(proposals);
    renderAll();
  }

  btnApproveSelected?.addEventListener("click", approveSelectedProposals);

  // -----------------------------
  // Generiranje predlogov (plakete)
  // -----------------------------
  function upsertPlaqueProposal(member, next) {
    const list = getPlaqueProposals();
    const existing = list.find((p) => p.memberId === member.id && p.status === "pending");
    if (existing) return;

    list.push({
      id: Date.now() + Math.floor(Math.random() * 9999),
      createdAt: new Date().toISOString(),
      status: "pending",
      memberId: member.id,
      proposedAwardKey: next.awardKey,
      condKey: next.condKey,
      condDate: next.condDate,
      note: next.note || "",
    });

    savePlaqueProposals(list);
  }

  function generatePlaqueProposals() {
    const members = getActiveMembersOnly();
    members.forEach((m) => {
      const next = nextPlaqueCandidate(m);
      if (!next) return;
      upsertPlaqueProposal(m, next);
    });
    renderPlaques();
  }

  btnGeneratePlaques?.addEventListener("click", () => {
    generatePlaqueProposals();
  });

  function approveSelectedPlaques() {
    const checks = Array.from(document.querySelectorAll('[data-plaque-check="1"]'));
    const ids = checks.filter((c) => c.checked).map((c) => Number(c.dataset.id));
    if (!ids.length) {
      alert("Najprej označi predloge (✓), ki jih želiš potrditi.");
      return;
    }

    const proposals = getPlaqueProposals();
    const toApprove = proposals.filter((p) => p.status === "pending" && ids.includes(p.id));
    if (!toApprove.length) return;

    toApprove.forEach((p) => {
      addAward(p.memberId, p.proposedAwardKey, nowISO());

      const mem = getMembers().find((m) => m.id === p.memberId);
      const name = mem ? `${mem.ime} ${mem.priimek}` : "neznan član";
      addHistory(
        "Priznanja",
        `Potrjena plaketa: ${name} – ${awardLabel(p.proposedAwardKey)} (${nowISO()}).`
      );

      p.status = "approved";
      p.approvedAt = new Date().toISOString();
    });

    savePlaqueProposals(proposals);
    renderAll();
  }

  btnApproveSelectedPlaques?.addEventListener("click", approveSelectedPlaques);

  // -----------------------------
  // Render: predlogi
  // -----------------------------
  function renderProposals() {
    if (!tbodyProposals) return;
    const proposals = getProposals().filter((p) => p.status === "pending");

    const members = getMembers(); // za ime
    tbodyProposals.innerHTML = "";

    if (!proposals.length) {
      tbodyProposals.innerHTML = emptyRow(8, "Ni predlogov priznanj", "Klikni “Generiraj predloge”, ko želiš osvežiti seznam kandidatov.");
      return;
    }

    proposals.forEach((p, idx) => {
      const m = members.find((x) => x.id === p.memberId);
      const name = memberLabel(m);

      const lastLabel = p.lastAwardKey ? awardLabel(p.lastAwardKey) : "-";
      const lastDate = p.lastAwardDate ? fmtDateSI(p.lastAwardDate) : "-";

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td style="text-align:center;">
          <input class="awards-row-check" type="checkbox" data-proposal-check="1" data-id="${p.id}">
        </td>
        <td>${idx + 1}</td>
        <td><strong>${name}</strong></td>
        <td>${awardBadge(p.proposedAwardKey)}</td>
        <td>${lastLabel}</td>
        <td>${lastDate}</td>
        <td><span class="award-note">${safe(p.note)}</span></td>
        <td class="table-actions">
          <button type="button" class="member-tool-btn member-tool-btn--delete delete" title="Odstrani predlog">Odstrani</button>
        </td>
      `;

      tr.querySelector(".delete")?.addEventListener("click", () => {
        if (!confirm("Odstranim predlog? (Če je še vedno primeren, se bo ob naslednjem generiranju spet pojavil.)")) return;
        const list = getProposals().filter((x) => x.id !== p.id);
        saveProposals(list);
        renderProposals();
      });

      tbodyProposals.appendChild(tr);
    });
  }

  // -----------------------------
  // Render: plakete
  // -----------------------------
  function renderPlaques() {
    if (!tbodyPlaques) return;
    const proposals = getPlaqueProposals().filter((p) => p.status === "pending");

    const members = getMembers();
    tbodyPlaques.innerHTML = "";

    if (!proposals.length) {
      tbodyPlaques.innerHTML = emptyRow(8, "Ni predlogov plaket", "Klikni “Generiraj plakete”, ko želiš preveriti pogoje za plakete.");
      return;
    }

    proposals.forEach((p, idx) => {
      const m = members.find((x) => x.id === p.memberId);
      const name = memberLabel(m);

      const condDate = p.condDate ? fmtDateSI(p.condDate) : "-";

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td style="text-align:center;">
          <input class="awards-row-check" type="checkbox" data-plaque-check="1" data-id="${p.id}">
        </td>
        <td>${idx + 1}</td>
        <td><strong>${name}</strong></td>
        <td>${awardBadge(p.proposedAwardKey)}</td>
        <td>${awardBadge(p.condKey)}</td>
        <td>${condDate}</td>
        <td><span class="award-note">${safe(p.note)}</span></td>
        <td class="table-actions">
          <button type="button" class="member-tool-btn member-tool-btn--delete delete" title="Odstrani predlog">Odstrani</button>
        </td>
      `;

      tr.querySelector(".delete")?.addEventListener("click", () => {
        if (!confirm("Odstranim predlog plakete? (Če je še vedno primeren, se bo ob naslednjem generiranju spet pojavil.)")) return;
        const list = getPlaqueProposals().filter((x) => x.id !== p.id);
        savePlaqueProposals(list);
        renderPlaques();
      });

      tbodyPlaques.appendChild(tr);
    });
  }

  // -----------------------------
  // Render: pregled članov
  // -----------------------------
  function renderMembersAwards() {
    if (!tbodyAwards) return;

    const members = getMembersForView()
      .slice()
      .sort((a, b) => {
        const pa = (a.priimek || "").localeCompare(b.priimek || "", "sl");
        if (pa !== 0) return pa;
        return (a.ime || "").localeCompare(b.ime || "", "sl");
      });

    tbodyAwards.innerHTML = "";

    members.forEach((m) => {
      const hist = historyForMember(m.id);

      const last = hist.length ? hist[hist.length - 1] : null;
      const lastLabel = last ? awardLabel(last.awardKey) : "-";
      const lastDate = last?.date ? fmtDateSI(last.date) : "-";

      const allBadges = hist.length
        ? hist
            .slice()
            .reverse()
            .map((h) => `<span class="award-badge award-badge--compact award-badge--${AWARDS[h.awardKey]?.kind || "neutral"}" title="${h.date}">${awardLabel(h.awardKey)}</span>`)
            .join(" ")
        : `<span class="award-note">Brez priznanj</span>`;

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><strong>${safe(m.priimek)}</strong></td>
        <td>${safe(m.ime)}</td>
        <td>${last ? awardBadge(last.awardKey) : `<span class="award-note">${lastLabel}</span>`}</td>
        <td>${lastDate}</td>
        <td>${allBadges}</td>
      `;
      tbodyAwards.appendChild(tr);
    });
  }

  function renderAll() {
    fillMemberSelect();
    renderProposals();
    renderPlaques();
    renderMembersAwards();
  }

  toggleArchived?.addEventListener("change", renderMembersAwards);

  // init
  inputDate.value = nowISO();
  renderAll();
}

document.addEventListener("DOMContentLoaded", () => {
  ensureDemoData();
  const user = requireAuth({ pageModuleKey: "priznanja" });
  if (!user) return;

  initHeader(user);
  renderAppNav(user, "priznanja");
  startReminderWatcher();

  handlePriznanjaPage();
});

