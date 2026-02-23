function handleKoledarPage() {
  const form = document.getElementById("event-form");
  const listContainer = document.getElementById("events-list");
  if (!form || !listContainer) return;

  function renderEvents() {
    const events = getEvents().sort((a, b) => (a.datum > b.datum ? 1 : -1));
    listContainer.innerHTML = "";
    events.forEach((ev) => {
      const div = document.createElement("div");
      div.className = "event-item";
      div.innerHTML = `<strong>${ev.datum}</strong> – ${ev.naslov}<br><small>${ev.opis}</small>`;
      listContainer.appendChild(div);
    });
  }

  renderEvents();

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const naslov = form.naslov.value.trim();
    const datum = form.datum.value;
    const opis = form.opis.value.trim();

    if (!naslov || !datum) {
      alert("Vnesi naslov in datum dogodka.");
      return;
    }

    const events = getEvents();
    events.push({ id: Date.now(), naslov, datum, opis });
    saveEvents(events);
    addHistory("Dogodek", `Dodano: ${naslov} (${datum}).`);

    form.reset();
    renderEvents();
  });
}

document.addEventListener("DOMContentLoaded", () => {
  ensureDemoData();
  const user = requireAuth({ pageModuleKey: "koledar" });
  if (!user) return;
  initHeader(user);
  handleKoledarPage();
});