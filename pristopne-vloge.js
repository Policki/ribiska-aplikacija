function matchesApplicationSearch(application, query) {
  if (!query) return true;
  const haystack = [
    application.priimek,
    application.ime,
    application.telefon,
    application.email,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(query);
}

document.addEventListener("DOMContentLoaded", () => {
  ensureDemoData();
  const user = requireAuth({ pageModuleKey: "dashboard" });
  if (!user) return;

  initHeader(user);
  renderAppNav(user, "dashboard");
  startReminderWatcher();

  const yearEl = document.getElementById("aktivno-leto");
  if (yearEl) yearEl.textContent = AktivnoLeto();

  const host = document.getElementById("applications-list");
  const search = document.getElementById("application-search");
  if (!host || !search) return;

  const render = () => {
    const query = search.value.trim().toLowerCase();
    const applications = getMembershipApplications()
      .filter((application) => matchesApplicationSearch(application, query))
      .sort((a, b) => String(b.submittedAt || "").localeCompare(String(a.submittedAt || "")));

    host.innerHTML = "";

    if (!applications.length) {
      host.innerHTML = `<article class="member-mobile-card"><div class="member-mobile-card__name">Trenutno ni oddanih pristopnih izjav.</div></article>`;
      return;
    }

    applications.forEach((application) => {
      const card = document.createElement("article");
      card.className = "member-mobile-card";
      card.innerHTML = `
        <div class="member-mobile-card__head">
          <div>
            <div class="member-mobile-card__name">${escapeHtml(application.priimek || "")} ${escapeHtml(application.ime || "")}</div>
            <div class="member-mobile-card__meta">
              <span class="badge ${application.adminConfirmedAt ? "ok" : "warn"}">${application.adminConfirmedAt ? "Potrjeno" : "Čaka na potrditev"}</span>
              <span class="badge neutral">${escapeHtml((application.submittedAt || "").slice(0, 10))}</span>
            </div>
          </div>
        </div>
        <div class="member-mobile-card__body">
          <div class="member-mobile-card__row"><span>Telefon</span><strong>${escapeHtml(application.telefon || "-")}</strong></div>
          <div class="member-mobile-card__row"><span>E-mail</span><strong>${escapeHtml(application.email || "-")}</strong></div>
          <div class="member-mobile-card__row"><span>Naslov</span><strong>${escapeHtml([application.naslov, application.posta, application.kraj].filter(Boolean).join(", ") || "-")}</strong></div>
        </div>
        <div class="member-mobile-card__actions">
          <button type="button" class="btn btn-secondary btn-print">Pripravi za tisk</button>
          <button type="button" class="btn btn-primary btn-confirm">${application.adminConfirmedAt ? "Ponovno potrdi" : "Potrdi admin"}</button>
        </div>
      `;

      card.querySelector(".btn-print")?.addEventListener("click", () => {
        window.open(`pristopna-izjava-tisk.html?id=${application.id}`, "_blank");
      });

      card.querySelector(".btn-confirm")?.addEventListener("click", () => {
        const applicationsAll = getMembershipApplications();
        const idx = applicationsAll.findIndex((item) => item.id === application.id);
        if (idx === -1) return;
        applicationsAll[idx].adminConfirmedAt = new Date().toISOString();
        applicationsAll[idx].adminConfirmedBy = user.username;
        saveMembershipApplications(applicationsAll);
        addHistory(
          "Pristopna izjava",
          `Admin ${user.username} je potrdil pristopno izjavo za ${applicationsAll[idx].ime} ${applicationsAll[idx].priimek}.`
        );
        window.open(`pristopna-izjava-tisk.html?id=${application.id}`, "_blank");
        render();
      });

      host.appendChild(card);
    });
  };

  search.addEventListener("input", render);
  render();
});
