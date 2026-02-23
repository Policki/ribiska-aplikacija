function handleArhivPage() {
  renderMembersTable({ onlyArchived: true });
}

document.addEventListener("DOMContentLoaded", () => {
  ensureDemoData();
  const user = requireAuth({ pageModuleKey: "arhiv" });
  if (!user) return;
  initHeader(user);
  handleArhivPage();
});