function handlePripravnikiIzpitiPage() {
  const user = requireAuth({ pageModuleKey: "pripravniki-izpiti" });
  if (!user) return;

  initHeader(user);
  renderAppNav(user, "pripravniki-izpiti");
  startReminderWatcher();

  const aktivnoLetoEl = document.getElementById("aktivno-leto");
  if (aktivnoLetoEl) aktivnoLetoEl.textContent = AktivnoLeto();

  const inpSearch = document.getElementById("pei-search");
  const btnExport = document.getElementById("pei-export-csv");

  const btnTabNoExam = document.getElementById("pei-tab-noexam");
  const btnTabSuggest = document.getElementById("pei-tab-suggest");

  const thead = document.getElementById("pei-thead");
  const tbody = document.getElementById("pei-tbody");
  if (!thead || !tbody) return;

  const ui = {
    tab: "noexam", // noexam | suggest
    search: "",
  };

  function currentYear() {
    return new Date().getFullYear();
  }

  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  function toISO(d) {
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  }

  function fmtDateSI(iso) {
    if (!iso) return "-";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleDateString("sl-SI");
  }

  function getAgeOnDate(birthISO, atDate) {
    if (!birthISO) return null;
    const b = new Date(birthISO);
    if (Number.isNaN(b.getTime())) return null;

    let age = atDate.getFullYear() - b.getFullYear();
    const m = atDate.getMonth() - b.getMonth();
    if (m < 0 || (m === 0 && atDate.getDate() < b.getDate())) age--;
    return age;
  }

  function matchesSearch(m) {
    if (!ui.search) return true;
    const q = ui.search.toLowerCase();
    const a = `${m.priimek || ""} ${m.ime || ""}`.toLowerCase();
    const c = String(m.clanska || "").toLowerCase();
    return a.includes(q) || c.includes(q);
  }

  function listNoExam() {
    return getMembers()
      .filter((m) => !m.arhiviran)
      .filter((m) => m.ribiskiIzpit !== true) // šteje tudi undefined = "ni opravljen"
      .filter(matchesSearch)
      .sort((a, b) => (a.priimek || "").localeCompare(b.priimek || "", "sl") || (a.ime || "").localeCompare(b.ime || "", "sl"));
  }

  function listSuggestionsAMtoAP() {
    const y = currentYear();
    const cutoff = new Date(y, 8, 30); // 30. september (mesec 8)
    return getMembers()
      .filter((m) => !m.arhiviran)
      .filter((m) => (m.status || "") === "AM")
      .filter((m) => m.ribiskiIzpit !== true) // predlagamo tiste brez izpita
      .filter((m) => {
        const age = getAgeOnDate(m.datumRojstva, cutoff);
        return age !== null && age >= 16;
      })
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

  function approveMemberToAP(memberId) {
    const list = getMembers();
    const idx = list.findIndex((x) => x.id === memberId);
    if (idx === -1) return;

    if (!confirm(`Spremenim status ${list[idx].priimek} ${list[idx].ime} iz AM → AP?`)) return;

    list[idx].status = "AP";
    saveMembers(list);

    addHistory("Status člana", `Spremenjen status: ${list[idx].priimek} ${list[idx].ime} → AP.`);
    render();
  }

  function renderNoExam() {
    thead.innerHTML = `
      <tr>
        <th>PRIIMEK</th>
        <th>IME</th>
        <th>ČLANSKA</th>
        <th>STATUS</th>
        <th>DATUM ROJSTVA</th>
        <th>IZPIT</th>
        <th>DATUM IZPITA</th>
        <th>ORODJA</th>
      </tr>
    `;

    const list = listNoExam();
    tbody.innerHTML = "";

    list.forEach((m) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${m.priimek || ""}</td>
        <td>${m.ime || ""}</td>
        <td>${m.clanska || ""}</td>
        <td>${m.status || ""}</td>
        <td>${fmtDateSI(m.datumRojstva)}</td>
        <td>${m.ribiskiIzpit === true ? "DA" : "NE"}</td>
        <td>${fmtDateSI(m.datumRibiskegaIzpita)}</td>
        <td class="table-actions">
          <span class="action-icon edit" title="Uredi člana">✏️</span>
        </td>
      `;
      tr.querySelector(".edit")?.addEventListener("click", () => {
        window.location.href = `urejanje-clana.html?id=${m.id}`;
      });
      tbody.appendChild(tr);
    });

    if (btnExport) {
      btnExport.onclick = () => {
        const rows = [
          ["Priimek", "Ime", "Članska", "Status", "Datum rojstva", "Izpit", "Datum izpita"],
          ...list.map((m) => [
            m.priimek || "",
            m.ime || "",
            m.clanska || "",
            m.status || "",
            m.datumRojstva || "",
            m.ribiskiIzpit === true ? "DA" : "NE",
            m.datumRibiskegaIzpita || "",
          ]),
        ];
        exportCSV(rows, `brez-izpita_${toISO(new Date())}.csv`);
      };
    }
  }

  function renderSuggest() {
    thead.innerHTML = `
      <tr>
        <th>PRIIMEK</th>
        <th>IME</th>
        <th>ČLANSKA</th>
        <th>STATUS</th>
        <th>DATUM ROJSTVA</th>
        <th>STAROST (30.9.)</th>
        <th>ORODJA</th>
      </tr>
    `;

    const y = currentYear();
    const cutoff = new Date(y, 8, 30);
    const list = listSuggestionsAMtoAP();
    tbody.innerHTML = "";

    list.forEach((m) => {
      const age = getAgeOnDate(m.datumRojstva, cutoff);
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${m.priimek || ""}</td>
        <td>${m.ime || ""}</td>
        <td>${m.clanska || ""}</td>
        <td>${m.status || ""}</td>
        <td>${fmtDateSI(m.datumRojstva)}</td>
        <td>${age ?? "-"}</td>
        <td style="text-align:center;">
          <button type="button" class="chip-btn primary">POTRDI AP</button>
        </td>
      `;
      tr.querySelector("button")?.addEventListener("click", () => approveMemberToAP(m.id));
      tbody.appendChild(tr);
    });

    if (btnExport) {
      btnExport.onclick = () => {
        const rows = [
          ["Priimek", "Ime", "Članska", "Status", "Datum rojstva", "Starost (30.9.)"],
          ...list.map((m) => [
            m.priimek || "",
            m.ime || "",
            m.clanska || "",
            m.status || "",
            m.datumRojstva || "",
            String(getAgeOnDate(m.datumRojstva, cutoff) ?? ""),
          ]),
        ];
        exportCSV(rows, `predlog_AM_AP_${y}.csv`);
      };
    }
  }

  function render() {
    if (ui.tab === "noexam") renderNoExam();
    else renderSuggest();

    btnTabNoExam?.classList.toggle("primary", ui.tab === "noexam");
    btnTabSuggest?.classList.toggle("primary", ui.tab === "suggest");
  }

  btnTabNoExam?.addEventListener("click", () => {
    ui.tab = "noexam";
    render();
  });
  btnTabSuggest?.addEventListener("click", () => {
    ui.tab = "suggest";
    render();
  });

  inpSearch?.addEventListener("input", () => {
    ui.search = (inpSearch.value || "").trim();
    render();
  });

  render();
}

document.addEventListener("DOMContentLoaded", () => {
  ensureDemoData();
  handlePripravnikiIzpitiPage();
});