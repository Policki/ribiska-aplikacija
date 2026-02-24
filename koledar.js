function handleKoledarPage() {
  const gridEl = document.getElementById("calendar-grid");
  const weekEl = document.getElementById("calendar-week");
  const titleEl = document.getElementById("cal-title");
  const btnPrev = document.getElementById("cal-prev");
  const btnNext = document.getElementById("cal-next");
  const btnToday = document.getElementById("cal-today");
  const btnMonth = document.getElementById("cal-month");
  const btnWeek = document.getElementById("cal-week");

  const form = document.getElementById("cal-form");
  const listEl = document.getElementById("cal-list");

  if (!gridEl || !titleEl || !form) return;

  const state = {
    view: "month", // month | week
    cursor: new Date(), // prikazani mesec
  };

  const DOW = ["NED", "PON", "TOR", "SRE", "ČET", "PET", "SOB"];

  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  function toISODate(d) {
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  }

  function monthTitle(d) {
    return d.toLocaleDateString("sl-SI", { month: "long", year: "numeric" });
  }

  function eventsForDate(dateISO) {
    const events = getEvents() || [];
    return events.filter((e) => e.datum === dateISO);
  }

  function remindersForDate(dateISO) {
    const rems = getReminders() || [];
    return rems
      .filter((r) => !r.done)
      .filter((r) => {
        const dt = new Date(r.datetime);
        if (Number.isNaN(dt.getTime())) return false;
        return toISODate(dt) === dateISO;
      })
      .sort((a, b) => new Date(a.datetime) - new Date(b.datetime));
  }

  function renderMonth() {
    weekEl.style.display = "none";
    gridEl.style.display = "grid";
    btnMonth.classList.add("active");
    btnWeek.classList.remove("active");

    const cursor = new Date(state.cursor.getFullYear(), state.cursor.getMonth(), 1);
    titleEl.textContent = monthTitle(cursor);

    gridEl.innerHTML = "";

    // Header DOW
    DOW.forEach((d) => {
      const h = document.createElement("div");
      h.className = "cal-dow";
      h.textContent = d;
      gridEl.appendChild(h);
    });

    const firstDow = cursor.getDay(); // 0=ned
    const start = new Date(cursor);
    start.setDate(1 - firstDow); // začnemo v nedeljo

    const todayISO = toISODate(new Date());

    // 6 tednov * 7 dni = 42 celic
    for (let i = 0; i < 42; i++) {
      const day = new Date(start);
      day.setDate(start.getDate() + i);

      const iso = toISODate(day);
      const cell = document.createElement("div");
      cell.className = "cal-cell";

      if (day.getMonth() !== cursor.getMonth()) cell.classList.add("outside");
      if (iso === todayISO) cell.classList.add("today");

      cell.innerHTML = `<div class="cal-daynum">${day.getDate()}</div>`;

      // dogodki
      const evs = eventsForDate(iso);
      evs.forEach((e) => {
        const chip = document.createElement("span");
        chip.className = "cal-chip";
        chip.style.background = e.color || "#3498db";
        chip.title = "Klikni za brisanje";
        chip.textContent = e.naslov || "Dogodek";

        chip.addEventListener("click", () => {
          if (!confirm("Izbrišem dogodek?")) return;
          const all = getEvents();
          const next = all.filter((x) => x.id !== e.id);
          saveEvents(next);
          addHistory("Koledar", `Izbrisan dogodek: ${e.naslov} (${e.datum})`);
          renderAll();
        });

        cell.appendChild(chip);
      });

      // opomniki
      const rems = remindersForDate(iso);
      rems.forEach((r) => {
        const dt = new Date(r.datetime);
        const t = `${pad2(dt.getHours())}:${pad2(dt.getMinutes())}`;

        const chip = document.createElement("span");
        chip.className = "cal-chip rem";
        chip.style.background = r.color || "#2ecc71";
        chip.title = "Klikni za brisanje";
        chip.textContent = `${t} ${r.title || "Opomnik"}`;

        chip.addEventListener("click", () => {
          if (!confirm("Izbrišem opomnik?")) return;
          const all = getReminders();
          const next = all.filter((x) => x.id !== r.id);
          saveReminders(next);
          addHistory("Opomnik", `Izbrisan opomnik: ${r.title} (${r.datetime})`);
          renderAll();
        });

        cell.appendChild(chip);
      });

      // klik na celico -> predizpolni datum v formi
      cell.addEventListener("click", (ev) => {
        // da klik na chip ne sproži predizpolnjevanja
        if (ev.target.classList.contains("cal-chip")) return;
        form.date.value = iso;
      });

      gridEl.appendChild(cell);
    }
  }

  function weekStart(d) {
    // nedelja kot začetek tedna
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    x.setDate(x.getDate() - x.getDay());
    return x;
  }

  function renderWeek() {
    gridEl.style.display = "none";
    weekEl.style.display = "block";
    btnWeek.classList.add("active");
    btnMonth.classList.remove("active");

    const start = weekStart(state.cursor);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);

    titleEl.textContent =
      `${start.toLocaleDateString("sl-SI")} – ${end.toLocaleDateString("sl-SI")}`;

    weekEl.innerHTML = "";

    for (let i = 0; i < 7; i++) {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      const iso = toISODate(day);

      const row = document.createElement("div");
      row.className = "week-row";

      const left = document.createElement("div");
      left.className = "week-day";
      left.textContent = `${DOW[day.getDay()]} ${day.getDate()}.${day.getMonth() + 1}.`;

      const right = document.createElement("div");
      right.className = "week-events";

      const evs = eventsForDate(iso);
      const rems = remindersForDate(iso);

      if (evs.length === 0 && rems.length === 0) {
        right.innerHTML = `<div style="opacity:.65; font-size:13px;">Ni dogodkov.</div>`;
      } else {
        evs.forEach((e) => {
          const chip = document.createElement("span");
          chip.className = "cal-chip";
          chip.style.background = e.color || "#3498db";
          chip.textContent = e.naslov || "Dogodek";
          chip.title = "Klikni za brisanje";
          chip.addEventListener("click", () => {
            if (!confirm("Izbrišem dogodek?")) return;
            saveEvents(getEvents().filter((x) => x.id !== e.id));
            addHistory("Koledar", `Izbrisan dogodek: ${e.naslov} (${e.datum})`);
            renderAll();
          });
          right.appendChild(chip);
        });

        rems.forEach((r) => {
          const dt = new Date(r.datetime);
          const t = `${pad2(dt.getHours())}:${pad2(dt.getMinutes())}`;

          const chip = document.createElement("span");
          chip.className = "cal-chip rem";
          chip.style.background = r.color || "#2ecc71";
          chip.textContent = `${t} ${r.title || "Opomnik"}`;
          chip.title = "Klikni za brisanje";
          chip.addEventListener("click", () => {
            if (!confirm("Izbrišem opomnik?")) return;
            saveReminders(getReminders().filter((x) => x.id !== r.id));
            addHistory("Opomnik", `Izbrisan opomnik: ${r.title} (${r.datetime})`);
            renderAll();
          });
          right.appendChild(chip);
        });
      }

      row.appendChild(left);
      row.appendChild(right);
      weekEl.appendChild(row);
    }
  }

  function renderListThisMonth() {
    const cursor = new Date(state.cursor.getFullYear(), state.cursor.getMonth(), 1);
    const month = cursor.getMonth();
    const year = cursor.getFullYear();

    const events = getEvents()
      .filter((e) => {
        const d = new Date(e.datum);
        return d.getFullYear() === year && d.getMonth() === month;
      })
      .sort((a, b) => (a.datum > b.datum ? 1 : -1))
      .map((e) => ({
        kind: "Dogodek",
        date: e.datum,
        title: e.naslov,
        color: e.color || "#3498db",
      }));

    const rems = getReminders()
      .filter((r) => !r.done)
      .filter((r) => {
        const d = new Date(r.datetime);
        return !Number.isNaN(d.getTime()) && d.getFullYear() === year && d.getMonth() === month;
      })
      .sort((a, b) => new Date(a.datetime) - new Date(b.datetime))
      .map((r) => ({
        kind: "Opomnik",
        date: new Date(r.datetime).toISOString(),
        title: r.title,
        color: r.color || "#2ecc71",
        datetime: r.datetime,
      }));

    const all = [...events, ...rems].sort((a, b) => {
      const da = a.datetime ? new Date(a.datetime) : new Date(a.date);
      const db = b.datetime ? new Date(b.datetime) : new Date(b.date);
      return da - db;
    });

    listEl.innerHTML = "";

    if (all.length === 0) {
      listEl.innerHTML = `<div style="opacity:.7;">Ni vnosov v tem mesecu.</div>`;
      return;
    }

    all.forEach((x) => {
      const item = document.createElement("div");
      item.className = "cal-list-item";

      const tag = document.createElement("span");
      tag.className = "tag";
      tag.style.background = x.color;
      tag.textContent = x.kind.toUpperCase();

      const when =
        x.kind === "Opomnik"
          ? new Date(x.datetime).toLocaleString("sl-SI", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
          : new Date(x.date).toLocaleDateString("sl-SI");

      item.innerHTML = `<div style="font-weight:800; margin-bottom:4px;"></div>
                        <div style="font-size:12px; opacity:.8;">${when}</div>`;
      item.firstChild.appendChild(tag);
      item.firstChild.appendChild(document.createTextNode(" " + (x.title || "-")));

      listEl.appendChild(item);
    });
  }

  function renderAll() {
    if (state.view === "month") renderMonth();
    else renderWeek();
    renderListThisMonth();
  }

  // Toolbar
  btnPrev.addEventListener("click", () => {
    if (state.view === "month") {
      state.cursor = new Date(state.cursor.getFullYear(), state.cursor.getMonth() - 1, 1);
    } else {
      state.cursor = new Date(state.cursor);
      state.cursor.setDate(state.cursor.getDate() - 7);
    }
    renderAll();
  });

  btnNext.addEventListener("click", () => {
    if (state.view === "month") {
      state.cursor = new Date(state.cursor.getFullYear(), state.cursor.getMonth() + 1, 1);
    } else {
      state.cursor = new Date(state.cursor);
      state.cursor.setDate(state.cursor.getDate() + 7);
    }
    renderAll();
  });

  btnToday.addEventListener("click", () => {
    state.cursor = new Date();
    renderAll();
  });

  btnMonth.addEventListener("click", () => {
    state.view = "month";
    renderAll();
  });

  btnWeek.addEventListener("click", () => {
    state.view = "week";
    renderAll();
  });

  // Form submit (dogodek ali opomnik)
  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const type = form.type.value;
    const name = form.name.value.trim();
    const date = form.date.value;
    const time = (form.time.value || "").trim();
    const color = form.color.value || "#2ecc71";
    const note = form.note.value.trim();

    if (!name || !date) {
      alert("Vpiši naziv in datum.");
      return;
    }

    if (type === "event") {
      const events = getEvents();
      events.push({
        id: Date.now(),
        naslov: name,
        datum: date,
        opis: note,
        color,
      });
      saveEvents(events);
      addHistory("Koledar", `Dodano: ${name} (${date}).`);
      form.reset();
      form.color.value = "#2ecc71";
      renderAll();
      return;
    }

    // reminder
    if (!time) {
      alert("Za opomnik izberi tudi čas.");
      return;
    }

    const dt = new Date(`${date}T${time}:00`);
    if (Number.isNaN(dt.getTime())) {
      alert("Neveljaven datum/čas.");
      return;
    }

    const rems = getReminders();
    rems.push({
      id: Date.now(),
      title: name,
      datetime: dt.toISOString(),
      note,
      color,
      done: false,
      notifiedAt: 0,
    });
    saveReminders(rems);
    addHistory("Opomnik", `Dodano: ${name} (${dt.toLocaleString("sl-SI")}).`);

    form.reset();
    form.color.value = "#2ecc71";
    renderAll();
  });

  // začetni datum v formi: danes
  form.date.value = toISODate(new Date());

  renderAll();
}

document.addEventListener("DOMContentLoaded", () => {
  ensureDemoData();
  startReminderWatcher();

  const user = requireAuth({ pageModuleKey: "koledar" });
  if (!user) return;

  initHeader(user);
  handleKoledarPage();
  renderAppNav(user, "koledar");
});

document.addEventListener("DOMContentLoaded", () => {
  const _aktivnoLetoEl = document.getElementById('aktivno-leto');
  if (_aktivnoLetoEl) {
    if (typeof AktivnoLeto === 'function') {  
      try {        _aktivnoLetoEl.textContent = AktivnoLeto();
      } catch (err) {        _aktivnoLetoEl.textContent = '';
      }    } else {      _aktivnoLetoEl.textContent = '';
    }
  }
});

