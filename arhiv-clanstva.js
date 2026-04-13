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

  if (typeof ensurePreviousMembershipYearSnapshot === "function") {
    ensurePreviousMembershipYearSnapshot();
  }

  const yearArchives = typeof getMembershipYearArchives === "function" ? getMembershipYearArchives() : {};
  const resignedArchives = typeof getMembershipResignedArchives === "function" ? getMembershipResignedArchives() : {};
  const resignedIndex = new Set();
  Object.entries(resignedArchives).forEach(([year, archive]) => {
    (archive?.members || []).forEach((member) => resignedIndex.add(`${year}:${member.id}`));
  });
  const members = getMembers().filter((m) => m.arhiviran && !resignedIndex.has(`${getArchiveYear(m)}:${m.id}`));

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

  const archivedYears = Object.keys(yearArchives)
    .filter((year) => yearArchives[year]?.members?.length)
    .sort((a, b) => Number(b) - Number(a));

  const resignedYears = Object.keys(resignedArchives)
    .filter((year) => resignedArchives[year]?.members?.length)
    .sort((a, b) => Number(b) - Number(a));

  if (archivedYears.length === 0 && resignedYears.length === 0 && years.length === 0) {
    host.innerHTML = `<div style="padding:14px; border:2px dashed rgba(0,0,0,.2); border-radius:14px; background:#fff;">
      V arhivu trenutno ni članov.
    </div>`;
    return;
  }

  archivedYears.forEach((year) => {
    const list = sortMembersByName(yearArchives[year].members || []);
    host.appendChild(
      buildArchiveDetails({
        title: `Članstvo ${year}`,
        countLabel: `${list.length} član(ov)`,
        hint: "Letni posnetek celotnega članstva. Ta seznam ostane nespremenjen tudi, če se tekoči podatki članov kasneje uredijo.",
        content: buildSnapshotTable(list),
      })
    );
  });

  resignedYears.forEach((year) => {
    const list = sortMembersByName(resignedArchives[year].members || []);
    host.appendChild(
      buildArchiveDetails({
        title: `Odstopili ${year}`,
        countLabel: `${list.length} član(ov)`,
        hint: "Člani, ki ob zaključku članarine niso imeli poravnane članarine. Če jih kasneje označiš kot plačane, se s tega seznama odstranijo.",
        content: buildResignedTable(year, list),
      })
    );
  });

  years.forEach((year) => {
    const list = sortMembersByName(groups[year]);
    host.appendChild(
      buildArchiveDetails({
        title: `Ročni arhiv ${year}`,
        countLabel: `${list.length} član(ov)`,
        hint: "Arhivirani člani iz obstoječe evidence.",
        content: buildYearTable(list),
      })
    );
  });
}

function sortMembersByName(list) {
  return (list || []).slice().sort((a, b) => {
    const ap = (a.priimek || "").localeCompare(b.priimek || "", "sl", { sensitivity: "base" });
    if (ap !== 0) return ap;
    return (a.ime || "").localeCompare(b.ime || "", "sl", { sensitivity: "base" });
  });
}

function buildArchiveDetails({ title, countLabel, hint, content }) {
  const details = document.createElement("details");
  details.className = "archive-panel";

  const summary = document.createElement("summary");
  summary.className = "archive-panel__summary";
  summary.innerHTML = `
    <span>${escapeHtml(title)}</span>
    <span>${escapeHtml(countLabel)}</span>
  `;
  details.appendChild(summary);

  const inner = document.createElement("div");
  inner.className = "archive-panel__body";
  if (hint) {
    const hintEl = document.createElement("div");
    hintEl.className = "small-hint";
    hintEl.style.marginBottom = "10px";
    hintEl.textContent = hint;
    inner.appendChild(hintEl);
  }
  inner.appendChild(content);
  details.appendChild(inner);

  return details;
}

function buildSnapshotTable(members) {
  const wrapper = document.createElement("div");
  wrapper.className = "table-wrapper";

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
        <th>NASLOV</th>
        <th>POŠTA</th>
        <th>EMAIL</th>
        <th>TELEFON</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;

  const tbody = table.querySelector("tbody");
  members.forEach((m, idx) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td style="text-align:center;">${idx + 1}</td>
      <td>${escapeHtml(m.status || "")}</td>
      <td>${escapeHtml(m.spc || "")}</td>
      <td>${escapeHtml(m.clanska || "")}</td>
      <td>${escapeHtml(m.priimek || "")}</td>
      <td>${escapeHtml(m.ime || "")}</td>
      <td>${escapeHtml(m.naslov || "")}</td>
      <td>${escapeHtml([m.posta, m.kraj].filter(Boolean).join(" "))}</td>
      <td>${m.email ? `<a href="mailto:${escapeHtml(m.email)}">${escapeHtml(m.email)}</a>` : ""}</td>
      <td>${escapeHtml(m.telefon || "")}</td>
    `;
    tbody.appendChild(tr);
  });

  wrapper.appendChild(table);
  return wrapper;
}

function buildResignedTable(year, members) {
  const wrapper = document.createElement("div");
  wrapper.className = "table-wrapper";

  const table = document.createElement("table");
  table.className = "table";
  table.innerHTML = `
    <thead>
      <tr>
        <th style="width:70px;">ZAP.ŠT</th>
        <th>STAT</th>
        <th>ČLANSK</th>
        <th>PRIIMEK</th>
        <th>IME</th>
        <th>ZNESEK</th>
        <th>DATUM</th>
        <th>RAZLOG</th>
        <th>ORODJA</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;

  const tbody = table.querySelector("tbody");
  members.forEach((m, idx) => {
    const canRestore = String(year) === currentYear();
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td style="text-align:center;">${idx + 1}</td>
      <td>${escapeHtml(m.status || "")}</td>
      <td>${escapeHtml(m.clanska || "")}</td>
      <td>${escapeHtml(m.priimek || "")}</td>
      <td>${escapeHtml(m.ime || "")}</td>
      <td><b>${formatEUR(m.amount)}</b></td>
      <td>${formatDateSI(m.resignedAt) || ""}</td>
      <td>${escapeHtml(m.reason || "Neporavnana članarina")}</td>
      <td class="table-actions">
        ${
          canRestore
            ? `<button class="btn btn-primary" style="padding:6px 10px; border-radius:12px; font-size:12px;" data-action="paid-trr" data-id="${m.id}">Plačal TRR</button>
               <button class="btn btn-secondary" style="padding:6px 10px; border-radius:12px; font-size:12px;" data-action="paid-cash" data-id="${m.id}">Plačal CASH</button>`
            : `<span class="small-hint">Zaključeno leto</span>`
        }
      </td>
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll("button[data-action]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = Number(btn.dataset.id);
      const state = btn.dataset.action === "paid-cash" ? "PAID_CASH" : "PAID_TRR";
      markResignedMemberPaid(year, id, state);
    });
  });

  wrapper.appendChild(table);
  return wrapper;
}

function markResignedMemberPaid(year, memberId, state) {
  const members = getMembers();
  const idx = members.findIndex((member) => Number(member.id) === Number(memberId));

  if (idx !== -1) {
    members[idx].arhiviran = false;
    members[idx].datumArhiva = null;
    members[idx].arhivLeto = null;
    members[idx].ponovniVpisOd = todayISO();
    saveMembers(members);
  }

  const all = getJSON("rd_fee_status_v1", {});
  all[year] = all[year] || {};
  all[year][memberId] = { state, updatedAt: new Date().toISOString() };
  setJSON("rd_fee_status_v1", all);

  if (typeof removeMembershipResignedMember === "function") {
    removeMembershipResignedMember(year, memberId);
  }

  const member = idx !== -1 ? members[idx] : { ime: "", priimek: "", clanska: "" };
  addHistory("Arhiv članstva", `Član ${member.ime || ""} ${member.priimek || ""} je označen kot plačan in odstranjen iz seznama odstoplih ${year}.`);
  renderArchiveByYear();
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
