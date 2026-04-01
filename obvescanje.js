document.addEventListener("DOMContentLoaded", () => {
  ensureDemoData();
  const user = requireAuth({ pageModuleKey: "obvescanje" });
  if (!user) return;

  initHeader(user);
  renderAppNav(user, "obvescanje");
  startReminderWatcher();

  const yearEl = document.getElementById("aktivno-leto");
  if (yearEl && typeof AktivnoLeto === "function") {
    yearEl.textContent = AktivnoLeto();
  }
});
