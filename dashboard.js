function handleDashboardPage(currentUser) {
  const cards = document.querySelectorAll(".dashboard-card");
  cards.forEach((card) => {
    const moduleKey = card.dataset.module;
    if (moduleKey && !userHasModule(currentUser, moduleKey)) {
      card.style.display = "none";
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  ensureDemoData();
  const user = requireAuth({ pageModuleKey: "dashboard" });
  if (!user) return;

  initHeader(user);
  handleDashboardPage(user);
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
});