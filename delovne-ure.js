function handleDelovneUrePage() {
  const tbody = document.getElementById("workhours-tbody");
  const donut = document.getElementById("workhours-donut");
  const donutText = document.getElementById("workhours-donut-text");
  const stats = document.getElementById("workhours-stats");
  const statGrid = document.getElementById("workhours-stat-grid");
  const youthMeta = document.getElementById("workhours-youth-meta");
  const adultMeta = document.getElementById("workhours-adult-meta");
  const youthPercent = document.getElementById("workhours-youth-percent");
  const adultPercent = document.getElementById("workhours-adult-percent");
  const youthBars = document.getElementById("workhours-youth-bars");
  const adultBars = document.getElementById("workhours-adult-bars");

  const selYear = document.getElementById("wh-year");
  const btnExport = document.getElementById("btn-export-csv");
  const inpSearch = document.getElementById("wh-search");

  const btnFilterMust = document.getElementById("wh-filter-must");
  const btnFilterMissing = document.getElementById("wh-filter-missing");
  const btnSortMissing = document.getElementById("wh-sort-missing");

  const aktivnoLetoEl = document.getElementById("aktivno-leto");
  if (aktivnoLetoEl) aktivnoLetoEl.textContent = AktivnoLeto();

  if (!tbody || !selYear) return;

  const currentUser = getCurrentUser();

  // UI stanje
  const ui = {
    year: currentYear(),
    filterMust: true,
    filterMissing: false,
    sortByMissing: false,
    search: "",
  };

  // Naj bo default izbran currentYear (koledarsko)
  ui.year = currentYear();

  // Leta za dropdown: pokaži zadnjih 6 (lahko spremeniš)
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

  function isMustDo(member) {
    const age = getAge(member.datumRojstva);
    // če ni datuma rojstva: privzeto štejem, da mora (kot prej)
    return age === null ? true : age < 70;
  }

  function getAgeSafe(member) {
    const age = getAge(member.datumRojstva);
    return age === null ? null : age;
  }

  function isYouthMember(member) {
    const status = String(member.status || "").trim();
    if (status === "AM" || status === "DAM") return true;
    const age = getAge(member.datumRojstva);
    return age !== null && age < 18;
  }

  function normalizeHoursMapForMembers(hoursMap, members) {
    // Nove člane “samodejno doda” tako, da jim privzeto ure 0 (brez nujnega shranjevanja)
    // Če želiš takoj zapisat v storage, lahko tu dodaš save.
    members.forEach((m) => {
      if (hoursMap[m.id] == null) hoursMap[m.id] = 0;
    });
    return hoursMap;
  }

  function getVisibleMembers() {
    let list = getMembers().filter((m) => !m.arhiviran);
    const visibleStatuses = getUserVisibleStatuses(currentUser);
    if (visibleStatuses) {
      list = list.filter((m) => visibleStatuses.includes(m.status));
    }
    return list;
  }

  function getFilteredMembers(members, hoursMap) {
    let list = members.slice();

    // search
    if (ui.search) {
      const q = ui.search.toLowerCase();
      list = list.filter((m) => {
        const a = `${m.priimek || ""} ${m.ime || ""}`.toLowerCase();
        const c = String(m.clanska || "").toLowerCase();
        return a.includes(q) || c.includes(q);
      });
    }

    // filter must
    if (ui.filterMust) {
      list = list.filter((m) => isMustDo(m));
    }

    // filter missing
    if (ui.filterMissing) {
      list = list.filter((m) => {
        const must = isMustDo(m);
        if (!must) return false;
        const h = Number(hoursMap[m.id] ?? 0);
        return h < 10;
      });
    }

    // sort
    if (ui.sortByMissing) {
      list.sort((a, b) => {
        const ha = Number(hoursMap[a.id] ?? 0);
        const hb = Number(hoursMap[b.id] ?? 0);
        const ma = Math.max(0, 10 - ha);
        const mb = Math.max(0, 10 - hb);
        // več manjkajočih gor
        if (mb !== ma) return mb - ma;
        // potem po priimku
        const pa = (a.priimek || "").localeCompare(b.priimek || "", "sl");
        if (pa !== 0) return pa;
        return (a.ime || "").localeCompare(b.ime || "", "sl");
      });
    } else {
      // default sort: priimek/ime
      list.sort((a, b) => {
        const pa = (a.priimek || "").localeCompare(b.priimek || "", "sl");
        if (pa !== 0) return pa;
        return (a.ime || "").localeCompare(b.ime || "", "sl");
      });
    }

    return list;
  }

  function setHours(year, hoursMap, memberId, value) {
    const v = Math.max(0, Math.floor(Number(value || 0)));
    hoursMap[memberId] = v;
    setWorkHoursYear(year, hoursMap);
  }

  function bumpHours(year, hoursMap, memberId, delta) {
    const cur = Number(hoursMap[memberId] ?? 0);
    setHours(year, hoursMap, memberId, cur + delta);
  }

  function updateDonut(members, hoursMap) {
    const summary = calculateSummary(members, hoursMap);
    const pct = summary.total.must === 0 ? 100 : Math.round((summary.total.completed / summary.total.must) * 100);

    if (donut && donutText) {
      donut.style.background = `conic-gradient(#2ecc71 ${pct}%, #e0e0e0 0)`;
      donutText.textContent = `${pct}%`;
    }

    if (stats) {
      stats.textContent = `Opravljeno: ${summary.total.completed}/${summary.total.must} obveznikov | skupaj ${summary.total.hours} ur`;
    }

    renderStats(summary);
    renderGroupChart("youth", summary.youth);
    renderGroupChart("adult", summary.adult);
  }

  function calculateSummary(members, hoursMap) {
    const base = () => ({
      members: 0,
      must: 0,
      completed: 0,
      missingMembers: 0,
      exempt: 0,
      hours: 0,
      requiredHours: 0,
      missingHours: 0,
      overHours: 0,
    });

    const summary = {
      total: base(),
      youth: base(),
      adult: base(),
    };

    members.forEach((member) => {
      const hours = Number(hoursMap[member.id] ?? 0);
      const mustDo = isMustDo(member);
      const bucket = isYouthMember(member) ? summary.youth : summary.adult;

      [summary.total, bucket].forEach((target) => {
        target.members += 1;
        target.hours += hours;
        if (!mustDo) {
          target.exempt += 1;
          return;
        }
        target.must += 1;
        target.requiredHours += 10;
        if (hours >= 10) target.completed += 1;
        else target.missingMembers += 1;
        target.missingHours += Math.max(0, 10 - hours);
        target.overHours += Math.max(0, hours - 10);
      });
    });

    return summary;
  }

  function completionPercent(group) {
    if (!group.must) return 100;
    return Math.round((group.completed / group.must) * 100);
  }

  function renderStats(summary) {
    if (!statGrid) return;
    statGrid.innerHTML = [
      statCard("Obvezniki", summary.total.must, "člani, ki morajo opraviti ure"),
      statCard("Opravljeno", `${summary.total.completed}/${summary.total.must}`, `${completionPercent(summary.total)}% realizacija`),
      statCard("Manjkajo člani", summary.total.missingMembers, `${summary.total.missingHours} manjkajočih ur`),
      statCard("Skupaj ur", summary.total.hours, `${summary.total.overHours} ur nad obveznostjo`),
      statCard("Mladinci", `${summary.youth.completed}/${summary.youth.must}`, `${summary.youth.hours} opravljenih ur`),
      statCard("Ostali člani", `${summary.adult.completed}/${summary.adult.must}`, `${summary.adult.hours} opravljenih ur`),
      statCard("Oproščeni", summary.total.exempt, "70 let ali več"),
      statCard("Potrebno skupaj", summary.total.requiredHours, "ur za 100% realizacijo"),
    ].join("");
  }

  function statCard(label, value, hint) {
    return `
      <article class="workhours-stat-card">
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(value)}</strong>
        <small>${escapeHtml(hint)}</small>
      </article>
    `;
  }

  function renderGroupChart(groupKey, group) {
    const isYouth = groupKey === "youth";
    const metaEl = isYouth ? youthMeta : adultMeta;
    const percentEl = isYouth ? youthPercent : adultPercent;
    const barsEl = isYouth ? youthBars : adultBars;
    const pct = completionPercent(group);

    if (metaEl) metaEl.textContent = `${group.members} članov | ${group.must} obveznikov | ${group.exempt} oproščenih`;
    if (percentEl) percentEl.textContent = `${pct}%`;
    if (!barsEl) return;

    const completedPct = group.must ? Math.round((group.completed / group.must) * 100) : 100;
    const missingPct = group.must ? Math.round((group.missingMembers / group.must) * 100) : 0;
    const hoursPct = group.requiredHours ? Math.min(100, Math.round((group.hours / group.requiredHours) * 100)) : 100;

    barsEl.innerHTML = [
      barRow("Opravili obveznost", completedPct, `${group.completed}/${group.must}`),
      barRow("Še manjka članov", missingPct, `${group.missingMembers}`),
      barRow("Ure glede na cilj", hoursPct, `${group.hours}/${group.requiredHours}`),
    ].join("");
  }

  function barRow(label, pct, value) {
    return `
      <div class="workhours-bar-row">
        <div class="workhours-bar-label">
          <span>${escapeHtml(label)}</span>
          <strong>${escapeHtml(value)}</strong>
        </div>
        <div class="workhours-bar-track"><i style="width:${Math.max(2, pct)}%"></i></div>
      </div>
    `;
  }

  function render() {
    const year = ui.year;
    const membersAll = getVisibleMembers();
    const mobileHost = document.getElementById("workhours-mobile-cards");

    const hoursMap = normalizeHoursMapForMembers(getWorkHoursYear(year), membersAll);

    // donut vedno na vseh aktivnih članih (ne glede na filter v tabeli)
    updateDonut(membersAll, hoursMap);

    const members = getFilteredMembers(membersAll, hoursMap);

    tbody.innerHTML = "";
    if (mobileHost) mobileHost.innerHTML = "";

    members.forEach((m) => {
      const age = getAgeSafe(m);
      const mustDo = isMustDo(m);
      const hours = Number(hoursMap[m.id] ?? 0);
      const ok = mustDo ? hours >= 10 : true;

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${m.priimek || ""}</td>
        <td>${m.ime || ""}</td>
        <td>${m.clanska || ""}</td>
        <td>${age === null ? "-" : age}</td>
        <td>${mustDo ? "DA" : "NE"}</td>
        <td>
          <input
            type="number"
            min="0"
            step="1"
            value="${hours}"
            data-member-id="${m.id}"
            class="wh-hours-input"
            style="width:90px; padding:6px; border-radius:10px; border:2px solid rgba(0,0,0,.15);"
          >
        </td>
        <td>
          <div style="display:flex; gap:6px; align-items:center; justify-content:center;">
            <button type="button" class="chip-btn wh-bump" data-delta="1" data-member-id="${m.id}">+1</button>
            <button type="button" class="chip-btn wh-bump" data-delta="2" data-member-id="${m.id}">+2</button>
            <button type="button" class="chip-btn wh-bump" data-delta="5" data-member-id="${m.id}">+5</button>
          </div>
        </td>
        <td style="text-align:center;">${ok ? "✅" : "❌"}</td>
      `;

      tbody.appendChild(tr);

      if (mobileHost) {
        const card = document.createElement("article");
        card.className = "member-mobile-card";
        card.innerHTML = `
          <div class="member-mobile-card__head">
            <div>
              <div class="member-mobile-card__name">${escapeHtml(m.priimek || "")} ${escapeHtml(m.ime || "")}</div>
              <div class="member-mobile-card__meta">
                <span class="badge neutral">${escapeHtml(m.clanska || "Brez članske")}</span>
                <span class="badge neutral">${mustDo ? "Mora opraviti" : "Ne rabi"}</span>
              </div>
            </div>
            <div class="member-mobile-card__status ${ok ? "ok" : "warn"}">${ok ? "OK" : "Manjka"}</div>
          </div>
          <div class="member-mobile-card__body">
            <div class="member-mobile-card__row">
              <span>Starost</span>
              <strong>${age === null ? "-" : age}</strong>
            </div>
            <div class="member-mobile-card__row">
              <span>Ure</span>
              <strong>${hours}</strong>
            </div>
          </div>
          <div class="member-mobile-card__actions inline">
            <input
              type="number"
              min="0"
              step="1"
              value="${hours}"
              data-member-id="${m.id}"
              class="wh-hours-input"
              style="width:100%; padding:10px 12px; border-radius:12px; border:2px solid rgba(0,0,0,.15);"
            >
            <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:8px;">
              <button type="button" class="chip-btn wh-bump" data-delta="1" data-member-id="${m.id}">+1</button>
              <button type="button" class="chip-btn wh-bump" data-delta="2" data-member-id="${m.id}">+2</button>
              <button type="button" class="chip-btn wh-bump" data-delta="5" data-member-id="${m.id}">+5</button>
            </div>
          </div>
        `;
        mobileHost.appendChild(card);
      }
    });

    // events: input (blur/change) + bump buttons
    const allHoursInputs = [
      ...tbody.querySelectorAll(".wh-hours-input"),
      ...(mobileHost ? Array.from(mobileHost.querySelectorAll(".wh-hours-input")) : []),
    ];

    allHoursInputs.forEach((inp) => {
      inp.addEventListener("change", () => {
        const id = Number(inp.dataset.memberId);
        setHours(year, hoursMap, id, inp.value);
        render(); // refresh status + donut
      });

      // bonus: Enter v inputu naj shrani in fokus na naslednji input (hitro vpisovanje)
      inp.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          inp.dispatchEvent(new Event("change"));
          const inputs = allHoursInputs;
          const idx = inputs.indexOf(inp);
          const next = inputs[idx + 1];
          if (next) next.focus();
        }
      });
    });

    const allBumps = [
      ...tbody.querySelectorAll(".wh-bump"),
      ...(mobileHost ? Array.from(mobileHost.querySelectorAll(".wh-bump")) : []),
    ];

    allBumps.forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = Number(btn.dataset.memberId);
        const delta = Number(btn.dataset.delta || 0);
        bumpHours(year, hoursMap, id, delta);
        render();
      });
    });
  }

  // -------------------------
  // Export CSV
  // -------------------------
  function exportCSV() {
    const year = ui.year;
    const members = getVisibleMembers();
    const hoursMap = normalizeHoursMapForMembers(getWorkHoursYear(year), members);

    const rows = [];
    rows.push([
      "Leto",
      "Clanska",
      "Priimek",
      "Ime",
      "DatumRojstva",
      "Starost",
      "Mora",
      "OpravljeneUre",
      "Status",
    ]);

    members
      .slice()
      .sort((a, b) => (a.priimek || "").localeCompare(b.priimek || "", "sl"))
      .forEach((m) => {
        const age = getAgeSafe(m);
        const mustDo = isMustDo(m);
        const hours = Number(hoursMap[m.id] ?? 0);
        const ok = mustDo ? hours >= 10 : true;

        rows.push([
          year,
          m.clanska || "",
          m.priimek || "",
          m.ime || "",
          m.datumRojstva || "",
          age === null ? "" : String(age),
          mustDo ? "DA" : "NE",
          String(hours),
          ok ? "OK" : "MANJKA",
        ]);
      });

    const csv = rows
      .map((r) =>
        r
          .map((cell) => {
            const s = String(cell ?? "");
            // CSV escaping
            if (s.includes('"') || s.includes(",") || s.includes("\n")) {
              return `"${s.replaceAll('"', '""')}"`;
            }
            return s;
          })
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `delovne-ure_${year}_RD-Mozirje.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();

    URL.revokeObjectURL(url);
  }

  // -------------------------
  // UI events
  // -------------------------
  buildYearOptions();

  selYear.addEventListener("change", () => {
    ui.year = selYear.value;
    render();
  });

  btnExport?.addEventListener("click", exportCSV);

  inpSearch?.addEventListener("input", () => {
    ui.search = (inpSearch.value || "").trim();
    render();
  });

  btnFilterMust?.addEventListener("click", () => {
    ui.filterMust = !ui.filterMust;
    btnFilterMust.classList.toggle("primary", ui.filterMust);
    render();
  });

  btnFilterMissing?.addEventListener("click", () => {
    ui.filterMissing = !ui.filterMissing;
    btnFilterMissing.classList.toggle("primary", ui.filterMissing);
    render();
  });

  btnSortMissing?.addEventListener("click", () => {
    ui.sortByMissing = !ui.sortByMissing;
    btnSortMissing.classList.toggle("primary", ui.sortByMissing);
    render();
  });

  render();
}

document.addEventListener("DOMContentLoaded", () => {
  ensureDemoData();
  const user = requireAuth({ pageModuleKey: "delovne-ure" });
  if (!user) return;

  initHeader(user);
  renderAppNav(user, "delovne-ure");
  startReminderWatcher();

  handleDelovneUrePage();
});
