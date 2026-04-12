// =======================
// letna-rekapitulacija.js
// =======================

document.addEventListener("DOMContentLoaded", () => {
  ensureDemoData();

  const RECAP_ACTIVE_YEAR_KEY = "rd_yearly_recap_active_year";
  const currentUser = getCurrentUser();
  const isAdmin = !!currentUser?.permissions?.canManageUsers || currentUser?.username === "admin";
  let activeYear = getRecapActiveYear();

  const form = document.getElementById("yearly-recap-form");
  const yearEl = document.getElementById("recap-year");
  const riverSplitFields = document.getElementById("river-split-fields");
  const submitStatus = document.getElementById("recap-submit-status");
  const thankYou = document.getElementById("recap-thank-you");

  const adminHeader = document.getElementById("recap-admin-header");
  const adminPanel = document.getElementById("recap-admin-panel");
  const adminYear = document.getElementById("recap-admin-year");
  const btnExport = document.getElementById("btn-export-recaps");
  const btnCloseYear = document.getElementById("btn-close-recap-year");
  const activeYearLabel = document.getElementById("recap-active-year-label");
  const statsHost = document.getElementById("recap-admin-stats");
  const fishChart = document.getElementById("recap-fish-chart");
  const daysChart = document.getElementById("recap-days-chart");
  const permitChart = document.getElementById("recap-permit-chart");
  const compareNote = document.getElementById("recap-compare-note");
  const compareHost = document.getElementById("recap-year-compare");
  const tableBody = document.getElementById("recap-admin-table");

  updateActiveYearDisplay();

  if (isAdmin) {
    adminHeader.hidden = false;
    adminPanel.hidden = false;
    initHeader(currentUser, "letna-rekapitulacija");
    renderAppNav(currentUser, "letna-rekapitulacija");
    setupAdmin();
  } else {
    adminHeader.hidden = true;
    adminPanel.hidden = true;
  }

  form.querySelectorAll('input[name="riverMemory"]').forEach((input) => {
    input.addEventListener("change", () => {
      riverSplitFields.hidden = form.elements.riverMemory.value !== "yes";
    });
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    submitRecap();
  });

  btnExport?.addEventListener("click", () => {
    exportRecapsForYear(Number(adminYear.value || activeYear));
  });

  btnCloseYear?.addEventListener("click", () => {
    closeRecapYear();
  });

  function getRecapActiveYear() {
    const stored = Number.parseInt(localStorage.getItem(RECAP_ACTIVE_YEAR_KEY), 10);
    if (Number.isFinite(stored) && stored >= 2026) return stored;
    localStorage.setItem(RECAP_ACTIVE_YEAR_KEY, "2026");
    return 2026;
  }

  function updateActiveYearDisplay() {
    yearEl.value = activeYear;
    if (activeYearLabel) activeYearLabel.textContent = String(activeYear);
  }

  function closeRecapYear() {
    const nextYear = activeYear + 1;
    const ok = confirm(
      `Ali želite zaključiti rekapitulacijsko leto ${activeYear}? Po zaključku bo javni obrazec sprejemal vnose samo še za leto ${nextYear}.`
    );
    if (!ok) return;

    activeYear = nextYear;
    localStorage.setItem(RECAP_ACTIVE_YEAR_KEY, String(activeYear));
    updateActiveYearDisplay();
    setupAdmin();
    showSubmitStatus(`Leto ${activeYear - 1} je zaključeno. Aktivno leto oddaje je zdaj ${activeYear}.`, false);
  }

  function numberValue(name, decimals = false) {
    const value = String(form.elements[name]?.value || "").replace(",", ".");
    const parsed = decimals ? Number.parseFloat(value) : Number.parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed < 0) return 0;
    return decimals ? Number(parsed.toFixed(2)) : parsed;
  }

  function cleanText(value) {
    return String(value || "").trim().replace(/\s+/g, " ");
  }

  function submitRecap() {
    const year = activeYear;
    const permitNumber = cleanText(form.elements.permitNumber.value);
    const permitType = form.elements.permitType.value;

    if (!year || year < 2000 || year > 2100) {
      showSubmitStatus("Vpišite pravilno leto rekapitulacije.", true);
      return;
    }

    if (!permitNumber) {
      showSubmitStatus("Vpišite številko ribolovne dovolilnice.", true);
      return;
    }

    if (!permitType) {
      showSubmitStatus("Izberite vrsto dovolilnice.", true);
      return;
    }

    const recaps = getYearlyRecaps();
    const duplicateIndex = recaps.findIndex(
      (item) =>
        Number(item.year) === year &&
        normalizePermit(item.permitNumber) === normalizePermit(permitNumber) &&
        item.permitType === permitType
    );

    if (duplicateIndex !== -1) {
      const shouldReplace = confirm(
        "Za to leto, tip in številko dovolilnice je rekapitulacija že shranjena. Ali želite obstoječi zapis prepisati z novimi podatki?"
      );
      if (!shouldReplace) return;
    }

    const savinjaDretaTotal = numberValue("savinjaDretaDays");
    const knowsRiverSplit = form.elements.riverMemory.value === "yes";
    const savinjaDays = knowsRiverSplit ? numberValue("savinjaDays") : 0;
    const dretaDays = knowsRiverSplit ? numberValue("dretaDays") : 0;
    const unknownSavinjaDretaDays = Math.max(0, savinjaDretaTotal - savinjaDays - dretaDays);

    const record = {
      id: duplicateIndex !== -1 ? recaps[duplicateIndex].id : Date.now(),
      year,
      permitNumber,
      permitType,
      fish: {
        sarenka: numberValue("sarenka"),
        krap: numberValue("krap"),
        amur: numberValue("amur"),
        linj: numberValue("linj"),
        ploscic: numberValue("ploscic"),
        klen: numberValue("klen"),
        zelenkaKg: numberValue("zelenkaKg", true),
      },
      days: {
        gaj: numberValue("gajDays"),
        savinjaDreta: savinjaDretaTotal,
        savinja: savinjaDays,
        dreta: dretaDays,
        unknownSavinjaDreta: unknownSavinjaDretaDays,
      },
      submittedAt: duplicateIndex !== -1 ? recaps[duplicateIndex].submittedAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (duplicateIndex !== -1) {
      recaps[duplicateIndex] = record;
    } else {
      recaps.unshift(record);
    }

    saveYearlyRecaps(recaps);
    showSubmitStatus("Rekapitulacija je shranjena. Hvala!", false);
    thankYou.hidden = false;
    form.reset();
    updateActiveYearDisplay();
    riverSplitFields.hidden = true;
    form.scrollIntoView({ behavior: "smooth", block: "start" });

    if (isAdmin) setupAdmin();
  }

  function showSubmitStatus(message, isError) {
    submitStatus.textContent = message;
    submitStatus.classList.toggle("form-error-text", !!isError);
  }

  function setupAdmin() {
    const years = getAvailableYears();
    adminYear.innerHTML = years.map((year) => `<option value="${year}">${year}</option>`).join("");
    if (!years.includes(activeYear)) adminYear.insertAdjacentHTML("afterbegin", `<option value="${activeYear}">${activeYear}</option>`);
    adminYear.value = String(years.includes(activeYear) ? activeYear : years[0]);
    adminYear.onchange = () => renderAdmin(Number(adminYear.value));
    renderAdmin(Number(adminYear.value));
  }

  function getAvailableYears() {
    const years = new Set([activeYear]);
    getYearlyRecaps().forEach((item) => {
      if (item.year) years.add(Number(item.year));
    });
    return Array.from(years).filter(Boolean).sort((a, b) => b - a);
  }

  function renderAdmin(year) {
    const allRecaps = getYearlyRecaps();
    const recaps = allRecaps.filter((item) => Number(item.year) === Number(year));
    const previousRecaps = allRecaps.filter((item) => Number(item.year) === Number(year) - 1);
    const activeNormalMembers = getActiveNormalCardMembers();
    const uniqueRecaps = new Set(recaps.map(recapUniqueKey).filter(Boolean)).size;
    const previousUniqueRecaps = new Set(previousRecaps.map(recapUniqueKey).filter(Boolean)).size;
    const totals = calculateTotals(recaps);
    const previousTotals = calculateTotals(previousRecaps);
    const completion = activeNormalMembers.length ? Math.round((uniqueRecaps / activeNormalMembers.length) * 100) : 0;

    statsHost.innerHTML = [
      statCard("Rekapituliranih", `${uniqueRecaps}`, `od ${activeNormalMembers.length} navadnih dovolilnic`),
      statCard("Pokritost", `${completion}%`, "glede na seznam članov z navadno karto"),
      statCard("Uplen v komadih", `${totals.fishPieces}`, "brez zelenke"),
      statCard("Zelenka", `${formatDecimal(totals.zelenkaKg)} kg`, "vodena ločeno v kilogramih"),
      statCard("Ribolovni dnevi", `${totals.totalDays}`, "Gaj, Savinja in Dreta skupaj"),
    ].join("");

    renderBars(fishChart, [
      ["Šarenka", totals.fish.sarenka],
      ["Krap", totals.fish.krap],
      ["Amur", totals.fish.amur],
      ["Linj", totals.fish.linj],
      ["Ploščič", totals.fish.ploscic],
      ["Klen", totals.fish.klen],
    ]);

    renderBars(daysChart, [
      ["Ribnik Gaj", totals.days.gaj],
      ["Savinja", totals.days.savinja],
      ["Dreta", totals.days.dreta],
      ["Savinja/Dreta neznano", totals.days.unknownSavinjaDreta],
    ]);

    renderPermitChart(recaps);
    renderYearComparison(year, { uniqueRecaps, totals }, { uniqueRecaps: previousUniqueRecaps, totals: previousTotals });
    renderAdminTable(recaps);
  }

  function calculateTotals(recaps) {
    const totals = {
      fish: { sarenka: 0, krap: 0, amur: 0, linj: 0, ploscic: 0, klen: 0 },
      zelenkaKg: 0,
      days: { gaj: 0, savinja: 0, dreta: 0, unknownSavinjaDreta: 0, savinjaDreta: 0 },
      fishPieces: 0,
      totalDays: 0,
    };

    recaps.forEach((item) => {
      Object.keys(totals.fish).forEach((key) => {
        totals.fish[key] += Number(item.fish?.[key] || 0);
      });
      totals.zelenkaKg += Number(item.fish?.zelenkaKg || 0);
      totals.days.gaj += Number(item.days?.gaj || 0);
      totals.days.savinja += Number(item.days?.savinja || 0);
      totals.days.dreta += Number(item.days?.dreta || 0);
      totals.days.unknownSavinjaDreta += Number(item.days?.unknownSavinjaDreta || 0);
      totals.days.savinjaDreta += Number(item.days?.savinjaDreta || 0);
    });

    totals.fishPieces = Object.values(totals.fish).reduce((sum, value) => sum + value, 0);
    totals.totalDays = totals.days.gaj + totals.days.savinjaDreta;
    return totals;
  }

  function statCard(label, value, hint) {
    return `
      <article class="recap-stat-card">
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(value)}</strong>
        <small>${escapeHtml(hint)}</small>
      </article>
    `;
  }

  function renderBars(host, rows) {
    const max = Math.max(1, ...rows.map(([, value]) => Number(value) || 0));
    host.innerHTML = rows
      .map(([label, value]) => {
        const pct = Math.max(4, Math.round(((Number(value) || 0) / max) * 100));
        return `
          <div class="recap-bar-row">
            <div class="recap-bar-label">${escapeHtml(label)}</div>
            <div class="recap-bar-track"><span style="width:${pct}%"></span></div>
            <strong>${escapeHtml(String(value || 0))}</strong>
          </div>
        `;
      })
      .join("");
  }

  function renderPermitChart(recaps) {
    const member = recaps.filter((item) => item.permitType === "clanska").length;
    const youth = recaps.filter((item) => item.permitType === "mladinska").length;
    const total = Math.max(1, member + youth);
    const memberPct = Math.round((member / total) * 100);

    permitChart.innerHTML = `
      <div class="recap-donut" style="--member:${memberPct};">
        <span>${member + youth}</span>
      </div>
      <div class="recap-donut-legend">
        <span><i class="recap-dot recap-dot--member"></i>Članske: <strong>${member}</strong></span>
        <span><i class="recap-dot recap-dot--youth"></i>Mladinske: <strong>${youth}</strong></span>
      </div>
    `;
  }

  function renderYearComparison(year, current, previous) {
    const previousYear = Number(year) - 1;
    compareNote.textContent = previous.uniqueRecaps || previous.totals.fishPieces || previous.totals.totalDays || previous.totals.zelenkaKg
      ? `Izbrano leto ${year} je primerjano z letom ${previousYear}.`
      : `Za leto ${previousYear} še ni shranjenih rekapitulacij, zato je primerjava prikazana kot izhodišče.`;

    const rows = [
      {
        label: "Oddane rekapitulacije",
        current: current.uniqueRecaps,
        previous: previous.uniqueRecaps,
        suffix: "",
      },
      {
        label: "Uplen v komadih",
        current: current.totals.fishPieces,
        previous: previous.totals.fishPieces,
        suffix: " kom",
      },
      {
        label: "Zelenka",
        current: current.totals.zelenkaKg,
        previous: previous.totals.zelenkaKg,
        suffix: " kg",
        decimal: true,
      },
      {
        label: "Ribolovni dnevi",
        current: current.totals.totalDays,
        previous: previous.totals.totalDays,
        suffix: " dni",
      },
    ];

    compareHost.innerHTML = rows.map((row) => comparisonItem(row, year, previousYear)).join("");
  }

  function comparisonItem(row, year, previousYear) {
    const current = Number(row.current || 0);
    const previous = Number(row.previous || 0);
    const max = Math.max(1, current, previous);
    const currentPct = Math.max(current ? 6 : 0, Math.round((current / max) * 100));
    const previousPct = Math.max(previous ? 6 : 0, Math.round((previous / max) * 100));
    const diff = current - previous;
    const diffClass = diff > 0 ? "is-up" : diff < 0 ? "is-down" : "is-even";
    const diffText = diff === 0 ? "enako" : `${diff > 0 ? "+" : ""}${formatComparisonValue(diff, row.decimal)}${row.suffix}`;

    return `
      <div class="recap-compare-item">
        <div class="recap-compare-title">
          <strong>${escapeHtml(row.label)}</strong>
          <span class="${diffClass}">${escapeHtml(diffText)}</span>
        </div>
        <div class="recap-compare-bars">
          <div class="recap-compare-line">
            <span>${previousYear}</span>
            <div><i class="previous" style="width:${previousPct}%"></i></div>
            <b>${escapeHtml(formatComparisonValue(previous, row.decimal))}${escapeHtml(row.suffix)}</b>
          </div>
          <div class="recap-compare-line">
            <span>${year}</span>
            <div><i class="current" style="width:${currentPct}%"></i></div>
            <b>${escapeHtml(formatComparisonValue(current, row.decimal))}${escapeHtml(row.suffix)}</b>
          </div>
        </div>
      </div>
    `;
  }

  function renderAdminTable(recaps) {
    if (!recaps.length) {
      tableBody.innerHTML = `<tr><td colspan="6">Za izbrano leto še ni oddanih rekapitulacij.</td></tr>`;
      return;
    }

    tableBody.innerHTML = recaps
      .slice()
      .sort((a, b) => String(a.permitNumber).localeCompare(String(b.permitNumber), "sl", { numeric: true }))
      .map((item) => {
        const pieces = ["sarenka", "krap", "amur", "linj", "ploscic", "klen"].reduce(
          (sum, key) => sum + Number(item.fish?.[key] || 0),
          0
        );
        const totalDays = Number(item.days?.gaj || 0) + Number(item.days?.savinjaDreta || 0);
        return `
          <tr>
            <td>${escapeHtml(item.year)}</td>
            <td>${escapeHtml(item.permitNumber)}</td>
            <td>${escapeHtml(formatPermitType(item.permitType))}</td>
            <td>${pieces} kom, ${formatDecimal(item.fish?.zelenkaKg || 0)} kg zelenke</td>
            <td>${totalDays}</td>
            <td>${escapeHtml(formatDateTime(item.updatedAt || item.submittedAt))}</td>
          </tr>
        `;
      })
      .join("");
  }

  function exportRecapsForYear(year) {
    const rows = getYearlyRecaps().filter((item) => Number(item.year) === Number(year));
    const header = [
      "Leto",
      "Številka dovolilnice",
      "Vrsta dovolilnice",
      "Šarenka kom",
      "Krap kom",
      "Amur kom",
      "Linj kom",
      "Ploščič kom",
      "Klen kom",
      "Zelenka kg",
      "Ribnik Gaj dnevi",
      "Savinja in Dreta dnevi",
      "Savinja dnevi",
      "Dreta dnevi",
      "Nerazporejeno Savinja/Dreta",
      "Oddano",
    ];

    const csvRows = [header, ...rows.map((item) => [
      item.year,
      item.permitNumber,
      formatPermitType(item.permitType),
      item.fish?.sarenka || 0,
      item.fish?.krap || 0,
      item.fish?.amur || 0,
      item.fish?.linj || 0,
      item.fish?.ploscic || 0,
      item.fish?.klen || 0,
      formatDecimal(item.fish?.zelenkaKg || 0),
      item.days?.gaj || 0,
      item.days?.savinjaDreta || 0,
      item.days?.savinja || 0,
      item.days?.dreta || 0,
      item.days?.unknownSavinjaDreta || 0,
      formatDateTime(item.updatedAt || item.submittedAt),
    ])];

    const csv = `\ufeff${csvRows.map((row) => row.map(csvCell).join(";")).join("\r\n")}`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `letna-rekapitulacija-${year}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function getActiveNormalCardMembers() {
    return getMembers().filter((member) => {
      if (member.arhiviran) return false;
      const card = normalizeIdentityText(member.tipKarte || member.tipLetneKarte || member.letnaKarta || "");
      return !card.includes("elrd") && !card.includes("elektronska");
    });
  }

  function normalizePermit(value) {
    return normalizeIdentityText(value).replace(/\s+/g, "");
  }

  function recapUniqueKey(item) {
    const permit = normalizePermit(item?.permitNumber);
    if (!permit) return "";
    return `${permit}|${item?.permitType || "clanska"}`;
  }

  function formatPermitType(value) {
    return value === "mladinska" ? "Mladinska" : "Članska";
  }

  function formatDateTime(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString("sl-SI");
  }

  function formatDecimal(value) {
    return Number(value || 0).toLocaleString("sl-SI", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  }

  function formatComparisonValue(value, decimal = false) {
    return Number(value || 0).toLocaleString("sl-SI", {
      minimumFractionDigits: 0,
      maximumFractionDigits: decimal ? 2 : 0,
    });
  }

  function csvCell(value) {
    const text = String(value ?? "");
    return `"${text.replaceAll('"', '""')}"`;
  }
});
