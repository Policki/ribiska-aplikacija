function handleTiskanjePage() {
  const elTitle = document.getElementById("print-title");
  const elReport = document.getElementById("print-report");
  const elOrientation = document.getElementById("print-orientation");
  const elMemberScope = document.getElementById("print-member-scope");
  const elYear = document.getElementById("print-year");
  const elDensity = document.getElementById("print-density");
  const elPaymentFilter = document.getElementById("print-payment-filter");
  const elCardFilter = document.getElementById("print-card-filter");

  const statusHost = document.getElementById("print-status-checks");
  const colHost = document.getElementById("print-col-checks");
  const summaryHost = document.getElementById("print-summary");

  const btnPrint = document.getElementById("btn-print");
  const btnOpenPreview = document.getElementById("btn-open-preview");

  const thead = document.getElementById("preview-thead");
  const tbody = document.getElementById("preview-tbody");
  const meta = document.getElementById("preview-meta");

  if (!elTitle || !elReport || !elOrientation || !elMemberScope || !elYear || !elDensity || !statusHost || !colHost || !btnPrint || !thead || !tbody || !meta) return;

  const currentUser = getCurrentUser();
  if (currentUser?.permissions?.canPrintDocuments === false) {
    btnPrint.disabled = true;
    btnOpenPreview.disabled = true;
    meta.textContent = "Uporabnik nima dovoljenja za tiskanje dokumentov.";
    return;
  }

  const STATUS_OPTIONS = [
    { key: "AA", label: "AA - polnoletni" },
    { key: "AM", label: "AM - mladinec" },
    { key: "AP", label: "AP - pripravnik" },
    { key: "AŠI", label: "AŠI - dijak/študent" },
    { key: "DAA", label: "DAA - pridružen polnoletni" },
    { key: "DAM", label: "DAM - pridružen mladinec" },
    { key: "AČ", label: "AČ - častni" },
    { key: "ZAČ", label: "ZAČ - zaslužni častni" },
  ];

  const MEMBER_COLS = [
    col("zap", "#", (m, i) => i + 1, { minimal: true }),
    col("status", "Status", (m) => m.status, { minimal: true }),
    col("clanska", "Članska", (m) => m.clanska, { minimal: true }),
    col("spc", "SPC", (m) => m.spc, { minimal: true }),
    col("priimek", "Priimek", (m) => m.priimek, { minimal: true }),
    col("ime", "Ime", (m) => m.ime, { minimal: true }),
    col("datumRojstva", "Rojen", (m) => formatDateSI(m.datumRojstva)),
    col("naslov", "Naslov", (m) => m.naslov, { contact: true }),
    col("posta", "Pošta", (m) => [m.posta, m.kraj].filter(Boolean).join(" "), { contact: true }),
    col("email", "E-pošta", (m) => m.email, { contact: true }),
    col("telefon", "Telefon", (m) => m.telefon, { contact: true }),
    col("tipKarte", "Tip karte", (m) => formatCardType(m.tipKarte || m.tipLetneKarte || m.letnaKarta)),
    col("ribiskiIzpit", "Izpit", (m) => yesNo(m.ribiskiIzpit)),
    col("datumVpisa", "Vpis", (m) => formatDateSI(m.datumVpisa)),
    col("ponovniVpisOd", "Ponovno od", (m) => formatDateSI(m.ponovniVpisOd)),
    col("datumArhiva", "Arhiv od", (m) => formatDateSI(m.datumArhiva)),
  ];

  const REPORTS = {
    members: {
      title: "Seznam članov",
      hint: "Klasičen seznam članov z izbranimi stolpci.",
      defaultCols: ["zap", "status", "clanska", "spc", "priimek", "ime"],
      columns: MEMBER_COLS,
      rows: () => filteredMembers(),
    },
    contacts: {
      title: "Kontaktni seznam članov",
      hint: "Hitri izpis naslovov, telefonov in e-poštnih naslovov.",
      defaultCols: ["zap", "status", "priimek", "ime", "telefon", "email", "naslov", "posta"],
      columns: MEMBER_COLS,
      rows: () => filteredMembers(),
    },
    fees: {
      title: "Članarina",
      hint: "Pregled plačil članarine za izbrano leto.",
      defaultCols: ["zap", "status", "clanska", "priimek", "ime", "amount", "paymentState", "updatedAt"],
      columns: [
        ...MEMBER_COLS.slice(0, 6),
        col("amount", "Znesek", (m) => `${feeAmountForMember(m)} EUR`),
        col("paymentState", "Plačilo", (m) => feeStateLabel(feeEntryForMember(m).state)),
        col("updatedAt", "Posodobljeno", (m) => formatDateTime(feeEntryForMember(m).updatedAt)),
      ],
      rows: () => filteredMembers().filter(matchesPaymentFilter),
    },
    workhours: {
      title: "Delovne ure",
      hint: "Pregled opravljenih in manjkajočih delovnih ur.",
      defaultCols: ["zap", "status", "clanska", "priimek", "ime", "age", "mustDo", "hours", "missing"],
      columns: [
        ...MEMBER_COLS.slice(0, 6),
        col("age", "Starost", (m) => valueOrDash(getAge(m.datumRojstva))),
        col("mustDo", "Obveznik", (m) => yesNo(memberMustDoWorkHours(m))),
        col("hours", "Ure", (m) => workHoursForMember(m)),
        col("missing", "Manjka", (m) => Math.max(0, 10 - workHoursForMember(m))),
      ],
      rows: () => filteredMembers(),
    },
    recaps: {
      title: "Letna rekapitulacija",
      hint: "Oddane rekapitulacije uplena in ribolovnih dni.",
      defaultCols: ["zap", "year", "permitNumber", "permitType", "fishPieces", "zelenkaKg", "days", "submittedAt"],
      columns: [
        col("zap", "#", (r, i) => i + 1, { minimal: true }),
        col("year", "Leto", (r) => r.year, { minimal: true }),
        col("permitNumber", "Dovolilnica", (r) => r.permitNumber, { minimal: true }),
        col("permitType", "Tip", (r) => formatPermitType(r.permitType), { minimal: true }),
        col("fishPieces", "Ribe kom", (r) => recapFishPieces(r), { minimal: true }),
        col("zelenkaKg", "Zelenka kg", (r) => formatDecimal(r.fish?.zelenkaKg)),
        col("days", "Dnevi", (r) => Number(r.days?.gaj || 0) + Number(r.days?.savinjaDreta || 0), { minimal: true }),
        col("gaj", "Gaj", (r) => r.days?.gaj || 0),
        col("savinjaDreta", "Savinja/Dreta", (r) => r.days?.savinjaDreta || 0),
        col("submittedAt", "Oddano", (r) => formatDateTime(r.updatedAt || r.submittedAt)),
      ],
      rows: () => getYearlyRecaps().filter((r) => Number(r.year) === Number(selectedYear())).sort(sortRecaps),
    },
    phoneQueue: {
      title: "Telefonske številke za vpis",
      hint: "Člani, pri katerih telefonska številka še čaka na vpis.",
      defaultCols: ["zap", "status", "clanska", "priimek", "ime", "telefon", "phoneDone"],
      columns: [
        ...MEMBER_COLS.slice(0, 6),
        col("telefon", "Telefon", (m) => m.telefon, { minimal: true }),
        col("phoneDone", "Vpisano", (m) => yesNo(m.telefonVpisan)),
      ],
      rows: () => filteredMembers().filter((m) => m.telefon && m.telefonVpisan !== true),
    },
    cardQueue: {
      title: "Članske izkaznice",
      hint: "Člani, pri katerih je treba urediti člansko izkaznico.",
      defaultCols: ["zap", "status", "clanska", "priimek", "ime", "tipKarte", "cardDone"],
      columns: [
        ...MEMBER_COLS.slice(0, 6),
        col("tipKarte", "Tip karte", (m) => formatCardType(m.tipKarte || m.tipLetneKarte || m.letnaKarta), { minimal: true }),
        col("cardDone", "Urejeno", (m) => yesNo(m.izkaznicaUrejena)),
      ],
      rows: () => filteredMembers().filter((m) => m.potrebujeIzkaznico === true || m.izkaznicaUrejena === false),
    },
    applications: {
      title: "Pristopne izjave",
      hint: "Arhiv oddanih pristopnih izjav za izbrano leto.",
      defaultCols: ["zap", "submittedAt", "priimek", "ime", "status", "telefon", "email", "applicationState"],
      columns: [
        col("zap", "#", (a, i) => i + 1, { minimal: true }),
        col("submittedAt", "Oddano", (a) => formatDateSI(a.datumVloge || a.submittedAt), { minimal: true }),
        col("priimek", "Priimek", (a) => a.priimek, { minimal: true }),
        col("ime", "Ime", (a) => a.ime, { minimal: true }),
        col("status", "Status", (a) => a.suggestedStatus || a.status),
        col("tipKarte", "Tip karte", (a) => formatCardType(a.tipKarte)),
        col("telefon", "Telefon", (a) => a.telefon),
        col("email", "E-pošta", (a) => a.email),
        col("applicationState", "Stanje", (a) => a.confirmedAt || a.adminConfirmedAt || a.memberId ? "Potrjena" : "Čaka"),
      ],
      rows: () => getMembershipApplications().filter(matchesSelectedYearByDate).sort((a, b) => String(b.submittedAt || "").localeCompare(String(a.submittedAt || ""))),
    },
    officials: {
      title: "Funkcionarji",
      hint: "Izpis funkcij in kontaktov funkcionarjev.",
      defaultCols: ["zap", "mandate", "body", "role", "name", "phone", "email"],
      columns: [
        col("zap", "#", (o, i) => i + 1, { minimal: true }),
        col("mandate", "Mandat", (o) => o.mandateLabel || "", { minimal: true }),
        col("body", "Organ", (o) => o.bodyLabel || o.body || "", { minimal: true }),
        col("role", "Funkcija", (o) => o.role || o.funkcija, { minimal: true }),
        col("name", "Ime in priimek", (o) => o.name || [o.priimek, o.ime].filter(Boolean).join(" "), { minimal: true }),
        col("phone", "Telefon", (o) => o.phone || o.telefon),
        col("email", "E-pošta", (o) => o.email),
        col("address", "Naslov", (o) => o.naslov),
        col("town", "Pošta", (o) => [o.posta, o.kraj].filter(Boolean).join(" ")),
        col("note", "Opomba", (o) => o.note || o.opomba),
      ],
      rows: () => printableOfficials(),
    },
    calendar: {
      title: "Koledarski dogodki",
      hint: "Letni seznam dogodkov, tekem in zaprtih revirjev.",
      defaultCols: ["zap", "datum", "kind", "naslov", "cas", "lokacija"],
      columns: [
        col("zap", "#", (e, i) => i + 1, { minimal: true }),
        col("datum", "Datum", (e) => formatDateSI(e.datum), { minimal: true }),
        col("kind", "Vrsta", (e) => eventKindLabel(e.kind || e.kategorija), { minimal: true }),
        col("naslov", "Naziv", (e) => e.naslov, { minimal: true }),
        col("cas", "Ura", (e) => formatTimeRange(e.cas, e.konec)),
        col("lokacija", "Lokacija", (e) => e.lokacija),
        col("opis", "Opis", (e) => e.opis),
      ],
      rows: () => getEvents().filter(matchesSelectedYearByDateField("datum")).sort((a, b) => String(a.datum || "").localeCompare(String(b.datum || ""))),
    },
    observations: {
      title: "Opažanja ribojedih živali",
      hint: "Seznam oddanih opažanj z lokacijami in številom slik.",
      defaultCols: ["zap", "createdAt", "observer", "title", "location", "coordinates", "images"],
      columns: [
        col("zap", "#", (o, i) => i + 1, { minimal: true }),
        col("createdAt", "Oddano", (o) => formatDateTime(o.createdAt || o.submittedAt), { minimal: true }),
        col("observer", "Opazovalec", (o) => o.observerName || [o.ime, o.priimek].filter(Boolean).join(" "), { minimal: true }),
        col("title", "Opažanje", (o) => o.title || o.naslov || o.what || "Opažanje", { minimal: true }),
        col("location", "Kraj", (o) => o.location || o.lokacija || o.place),
        col("coordinates", "Koordinate", (o) => formatCoordinates(o)),
        col("description", "Opis", (o) => o.description || o.opis),
        col("images", "Slik", (o) => (o.images || o.slike || []).length),
      ],
      rows: () => getAnimalObservations().filter(matchesSelectedYearByDateField("createdAt", "submittedAt")).sort((a, b) => String(b.createdAt || b.submittedAt || "").localeCompare(String(a.createdAt || a.submittedAt || ""))),
    },
  };

  buildYearOptions();
  buildStatusChecks();
  bindEvents();
  applyReportDefaults();
  renderPreview();

  function bindEvents() {
    document.getElementById("ps-all")?.addEventListener("click", () => setStatuses(STATUS_OPTIONS.map((s) => s.key)));
    document.getElementById("ps-none")?.addEventListener("click", () => setStatuses([]));
    document.getElementById("ps-common")?.addEventListener("click", () => setStatuses(["AA", "AM", "AP"]));

    document.getElementById("pc-all")?.addEventListener("click", () => setCols(currentReport().columns.map((c) => c.key)));
    document.getElementById("pc-min")?.addEventListener("click", () => setCols(currentReport().columns.filter((c) => c.minimal).map((c) => c.key)));
    document.getElementById("pc-contact")?.addEventListener("click", () => setCols(currentReport().columns.filter((c) => c.contact || c.minimal).map((c) => c.key)));
    document.getElementById("pc-none")?.addEventListener("click", () => setCols([]));

    elReport.addEventListener("change", applyReportDefaults);
    [elTitle, elOrientation, elMemberScope, elYear, elDensity, elPaymentFilter, elCardFilter].forEach((el) => {
      el?.addEventListener("input", renderPreview);
      el?.addEventListener("change", renderPreview);
    });
    statusHost.addEventListener("change", renderPreview);
    colHost.addEventListener("change", renderPreview);
    btnOpenPreview.addEventListener("click", () => openPrintWindow({ autoPrint: false }));
    btnPrint.addEventListener("click", () => openPrintWindow({ autoPrint: true }));
  }

  function buildStatusChecks() {
    statusHost.innerHTML = STATUS_OPTIONS.map(
      (s) => `<label><input type="checkbox" data-status="${escapeAttr(s.key)}"> ${escapeHtml(s.label)}</label>`
    ).join("");
  }

  function buildColChecks(cols) {
    colHost.innerHTML = cols
      .map((c) => `<label><input type="checkbox" data-col="${escapeAttr(c.key)}"> ${escapeHtml(c.label)}</label>`)
      .join("");
  }

  function buildYearOptions() {
    const years = new Set([Number(currentYear())]);
    getMembers().forEach((m) => {
      extractYear(m.datumVpisa) && years.add(extractYear(m.datumVpisa));
      extractYear(m.datumArhiva) && years.add(extractYear(m.datumArhiva));
    });
    getYearlyRecaps().forEach((r) => Number(r.year) && years.add(Number(r.year)));
    getMembershipApplications().forEach((a) => extractYear(a.datumVloge || a.submittedAt) && years.add(extractYear(a.datumVloge || a.submittedAt)));
    getEvents().forEach((e) => extractYear(e.datum) && years.add(extractYear(e.datum)));
    getAnimalObservations().forEach((o) => extractYear(o.createdAt || o.submittedAt) && years.add(extractYear(o.createdAt || o.submittedAt)));

    elYear.innerHTML = Array.from(years)
      .filter(Boolean)
      .sort((a, b) => b - a)
      .map((year) => `<option value="${year}">${year}</option>`)
      .join("");
  }

  function applyReportDefaults() {
    const report = currentReport();
    elTitle.value = report.title;
    buildColChecks(report.columns);
    setCols(report.defaultCols || report.columns.filter((c) => c.minimal).map((c) => c.key), false);
    renderPreview();
  }

  function currentReport() {
    return REPORTS[elReport.value] || REPORTS.members;
  }

  function selectedYear() {
    return Number(elYear.value || currentYear());
  }

  function getSelectedStatuses() {
    return Array.from(statusHost.querySelectorAll('input[type="checkbox"]:checked'))
      .map((el) => el.getAttribute("data-status"))
      .filter(Boolean);
  }

  function setStatuses(list) {
    const set = new Set(list);
    statusHost.querySelectorAll('input[type="checkbox"]').forEach((el) => {
      el.checked = set.has(el.getAttribute("data-status"));
    });
    renderPreview();
  }

  function getSelectedCols() {
    return Array.from(colHost.querySelectorAll('input[type="checkbox"]:checked'))
      .map((el) => el.getAttribute("data-col"))
      .filter(Boolean);
  }

  function setCols(keys, shouldRender = true) {
    const set = new Set(keys);
    colHost.querySelectorAll('input[type="checkbox"]').forEach((el) => {
      el.checked = set.has(el.getAttribute("data-col"));
    });
    if (shouldRender) renderPreview();
  }

  function filteredMembers() {
    const allowed = getUserVisibleStatuses(currentUser);
    const selectedStatuses = getSelectedStatuses();
    const scope = elMemberScope.value;
    const cardFilter = elCardFilter?.value || "all";

    let members = getMembers().filter((m) => {
      if (scope === "active") return !m.arhiviran;
      if (scope === "archived") return !!m.arhiviran;
      return true;
    });

    if (allowed) members = members.filter((m) => allowed.includes(m.status));
    if (selectedStatuses.length) members = members.filter((m) => selectedStatuses.includes(m.status));
    if (cardFilter !== "all") members = members.filter((m) => cardMatches(m, cardFilter));

    return members.sort(sortMembers);
  }

  function currentRowsAndCols() {
    const report = currentReport();
    const colKeys = getSelectedCols();
    const cols = report.columns.filter((c) => colKeys.includes(c.key));
    const rows = report.rows();
    return { report, cols, rows };
  }

  function renderPreview() {
    const { report, cols, rows } = currentRowsAndCols();
    const orientation = elOrientation.value === "landscape" ? "ležeče" : "pokončno";
    const densityLabel = elDensity.options[elDensity.selectedIndex]?.textContent || "";

    meta.textContent = `${report.hint} | Vrstic: ${rows.length} | Stolpci: ${cols.length} | ${orientation} | ${densityLabel}`;
    renderSummary(rows, cols);

    thead.innerHTML = `<tr>${cols.map((c) => `<th>${escapeHtml(c.label)}</th>`).join("")}</tr>`;
    tbody.innerHTML = rows.length
      ? rows.map((row, i) => `<tr>${cols.map((c) => `<td>${escapeHtml(valueOrDash(c.get(row, i)))}</td>`).join("")}</tr>`).join("")
      : `<tr><td colspan="${Math.max(1, cols.length)}">Ni podatkov za izbrani izpis.</td></tr>`;
  }

  function renderSummary(rows, cols) {
    if (!summaryHost) return;
    const visibleStatuses = new Set(rows.map((row) => row.status).filter(Boolean));
    summaryHost.innerHTML = [
      summaryCard("Vrstic", rows.length),
      summaryCard("Stolpcev", cols.length),
      summaryCard("Leto", selectedYear()),
      summaryCard("Statusov", visibleStatuses.size || "-"),
    ].join("");
  }

  function openPrintWindow({ autoPrint }) {
    const { report, cols, rows } = currentRowsAndCols();
    const title = (elTitle.value || report.title).trim();

    if (!cols.length) {
      alert("Izberi vsaj en stolpec za tisk.");
      return;
    }

    const orientation = elOrientation.value;
    const density = elDensity.value;
    const fontSize = density === "compact" ? 8.5 : density === "comfortable" ? 11 : 9.8;
    const cellPadding = density === "compact" ? "2px 3px" : density === "comfortable" ? "5px 7px" : "3px 5px";
    const rowsHtml = rows
      .map((row, i) => `<tr>${cols.map((c) => `<td>${escapeHtml(valueOrDash(c.get(row, i)))}</td>`).join("")}</tr>`)
      .join("");

    const win = window.open("", "_blank");
    if (!win) {
      alert("Brskalnik je blokiral odpiranje predogleda. Dovoli pojavna okna za to stran.");
      return;
    }

    win.document.write(`
      <html lang="sl">
        <head>
          <meta charset="UTF-8">
          <title>${escapeHtml(title)} - tisk</title>
          <style>
            @page { size: A4 ${orientation}; margin: ${density === "compact" ? "7mm" : "10mm"}; }
            * { box-sizing: border-box; }
            body { margin: 0; color: #111; font-family: Arial, Helvetica, sans-serif; }
            header { display: flex; justify-content: space-between; gap: 10px; align-items: flex-start; border-bottom: 2px solid #111; padding-bottom: 6px; margin-bottom: 8px; }
            h1 { margin: 0; font-size: ${density === "compact" ? 15 : 18}px; letter-spacing: .02em; text-transform: uppercase; }
            .meta { font-size: ${Math.max(8, fontSize - 1)}px; text-align: right; line-height: 1.35; }
            table { border-collapse: collapse; width: 100%; table-layout: fixed; font-size: ${fontSize}px; }
            th, td { border: 1px solid #222; padding: ${cellPadding}; text-align: left; vertical-align: top; word-break: break-word; }
            th { background: #e9eef0; font-weight: 700; text-transform: uppercase; }
            tbody tr:nth-child(even) td { background: #f7f7f7; }
            footer { margin-top: 8px; font-size: 8px; color: #444; display: flex; justify-content: space-between; }
            @media print {
              body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
              thead { display: table-header-group; }
              tr { page-break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <header>
            <div>
              <h1>${escapeHtml(title)}</h1>
              <div style="font-size:${Math.max(8, fontSize - 1)}px;">Ribiška družina Mozirje</div>
            </div>
            <div class="meta">
              <div>${escapeHtml(report.hint)}</div>
              <div>Vrstic: ${rows.length} | Stolpci: ${cols.length} | Leto: ${selectedYear()}</div>
              <div>Pripravljeno: ${escapeHtml(new Date().toLocaleString("sl-SI"))}</div>
            </div>
          </header>
          <table>
            <thead><tr>${cols.map((c) => `<th>${escapeHtml(c.label)}</th>`).join("")}</tr></thead>
            <tbody>${rowsHtml || `<tr><td colspan="${cols.length}">Ni podatkov za izbrani izpis.</td></tr>`}</tbody>
          </table>
          <footer>
            <span>© ${new Date().getFullYear()} Ribiška družina Mozirje | Enej Poličnik</span>
            <span>${escapeHtml(title)}</span>
          </footer>
          ${autoPrint ? `<script>window.addEventListener("load", () => window.print());</script>` : ""}
        </body>
      </html>
    `);

    win.document.close();
    addHistory("Tiskanje", `Pripravljen izpis: ${title} (${rows.length} vrstic).`);
  }

  function matchesPaymentFilter(member) {
    const filter = elPaymentFilter?.value || "all";
    if (filter === "all") return true;
    const state = feeEntryForMember(member).state;
    if (filter === "unpaid") return state === "UNPAID";
    if (filter === "paid") return state !== "UNPAID";
    if (filter === "cash") return state === "PAID_CASH";
    if (filter === "trr") return state === "PAID_TRR";
    return true;
  }

  function feeEntryForMember(member) {
    const modern = getJSON("rd_fee_status_v1", {});
    const map = modern[selectedYear()] || getFeesYear(selectedYear()) || {};
    const entry = map[member.id] || {};
    return {
      state: entry.state || entry.status || (member.status === "ZAČ" ? "AUTO" : "UNPAID"),
      updatedAt: entry.updatedAt || entry.date || "",
    };
  }

  function workHoursForMember(member) {
    const map = getWorkHoursYear(selectedYear()) || {};
    const entry = map[member.id];
    if (typeof entry === "number") return entry;
    return Number(entry?.hours ?? entry?.opravljene ?? entry?.total ?? 0) || 0;
  }
}

function col(key, label, get, flags = {}) {
  return { key, label, get, ...flags };
}

function summaryCard(label, value) {
  return `<article><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></article>`;
}

function sortMembers(a, b) {
  const last = String(a.priimek || "").localeCompare(String(b.priimek || ""), "sl", { sensitivity: "base" });
  if (last !== 0) return last;
  return String(a.ime || "").localeCompare(String(b.ime || ""), "sl", { sensitivity: "base" });
}

function sortRecaps(a, b) {
  return String(a.permitNumber || "").localeCompare(String(b.permitNumber || ""), "sl", { numeric: true });
}

function selectedDateValue(item, ...fields) {
  for (const field of fields) {
    if (item?.[field]) return item[field];
  }
  return item?.datum || item?.date || item?.submittedAt || item?.createdAt || "";
}

function matchesSelectedYearByDate(item) {
  return extractYear(selectedDateValue(item, "datumVloge", "submittedAt", "createdAt")) === Number(document.getElementById("print-year")?.value || currentYear());
}

function matchesSelectedYearByDateField(...fields) {
  return (item) => extractYear(selectedDateValue(item, ...fields)) === Number(document.getElementById("print-year")?.value || currentYear());
}

function extractYear(value) {
  if (!value) return 0;
  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) return date.getFullYear();
  const match = String(value).match(/\b(20\d{2}|19\d{2})\b/);
  return match ? Number(match[1]) : 0;
}

function memberMustDoWorkHours(member) {
  const age = getAge(member.datumRojstva);
  return age === null ? true : age < 70;
}

function feeAmountForMember(member) {
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

function feeStateLabel(state) {
  if (state === "AUTO") return "AUTO";
  if (state === "PAID_TRR") return "Plačano TRR";
  if (state === "PAID_CASH") return "Plačano gotovina";
  return "Neplačano";
}

function cardMatches(member, filter) {
  const card = normalizeIdentityText(member.tipKarte || member.tipLetneKarte || member.letnaKarta || "");
  const isElrd = card.includes("elrd") || card.includes("elektronska");
  return filter === "elrd" ? isElrd : !isElrd;
}

function formatCardType(value) {
  const card = normalizeIdentityText(value);
  if (card.includes("elrd") || card.includes("elektronska")) return "eLRD";
  if (!card) return "";
  return "Navadna";
}

function recapFishPieces(item) {
  return ["sarenka", "krap", "amur", "linj", "ploscic", "klen"].reduce((sum, key) => sum + Number(item.fish?.[key] || 0), 0);
}

function formatPermitType(value) {
  return value === "mladinska" ? "Mladinska" : "Članska";
}

function eventKindLabel(kind) {
  const labels = {
    event: "Dogodek",
    match: "Tekma",
    closed: "Zaprt revir",
    work: "Delovna akcija",
    meeting: "Sestanek",
  };
  return labels[kind] || "Dogodek";
}

function formatTimeRange(start, end) {
  if (!start && !end) return "";
  return [start, end].filter(Boolean).join("-");
}

function formatCoordinates(item) {
  const lat = item?.lat ?? item?.latitude ?? item?.coordinates?.lat;
  const lng = item?.lng ?? item?.lon ?? item?.longitude ?? item?.coordinates?.lng;
  if (lat == null || lng == null) return "";
  return `${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}`;
}

function printableOfficials() {
  const bodies = {
    "upravni-odbor": { label: "Upravni odbor", order: 1 },
    "disciplinski-tozilec": { label: "Disciplinski tožilec", order: 2 },
    "disciplinsko-sodisce": { label: "Disciplinsko sodišče", order: 3 },
  };
  const roleOrder = ["Predsednik", "Tajnik", "Gospodar", "Tožilec", "Član", "Namestnik"];
  const members = getMembers();
  const mandates = getJSON("rd_official_mandates", []);

  return getOfficials()
    .map((official) => {
      const member = members.find((m) => Number(m.id) === Number(official.memberId)) || {};
      const mandate =
        mandates.find((m) => Number(m.id) === Number(official.mandateId)) ||
        mandates.find((m) => Number(m.startYear) === Number(official.mandateStart) && Number(m.endYear) === Number(official.mandateEnd)) ||
        null;
      const bodyMeta = bodies[official.body] || { label: official.body || "Drugo", order: 99 };
      return {
        ...official,
        priimek: member.priimek || official.priimek || "",
        ime: member.ime || official.ime || "",
        name: official.name || [member.priimek, member.ime].filter(Boolean).join(" "),
        telefon: member.telefon || official.telefon || official.phone || "",
        email: member.email || official.email || "",
        naslov: member.naslov || official.naslov || "",
        posta: member.posta || official.posta || "",
        kraj: member.kraj || official.kraj || "",
        mandateLabel: mandate ? `${mandate.startYear}-${mandate.endYear}` : official.mandateStart ? `${official.mandateStart}-${official.mandateEnd || ""}` : "",
        bodyLabel: bodyMeta.label,
        bodyOrder: bodyMeta.order,
      };
    })
    .sort((a, b) => {
      const mandateDiff = String(b.mandateLabel || "").localeCompare(String(a.mandateLabel || ""), "sl", { numeric: true });
      if (mandateDiff !== 0) return mandateDiff;
      const bodyDiff = Number(a.bodyOrder || 99) - Number(b.bodyOrder || 99);
      if (bodyDiff !== 0) return bodyDiff;
      const roleDiff = roleRankForPrint(a.role, roleOrder) - roleRankForPrint(b.role, roleOrder);
      if (roleDiff !== 0) return roleDiff;
      return sortMembers(a, b);
    });
}

function roleRankForPrint(role, roleOrder) {
  const index = roleOrder.indexOf(role);
  return index === -1 ? 999 : index;
}

function yesNo(value) {
  return value ? "Da" : "Ne";
}

function valueOrDash(value) {
  if (value === 0) return "0";
  return value == null || value === "" ? "-" : String(value);
}

function formatDateSI(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = String(d.getFullYear());
  return `${dd}.${mm}.${yyyy}`;
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

function escapeAttr(s) {
  return String(s).replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

document.addEventListener("DOMContentLoaded", () => {
  ensureDemoData();
  const user = requireAuth({ pageModuleKey: "tiskanje" });
  if (!user) return;

  initHeader(user);
  renderAppNav(user, "tiskanje");
  handleTiskanjePage();
  startReminderWatcher();

  const el = document.getElementById("aktivno-leto");
  if (el && typeof AktivnoLeto === "function") el.textContent = AktivnoLeto();
});
