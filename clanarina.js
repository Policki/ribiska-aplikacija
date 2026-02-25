function handleClanarinaPage() {
  // =============================
  // LocalStorage ključi (lokalno; core.js ne spreminjamo)
  // =============================
  const LS_FEE_SNAPSHOT = "rd_fee_snapshot_v1"; // { [year]: { createdAt, memberIds:[...] } }
  const LS_FEE_STATUS = "rd_fee_status_v1";     // { [year]: { [memberId]: {state, updatedAt} } }
  const LS_FEE_CLOSED = "rd_fee_closed_v1";     // { [year]: { closedAt } }
  const LS_FEE_NONPAY_LOG = "rd_fee_nonpay_log_v1"; // { [year]: [ {memberId, priimek, ime, clanska, amount, archivedAt} ] }

  // =============================
  // Statusi plačila
  // =============================
  const STATE = {
    UNPAID: "UNPAID",
    PAID_TRR: "PAID_TRR",
    PAID_CASH: "PAID_CASH",
    AUTO: "AUTO", // ZAČ - avtomatski renew
  };

  // =============================
  // DOM
  // =============================
  const tbody = document.getElementById("fees-tbody");
  const tbodyNonpayers = document.getElementById("nonpayers-tbody");
  const selYear = document.getElementById("fee-year");
  const inpSearch = document.getElementById("fee-search");
  const btnClose = document.getElementById("btn-close-year");
  const statsEl = document.getElementById("fee-stats");
  const aktivnoLetoEl = document.getElementById("aktivno-leto");
  if (aktivnoLetoEl) aktivnoLetoEl.textContent = AktivnoLeto();

  if (!tbody || !selYear) return;

  // =============================
  // UI state
  // =============================
  const ui = {
    year: currentYear(),
    search: "",
  };

  // =============================
  // helpers: storage / time
  // =============================
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

  function nowISO() {
    return new Date().toISOString();
  }

  function todayISO() {
    return new Date().toISOString().slice(0, 10);
  }

  // =============================
  // Pravila članarine (po tvojem)
  // =============================
  function isAutoRenewMember(m) {
    return m?.status === "ZAČ";
  }

  function feeAmountForMember(m) {
    if (!m) return 0;

    // ZAČ: ni članarine
    if (m.status === "ZAČ") return 0;

    // AČ: 70 €
    if (m.status === "AČ") return 70;

    // AM, DAM: 25 €
    if (m.status === "AM" || m.status === "DAM") return 25;

    // AŠI: 25 €
    if (m.status === "AŠI") return 25;

    // AP: < 18 => 25€, sicer 180
    if (m.status === "AP") {
      const age = getAge(m.datumRojstva);
      if (age !== null && age < 18) return 25;
      return 180;
    }

    // AA, DAA: 180 €
    if (m.status === "AA" || m.status === "DAA") return 180;

    // fallback
    return 180;
  }

  // =============================
  // UI labels/colors
  // =============================
  function stateLabel(state) {
    if (state === STATE.AUTO) return "AUTO (ZAČ)";
    if (state === STATE.PAID_TRR) return "PLAČAL (TRR)";
    if (state === STATE.PAID_CASH) return "PLAČAL (CASH)";
    return "NEPLAČAL";
  }

  function stateColorClass(state) {
    if (state === STATE.UNPAID) return "red";
    if (state === STATE.PAID_TRR) return "green";
    if (state === STATE.PAID_CASH) return "blue"; // CASH druga barva
    if (state === STATE.AUTO) return "green";
    return "";
  }

  function badgeClassForState(state) {
    if (state === STATE.UNPAID) return "warn";
    if (state === STATE.PAID_TRR) return "ok";
    if (state === STATE.PAID_CASH) return "cash";
    if (state === STATE.AUTO) return "ok";
    return "neutral";
  }

  // =============================
  // Leta (dropdown)
  // =============================
  function buildYearOptions() {
    const thisYear = Number(currentYear());
    const years = [];
    for (let y = thisYear; y >= thisYear - 6; y--) years.push(String(y));

    selYear.innerHTML = "";
    years.forEach((y) => {
      const opt = document.createElement("option");
      opt.value = y;
      opt.textContent = y;
      if (y === ui.year) opt.selected = true;
      selYear.appendChild(opt);
    });
  }

  // =============================
  // Snapshot ob 1.1. (prvič, ko odpreš leto)
  // =============================
  function ensureYearSnapshot(year) {
    const snapAll = getJSONLocal(LS_FEE_SNAPSHOT, {});
    if (snapAll[year]?.memberIds?.length) return;

    // seznam obveznikov: aktivni člani v trenutku kreiranja snapshota
    const active = getMembers().filter((m) => !m.arhiviran);
    const memberIds = active.map((m) => m.id);

    snapAll[year] = { createdAt: nowISO(), memberIds };
    setJSONLocal(LS_FEE_SNAPSHOT, snapAll);

    // init status map
    const statusAll = getJSONLocal(LS_FEE_STATUS, {});
    statusAll[year] = statusAll[year] || {};

    const membersAll = getMembers();
    memberIds.forEach((id) => {
      if (statusAll[year][id]) return;

      const m = membersAll.find((x) => x.id === id);
      const auto = m && isAutoRenewMember(m);

      statusAll[year][id] = {
        state: auto ? STATE.AUTO : STATE.UNPAID,
        updatedAt: nowISO(),
      };
    });

    setJSONLocal(LS_FEE_STATUS, statusAll);

    addHistory("Članarina", `Ustvarjen seznam članarine za leto ${year} (${memberIds.length} članov).`);
  }

  function getSnapshotIds(year) {
    const snapAll = getJSONLocal(LS_FEE_SNAPSHOT, {});
    return snapAll[year]?.memberIds || [];
  }

  function getStatusMap(year) {
    const all = getJSONLocal(LS_FEE_STATUS, {});
    return all[year] || {};
  }

  function setStatus(year, memberId, state) {
    const all = getJSONLocal(LS_FEE_STATUS, {});
    all[year] = all[year] || {};
    all[year][memberId] = { state, updatedAt: nowISO() };
    setJSONLocal(LS_FEE_STATUS, all);
  }

  function isYearClosed(year) {
    const closed = getJSONLocal(LS_FEE_CLOSED, {});
    return !!closed[year]?.closedAt;
  }

  function markYearClosed(year) {
    const closed = getJSONLocal(LS_FEE_CLOSED, {});
    closed[year] = { closedAt: nowISO() };
    setJSONLocal(LS_FEE_CLOSED, closed);
  }

  function addNonpayLog(year, entry) {
    const all = getJSONLocal(LS_FEE_NONPAY_LOG, {});
    all[year] = all[year] || [];
    all[year].push(entry);
    setJSONLocal(LS_FEE_NONPAY_LOG, all);
  }

  function getNonpayLog(year) {
    const all = getJSONLocal(LS_FEE_NONPAY_LOG, {});
    return all[year] || [];
  }

  // =============================
  // Search helper
  // =============================
  function matchesSearch(m) {
    if (!ui.search) return true;
    const q = ui.search.toLowerCase();
    const a = `${m.priimek || ""} ${m.ime || ""}`.toLowerCase();
    const c = String(m.clanska || "").toLowerCase();
    return a.includes(q) || c.includes(q);
  }

  // =============================
  // Stats
  // =============================
  function renderStats(year, ids, statusMap) {
    const total = ids.length;

    let unpaid = 0;
    let paidTRR = 0;
    let paidCASH = 0;
    let auto = 0;

    ids.forEach((id) => {
      const st = statusMap[id]?.state || STATE.UNPAID;
      if (st === STATE.UNPAID) unpaid++;
      if (st === STATE.PAID_TRR) paidTRR++;
      if (st === STATE.PAID_CASH) paidCASH++;
      if (st === STATE.AUTO) auto++;
    });

    const paid = paidTRR + paidCASH + auto;

    if (statsEl) {
      statsEl.textContent =
        `Skupaj: ${total} | Aktivni za leto: ${paid} (TRR ${paidTRR}, CASH ${paidCASH}, AUTO ${auto}) | Neplačali: ${unpaid}` +
        (isYearClosed(year) ? " | LETO ZAKLJUČENO" : "");
    }
  }

  // =============================
  // Render: glavni seznam
  // =============================
  function render() {
    const year = ui.year;

    ensureYearSnapshot(year);

    const ids = getSnapshotIds(year);
    const statusMap = getStatusMap(year);

    const membersAll = getMembers();
    const membersSnap = ids
      .map((id) => membersAll.find((m) => m.id === id))
      .filter(Boolean);

    const members = membersSnap
      .filter(matchesSearch)
      .sort((a, b) => {
        const pa = (a.priimek || "").localeCompare(b.priimek || "", "sl");
        if (pa !== 0) return pa;
        return (a.ime || "").localeCompare(b.ime || "", "sl");
      });

    const closed = isYearClosed(year);

    tbody.innerHTML = "";

    members.forEach((m) => {
      const amount = feeAmountForMember(m);
      const st = statusMap[m.id]?.state || (isAutoRenewMember(m) ? STATE.AUTO : STATE.UNPAID);
      const color = stateColorClass(st);

      const tr = document.createElement("tr");

      tr.innerHTML = `
        <td>${m.priimek || ""}</td>
        <td>${m.ime || ""}</td>
        <td><span class="badge ${badgeClassForState(st)}">${stateLabel(st)}</span></td>
        <td>${m.naslov || "-"}</td>
        <td>${m.kraj || "-"}</td>
        <td><b>${amount} €</b></td>
        <td>
          <div class="fee-box ${color}" data-member-id="${m.id}" style="min-width:190px;">
            ${stateLabel(st)}
          </div>

          <div class="fee-picker" data-member-id="${m.id}" style="display:none;">
            <button type="button" class="fee-pick red" title="Neplačal"></button>
            <button type="button" class="fee-pick green" title="Plačal (TRR)"></button>
            <button type="button" class="fee-pick blue" title="Plačal (CASH)"></button>
          </div>

          ${isAutoRenewMember(m) ? `<div class="small-hint" style="margin-top:6px;">ZAČ: avtomatski renew (0€)</div>` : ""}
          ${closed ? `<div class="small-hint" style="margin-top:6px;">Leto je zaključeno.</div>` : ""}
        </td>
      `;

      tbody.appendChild(tr);
    });

    // toggle picker
    tbody.querySelectorAll(".fee-box").forEach((box) => {
      box.addEventListener("click", () => {
        const id = Number(box.dataset.memberId);
        const mem = getMembers().find((m) => m.id === id);
        if (mem && isAutoRenewMember(mem)) return; // ZAČ: brez pickerja

        const picker = tbody.querySelector(`.fee-picker[data-member-id="${id}"]`);
        if (!picker) return;
        picker.style.display = picker.style.display === "none" ? "flex" : "none";
      });
    });

    // pick status
    tbody.querySelectorAll(".fee-picker .fee-pick").forEach((btn) => {
      btn.addEventListener("click", () => {
        const picker = btn.closest(".fee-picker");
        const id = Number(picker.dataset.memberId);

        const mem = getMembers().find((m) => m.id === id);
        if (mem && isAutoRenewMember(mem)) {
          alert("ZAČ ima avtomatski renew članarine (0€).");
          return;
        }

        let newState = STATE.UNPAID;
        if (btn.classList.contains("red")) newState = STATE.UNPAID;
        if (btn.classList.contains("green")) newState = STATE.PAID_TRR;
        if (btn.classList.contains("blue")) newState = STATE.PAID_CASH;

        setStatus(year, id, newState);

        const name = mem ? `${mem.ime} ${mem.priimek}` : `ID ${id}`;
        addHistory("Članarina", `Status članarine ${year}: ${name} → ${stateLabel(newState)}.`);

        render();
      });
    });

    renderStats(year, ids, statusMap);
    renderNonpayersPanel(year, ids, statusMap);
  }

  // =============================
  // Render: neplačniki panel (details)
  // =============================
  function renderNonpayersPanel(year, ids, statusMap) {
    if (!tbodyNonpayers) return;

    const membersAll = getMembers();

    const unpaidIds = ids.filter((id) => {
      const st = statusMap[id]?.state || STATE.UNPAID;
      if (st !== STATE.UNPAID) return false;
      const m = membersAll.find((x) => x.id === id);
      if (m && isAutoRenewMember(m)) return false; // ZAČ ven
      return true;
    });

    tbodyNonpayers.innerHTML = "";

    if (!unpaidIds.length) {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td colspan="6" style="padding:14px; text-align:center; opacity:.75;">Ni neplačnikov.</td>`;
      tbodyNonpayers.appendChild(tr);
      return;
    }

    unpaidIds.forEach((id, idx) => {
      const m = membersAll.find((x) => x.id === id);
      if (!m) return;

      const amount = feeAmountForMember(m);

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${idx + 1}</td>
        <td>${m.priimek || ""}</td>
        <td>${m.ime || ""}</td>
        <td>${m.clanska || ""}</td>
        <td><b>${amount} €</b></td>
        <td>
          <div style="display:flex; gap:8px; flex-wrap:wrap;">
            <button type="button" class="chip-btn primary" data-action="revive-trr" data-id="${id}">
              Označi PLAČAL (TRR) + vrni aktivnega
            </button>
            <button type="button" class="chip-btn primary" data-action="revive-cash" data-id="${id}">
              Označi PLAČAL (CASH) + vrni aktivnega
            </button>
          </div>
          <div class="small-hint" style="margin-top:6px;">
            Vrnitev iz arhiva je možna samo v trenutnem letu.
          </div>
        </td>
      `;
      tbodyNonpayers.appendChild(tr);
    });

    tbodyNonpayers.querySelectorAll("button[data-action]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = Number(btn.dataset.id);
        const action = btn.dataset.action;

        // dovolimo le v trenutnem letu
        if (year !== currentYear()) {
          alert("Vrnitev iz arhiva je možna samo v trenutnem letu.");
          return;
        }

        const members = getMembers();
        const idx = members.findIndex((m) => m.id === id);
        if (idx === -1) return;

        if (isAutoRenewMember(members[idx])) {
          alert("ZAČ je avtomatski renew (0€).");
          return;
        }

        const payState = action === "revive-cash" ? STATE.PAID_CASH : STATE.PAID_TRR;

        // 1) status v evidenci
        setStatus(year, id, payState);

        // 2) vrni iz arhiva, če je arhiviran
        if (members[idx].arhiviran) {
          members[idx].arhiviran = false;
          members[idx].datumArhiva = null;
          members[idx].arhivLeto = null;
          saveMembers(members);
        } else {
          saveMembers(members);
        }

        addHistory(
          "Članarina",
          `Član ${members[idx].ime} ${members[idx].priimek} je plačal (${stateLabel(payState)}) in je ponovno aktiven za leto ${year}.`
        );

        render();
      });
    });
  }

  // =============================
  // Zaključi leto: neplačnike v arhiv
  // =============================
  function closeYear() {
    const year = ui.year;

    ensureYearSnapshot(year);

    if (isYearClosed(year)) {
      alert("To leto je že zaključeno.");
      return;
    }

    if (!confirm(`Zaključim leto ${year}? Vsi neplačniki bodo premaknjeni v arhiv članstva (odstop).`)) return;

    const ids = getSnapshotIds(year);
    const statusMap = getStatusMap(year);
    const members = getMembers();

    ids.forEach((id) => {
      const st = statusMap[id]?.state || STATE.UNPAID;
      if (st !== STATE.UNPAID) return;

      const idx = members.findIndex((m) => m.id === id);
      if (idx === -1) return;

      // ZAČ nikoli ne arhiviramo
      if (isAutoRenewMember(members[idx])) return;

      // arhiviraj
      members[idx].arhiviran = true;
      members[idx].datumArhiva = todayISO();
      members[idx].arhivLeto = Number(year);

      const amount = feeAmountForMember(members[idx]);

      addNonpayLog(year, {
        memberId: id,
        priimek: members[idx].priimek || "",
        ime: members[idx].ime || "",
        clanska: members[idx].clanska || "",
        amount,
        archivedAt: nowISO(),
      });

      addHistory(
        "Članarina",
        `Neplačnik ${members[idx].ime} ${members[idx].priimek} (leto ${year}) premaknjen v arhiv članstva (odstop).`
      );
    });

    saveMembers(members);
    markYearClosed(year);

    render();
  }

  // =============================
  // Init + events
  // =============================
  buildYearOptions();

  selYear.addEventListener("change", () => {
    ui.year = selYear.value;
    render();
  });

  inpSearch?.addEventListener("input", () => {
    ui.search = (inpSearch.value || "").trim();
    render();
  });

  btnClose?.addEventListener("click", closeYear);

  render();
}

document.addEventListener("DOMContentLoaded", () => {
  ensureDemoData();
  const user = requireAuth({ pageModuleKey: "clanarina" });
  if (!user) return;

  initHeader(user);
  renderAppNav(user, "clanarina");
  startReminderWatcher();

  handleClanarinaPage();
});