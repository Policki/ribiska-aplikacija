function handleSeznamPage() {
  initMembersUI();
}

/* =========================
   UI: filtri + tabela + export
========================= */

const UI_STATE_KEY = "rd_seznam_ui_state";

function defaultUIState() {
  return {
    search: "",
    // multi-select filtri (vrednosti so stringi)
    filters: {
      status: [],
      spc: [],
      birthYear: [],
      tipKarte: [],
      kraj: [],
      posta: [], // ✅ NEW
    },
    // prikaz stolpcev
    columns: {
      zapst: true,
      status: true,
      spc: true,
      clanska: true,
      priimek: true,
      ime: true,
      naslov: true,
      posta: true, // ✅ NEW
      kraj: true,
      email: true,
      telefon: true,
      tools: true,
    },
  };
}

function loadUIState() {
  try {
    const raw = localStorage.getItem(UI_STATE_KEY);
    if (!raw) return defaultUIState();
    const parsed = JSON.parse(raw);
    return {
      ...defaultUIState(),
      ...parsed,
      filters: { ...defaultUIState().filters, ...(parsed.filters || {}) },
      columns: { ...defaultUIState().columns, ...(parsed.columns || {}) },
    };
  } catch {
    return defaultUIState();
  }
}

function saveUIState(state) {
  localStorage.setItem(UI_STATE_KEY, JSON.stringify(state));
}

function initMembersUI() {
  // 1) filtri UI
  const state = loadUIState();

  const searchEl = document.getElementById("members-search");
  if (searchEl) {
    searchEl.value = state.search || "";
    searchEl.addEventListener("input", () => {
      state.search = searchEl.value || "";
      saveUIState(state);
      renderEverything(state);
    });
  }

  const btnReset = document.getElementById("btn-reset-filters");
  if (btnReset) {
    btnReset.addEventListener("click", () => {
      const fresh = defaultUIState();
      saveUIState(fresh);
      if (searchEl) searchEl.value = "";
      renderEverything(fresh);
    });
  }

  const btnXlsx = document.getElementById("btn-export-xlsx");
  if (btnXlsx) btnXlsx.addEventListener("click", () => exportMembersXLSX());

  const btnCsv = document.getElementById("btn-export-csv");
  if (btnCsv) btnCsv.addEventListener("click", () => exportMembersCSV());

  // 2) prva risba
  renderEverything(state);
}

function renderEverything(state) {
  const currentUser = getCurrentUser();
  const visibleStatuses = getUserVisibleStatuses(currentUser);

  // base members (ne-arhiv)
  let members = getMembers().filter((m) => !m.arhiviran);

  // upoštevaj permission "visibleStatuses"
  if (visibleStatuses) {
    members = members.filter((m) => visibleStatuses.includes(m.status));
  }

  renderDynamicFilters(members, state);
  renderColumnsBox(state);
  renderTableWithState(members, state);
  applyColumnVisibility(state);
}

function renderDynamicFilters(members, state) {
  const host = document.getElementById("filters-dynamic");
  if (!host) return;

  const uniq = (arr) =>
    Array.from(new Set(arr.filter((x) => x !== null && x !== undefined && String(x).trim() !== "")));

  const statuses = uniq(members.map((m) => m.status)).sort();
  const spcs = uniq(members.map((m) => m.spc)).sort();
  const tipKarte = uniq(members.map((m) => m.tipKarte)).sort();
  const kraji = uniq(members.map((m) => m.kraj)).sort();
  const poste = uniq(members.map((m) => m.posta)).sort((a, b) => String(a).localeCompare(String(b), "sl")); // ✅ NEW

  const birthYears = uniq(
    members
      .map((m) => (m.datumRojstva ? String(new Date(m.datumRojstva).getFullYear()) : ""))
      .filter(Boolean)
  ).sort();

  host.innerHTML = "";
  host.appendChild(makeMultiFilterGroup("Status", "status", statuses, state));
  host.appendChild(makeMultiFilterGroup("Spol", "spc", spcs, state));
  host.appendChild(makeMultiFilterGroup("Letnica rojstva", "birthYear", birthYears, state));
  host.appendChild(makeMultiFilterGroup("Tip karte", "tipKarte", tipKarte, state));
  host.appendChild(makeMultiFilterGroup("Kraj", "kraj", kraji, state));
  host.appendChild(makeMultiFilterGroup("Pošta", "posta", poste, state)); // ✅ NEW
}

function makeMultiFilterGroup(title, key, options, state) {
  const details = document.createElement("details");
  details.className = "filter-group";
  details.open = key === "status";

  const summary = document.createElement("summary");
  summary.textContent = title;
  details.appendChild(summary);

  const box = document.createElement("div");
  box.className = "checklist";

  // "Vse" checkbox
  const allId = `flt-${key}-all`;
  const allWrap = document.createElement("label");
  allWrap.innerHTML = `<input type="checkbox" id="${allId}"> <span>Vse</span>`;
  box.appendChild(allWrap);

  const selected = new Set((state.filters && state.filters[key]) || []);
  const allChecked = selected.size === 0;
  allWrap.querySelector("input").checked = allChecked;

  allWrap.querySelector("input").addEventListener("change", (e) => {
    if (e.target.checked) {
      state.filters[key] = [];
      saveUIState(state);
      renderEverything(state);
    }
  });

  options.forEach((opt) => {
    const id = `flt-${key}-${String(opt).replaceAll(" ", "_")}`;
    const wrap = document.createElement("label");
    const checked = selected.has(String(opt));
    wrap.innerHTML = `<input type="checkbox" id="${id}"> <span>${opt}</span>`;
    const inp = wrap.querySelector("input");
    inp.checked = checked;

    inp.addEventListener("change", () => {
      const next = new Set((state.filters && state.filters[key]) || []);
      if (inp.checked) next.add(String(opt));
      else next.delete(String(opt));

      state.filters[key] = Array.from(next);
      saveUIState(state);
      renderEverything(state);
    });

    box.appendChild(wrap);
  });

  details.appendChild(box);
  return details;
}

function renderColumnsBox(state) {
  const box = document.getElementById("columns-box");
  if (!box) return;

  const cols = [
    ["zapst", "ZAP.ŠT."],
    ["status", "STATUS"],
    ["spc", "SPOL"],
    ["clanska", "ČLANSKA"],
    ["priimek", "PRIIMEK"],
    ["ime", "IME"],
    ["naslov", "NASLOV"],
    ["posta", "ŠT. POŠTE"], // ✅ NEW
    ["kraj", "KRAJ"],
    ["email", "EMAIL"],
    ["telefon", "TELEFON"],
    ["tools", "ORODJA"],
  ];

  box.innerHTML = "";

  // "vsi stolpci"
  const allLabel = document.createElement("label");
  allLabel.innerHTML = `<input type="checkbox"> <span>Vsi stolpci</span>`;
  const allInp = allLabel.querySelector("input");
  const allOn = cols.every(([k]) => state.columns[k] === true);
  allInp.checked = allOn;

  allInp.addEventListener("change", () => {
    cols.forEach(([k]) => (state.columns[k] = allInp.checked));
    state.columns.zapst = true;
    state.columns.tools = true;
    saveUIState(state);
    renderEverything(state);
  });

  box.appendChild(allLabel);

  cols.forEach(([key, label]) => {
    const wrap = document.createElement("label");
    wrap.innerHTML = `<input type="checkbox"> <span>${label}</span>`;
    const inp = wrap.querySelector("input");
    inp.checked = state.columns[key] !== false;

    const locked = key === "zapst" || key === "tools";
    if (locked) {
      inp.checked = true;
      inp.disabled = true;
      wrap.style.opacity = "0.7";
    } else {
      inp.addEventListener("change", () => {
        state.columns[key] = inp.checked;
        saveUIState(state);
        applyColumnVisibility(state);
      });
    }

    box.appendChild(wrap);
  });
}

function renderTableWithState(members, state) {
  const tbody = document.getElementById("members-tbody");
  if (!tbody) return;

  const filtered = applyFilters(members, state).sort((a, b) => {
    const ap = (a.priimek || "").localeCompare((b.priimek || ""), "sl", { sensitivity: "base" });
    if (ap !== 0) return ap;
    return (a.ime || "").localeCompare((b.ime || ""), "sl", { sensitivity: "base" });
  });

  tbody.innerHTML = "";
  filtered.forEach((m, index) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="col-zapst" data-col="zapst">${index + 1}</td>
      <td data-col="status">${m.status || ""}</td>
      <td data-col="spc">${m.spc || ""}</td>
      <td data-col="clanska">${m.clanska || ""}</td>
      <td data-col="priimek">${m.priimek || ""}</td>
      <td data-col="ime">${m.ime || ""}</td>
      <td data-col="naslov">${m.naslov || ""}</td>
      <td data-col="posta">${m.posta || ""}</td>   <!-- ✅ NEW -->
      <td data-col="kraj">${m.kraj || ""}</td>
      <td data-col="email">${m.email ? `<a href="mailto:${m.email}">${m.email}</a>` : ""}</td>
      <td data-col="telefon">${m.telefon || ""}</td>
      <td class="table-actions" data-col="tools">
        <span class="action-icon edit" title="Uredi">✏️</span>
        <span class="action-icon delete" title="Arhiviraj">🗑️</span>
      </td>
    `;

    tr.querySelector(".edit").addEventListener("click", () => {
      window.location.href = `urejanje-clana.html?id=${m.id}`;
    });

    tr.querySelector(".delete").addEventListener("click", () => {
      if (confirm("Ali res želiš premakniti člana v arhiv?")) {
        const list = getMembers();
        const idx = list.findIndex((x) => x.id === m.id);
        if (idx !== -1) {
          list[idx].arhiviran = true;
          addHistory("Arhiviranje člana", `${m.ime} ${m.priimek} premaknjen v arhiv.`);
          saveMembers(list);
          renderEverything(loadUIState());
        }
      }
    });

    tbody.appendChild(tr);
  });
}

function applyFilters(members, state) {
  const s = (state.search || "").trim().toLowerCase();
  const f = state.filters || {};

  const selectedStatus = new Set(f.status || []);
  const selectedSpc = new Set(f.spc || []);
  const selectedBirthYear = new Set(f.birthYear || []);
  const selectedTipKarte = new Set(f.tipKarte || []);
  const selectedKraj = new Set(f.kraj || []);
  const selectedPosta = new Set(f.posta || []); // ✅ NEW

  return members.filter((m) => {
    if (selectedStatus.size && !selectedStatus.has(String(m.status || ""))) return false;
    if (selectedSpc.size && !selectedSpc.has(String(m.spc || ""))) return false;

    const by = m.datumRojstva ? String(new Date(m.datumRojstva).getFullYear()) : "";
    if (selectedBirthYear.size && !selectedBirthYear.has(by)) return false;

    if (selectedTipKarte.size && !selectedTipKarte.has(String(m.tipKarte || ""))) return false;
    if (selectedKraj.size && !selectedKraj.has(String(m.kraj || ""))) return false;
    if (selectedPosta.size && !selectedPosta.has(String(m.posta || ""))) return false; // ✅ NEW

    // search
    if (!s) return true;
    const hay = [
      m.ime,
      m.priimek,
      m.clanska,
      m.email,
      m.telefon,
      m.naslov,
      m.posta, // ✅ NEW
      m.kraj,
      m.status,
      m.spc,
      m.tipKarte,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return hay.includes(s);
  });
}

function applyColumnVisibility(state) {
  const table = document.getElementById("members-table");
  if (!table) return;

  const cols = state.columns || {};
  const allCells = table.querySelectorAll("[data-col]");
  allCells.forEach((el) => {
    const key = el.getAttribute("data-col");
    const visible = cols[key] !== false;
    el.style.display = visible ? "" : "none";
  });

  const ths = table.querySelectorAll("thead th");
  // ✅ NEW: mapping mora ustrezati vrstnemu redu v thead
  const mapping = ["zapst","status","spc","clanska","priimek","ime","naslov","posta","kraj","email","telefon","tools"];
  ths.forEach((th, idx) => {
    const k = mapping[idx];
    if (!k) return;
    th.style.display = (cols[k] !== false) ? "" : "none";
  });
}

/* =========================
   EXPORT
========================= */

function buildExportRows(allMembers) {
  const members = allMembers.filter(m => !m.arhiviran);

  const header = [
    "STAT",
    "SPC",
    "CLANSK",
    "PRIIMEK",
    "IME",
    "NASLOV",
    "POSTA",   // ✅ NEW
    "KRAJ",
    "ČLANARINA",
    "KARTA",
    "EMAIL",
    "TELEF",
    "ROJSTVO",
    "VPIS",
  ];

  const rows = members.map((m) => {
    const rojstvo = m.datumRojstva ? formatDateSI(m.datumRojstva) : "";
    const vpis = m.datumVpisa ? formatDateSI(m.datumVpisa) : "";
    const clanarina = feeForStatus(m.status);

    return [
      m.status || "",
      m.spc || "",
      m.clanska || "",
      m.priimek || "",
      m.ime || "",
      m.naslov || "",
      m.posta || "",     // ✅ NEW
      m.kraj || "",
      clanarina != null ? String(clanarina) : "",
      m.tipKarte || "",
      m.email || "",
      m.telefon || "",
      rojstvo,
      vpis,
    ];
  });

  return { header, rows };
}

function formatDateSI(dateStr) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = String(d.getFullYear());
  return `${dd}.${mm}.${yyyy}`;
}

function exportMembersXLSX() {
  const all = getMembers();
  const { header, rows } = buildExportRows(all);

  if (typeof XLSX === "undefined") {
    alert("XLSX knjižnica ni naložena. Uporabi CSV izvoz ali dodaj SheetJS script.");
    return;
  }

  const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Clani");

  const fileName = `clani_RD_Mozirje_${AktivnoLeto()}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

function exportMembersCSV() {
  const all = getMembers();
  const { header, rows } = buildExportRows(all);

  const escape = (v) => {
    const s = String(v ?? "");
    if (s.includes('"') || s.includes(";") || s.includes("\n")) {
      return `"${s.replaceAll('"', '""')}"`;
    }
    return s;
  };

  const lines = [];
  lines.push(header.map(escape).join(";"));
  rows.forEach((r) => lines.push(r.map(escape).join(";")));

  const bom = "\uFEFF";
  const blob = new Blob([bom + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `clani_RD_Mozirje_${AktivnoLeto()}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/* =========================
   Page init
========================= */

document.addEventListener("DOMContentLoaded", () => {
  ensureDemoData();
  const user = requireAuth({ pageModuleKey: "seznam" });
  if (!user) return;

  initHeader(user);
  renderAppNav(user, "seznam");

  handleSeznamPage();
  startReminderWatcher();
});

// footer leto
document.addEventListener("DOMContentLoaded", () => {
  const el = document.getElementById("aktivno-leto");
  if (!el) return;
  try {
    el.textContent = typeof AktivnoLeto === "function" ? AktivnoLeto() : "";
  } catch {
    el.textContent = "";
  }
});