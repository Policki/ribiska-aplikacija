function handleDashboardPage(currentUser) {
  const cards = document.querySelectorAll(".dashboard-card");
  const statCards = document.querySelectorAll("[data-dashboard-stat]");

  cards.forEach((card) => {
    const moduleKey = card.dataset.module;
    if (moduleKey && !userHasModule(currentUser, moduleKey)) {
      card.classList.add("is-hidden");
      card.setAttribute("aria-hidden", "true");
      return;
    }

    card.classList.remove("is-hidden");
    card.removeAttribute("aria-hidden");
  });

  statCards.forEach((card) => {
    const statKey = card.dataset.dashboardStat;
    if (statKey && !userCanSeeDashboardStat(currentUser, statKey)) {
      card.classList.add("is-hidden");
      card.setAttribute("aria-hidden", "true");
      return;
    }
    card.classList.remove("is-hidden");
    card.removeAttribute("aria-hidden");
  });
}

function userCanSeeDashboardStat(user, statKey) {
  if (!user || user.modules?.includes("*")) return true;
  const permissions = user.permissions || {};
  const permissionMap = {
    activeMembers: "canSeeDashboardActiveMembers",
    phoneQueue: "canSeeDashboardPhoneQueue",
    cardQueue: "canSeeDashboardCardQueue",
    membershipApplications: "canSeeDashboardApplications",
  };
  const permissionKey = permissionMap[statKey];
  if (!permissionKey) return true;
  return permissions[permissionKey] !== false;
}

function renderDashboardStats(currentUser) {
  const members = getMembers();
  const pendingApplications = getMembershipApplications().filter(
    (application) => application.adminConfirmedAt == null
  ).length;
  const visibleStatuses = getUserVisibleStatuses(currentUser);
  const visibleMembers = visibleStatuses
    ? members.filter((m) => visibleStatuses.includes(m.status))
    : members;

  const aktivni = members.filter((m) => !m.arhiviran).length;
  const cakajociTelefoni = visibleMembers.filter(
    (m) => !m.arhiviran && String(m.telefon || "").trim() && m.telefonVpisan !== true
  ).length;
  const cakajociNaPrijavo = visibleMembers.filter(
    (m) =>
      !m.arhiviran &&
      ["AA", "AM", "AP"].includes(String(m.status || "").trim()) &&
      !String(m.clanska || "").trim()
  ).length;

  const setText = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = String(value);
  };

  setText("stat-aktivni", aktivni);
  setText("stat-telefoni", cakajociTelefoni);
  setText("stat-pristopne-vloge", pendingApplications);
  setText("stat-izkaznice", cakajociNaPrijavo);
}

function startDashboardClock() {
  const el = document.querySelector(".dashboard-eyebrow");
  if (!el) return;

  const render = () => {
    const now = new Date();
    el.textContent = now.toLocaleString("sl-SI", {
      weekday: "long",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  render();
  setInterval(render, 1000);
}

document.addEventListener("DOMContentLoaded", () => {
  ensureDemoData();
  const user = requireAuth({ pageModuleKey: "dashboard" });
  if (!user) return;

  initHeader(user);
  handleDashboardPage(user);
  startDashboardClock();
  renderDashboardStats(user);
  const _aktivnoLetoEl = document.getElementById('aktivno-leto');
  if (_aktivnoLetoEl) {
    if (typeof AktivnoLeto === 'function') {
      try {
        _aktivnoLetoEl.textContent = AktivnoLeto();
      } catch (err) {
        _aktivnoLetoEl.textContent = '';
      }
    } else {
      _aktivnoLetoEl.textContent = '';
    }
  }
  startReminderWatcher();
});
