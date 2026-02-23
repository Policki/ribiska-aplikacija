function handleClanarinaPage() {
  const year = currentYear();
  const tbody = document.getElementById("fees-tbody");
  if (!tbody) return;

  const feesMap = getFeesYear(year);

  function render() {
    const members = getMembers().filter((m) => !m.arhiviran);
    tbody.innerHTML = "";

    members.forEach((m) => {
      const amount = feeForStatus(m.status);
      const color = feesMap[m.id] || "";
      const tr = document.createElement("tr");

      tr.innerHTML = `
        <td>${m.priimek}</td>
        <td>${m.ime}</td>
        <td>${m.naslov || "-"}</td>
        <td>${m.kraj || "-"}</td>
        <td>
          <div class="fee-box ${color}" data-member-id="${m.id}">
            ${amount} €
          </div>
          <div class="fee-picker" data-member-id="${m.id}" style="display:none;">
            <button type="button" class="fee-pick red" title="Neplačano"></button>
            <button type="button" class="fee-pick green" title="Plačano"></button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });

    tbody.querySelectorAll(".fee-box").forEach((box) => {
      box.addEventListener("click", () => {
        const id = box.dataset.memberId;
        const picker = tbody.querySelector(`.fee-picker[data-member-id="${id}"]`);
        picker.style.display = picker.style.display === "none" ? "flex" : "none";
      });
    });

    tbody.querySelectorAll(".fee-picker .fee-pick").forEach((btn) => {
      btn.addEventListener("click", () => {
        const picker = btn.closest(".fee-picker");
        const id = Number(picker.dataset.memberId);
        const color = btn.classList.contains("green") ? "green" : "red";
        feesMap[id] = color;
        setFeesYear(year, feesMap);
        render();
      });
    });
  }

  render();
}

document.addEventListener("DOMContentLoaded", () => {
  ensureDemoData();
  const user = requireAuth({ pageModuleKey: "clanarina" });
  if (!user) return;
  initHeader(user);
  handleClanarinaPage();
});