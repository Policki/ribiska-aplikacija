function getSystemQueueMembers(currentUser, query = "") {
  const visibleStatuses = getUserVisibleStatuses(currentUser);
  const q = normalizeIdentityText(query);

  let members = getMembers().filter((member) => {
    if (member.arhiviran) return false;
    if (!["AA", "AM", "AP"].includes(String(member.status || "").trim())) return false;
    if (String(member.clanska || "").trim()) return false;
    if (visibleStatuses && !visibleStatuses.includes(member.status)) return false;
    return true;
  });

  if (q) {
    members = members.filter((member) => {
      const hay = normalizeIdentityText(
        `${member.priimek || ""} ${member.ime || ""} ${member.status || ""} ${member.telefon || ""} ${member.email || ""}`
      );
      return hay.includes(q);
    });
  }

  return members.sort((a, b) => {
    const dateA = String(a.datumVpisa || "");
    const dateB = String(b.datumVpisa || "");
    if (dateA !== dateB) return dateB.localeCompare(dateA);
    return `${a.priimek || ""} ${a.ime || ""}`.localeCompare(`${b.priimek || ""} ${b.ime || ""}`, "sl");
  });
}

function saveMemberNumber(memberId, number) {
  const clanska = String(number || "").trim();
  if (!/^\d{6,7}$/.test(clanska)) {
    alert("Članska številka mora vsebovati 6-7 številk.");
    return false;
  }

  const members = getMembers();
  const duplicate = members.some((member) => member.id !== memberId && String(member.clanska || "").trim() === clanska);
  if (duplicate) {
    alert("Ta članska številka je že uporabljena pri drugem članu.");
    return false;
  }

  const index = members.findIndex((member) => member.id === memberId);
  if (index === -1) return false;

  members[index].clanska = clanska;
  saveMembers(members);
  addHistory("Prijava v sistem", `Članu ${members[index].priimek || ""} ${members[index].ime || ""} je vpisana članska številka ${clanska}.`);
  return true;
}

function renderSystemQueue(currentUser) {
  const tbody = document.getElementById("system-queue-body");
  const mobileHost = document.getElementById("system-queue-mobile");
  const tableWrap = document.getElementById("system-queue-table-wrap");
  const emptyState = document.getElementById("system-queue-empty");
  const countEl = document.getElementById("system-queue-count");
  const searchEl = document.getElementById("system-queue-search");
  if (!tbody || !tableWrap || !emptyState || !countEl) return;

  const members = getSystemQueueMembers(currentUser, searchEl?.value || "");
  countEl.textContent = String(members.length);
  tbody.innerHTML = "";
  if (mobileHost) mobileHost.innerHTML = "";

  if (!members.length) {
    tableWrap.hidden = true;
    emptyState.hidden = false;
    return;
  }

  tableWrap.hidden = false;
  emptyState.hidden = true;

  members.forEach((member, index) => {
    const fullName = `${member.priimek || ""} ${member.ime || ""}`.trim();
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${index + 1}</td>
      <td><strong>${escapeHtml(fullName)}</strong></td>
      <td><span class="badge neutral">${escapeHtml(member.status || "-")}</span></td>
      <td>${escapeHtml(formatDateSI(member.datumVpisa))}</td>
      <td>${escapeHtml(member.telefon || "-")}</td>
      <td>
        <input class="system-queue-number" data-id="${member.id}" type="text" inputmode="numeric" maxlength="7" placeholder="npr. 123456" />
      </td>
      <td class="table-actions">
        <button type="button" class="member-tool-btn member-tool-btn--edit system-queue-save" data-id="${member.id}">Shrani</button>
        <button type="button" class="member-tool-btn member-tool-btn--view system-queue-open" data-id="${member.id}">Pogled</button>
      </td>
    `;
    tbody.appendChild(row);

    if (mobileHost) {
      const card = document.createElement("article");
      card.className = "member-mobile-card";
      card.innerHTML = `
        <div class="member-mobile-card__head">
          <div>
            <div class="member-mobile-card__name">${escapeHtml(fullName)}</div>
            <div class="member-mobile-card__meta">
              <span class="badge neutral">${escapeHtml(member.status || "-")}</span>
              <span class="badge neutral">${escapeHtml(formatDateSI(member.datumVpisa) || "Brez datuma")}</span>
            </div>
          </div>
        </div>
        <div class="member-mobile-card__body">
          <div class="member-mobile-card__row">
            <span>Telefon</span>
            <strong>${escapeHtml(member.telefon || "-")}</strong>
          </div>
          <div class="member-mobile-card__row">
            <span>Članska</span>
            <input class="system-queue-number" data-id="${member.id}" type="text" inputmode="numeric" maxlength="7" placeholder="npr. 123456" />
          </div>
        </div>
        <div class="member-mobile-card__actions">
          <button type="button" class="btn btn-primary system-queue-save" data-id="${member.id}">Shrani številko</button>
          <button type="button" class="btn btn-secondary system-queue-open" data-id="${member.id}">Podroben pogled</button>
        </div>
      `;
      mobileHost.appendChild(card);
    }
  });

  bindSystemQueueActions(currentUser);
}

function bindSystemQueueActions(currentUser) {
  document.querySelectorAll(".system-queue-save").forEach((button) => {
    button.addEventListener("click", () => {
      const id = Number(button.dataset.id);
      const input = button.closest("tr, .member-mobile-card")?.querySelector(".system-queue-number");
      if (!id || !input) return;
      if (saveMemberNumber(id, input.value)) renderSystemQueue(currentUser);
    });
  });

  document.querySelectorAll(".system-queue-open").forEach((button) => {
    button.addEventListener("click", () => {
      const id = Number(button.dataset.id);
      if (id) window.location.href = `urejanje-clana.html?id=${id}&mode=view`;
    });
  });
}

function formatDateSI(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("sl-SI");
}

document.addEventListener("DOMContentLoaded", () => {
  ensureDemoData();
  const user = requireAuth({ pageModuleKey: "seznam" });
  if (!user) return;

  initHeader(user);
  renderAppNav(user, "seznam");
  renderSystemQueue(user);
  startReminderWatcher();

  document.getElementById("system-queue-search")?.addEventListener("input", () => renderSystemQueue(user));

  const yearEl = document.getElementById("aktivno-leto");
  if (yearEl && typeof AktivnoLeto === "function") yearEl.textContent = AktivnoLeto();
});
