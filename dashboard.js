function handleDashboardPage(currentUser) {
  const cards = document.querySelectorAll(".dashboard-card");

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
}

function renderDashboardStats(currentUser) {
  const members = getMembers();
  const reminders = getReminders().filter((item) => !item.done);
  const visibleStatuses = getUserVisibleStatuses(currentUser);
  const visibleMembers = visibleStatuses
    ? members.filter((m) => visibleStatuses.includes(m.status))
    : members;

  const aktivni = members.filter((m) => !m.arhiviran).length;
  const cakajociTelefoni = visibleMembers.filter(
    (m) => !m.arhiviran && String(m.telefon || "").trim() && m.telefonVpisan !== true
  ).length;
  const cakajoceIzkaznice = members.filter(
    (m) => m.potrebujeIzkaznico === true && m.izkaznicaUrejena !== true
  ).length;

  const setText = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = String(value);
  };

  setText("stat-aktivni", aktivni);
  setText("stat-telefoni", cakajociTelefoni);
  setText("stat-izkaznice", cakajoceIzkaznice);
  setText("stat-opomniki", reminders.length);
}

document.addEventListener("DOMContentLoaded", () => {
  ensureDemoData();
  const user = requireAuth({ pageModuleKey: "dashboard" });
  if (!user) return;

  initHeader(user);
  handleDashboardPage(user);
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
