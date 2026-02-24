function handleFunkcionarjiPage() {
  const selectMember = document.getElementById("official-member");
  const selectRole = document.getElementById("official-role");
  const tbody = document.getElementById("officials-tbody");
  const form = document.getElementById("official-form");
  if (!selectMember || !selectRole || !tbody || !form) return;

  function activeMembers() {
    return getMembers().filter((m) => !m.arhiviran);
  }

  function fillMemberSelect() {
    const members = activeMembers();
    selectMember.innerHTML = "";
    members.forEach((m) => {
      const opt = document.createElement("option");
      opt.value = m.id;
      opt.textContent = `${m.priimek} ${m.ime} (št. ${m.clanska})`;
      selectMember.appendChild(opt);
    });
  }

  function renderTable() {
    const officials = getOfficials();
    const members = getMembers();
    tbody.innerHTML = "";

    officials.forEach((o, index) => {
      const member = members.find((m) => m.id === o.memberId);
      const name = member ? `${member.priimek} ${member.ime}` : "(član ne obstaja)";

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${index + 1}</td>
        <td>${name}</td>
        <td>${o.role}</td>
        <td class="table-actions">
          <span class="action-icon delete" title="Odstrani funkcionarja">🗑️</span>
        </td>
      `;

      tr.querySelector(".delete").addEventListener("click", () => {
        if (!confirm("Odstranim funkcionarja?")) return;
        const list = getOfficials().filter((x) => x.id !== o.id);
        saveOfficials(list);
        addHistory("Funkcionarji", `Odstranjen funkcionar: ${name} (${o.role}).`);
        renderTable();
      });

      tbody.appendChild(tr);
    });
  }

  fillMemberSelect();
  renderTable();

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const memberId = Number(selectMember.value);
    const role = selectRole.value.trim();

    if (!memberId || !role) {
      alert("Izberi člana in funkcijo.");
      return;
    }

    const officials = getOfficials();
    if (officials.some((o) => o.memberId === memberId && o.role === role)) {
      alert("Ta član že ima to funkcijo.");
      return;
    }

    officials.push({ id: Date.now(), memberId, role });
    saveOfficials(officials);

    const member = getMembers().find((m) => m.id === memberId);
    const name = member ? `${member.priimek} ${member.ime}` : "neznan član";

    addHistory("Funkcionarji", `Dodan funkcionar: ${name} (${role}).`);
    renderTable();
  });
}

document.addEventListener("DOMContentLoaded", () => {
  ensureDemoData();
  const user = requireAuth({ pageModuleKey: "funkcionarji" });
  if (!user) return;
  initHeader(user);
  handleFunkcionarjiPage();
  startReminderWatcher();
  renderAppNav(user, "funkcionarji");
});