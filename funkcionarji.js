function handleFunkcionarjiPage() {
  const selectMember = document.getElementById("official-member");
  const selectRole = document.getElementById("official-role");
  const tbody = document.getElementById("officials-tbody");
  const form = document.getElementById("official-form");
  const aktivnoLetoEl = document.getElementById("aktivno-leto");

  if (aktivnoLetoEl) aktivnoLetoEl.textContent = AktivnoLeto();
  if (!selectMember || !selectRole || !tbody || !form) return;

  // ----- nastavitve / helperji (lokalno na strani) -----

  const ROLE_ORDER = [
    "Predsednik",
    "Gospodar",
    "Tajnik",
    "Član UO",
    "Tožilec",
    "Član disciplinske razsodišča",
    "Drugo",
  ];

  const roleRank = (role) => {
    const i = ROLE_ORDER.indexOf(role);
    return i === -1 ? 999 : i;
  };

  const safe = (v) => (v == null ? "" : String(v));

  const fmtPhone = (tel) => safe(tel).trim();
  const fmtEmail = (em) => safe(em).trim();
  const fmtAddress = (naslov) => safe(naslov).trim();
  const fmtTown = (kraj) => safe(kraj).trim();

  function activeMembers() {
    return getMembers().filter((m) => !m.arhiviran);
  }

  function fillMemberSelect() {
    const members = activeMembers()
      .slice()
      .sort((a, b) => {
        const pa = (a.priimek || "").localeCompare(b.priimek || "", "sl");
        if (pa !== 0) return pa;
        return (a.ime || "").localeCompare(b.ime || "", "sl");
      });

    selectMember.innerHTML = "";
    members.forEach((m) => {
      const opt = document.createElement("option");
      opt.value = m.id;
      opt.textContent = `${m.priimek} ${m.ime} (št. ${m.clanska})`;
      selectMember.appendChild(opt);
    });

    if (!members.length) {
      const opt = document.createElement("option");
      opt.value = "";
      opt.textContent = "Ni aktivnih članov";
      selectMember.appendChild(opt);
    }
  }

  function buildJoinedOfficials() {
    const officials = getOfficials();
    const members = getMembers();

    // join officials -> member
    const joined = officials.map((o) => {
      const member = members.find((m) => m.id === o.memberId) || null;
      return { ...o, member };
    });

    // sortiranje: po pomembnosti funkcije, potem priimek/ime
    joined.sort((a, b) => {
      const rr = roleRank(a.role) - roleRank(b.role);
      if (rr !== 0) return rr;

      const ap = (a.member?.priimek || "").localeCompare(b.member?.priimek || "", "sl");
      if (ap !== 0) return ap;

      return (a.member?.ime || "").localeCompare(b.member?.ime || "", "sl");
    });

    return joined;
  }

  function renderTable() {
    const joined = buildJoinedOfficials();
    tbody.innerHTML = "";

    if (!joined.length) {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td colspan="8" style="padding:14px; text-align:center; opacity:.75;">
          Trenutno ni vnešenih funkcionarjev.
        </td>
      `;
      tbody.appendChild(tr);
      return;
    }

    joined.forEach((o, index) => {
      const m = o.member;

      const name = m ? `${safe(m.priimek)} ${safe(m.ime)}` : "(član ne obstaja)";
      const tel = m ? fmtPhone(m.telefon) : "";
      const email = m ? fmtEmail(m.email) : "";
      const naslov = m ? fmtAddress(m.naslov) : "";
      const kraj = m ? fmtTown(m.kraj) : "";

      const telHtml = tel ? `<a href="tel:${tel}">${tel}</a>` : "";
      const emailHtml = email ? `<a href="mailto:${email}">${email}</a>` : "";

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td class="col-zapst">${index + 1}</td>
        <td>${name}</td>
        <td>${safe(o.role)}</td>
        <td>${telHtml}</td>
        <td>${emailHtml}</td>
        <td>${naslov}</td>
        <td>${kraj}</td>
        <td class="table-actions">
          <span class="action-icon delete" title="Odstrani funkcionarja">🗑️</span>
        </td>
      `;

      tr.querySelector(".delete")?.addEventListener("click", () => {
        if (!confirm("Odstranim funkcionarja?")) return;

        const list = getOfficials().filter((x) => x.id !== o.id);
        saveOfficials(list);

        addHistory(
          "Funkcionarji",
          `Odstranjen funkcionar: ${name} (${safe(o.role)}).`
        );

        renderTable();
        fillMemberSelect(); // če si koga odstranil, ni nujno, ampak je OK
      });

      tbody.appendChild(tr);
    });
  }

  // ----- init -----
  fillMemberSelect();
  renderTable();

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const memberId = Number(selectMember.value);
    const role = (selectRole.value || "").trim();

    if (!memberId || !role) {
      alert("Izberi člana in funkcijo.");
      return;
    }

    const officials = getOfficials();

    // varovalka: isti član + ista funkcija naj ne bo 2x
    if (officials.some((o) => o.memberId === memberId && o.role === role)) {
      alert("Ta član že ima to funkcijo.");
      return;
    }

    officials.push({ id: Date.now(), memberId, role });
    saveOfficials(officials);

    const member = getMembers().find((m) => m.id === memberId);
    const name = member ? `${safe(member.priimek)} ${safe(member.ime)}` : "neznan član";

    addHistory("Funkcionarji", `Dodan funkcionar: ${name} (${role}).`);

    renderTable();
  });
}

document.addEventListener("DOMContentLoaded", () => {
  ensureDemoData();

  const user = requireAuth({ pageModuleKey: "funkcionarji" });
  if (!user) return;

  initHeader(user);
  renderAppNav(user, "funkcionarji");
  startReminderWatcher();

  handleFunkcionarjiPage();
});