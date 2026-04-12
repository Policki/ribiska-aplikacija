function handleStatistikaPage() {
  const yearSelect = document.getElementById("statistics-year");
  const yearLabel = document.getElementById("statistics-year-label");
  const btnRefresh = document.getElementById("btn-statistics-refresh");
  const kpiGrid = document.getElementById("statistics-kpi-grid");
  const statusBars = document.getElementById("statistics-status-bars");
  const ageBars = document.getElementById("statistics-age-bars");
  const feeBars = document.getElementById("statistics-fee-bars");
  const workBars = document.getElementById("statistics-work-bars");
  const licenseBars = document.getElementById("statistics-license-bars");
  const recapBars = document.getElementById("statistics-recap-bars");
  const compareHost = document.getElementById("statistics-year-compare");
  const opsGrid = document.getElementById("statistics-ops-grid");

  if (!yearSelect || !kpiGrid) return;

  const currentUser = getCurrentUser();
  buildYearOptions();
  render();

  yearSelect.addEventListener("change", render);
  btnRefresh?.addEventListener("click", render);

  function buildYearOptions() {
    const years = new Set([Number(currentYear()), Number(AktivnoLeto())]);
    getMembers().forEach((member) => {
      addYear(years, member.datumVpisa);
      addYear(years, member.datumArhiva);
    });
    getYearlyRecaps().forEach((recap) => Number(recap.year) && years.add(Number(recap.year)));
    getEvents().forEach((event) => addYear(years, event.datum));
    getAnimalObservations().forEach((observation) => addYear(years, observation.createdAt || observation.submittedAt));
    getMembershipApplications().forEach((application) => addYear(years, application.datumVloge || application.submittedAt));
    Object.keys(getJSON("rd_licenses_active_v1", {})).forEach((year) => years.add(Number(year)));
    Object.keys(getJSON("rd_fee_status_v1", {})).forEach((year) => years.add(Number(year)));

    yearSelect.innerHTML = Array.from(years)
      .filter(Boolean)
      .sort((a, b) => b - a)
      .map((year) => `<option value="${year}">${year}</option>`)
      .join("");
    yearSelect.value = String(Number(currentYear()));
  }

  function render() {
    const year = Number(yearSelect.value || currentYear());
    if (yearLabel) yearLabel.textContent = String(year);

    const model = buildStatisticsModel(year);
    renderKpis(model);
    renderBars(statusBars, model.statusRows);
    renderBars(ageBars, model.ageRows);
    renderBars(feeBars, model.feeRows);
    renderBars(workBars, model.workRows);
    renderBars(licenseBars, model.licenseRows);
    renderBars(recapBars, model.recapRows);
    renderComparison(model, buildStatisticsModel(year - 1));
    renderOps(model);
  }

  function buildStatisticsModel(year) {
    const visibleStatuses = getUserVisibleStatuses(currentUser);
    const allMembers = getMembers();
    const members = visibleStatuses ? allMembers.filter((m) => visibleStatuses.includes(m.status)) : allMembers;
    const activeMembers = members.filter((m) => !m.arhiviran);
    const archivedMembers = members.filter((m) => m.arhiviran);
    const newMembers = members.filter((m) => extractYear(m.datumVpisa) === year);
    const archivedThisYear = members.filter((m) => extractYear(m.datumArhiva) === year || Number(m.arhivLeto) === year);

    const statusCounts = countBy(activeMembers, (m) => m.status || "Brez statusa");
    const ageCounts = {
      "do 18": 0,
      "19-30": 0,
      "31-50": 0,
      "51-69": 0,
      "70+": 0,
      "brez datuma": 0,
    };
    activeMembers.forEach((member) => {
      const age = getAge(member.datumRojstva);
      if (age === null) ageCounts["brez datuma"] += 1;
      else if (age <= 18) ageCounts["do 18"] += 1;
      else if (age <= 30) ageCounts["19-30"] += 1;
      else if (age <= 50) ageCounts["31-50"] += 1;
      else if (age <= 69) ageCounts["51-69"] += 1;
      else ageCounts["70+"] += 1;
    });

    const fee = feeStats(year, activeMembers);
    const work = workStats(year, activeMembers);
    const licenses = licenseStats(year);
    const recap = recapStats(year);
    const awards = awardStats(year);
    const applications = applicationStats(year);
    const observations = observationStats(year);
    const events = eventStats(year);

    return {
      year,
      activeMembers,
      archivedMembers,
      newMembers,
      archivedThisYear,
      fee,
      work,
      licenses,
      recap,
      awards,
      applications,
      observations,
      events,
      statusRows: objectRows(statusCounts),
      ageRows: objectRows(ageCounts),
      feeRows: [
        ["Plačani", fee.paid],
        ["Neplačani", fee.unpaid],
        ["TRR", fee.trr],
        ["Gotovina", fee.cash],
        ["AUTO", fee.auto],
      ],
      workRows: [
        ["Opravili", work.completed],
        ["Manjka", work.missingMembers],
        ["Mladinci opravili", work.youthCompleted],
        ["Ostali opravili", work.adultCompleted],
        ["Oproščeni", work.exempt],
      ],
      licenseRows: [
        ["Članske", licenses.clanska],
        ["Mladinske", licenses.mladinska],
        ["Trening", licenses.trening],
        ["Častne", licenses.castna],
      ],
      recapRows: [
        ["Oddane", recap.count],
        ["Uplen kom", recap.fishPieces],
        ["Zelenka kg", recap.zelenkaKg],
        ["Ribolovni dnevi", recap.days],
      ],
    };
  }

  function renderKpis(model) {
    kpiGrid.innerHTML = [
      kpi("Aktivni člani", model.activeMembers.length, `${model.newMembers.length} novih v letu`),
      kpi("Arhivirani", model.archivedMembers.length, `${model.archivedThisYear.length} arhiviranih v letu`),
      kpi("Članarina", `${percent(model.fee.paid, model.fee.total)}%`, `${formatEUR(model.fee.received)} prejeto`),
      kpi("Delovne ure", `${percent(model.work.completed, model.work.must)}%`, `${model.work.missingHours} ur še manjka`),
      kpi("Letne karte", model.licenses.total, `${model.licenses.mladinska} mladinskih`),
      kpi("Rekapitulacije", model.recap.count, `${model.recap.days} ribolovnih dni`),
      kpi("Pristopne vloge", model.applications.total, `${model.applications.pending} čaka`),
      kpi("Opažanja", model.observations.total, `${model.observations.images} slik`),
    ].join("");
  }

  function renderComparison(current, previous) {
    const rows = [
      ["Aktivni člani", current.activeMembers.length, previous.activeMembers.length],
      ["Novi člani", current.newMembers.length, previous.newMembers.length],
      ["Plačani članarino", current.fee.paid, previous.fee.paid],
      ["Prejeto članarine", current.fee.received, previous.fee.received, "eur"],
      ["Opravljene ure", current.work.hours, previous.work.hours],
      ["Letne karte", current.licenses.total, previous.licenses.total],
      ["Rekapitulacije", current.recap.count, previous.recap.count],
      ["Opažanja", current.observations.total, previous.observations.total],
    ];

    compareHost.innerHTML = rows
      .map(([label, now, before, type]) => {
        const diff = Number(now || 0) - Number(before || 0);
        const cls = diff > 0 ? "is-up" : diff < 0 ? "is-down" : "is-even";
        const displayNow = type === "eur" ? formatEUR(now) : now;
        const displayBefore = type === "eur" ? formatEUR(before) : before;
        const displayDiff = type === "eur" ? formatEUR(Math.abs(diff)) : Math.abs(diff);
        return `
          <article class="statistics-compare-item">
            <span>${escapeHtml(label)}</span>
            <strong>${escapeHtml(displayNow)}</strong>
            <small>${current.year - 1}: ${escapeHtml(displayBefore)} | <b class="${cls}">${diff > 0 ? "+" : diff < 0 ? "-" : ""}${escapeHtml(displayDiff)}</b></small>
          </article>
        `;
      })
      .join("");
  }

  function renderOps(model) {
    opsGrid.innerHTML = [
      mini("Telefoni za vnos", model.activeMembers.filter((m) => m.telefon && m.telefonVpisan !== true).length),
      mini("Izkaznice čakajo", model.activeMembers.filter((m) => m.potrebujeIzkaznico === true && m.izkaznicaUrejena !== true).length),
      mini("Koledarski dogodki", model.events.total),
      mini("Tekme", model.events.matches),
      mini("Priznanja v letu", model.awards.total),
      mini("Predlogi priznanj", model.awards.proposals),
      mini("Oddane vloge", model.applications.total),
      mini("Potrjene vloge", model.applications.confirmed),
      mini("Opažanja", model.observations.total),
      mini("Slike opažanj", model.observations.images),
      mini("Neplačani", model.fee.unpaid),
      mini("Manjkajo ure", model.work.missingMembers),
    ].join("");
  }
}

function feeStats(year, activeMembers) {
  const statusMap = getJSON("rd_fee_status_v1", {})[year] || {};
  const ids = getJSON("rd_fee_snapshot_v1", {})[year]?.memberIds || activeMembers.map((m) => m.id);
  const members = getMembers();
  const stats = { total: ids.length, unpaid: 0, trr: 0, cash: 0, auto: 0, paid: 0, expected: 0, received: 0, open: 0 };

  ids.forEach((id) => {
    const member = members.find((m) => Number(m.id) === Number(id));
    const amount = feeAmountForStatistics(member);
    const state = member?.status === "ZAČ" ? "AUTO" : statusMap[id]?.state || "UNPAID";
    stats.expected += amount;
    if (state === "PAID_TRR") stats.trr += 1;
    if (state === "PAID_CASH") stats.cash += 1;
    if (state === "AUTO") stats.auto += 1;
    if (state === "UNPAID") {
      stats.unpaid += 1;
      stats.open += amount;
    } else {
      stats.paid += 1;
      stats.received += amount;
    }
  });

  return stats;
}

function workStats(year, activeMembers) {
  const map = getWorkHoursYear(year) || {};
  const stats = { must: 0, completed: 0, missingMembers: 0, exempt: 0, hours: 0, missingHours: 0, youthCompleted: 0, adultCompleted: 0 };
  activeMembers.forEach((member) => {
    const hours = Number(map[member.id] ?? 0);
    const age = getAge(member.datumRojstva);
    const must = age === null ? true : age < 70;
    const youth = member.status === "AM" || member.status === "DAM" || (age !== null && age < 18);
    stats.hours += hours;
    if (!must) {
      stats.exempt += 1;
      return;
    }
    stats.must += 1;
    if (hours >= 10) {
      stats.completed += 1;
      if (youth) stats.youthCompleted += 1;
      else stats.adultCompleted += 1;
    } else {
      stats.missingMembers += 1;
      stats.missingHours += Math.max(0, 10 - hours);
    }
  });
  return stats;
}

function licenseStats(year) {
  const list = getJSON("rd_licenses_active_v1", {})[year] || [];
  const counts = { total: list.length, clanska: 0, mladinska: 0, trening: 0, castna: 0 };
  list.forEach((item) => {
    const key = normalizeLicenseTypeForStats(item.vrstaKarte);
    counts[key] += 1;
  });
  return counts;
}

function recapStats(year) {
  const rows = getYearlyRecaps().filter((item) => Number(item.year) === Number(year));
  const stats = { count: rows.length, fishPieces: 0, zelenkaKg: 0, days: 0 };
  rows.forEach((item) => {
    stats.fishPieces += ["sarenka", "krap", "amur", "linj", "ploscic", "klen"].reduce((sum, key) => sum + Number(item.fish?.[key] || 0), 0);
    stats.zelenkaKg += Number(item.fish?.zelenkaKg || 0);
    stats.days += Number(item.days?.gaj || 0) + Number(item.days?.savinjaDreta || 0);
  });
  return stats;
}

function awardStats(year) {
  const history = getJSON("rd_awards_history_v1", []);
  const proposals = getJSON("rd_awards_proposals_v1", []).filter((item) => item.status === "pending");
  const plaques = getJSON("rd_awards_plaque_proposals_v1", []).filter((item) => item.status === "pending");
  return {
    total: history.filter((item) => extractYear(item.date) === year).length,
    proposals: proposals.length + plaques.length,
  };
}

function applicationStats(year) {
  const rows = getMembershipApplications().filter((item) => extractYear(item.datumVloge || item.submittedAt) === year);
  return {
    total: rows.length,
    confirmed: rows.filter((item) => item.confirmedAt || item.adminConfirmedAt || item.memberId).length,
    pending: rows.filter((item) => !(item.confirmedAt || item.adminConfirmedAt || item.memberId)).length,
  };
}

function observationStats(year) {
  const rows = getAnimalObservations().filter((item) => extractYear(item.createdAt || item.submittedAt) === year);
  return {
    total: rows.length,
    images: rows.reduce((sum, item) => sum + (item.images || item.slike || []).length, 0),
  };
}

function eventStats(year) {
  const rows = getEvents().filter((item) => extractYear(item.datum) === year);
  return {
    total: rows.length,
    matches: rows.filter((item) => (item.kind || item.kategorija) === "match").length,
  };
}

function renderBars(host, rows) {
  if (!host) return;
  const max = Math.max(1, ...rows.map(([, value]) => Number(value) || 0));
  host.innerHTML = rows.length
    ? rows
        .map(([label, value]) => {
          const pct = Math.max(2, Math.round(((Number(value) || 0) / max) * 100));
          return `
            <div class="statistics-bar-row">
              <div class="statistics-bar-label"><span>${escapeHtml(label)}</span><strong>${escapeHtml(formatValue(value))}</strong></div>
              <div class="statistics-bar-track"><i style="width:${pct}%"></i></div>
            </div>
          `;
        })
        .join("")
    : `<div class="small-hint">Ni podatkov.</div>`;
}

function objectRows(obj) {
  return Object.entries(obj).sort((a, b) => Number(b[1]) - Number(a[1]));
}

function countBy(rows, getter) {
  return rows.reduce((acc, row) => {
    const key = getter(row);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function kpi(label, value, hint) {
  return `
    <article class="statistics-kpi-card">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
      <small>${escapeHtml(hint)}</small>
    </article>
  `;
}

function mini(label, value) {
  return `
    <article class="statistics-mini-card">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
    </article>
  `;
}

function addYear(set, value) {
  const year = extractYear(value);
  if (year) set.add(year);
}

function extractYear(value) {
  if (!value) return 0;
  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) return date.getFullYear();
  const match = String(value).match(/\b(19\d{2}|20\d{2})\b/);
  return match ? Number(match[1]) : 0;
}

function percent(part, total) {
  if (!total) return 100;
  return Math.round((Number(part || 0) / Number(total || 1)) * 100);
}

function formatEUR(value) {
  return `${Number(value || 0).toLocaleString("sl-SI", { maximumFractionDigits: 0 })} €`;
}

function formatValue(value) {
  return Number(value || 0).toLocaleString("sl-SI", { maximumFractionDigits: 2 });
}

function normalizeLicenseTypeForStats(value) {
  const raw = normalizeIdentityText(value);
  if (raw.includes("mlad")) return "mladinska";
  if (raw.includes("tren")) return "trening";
  if (raw.includes("cast")) return "castna";
  return "clanska";
}

function feeAmountForStatistics(member) {
  if (!member) return 0;
  if (member.status === "ZAČ") return 0;
  if (member.status === "AČ") return 70;
  if (member.status === "AM" || member.status === "DAM" || member.status === "AŠI") return 25;
  if (member.status === "AP") {
    const age = getAge(member.datumRojstva);
    return age !== null && age < 18 ? 25 : 180;
  }
  return 180;
}

document.addEventListener("DOMContentLoaded", () => {
  ensureDemoData();
  const user = requireAuth({ pageModuleKey: "statistika" });
  if (!user) return;

  initHeader(user);
  renderAppNav(user, "statistika");
  startReminderWatcher();
  handleStatistikaPage();

  const el = document.getElementById("aktivno-leto");
  if (el && typeof AktivnoLeto === "function") el.textContent = AktivnoLeto();
});
