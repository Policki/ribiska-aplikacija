function handlePriznanjaPage() {
  const selectMember = document.getElementById("award-member");
  const inputName = document.getElementById("award-name");
  const inputYear = document.getElementById("award-year");
  const tbody = document.getElementById("awards-tbody");
  const form = document.getElementById("award-form");
  if (!selectMember || !tbody || !form) return;

  function activeMembers() {
    return getMembers().filter((m) => !m.arhiviran);
  }

  function fillMemberSelect(selectedId) {
    const members = activeMembers();
    selectMember.innerHTML = "";
    members.forEach((m) => {
      const opt = document.createElement("option");
      opt.value = m.id;
      opt.textContent = `${m.priimek} ${m.ime} (št. ${m.clanska})`;
      if (selectedId && selectedId === m.id) opt.selected = true;
      selectMember.appendChild(opt);
    });
  }

  function renderTable() {
    const members = activeMembers();
    tbody.innerHTML = "";
    members.forEach((m) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${m.priimek}</td>
        <td>${m.ime}</td>
        <td>${m.lastAwardName || "-"}</td>
        <td>${m.lastAwardYear || "-"}</td>
        <td class="table-actions">
          <span class="action-icon edit" title="Uredi priznanje">✏️</span>
        </td>
      `;

      tr.querySelector(".edit").addEventListener("click", () => {
        fillMemberSelect(m.id);
        inputName.value = m.lastAwardName || "";
        inputYear.value = m.lastAwardYear || "";
      });

      tbody.appendChild(tr);
    });
  }

  fillMemberSelect();
  renderTable();

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const memberId = Number(selectMember.value);
    const name = inputName.value.trim();
    const year = inputYear.value.trim();

    if (!memberId || !name || !year) {
      alert("Izberi člana in vpiši naziv priznanja ter leto.");
      return;
    }

    const members = getMembers();
    const idx = members.findIndex((m) => m.id === memberId);
    if (idx === -1) return;

    members[idx].lastAwardName = name;
    members[idx].lastAwardYear = year;
    saveMembers(members);

    addHistory("Priznanje", `Članu ${members[idx].ime} ${members[idx].priimek} dodeljeno priznanje "${name}" (${year}).`);

    form.reset();
    fillMemberSelect();
    renderTable();
  });
}

document.addEventListener("DOMContentLoaded", () => {
  ensureDemoData();
  const user = requireAuth({ pageModuleKey: "priznanja" });
  if (!user) return;
  initHeader(user);
  handlePriznanjaPage();
});