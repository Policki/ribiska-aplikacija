document.addEventListener("DOMContentLoaded", () => {
  ensureDemoData();
  const user = requireAuth({ pageModuleKey: "dashboard" });
  if (!user) return;

  initHeader(user);
  renderAppNav(user, "dashboard");
  startReminderWatcher();

  const yearEl = document.getElementById("aktivno-leto");
  if (yearEl && typeof AktivnoLeto === "function") {
    yearEl.textContent = AktivnoLeto();
  }
});
