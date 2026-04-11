document.addEventListener("DOMContentLoaded", () => {
  ensureDemoData();
  const user = requireAuth({ pageModuleKey: "opazanja-zivali" });
  if (!user) return;

  const canPrint = !!(user?.permissions?.canManageUsers || user?.username === "admin");
  if (!canPrint) {
    alert("Nimate dovoljenja za tisk opažanj.");
    window.location.href = "dashboard.html";
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const id = Number(params.get("id"));
  const observation = getAnimalObservations().find((item) => item.id === id);
  const host = document.getElementById("animal-observation-print-host");
  const btnPrint = document.getElementById("btn-print-observation");

  if (!observation || !host) {
    if (host) host.innerHTML = "<p>Opažanje ni bilo najdeno.</p>";
    return;
  }

  const formatDate = (value) => {
    if (!value) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}.${mm}.${yyyy}`;
  };

  host.innerHTML = `
    <section class="animal-print">
      <header class="animal-print__header">
        <h1>Zabeleženo opažanje ribojedih ptic</h1>
        <div class="animal-print__meta">
          <div><span>Ime in priimek</span><strong>${escapeHtml(`${observation.firstName || ""} ${observation.lastName || ""}`.trim() || "-")}</strong></div>
          <div><span>Kaj je na sliki</span><strong>${escapeHtml(observation.title || "-")}</strong></div>
          <div><span>Kraj</span><strong>${escapeHtml(observation.place || "-")}</strong></div>
          <div><span>Datum</span><strong>${escapeHtml(formatDate(observation.date || ""))}</strong></div>
          <div><span>Koordinate</span><strong>${escapeHtml(observation.latitude && observation.longitude ? `${observation.latitude}, ${observation.longitude}` : "-")}</strong></div>
        </div>
      </header>

      <section class="animal-print__description">
        <h2>Opis</h2>
        <p>${escapeHtml(observation.description || "-")}</p>
      </section>

      <section class="animal-print__images">
        ${(observation.images || [])
          .map(
            (image, index) => `
              <figure class="animal-print__figure">
                <img src="${image}" alt="Opažanje ${index + 1}" />
              </figure>
            `
          )
          .join("")}
      </section>
    </section>
  `;

  btnPrint?.addEventListener("click", () => {
    window.print();
  });
});
