function getPendingPhoneMembers(currentUser) {
  let members = getMembers().filter(
    (member) =>
      !member.arhiviran &&
      String(member.telefon || "").trim() &&
      member.telefonVpisan !== true
  );

  const visibleStatuses = getUserVisibleStatuses(currentUser);
  if (visibleStatuses) {
    members = members.filter((member) => visibleStatuses.includes(member.status));
  }

  return members.sort((a, b) => {
    const dateA = String(a.datumVpisa || "");
    const dateB = String(b.datumVpisa || "");
    if (dateA !== dateB) return dateB.localeCompare(dateA);
    return `${a.priimek || ""} ${a.ime || ""}`.localeCompare(`${b.priimek || ""} ${b.ime || ""}`, "sl");
  });
}

function markPhoneAsWritten(memberId) {
  const members = getMembers();
  const index = members.findIndex((member) => member.id === memberId);
  if (index === -1) return false;

  members[index].telefonVpisan = true;
  saveMembers(members);
  addHistory(
    "Telefon člana",
    `Telefonska številka je vpisana v telefon: ${members[index].priimek} ${members[index].ime}.`
  );
  return true;
}

function renderPhoneTasks(currentUser) {
  const tbody = document.getElementById("phone-members-body");
  const mobileHost = document.getElementById("phone-mobile-cards");
  const emptyState = document.getElementById("phone-empty-state");
  const tableWrap = document.getElementById("phone-table-wrap");
  const countEl = document.getElementById("phone-pending-count");
  if (!tbody || !emptyState || !tableWrap || !countEl) return;

  const members = getPendingPhoneMembers(currentUser);
  countEl.textContent = String(members.length);
  if (mobileHost) mobileHost.innerHTML = "";

  if (!members.length) {
    tbody.innerHTML = "";
    tableWrap.hidden = true;
    emptyState.hidden = false;
    return;
  }

  tableWrap.hidden = false;
  emptyState.hidden = true;

  tbody.innerHTML = members
    .map((member) => {
      const fullName = `${member.priimek || ""} ${member.ime || ""}`.trim();
      if (mobileHost) {
        const card = document.createElement("article");
        card.className = "member-mobile-card";
        card.innerHTML = `
          <div class="member-mobile-card__head">
            <div>
              <div class="member-mobile-card__name">${escapeHtml(fullName)}</div>
              <div class="member-mobile-card__meta">
                <span class="badge neutral">${escapeHtml(member.status || "-")}</span>
              </div>
            </div>
          </div>
          <div class="member-mobile-card__body">
            <div class="member-mobile-card__row">
              <span>Telefon</span>
              <strong>${escapeHtml(member.telefon || "")}</strong>
            </div>
          </div>
          <div class="member-mobile-card__actions">
            <label class="chip-btn" style="display:flex; align-items:center; justify-content:center; gap:10px;">
              <input type="checkbox" class="phone-task-toggle" data-id="${member.id}" />
              Označi kot vpisano
            </label>
          </div>
        `;
        mobileHost.appendChild(card);
      }
      return `
        <tr>
          <td>${escapeHtml(fullName)}</td>
          <td>${escapeHtml(member.status || "")}</td>
          <td>${escapeHtml(member.telefon || "")}</td>
          <td class="phone-task-cell">
            <input
              type="checkbox"
              class="phone-task-toggle"
              data-id="${member.id}"
              aria-label="Označi kot vpisano za ${escapeHtml(fullName)}"
            />
          </td>
        </tr>
      `;
    })
    .join("");

  const allToggles = [
    ...tbody.querySelectorAll(".phone-task-toggle"),
    ...(mobileHost ? Array.from(mobileHost.querySelectorAll(".phone-task-toggle")) : []),
  ];

  allToggles.forEach((checkbox) => {
    checkbox.addEventListener("change", (event) => {
      const id = Number(event.currentTarget.dataset.id);
      if (!id) return;

      const saved = markPhoneAsWritten(id);
      if (saved) {
        renderPhoneTasks(currentUser);
      }
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  ensureDemoData();
  const user = requireAuth();
  if (!user) return;

  initHeader(user);
  renderAppNav(user);
  renderPhoneTasks(user);
  startReminderWatcher();

  const yearEl = document.getElementById("aktivno-leto");
  if (yearEl && typeof AktivnoLeto === "function") {
    yearEl.textContent = AktivnoLeto();
  }
});
