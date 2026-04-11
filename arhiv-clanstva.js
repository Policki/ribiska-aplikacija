function handleArhivPage() {
  renderArchiveByYear();
}

function getArchiveYear(member) {
  if (member.arhivLeto) return String(member.arhivLeto);

  if (member.datumArhiva) {
    const d = new Date(member.datumArhiva);
    if (!Number.isNaN(d.getTime())) return String(d.getFullYear());
  }

  // če nima podatkov, privzemi letošnje leto
  return String(new Date().getFullYear());
}

function renderArchiveByYear() {
  const host = document.getElementById("archive-years");
  if (!host) return;

  const members = getMembers().filter((m) => m.arhiviran);

  // group by year
  const groups = {};
  members.forEach((m) => {
    const y = getArchiveYear(m);
    if (!groups[y]) groups[y] = [];
    groups[y].push(m);
  });

  // sort years desc (Neznano na koncu)
  const years = Object.keys(groups).sort((a, b) => {
    if (a === "Neznano") return 1;
    if (b === "Neznano") return -1;
    return Number(b) - Number(a);
  });

  host.innerHTML = "";

  if (years.length === 0) {
    host.innerHTML = `<div style="padding:14px; border:2px dashed rgba(0,0,0,.2); border-radius:14px; background:#fff;">
      V arhivu trenutno ni članov.
    </div>`;
    return;
  }

  years.forEach((year) => {
    const list = groups[year]
      .slice()
      .sort((a, b) => {
        const ap = (a.priimek || "").localeCompare((b.priimek || ""), "sl", { sensitivity: "base" });
        if (ap !== 0) return ap;
        return (a.ime || "").localeCompare((b.ime || ""), "sl", { sensitivity: "base" });
      });

    const details = document.createElement("details");
    details.style.background = "#fff";
    details.style.borderRadius = "14px";
    details.style.border = "2px solid rgba(11,75,75,.15)";
    details.style.boxShadow = "0 10px 30px rgba(0,0,0,.08)";

    const summary = document.createElement("summary");
    summary.style.cursor = "pointer";
    summary.style.padding = "12px 14px";
    summary.style.fontWeight = "900";
    summary.style.listStyle = "none";
    summary.style.display = "flex";
    summary.style.alignItems = "center";
    summary.style.justifyContent = "space-between";

    summary.innerHTML = `
      <span>${year}</span>
      <span style="font-weight:800; font-size:13px; opacity:.8;">${list.length} član(ov)</span>
    `;

    // odstrani privzeti marker
    summary.addEventListener("click", () => {});
    details.appendChild(summary);

    const inner = document.createElement("div");
    inner.style.padding = "0 12px 12px 12px";

    inner.appendChild(buildYearTable(list));

    details.appendChild(inner);
    host.appendChild(details);
  });
}

function buildYearTable(members) {
  const wrapper = document.createElement("div");
  wrapper.className = "table-wrapper"; // uporabi obstoječi stil iz styles.css

  const table = document.createElement("table");
  table.className = "table";

  table.innerHTML = `
    <thead>
      <tr>
        <th style="width:70px;">ZAP.ŠT</th>
        <th>STAT</th>
        <th>SPC</th>
        <th>ČLANSK</th>
        <th>PRIIMEK</th>
        <th>IME</th>
        <th>EMAIL</th>
        <th>TELEFON</th>
        <th>ARHIV OD</th>
        <th>PONOVNO OD</th>
        <th>ORODJA</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;

  const tbody = table.querySelector("tbody");

  members.forEach((m, idx) => {
    const tr = document.createElement("tr");

    const arhivOd = formatDateSI(m.datumArhiva);
    const ponovnoOd = formatDateSI(m.ponovniVpisOd);

    tr.innerHTML = `
      <td style="text-align:center;">${idx + 1}</td>
      <td>${m.status || ""}</td>
      <td>${m.spc || ""}</td>
      <td>${m.clanska || ""}</td>
      <td>${m.priimek || ""}</td>
      <td>${m.ime || ""}</td>
      <td>${m.email ? `<a href="mailto:${m.email}">${m.email}</a>` : ""}</td>
      <td>${m.telefon || ""}</td>
      <td>${arhivOd || ""}</td>
      <td>${ponovnoOd || ""}</td>
      <td class="table-actions">
        <button class="btn btn-primary" style="padding:6px 10px; border-radius:12px; font-size:12px;" data-action="restore">Vrni</button>
        <span class="action-icon delete" title="Trajno izbriši">🗑️</span>
      </td>
    `;

    // Vrni člana (aktivacija)
    tr.querySelector('[data-action="restore"]').addEventListener("click", () => {
      if (!confirm("Ali želiš člana vrniti med aktivne?")) return;

      const list = getMembers();
      const i = list.findIndex((x) => x.id === m.id);
      if (i === -1) return;

      list[i].arhiviran = false;
      list[i].ponovniVpisOd = todayISO();     // NOVO: datum ponovne aktivacije
      // arhivLeto/datumArhiva pustimo zaradi zgodovine (lahko tudi zbrišeš, če želiš)
      saveMembers(list);

      addHistory("Vrnitev člana", `Član vrnjen med aktivne: ${m.ime} ${m.priimek} (št. ${m.clanska}).`);
      renderArchiveByYear();
    });

    // Trajno izbriši iz arhiva
    tr.querySelector(".delete").addEventListener("click", () => {
      if (!confirm("Ali res želiš člana trajno izbrisati iz arhiva?")) return;

      const list = getMembers();
      const i = list.findIndex((x) => x.id === m.id);
      if (i === -1) return;

      const gone = list[i];
      list.splice(i, 1);
      saveMembers(list);

      addHistory("Izbris člana", `Tajno izbrisan član iz arhiva: ${gone.ime} ${gone.priimek} (št. ${gone.clanska}).`);
      renderArchiveByYear();
    });

    tbody.appendChild(tr);
  });

  wrapper.appendChild(table);
  return wrapper;
}

function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
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

document.addEventListener("DOMContentLoaded", () => {
  ensureDemoData();
  const user = requireAuth({ pageModuleKey: "arhiv" });
  if (!user) return;

  initHeader(user);
  renderAppNav(user, "arhiv");
  handleArhivPage();
  startReminderWatcher();

  // footer leto
  const el = document.getElementById("aktivno-leto");
  if (el && typeof AktivnoLeto === "function") el.textContent = AktivnoLeto();
});
