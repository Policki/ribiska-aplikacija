function handleNarociloIzkaznicPage() {
  const user = requireAuth({ pageModuleKey: "clanske-izkaznice" });
  if (!user) return;

  initHeader(user);
  renderAppNav(user, "clanske-izkaznice");
  startReminderWatcher();

  const aktivnoLetoEl = document.getElementById("aktivno-leto");
  if (aktivnoLetoEl) aktivnoLetoEl.textContent = AktivnoLeto();

  const tbody = document.getElementById("card-tbody");
  const inpSearch = document.getElementById("card-search");
  const btnExport = document.getElementById("card-export-csv");
  if (!tbody) return;

  const ui = { search: "" };

  function fmtDateSI(iso) {
    if (!iso) return "-";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleDateString("sl-SI");
  }

  function matchesSearch(m) {
    if (!ui.search) return true;
    const q = ui.search.toLowerCase();
    const a = `${m.priimek || ""} ${m.ime || ""}`.toLowerCase();
    const c = String(m.clanska || "").toLowerCase();
    return a.includes(q) || c.includes(q);
  }

  // Član je v naročilu, če:
  // - potrebujeIzkaznico = true
  // - izkaznicaUrejena != true (da jo lahko "zaključiš")
  function listOrders() {
    return getMembers()
      .filter((m) => !m.arhiviran)
      .filter((m) => m.potrebujeIzkaznico === true)
      .filter((m) => m.izkaznicaUrejena !== true)
      .filter(matchesSearch)
      .sort((a, b) => (a.priimek || "").localeCompare(b.priimek || "", "sl") || (a.ime || "").localeCompare(b.ime || "", "sl"));
  }

  function exportCSV(rows, filename) {
    const csv = rows
      .map((r) =>
        r
          .map((cell) => {
            const s = String(cell ?? "");
            if (s.includes('"') || s.includes(",") || s.includes("\n")) return `"${s.replaceAll('"', '""')}"`;
            return s;
          })
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function markDone(memberId) {
    const list = getMembers();
    const idx = list.findIndex((x) => x.id === memberId);
    if (idx === -1) return;

    if (!confirm(`Označim izkaznico kot urejeno: ${list[idx].priimek} ${list[idx].ime}?`)) return;

    list[idx].izkaznicaUrejena = true;
    saveMembers(list);
    addHistory("Izkaznice", `Urejena izkaznica: ${list[idx].priimek} ${list[idx].ime}.`);
    render();
  }

  function render() {
    const list = listOrders();
    tbody.innerHTML = "";

    list.forEach((m) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${m.priimek || ""}</td>
        <td>${m.ime || ""}</td>
        <td>${m.clanska || ""}</td>
        <td>${m.status || ""}</td>
        <td>${fmtDateSI(m.datumVpisa)}</td>
        <td style="text-align:center;">
          <button type="button" class="chip-btn primary">UREJENO</button>
          <span class="action-icon edit" title="Uredi člana" style="margin-left:10px;">✏️</span>
        </td>
      `;
      tr.querySelector("button")?.addEventListener("click", () => markDone(m.id));
      tr.querySelector(".edit")?.addEventListener("click", () => (window.location.href = `urejanje-clana.html?id=${m.id}`));
      tbody.appendChild(tr);
    });

    btnExport && (btnExport.onclick = () => {
      const rows = [
        ["Priimek", "Ime", "Članska", "Status", "Datum vpisa"],
        ...list.map((m) => [m.priimek || "", m.ime || "", m.clanska || "", m.status || "", m.datumVpisa || ""]),
      ];
      exportCSV(rows, `narocilo-izkaznic_${new Date().toISOString().slice(0,10)}.csv`);
    });
  }

  inpSearch?.addEventListener("input", () => {
    ui.search = (inpSearch.value || "").trim();
    render();
  });

  render();
}

document.addEventListener("DOMContentLoaded", () => {
  ensureDemoData();
  handleNarociloIzkaznicPage();
});
