function handleKarteCuvajiPage() {
  // =========================
  // LocalStorage (po letih)
  // =========================
  const LS_LIC_ACTIVE = "rd_licenses_active_v1";   // { [year]: [records...] }
  const LS_LIC_ARCHIVE = "rd_licenses_archive_v1"; // { [year]: [records...] }
  const LS_LIC_CLOSED = "rd_licenses_closed_v1";   // { [year]: { closedAt } }

  // =========================
  // DOM
  // =========================
  const fileInput = document.getElementById("licenses-file");
  const tbody = document.getElementById("licenses-tbody");
  const form = document.getElementById("license-form");
  const selYear = document.getElementById("lic-year");
  const inpSearch = document.getElementById("lic-search");
  const btnClose = document.getElementById("btn-lic-close-year");
  const btnExport = document.getElementById("btn-lic-export");
  const statsEl = document.getElementById("lic-stats");
  const archiveHost = document.getElementById("licenses-archive-host");

  const aktivnoLetoEl = document.getElementById("aktivno-leto");
  if (aktivnoLetoEl) aktivnoLetoEl.textContent = AktivnoLeto();

  if (!tbody || !form || !selYear) return;

  const ui = {
    year: currentYear(),
    search: "",
  };

  // =========================
  // helpers
  // =========================
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
  function safe(v) {
    return v == null ? "" : String(v);
  }

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

  // Active list is EMPTY by default, until user adds/imports
  function ensureYearActiveList(year) {
    const all = getJSONLocal(LS_LIC_ACTIVE, {});
    if (!all[year]) {
      all[year] = [];
      setJSONLocal(LS_LIC_ACTIVE, all);
    }
  }

  function getActiveList(year) {
    const all = getJSONLocal(LS_LIC_ACTIVE, {});
    return all[year] || [];
  }
  function setActiveList(year, list) {
    const all = getJSONLocal(LS_LIC_ACTIVE, {});
    all[year] = list;
    setJSONLocal(LS_LIC_ACTIVE, all);
  }

  function getArchiveMap() {
    return getJSONLocal(LS_LIC_ARCHIVE, {});
  }
  function setArchiveMap(map) {
    setJSONLocal(LS_LIC_ARCHIVE, map);
  }

  function isYearClosed(year) {
    const closed = getJSONLocal(LS_LIC_CLOSED, {});
    return !!closed[year]?.closedAt;
  }
  function markYearClosed(year) {
    const closed = getJSONLocal(LS_LIC_CLOSED, {});
    closed[year] = { closedAt: nowISO() };
    setJSONLocal(LS_LIC_CLOSED, closed);
  }

  function normalizeNumber(n) {
    // ohrani vodilne ničle pri "001" ipd.
    return safe(n).trim();
  }

  function normalizeName(s) {
    return safe(s).trim();
  }

  function matchesSearch(x) {
    if (!ui.search) return true;
    const q = ui.search.toLowerCase();
    const a = `${x.ime || ""} ${x.priimek || ""}`.toLowerCase();
    const b = String(x.stKarte || "").toLowerCase();
    return a.includes(q) || b.includes(q);
  }

  // =========================
  // Render
  // =========================
  function renderStats(year, list) {
    if (!statsEl) return;
    statsEl.textContent = `Zapisov: ${list.length}` + (isYearClosed(year) ? " | LETO ZAKLJUČENO" : "");
  }

  function renderTable() {
    const year = ui.year;
    ensureYearActiveList(year);

    let list = getActiveList(year).slice();

    // filter + sort
    list = list.filter(matchesSearch).sort((a, b) => {
      const pa = (a.priimek || "").localeCompare(b.priimek || "", "sl");
      if (pa !== 0) return pa;
      const ia = (a.ime || "").localeCompare(b.ime || "", "sl");
      if (ia !== 0) return ia;
      return String(a.stKarte || "").localeCompare(String(b.stKarte || ""), "sl");
    });

    tbody.innerHTML = "";

    if (!list.length) {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td colspan="8" style="padding:14px; text-align:center; opacity:.75;">Seznam je prazen. Dodaj ročno ali uvozi Excel.</td>`;
      tbody.appendChild(tr);
      renderStats(year, getActiveList(year));
      return;
    }

    list.forEach((x, i) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${i + 1}</td>
        <td>${safe(x.ime)}</td>
        <td>${safe(x.priimek)}</td>
        <td><b>${safe(x.stKarte)}</b></td>
        <td>${safe(x.revir0)}</td>
        <td>${safe(x.revir1)}</td>
        <td>${safe(x.revir2)}</td>
        <td class="table-actions">
          <span class="action-icon delete" data-id="${x.id}" title="Izbriši">🗑️</span>
        </td>
      `;
      tbody.appendChild(tr);
    });

    tbody.querySelectorAll(".delete").forEach((btn) => {
      btn.addEventListener("click", () => {
        const year = ui.year;
        const id = Number(btn.dataset.id);
        if (!confirm("Izbrišem zapis?")) return;

        const current = getActiveList(year);
        const next = current.filter((x) => x.id !== id);
        setActiveList(year, next);

        addHistory("Letne karte", `Izbrisan zapis (leto ${year}).`);
        renderAll();
      });
    });

    renderStats(year, getActiveList(year));
  }

  function renderArchive() {
    if (!archiveHost) return;

    const arch = getArchiveMap();
    const years = Object.keys(arch).sort((a, b) => Number(b) - Number(a));

    if (!years.length) {
      archiveHost.innerHTML = `<div class="small-hint">Arhiv je prazen.</div>`;
      return;
    }

    archiveHost.innerHTML = "";

    years.forEach((y) => {
      const list = arch[y] || [];
      const wrap = document.createElement("div");
      wrap.className = "card";
      wrap.style.marginBottom = "12px";

      wrap.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; gap:10px;">
          <div style="font-weight:900;">Leto ${y}</div>
          <div class="small-hint">Zapisov: ${list.length}</div>
        </div>
        <div class="table-wrapper" style="margin-top:10px;">
          <table class="table">
            <thead>
              <tr>
                <th>#</th>
                <th>IME</th>
                <th>PRIIMEK</th>
                <th>ŠT. KARTE</th>
                <th>REVIR0</th>
                <th>REVIR1</th>
                <th>REVIR2</th>
              </tr>
            </thead>
            <tbody>
              ${list
                .slice()
                .sort((a, b) => (a.priimek || "").localeCompare(b.priimek || "", "sl"))
                .map(
                  (x, i) => `
                  <tr>
                    <td>${i + 1}</td>
                    <td>${safe(x.ime)}</td>
                    <td>${safe(x.priimek)}</td>
                    <td><b>${safe(x.stKarte)}</b></td>
                    <td>${safe(x.revir0)}</td>
                    <td>${safe(x.revir1)}</td>
                    <td>${safe(x.revir2)}</td>
                  </tr>
                `
                )
                .join("")}
            </tbody>
          </table>
        </div>
      `;

      archiveHost.appendChild(wrap);
    });
  }

  function renderAll() {
    renderTable();
    renderArchive();
  }

  // =========================
  // Dodaj ročno
  // =========================
  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const year = ui.year;
    ensureYearActiveList(year);

    if (isYearClosed(year)) {
      alert("To leto je zaključeno. Izberi novo leto za vnos.");
      return;
    }

    const ime = normalizeName(form.licenseFirst.value);
    const priimek = normalizeName(form.licenseLast.value);
    const stKarte = normalizeNumber(form.licenseNumber.value);

    const revir0 = normalizeName(form.revir0.value);
    const revir1 = normalizeName(form.revir1.value);
    const revir2 = normalizeName(form.revir2.value);

    if (!ime || !priimek || !stKarte) {
      alert("Vnesi ime, priimek in številko karte.");
      return;
    }

    const list = getActiveList(year);

    // prepreči podvojitev iste številke (lahko odstraniš, če ne želiš)
    if (list.some((x) => String(x.stKarte) === String(stKarte))) {
      if (!confirm("Ta številka karte že obstaja v seznamu. Vseeno dodam?")) return;
    }

    list.push({
      id: Date.now(),
      ime,
      priimek,
      stKarte,
      revir0,
      revir1,
      revir2,
      createdAt: nowISO(),
    });

    setActiveList(year, list);

    addHistory("Letne karte", `Dodan zapis: ${ime} ${priimek} – karta ${stKarte} (leto ${year}).`);
    form.reset();
    renderAll();
  });

  // =========================
  // Uvoz Excel (SheetJS) - podpira tvoj format iz slike
  // =========================
  async function importExcel(file) {
    if (typeof XLSX === "undefined") {
      alert("Manjka knjižnica XLSX (SheetJS).");
      return;
    }

    const year = ui.year;
    ensureYearActiveList(year);

    if (isYearClosed(year)) {
      alert("To leto je zaključeno. Izberi novo leto za uvoz.");
      return;
    }

    const data = await file.arrayBuffer();
    const wb = XLSX.read(data);
    const sheetName = wb.SheetNames[0];
    const sheet = wb.Sheets[sheetName];

    // 1) preberemo kot rows + header
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
    if (!rows.length) {
      alert("Excel je prazen.");
      return;
    }

    // detekcija headerja (prva vrstica)
    const headerRow = rows[0].map((h) => String(h).trim().toLowerCase());

    const colIndex = (names) => {
      for (const n of names) {
        const idx = headerRow.indexOf(n);
        if (idx !== -1) return idx;
      }
      return -1;
    };

    // tvoji možni stolpci
    const idxIme = colIndex(["ime", "first", "firstname"]);
    const idxPriimek = colIndex(["priimek", "surname", "lastname"]);
    const idxZapSt = colIndex(["zap.st.", "zap st", "zapst", "zap. st.", "zapst."]);
    const idxDov = colIndex(["stevilka", "št", "st", "st.", "dovolilnica", "številka dovolilnice", "št. dovolilnice", "st. dovolilnice"]);

    const idxRevir0 = colIndex(["revir0", "revir 0"]);
    const idxRevir1 = colIndex(["revir1", "revir 1"]);
    const idxRevir2 = colIndex(["revir2", "revir 2"]);

    // Če ni headerja (npr. samo 2 stolpca), fallback:
    const hasImePriimek = idxIme !== -1 && idxPriimek !== -1;
    const hasNumberCol = idxZapSt !== -1 || idxDov !== -1;

    const imported = [];
    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      if (!row || !row.length) continue;

      let ime = "";
      let priimek = "";
      let stKarte = "";

      if (hasImePriimek) {
        ime = normalizeName(row[idxIme]);
        priimek = normalizeName(row[idxPriimek]);
      } else {
        // fallback: prvi stolpec "Ime Priimek"
        const full = normalizeName(row[0]);
        if (full) {
          const parts = full.split(/\s+/);
          if (parts.length >= 2) {
            ime = parts.slice(0, parts.length - 1).join(" ");
            priimek = parts[parts.length - 1];
          } else {
            ime = full;
            priimek = "";
          }
        }
      }

      // številka karte: preferiraj "dovolilnica/stevilka", sicer "Zap.St."
      const numRaw =
        (idxDov !== -1 ? row[idxDov] : "") ||
        (idxZapSt !== -1 ? row[idxZapSt] : "") ||
        "";

      stKarte = normalizeNumber(numRaw);

      // če še vedno ni številke in imaš stari format 2 stolpca (name|number)
      if (!stKarte && !hasNumberCol && row.length >= 2) {
        stKarte = normalizeNumber(row[1]);
      }

      if (!ime || !priimek || !stKarte) {
        // preskoči prazne vrstice
        continue;
      }

      const revir0 = idxRevir0 !== -1 ? normalizeName(row[idxRevir0]) : "";
      const revir1 = idxRevir1 !== -1 ? normalizeName(row[idxRevir1]) : "";
      const revir2 = idxRevir2 !== -1 ? normalizeName(row[idxRevir2]) : "";

      imported.push({
        id: Date.now() + r + Math.floor(Math.random() * 999),
        ime,
        priimek,
        stKarte,
        revir0,
        revir1,
        revir2,
        createdAt: nowISO(),
      });
    }

    if (!imported.length) {
      alert("Nisem našel veljavnih vrstic (pričakujem vsaj: ime, priimek, številka).");
      return;
    }

    // merge: dodaj na obstoječi seznam (ne prepiši)
    const list = getActiveList(year);
    const merged = list.slice();

    let added = 0;
    imported.forEach((rec) => {
      // soft dedupe po številki karte
      if (merged.some((x) => String(x.stKarte) === String(rec.stKarte))) return;
      merged.push(rec);
      added++;
    });

    setActiveList(year, merged);

    addHistory("Letne karte", `Uvoz iz Excela: dodanih ${added} zapisov (leto ${year}).`);
    alert(`Uvoz uspešen. Dodanih ${added} zapisov. (Podvojene številke so bile preskočene.)`);

    renderAll();
  }

  if (fileInput) {
    fileInput.addEventListener("change", async () => {
      const file = fileInput.files?.[0];
      if (!file) return;

      const ok = confirm("Uvozim podatke iz datoteke? Podvojene številke kart se bodo preskočile.");
      if (!ok) {
        fileInput.value = "";
        return;
      }

      try {
        await importExcel(file);
      } catch (e) {
        console.error(e);
        alert("Napaka pri uvozu. Preveri format datoteke.");
      } finally {
        fileInput.value = "";
      }
    });
  }

  // =========================
  // Zaključi leto -> arhiv
  // =========================
  function closeYear() {
    const year = ui.year;
    ensureYearActiveList(year);

    if (isYearClosed(year)) {
      alert("To leto je že zaključeno.");
      return;
    }

    const list = getActiveList(year);
    if (!list.length) {
      if (!confirm("Seznam je prazen. Vseeno zaključim leto?")) return;
    } else {
      if (!confirm(`Zaključim leto ${year}? Trenutni seznam (${list.length} zapisov) bo arhiviran.`)) return;
    }

    const arch = getArchiveMap();
    arch[year] = list.slice();
    setArchiveMap(arch);

    // aktivni seznam ostane prazen (tako kot želiš)
    setActiveList(year, []);

    markYearClosed(year);

    addHistory("Letne karte", `Zaključeno leto ${year}. Arhiviranih ${list.length} zapisov. Aktivni seznam je izpraznjen.`);
    renderAll();
  }

  // =========================
  // Export CSV
  // =========================
  function exportCSV() {
    const year = ui.year;
    const list = getActiveList(year);

    const rows = [];
    rows.push(["Zap.St.", "ime", "priimek", "revir0", "revir1", "revir2", "print"]);

    list
      .slice()
      .sort((a, b) => (a.priimek || "").localeCompare(b.priimek || "", "sl"))
      .forEach((x, i) => {
        rows.push([
          safe(x.stKarte) || String(i + 1),
          safe(x.ime),
          safe(x.priimek),
          safe(x.revir0),
          safe(x.revir1),
          safe(x.revir2),
          "N",
        ]);
      });

    const csv = rows
      .map((r) =>
        r
          .map((cell) => {
            const s = String(cell ?? "");
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
    a.download = `letne-karte_${year}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();

    URL.revokeObjectURL(url);
  }

  // =========================
  // Events
  // =========================
  buildYearOptions();

  selYear.addEventListener("change", () => {
    ui.year = selYear.value;
    renderAll();
  });

  inpSearch?.addEventListener("input", () => {
    ui.search = (inpSearch.value || "").trim();
    renderTable();
  });

  btnClose?.addEventListener("click", closeYear);
  btnExport?.addEventListener("click", exportCSV);

  // init
  ensureYearActiveList(ui.year);
  renderAll();
}

document.addEventListener("DOMContentLoaded", () => {
  ensureDemoData();
  const user = requireAuth({ pageModuleKey: "karte-cuvaji" });
  if (!user) return;

  initHeader(user);
  renderAppNav(user, "karte-cuvaji");
  startReminderWatcher();

  handleKarteCuvajiPage();
});