function handleDelovneUrePage() {
  const year = currentYear();
  const tbody = document.getElementById("workhours-tbody");
  const donut = document.getElementById("workhours-donut");
  const donutText = document.getElementById("workhours-donut-text");

  if (!tbody) return;

  const hoursMap = getWorkHoursYear(year);

  function render() {
    const members = getMembers().filter((m) => !m.arhiviran);
    tbody.innerHTML = "";

    const must = [];
    const done = [];

    members.forEach((m) => {
      const age = getAge(m.datumRojstva);
      const mustDo = age !== null ? age < 70 : true;
      const hours = Number(hoursMap[m.id] ?? 0);
      const ok = mustDo ? hours >= 10 : true;

      if (mustDo) {
        must.push(m);
        if (hours >= 10) done.push(m);
      }

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${m.priimek}</td>
        <td>${m.ime}</td>
        <td>${age === null ? "-" : age}</td>
        <td>${mustDo ? "DA" : "NE"}</td>
        <td>
          <input type="number" min="0" step="1" value="${hours}" data-member-id="${m.id}" style="width:80px; padding:6px;">
        </td>
        <td>${ok ? "✅" : "❌"}</td>
      `;
      tbody.appendChild(tr);
    });

    const total = must.length;
    const completed = done.length;
    const pct = total === 0 ? 100 : Math.round((completed / total) * 100);

    if (donut && donutText) {
      donut.style.background = `conic-gradient(#2ecc71 ${pct}%, #e0e0e0 0)`;
      donutText.textContent = `${pct}%`;

      const stats = document.getElementById("workhours-stats");
      if (stats) {
        stats.textContent = `Opravljeno: ${completed}/${total} (člani, ki morajo opraviti ure)`;
      }
    }

    tbody.querySelectorAll('input[type="number"][data-member-id]').forEach((inp) => {
      inp.addEventListener("change", () => {
        const id = Number(inp.dataset.memberId);
        const val = Math.max(0, Number(inp.value || 0));
        hoursMap[id] = val;
        setWorkHoursYear(year, hoursMap);
      });
    });
  }

  render();
}

document.addEventListener("DOMContentLoaded", () => {
  ensureDemoData();
  const user = requireAuth({ pageModuleKey: "delovne-ure" });
  if (!user) return;
  initHeader(user);
  handleDelovneUrePage();
  startReminderWatcher();
  renderAppNav(user, "delovne-ure");
});