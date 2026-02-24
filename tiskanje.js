function handleTiskanjePage() {
  const elTitle = document.getElementById("print-title");
  const elType = document.getElementById("print-type");
  const elOrientation = document.getElementById("print-orientation");

  const statusHost = document.getElementById("print-status-checks");
  const colHost = document.getElementById("print-col-checks");

  const btnPrint = document.getElementById("btn-print");
  const btnOpenPreview = document.getElementById("btn-open-preview");

  const thead = document.getElementById("preview-thead");
  const tbody = document.getElementById("preview-tbody");
  const meta = document.getElementById("preview-meta");

  if (!elTitle || !elType || !elOrientation || !statusHost || !colHost || !btnPrint || !thead || !tbody || !meta) return;

  // ---- Config
  const STATUS_OPTIONS = [
    { key: "AA", label: "AA – polnoletni" },
    { key: "AM", label: "AM – mladinec" },
    { key: "AP", label: "AP – pripravnik" },
    { key: "AŠI", label: "AŠI – dijak/študent" },
    { key: "DAA", label: "DAA – pridružen polnoletni" },
    { key: "DAM", label: "DAM – pridružen mladinec" },
    { key: "AČ", label: "AČ – častni" },
    { key: "ZAČ", label: "ZAČ – zaslužni častni" },
  ];

  const COLS = [
    { key: "zap", label: "#", get: (m, i) => String(i + 1), minimal: true },
    { key: "status", label: "STAT", get: (m) => m.status || "", minimal: true },
    { key: "spc", label: "SPC", get: (m) => m.spc || "", minimal: true },
    { key: "clanska", label: "ČLANSK", get: (m) => m.clanska || "", minimal: true },
    { key: "priimek", label: "PRIIMEK", get: (m) => m.priimek || "", minimal: true },
    { key: "ime", label: "IME", get: (m) => m.ime || "", minimal: true },
    { key: "naslov", label: "NASLOV", get: (m) => m.naslov || "", contact: true },
    { key: "kraj", label: "KRAJ", get: (m) => m.kraj || "", contact: true },
    { key: "email", label: "EMAIL", get: (m) => m.email || "", contact: true },
    { key: "telefon", label: "TELEFON", get: (m) => m.telefon || "", contact: true },
    { key: "datumVpisa", label: "VPIS", get: (m) => formatDateSI(m.datumVpisa), contact: false },
    { key: "ponovniVpisOd", label: "PONOVNO OD", get: (m) => formatDateSI(m.ponovniVpisOd), contact: false },
    { key: "datumArhiva", label: "ARHIV OD", get: (m) => formatDateSI(m.datumArhiva), contact: false },
  ];

  // ---- Build checks
  function buildStatusChecks() {
    statusHost.innerHTML = "";
    STATUS_OPTIONS.forEach((s) => {
      const label = document.createElement("label");
      label.innerHTML = `<input type="checkbox" data-status="${escapeAttr(s.key)}"> ${s.label}`;
      statusHost.appendChild(label);
    });
  }

  function buildColChecks() {
    colHost.innerHTML = "";
    COLS.forEach((c) => {
      const label = document.createElement("label");
      label.innerHTML = `<input type="checkbox" data-col="${c.key}"> ${c.label}`;
      colHost.appendChild(label);
    });
  }

  buildStatusChecks();
  buildColChecks();

  // defaults
  setCols(COLS.filter((c) => c.minimal).map((c) => c.key));
  // statuses: none checked = all allowed

  // ---- Quick buttons
  const psAll = document.getElementById("ps-all");
  const psNone = document.getElementById("ps-none");
  const psCommon = document.getElementById("ps-common");

  psAll.addEventListener("click", () => setStatuses(STATUS_OPTIONS.map((s) => s.key)));
  psNone.addEventListener("click", () => setStatuses([]));
  psCommon.addEventListener("click", () => setStatuses(["AA", "AM", "AP"]));

  const pcAll = document.getElementById("pc-all");
  const pcMin = document.getElementById("pc-min");
  const pcContact = document.getElementById("pc-contact");
  const pcNone = document.getElementById("pc-none");

  pcAll.addEventListener("click", () => setCols(COLS.map((c) => c.key)));
  pcMin.addEventListener("click", () => setCols(COLS.filter((c) => c.minimal).map((c) => c.key)));
  pcContact.addEventListener("click", () => setCols(COLS.filter((c) => c.contact || c.minimal).map((c) => c.key)));
  pcNone.addEventListener("click", () => setCols([]));

  // update on change
  statusHost.addEventListener("change", renderPreview);
  colHost.addEventListener("change", renderPreview);
  elTitle.addEventListener("input", renderPreview);
  elType.addEventListener("change", renderPreview);
  elOrientation.addEventListener("change", renderPreview);

  // preview buttons
  btnOpenPreview.addEventListener("click", () => openPrintWindow({ autoPrint: false }));
  btnPrint.addEventListener("click", () => openPrintWindow({ autoPrint: true }));

  // initial
  renderPreview();

  // ---- Helpers: read selections
  function getSelectedStatuses() {
    return Array.from(statusHost.querySelectorAll('input[type="checkbox"]:checked'))
      .map((el) => el.getAttribute("data-status"))
      .filter(Boolean);
  }

  function setStatuses(list) {
    const set = new Set(list);
    statusHost.querySelectorAll('input[type="checkbox"]').forEach((el) => {
      const k = el.getAttribute("data-status");
      el.checked = set.has(k);
    });
    renderPreview();
  }

  function getSelectedCols() {
    return Array.from(colHost.querySelectorAll('input[type="checkbox"]:checked'))
      .map((el) => el.getAttribute("data-col"))
      .filter(Boolean);
  }

  function setCols(keys) {
    const set = new Set(keys);
    colHost.querySelectorAll('input[type="checkbox"]').forEach((el) => {
      const k = el.getAttribute("data-col");
      el.checked = set.has(k);
    });
    renderPreview();
  }

  function getFilteredMembers() {
    const currentUser = getCurrentUser();
    const allowed = getUserVisibleStatuses(currentUser); // null means all
    const selectedStatuses = getSelectedStatuses();

    const type = elType.value;

    let members = getMembers().filter((m) => (type === "archived" ? m.arhiviran : !m.arhiviran));

    // first respect user allowed statuses
    if (allowed) {
      members = members.filter((m) => allowed.includes(m.status));
    }

    // then apply print selected statuses if any selected
    if (selectedStatuses.length) {
      members = members.filter((m) => selectedStatuses.includes(m.status));
    }

    // always sort by priimek, then ime
    members.sort((a, b) => {
      const ap = (a.priimek || "").localeCompare((b.priimek || ""), "sl", { sensitivity: "base" });
      if (ap !== 0) return ap;
      return (a.ime || "").localeCompare((b.ime || ""), "sl", { sensitivity: "base" });
    });

    return members;
  }

  function renderPreview() {
    const members = getFilteredMembers();
    const colKeys = getSelectedCols();
    const cols = COLS.filter((c) => colKeys.includes(c.key));

    // meta
    const typeLabel = elType.value === "archived" ? "Arhivirani" : "Aktivni";
    meta.textContent = `${typeLabel}: ${members.length} član(ov) • Stolpci: ${cols.length} • Usmeritev: ${elOrientation.value === "landscape" ? "ležeče" : "pokončno"}`;

    thead.innerHTML = `<tr>${cols.map((c) => `<th>${escapeHtml(c.label)}</th>`).join("")}</tr>`;

    tbody.innerHTML = members
      .map((m, i) => `<tr>${cols.map((c) => `<td>${escapeHtml(c.get(m, i))}</td>`).join("")}</tr>`)
      .join("");
  }

  function openPrintWindow({ autoPrint }) {
    const title = (elTitle.value || "Seznam članov").trim();
    const members = getFilteredMembers();
    const colKeys = getSelectedCols();
    const cols = COLS.filter((c) => colKeys.includes(c.key));
    const orientation = elOrientation.value;

    if (!cols.length) {
      alert("Izberi vsaj en stolpec za tisk.");
      return;
    }

    const rows = members
      .map((m, i) => `<tr>${cols.map((c) => `<td>${escapeHtml(c.get(m, i))}</td>`).join("")}</tr>`)
      .join("");

    const win = window.open("", "_blank");

    win.document.write(`
      <html>
        <head>
          <title>${escapeHtml(title)} - tisk</title>
          <style>
            @page { size: A4 ${orientation}; margin: 12mm; }
            body { font-family: Arial, sans-serif; }
            h1 { text-align:center; margin:0 0 12px 0; font-size: 18px; }
            .meta { text-align:center; margin:0 0 10px 0; font-size: 12px; opacity:.8; }
            table { border-collapse: collapse; width: 100%; font-size: 11px; }
            th, td { border:1px solid #000; padding:4px 6px; text-align:left; vertical-align: top; }
            th { background:#eee; }
            tr:nth-child(even) td { background: #fafafa; }
            .nowrap { white-space: nowrap; }
          </style>
        </head>
        <body>
          <h1>${escapeHtml(title)}</h1>
          <div class="meta">${members.length} član(ov) • ${new Date().toLocaleString("sl-SI")}</div>
          <table>
            <thead><tr>${cols.map((c) => `<th>${escapeHtml(c.label)}</th>`).join("")}</tr></thead>
            <tbody>${rows}</tbody>
          </table>
          ${autoPrint ? `<script>window.print();</script>` : ""}
        </body>
      </html>
    `);

    win.document.close();
    addHistory("Tiskanje", `Pripravljen tisk: ${title} (${members.length} vrstic).`);
  }
}

/* ---- utils ---- */
function formatDateSI(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = String(d.getFullYear());
  return `${dd}.${mm}.${yyyy}`;
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

/* ---- init ---- */
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