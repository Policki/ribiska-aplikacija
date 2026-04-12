function handleKoledarPage(user) {
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
  const adminSide = document.getElementById("calendar-admin-side");
  const printMonth = document.getElementById("print-month");
  const printYear = document.getElementById("print-year");
  const printCount = document.getElementById("print-count");
  const btnPrint = document.getElementById("btn-print-calendar");
  const printArea = document.getElementById("calendar-print-area");
  const btnReset = document.getElementById("btn-cal-reset");

  if (!gridEl || !titleEl) return;

  const canEditCalendar = !!user;
  if (adminSide) adminSide.hidden = !canEditCalendar;

  const state = {
    view: "month",
    cursor: new Date(),
  };

  const DOW = ["NED", "PON", "TOR", "SRE", "ČET", "PET", "SOB"];
  const EVENT_KIND_META = {
    event: { label: "Dogodek", color: "#3498db" },
    match: { label: "Tekma", color: "#d35400" },
    closed: { label: "Zaprt revir", color: "#c0392b" },
    work: { label: "Delovna akcija", color: "#27ae60" },
    meeting: { label: "Sestanek", color: "#7f5ab6" },
  };

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
    return (getEvents() || []).filter((e) => e.datum === dateISO);
  }

  function remindersForDate(dateISO) {
    if (!canEditCalendar) return [];
    return (getReminders() || [])
      .filter((r) => !r.done)
      .filter((r) => {
        const dt = new Date(r.datetime);
        return !Number.isNaN(dt.getTime()) && toISODate(dt) === dateISO;
      })
      .sort((a, b) => new Date(a.datetime) - new Date(b.datetime));
  }

  function makeEventChip(event) {
    const chip = document.createElement("span");
    const kind = normalizeEventKind(event);
    chip.className = `cal-chip cal-chip--${kind}`;
    chip.style.background = event.color || EVENT_KIND_META[kind]?.color || "#3498db";
    chip.textContent = `${event.cas ? `${event.cas} ` : ""}${event.naslov || EVENT_KIND_META[kind]?.label || "Dogodek"}`;

    if (canEditCalendar) {
      chip.title = "Klikni za brisanje";
      chip.addEventListener("click", () => {
        if (!confirm("Izbrišem dogodek?")) return;
        saveEvents(getEvents().filter((x) => x.id !== event.id));
        addHistory("Koledar", `Izbrisan dogodek: ${event.naslov} (${event.datum})`);
        renderAll();
      });
    }

    return chip;
  }

  function makeReminderChip(reminder) {
    const dt = new Date(reminder.datetime);
    const t = `${pad2(dt.getHours())}:${pad2(dt.getMinutes())}`;
    const chip = document.createElement("span");
    chip.className = "cal-chip rem";
    chip.style.background = reminder.color || "#2ecc71";
    chip.textContent = `${t} ${reminder.title || "Opomnik"}`;
    chip.title = "Klikni za brisanje";
    chip.addEventListener("click", () => {
      if (!confirm("Izbrišem opomnik?")) return;
      saveReminders(getReminders().filter((x) => x.id !== reminder.id));
      addHistory("Opomnik", `Izbrisan opomnik: ${reminder.title} (${reminder.datetime})`);
      renderAll();
    });
    return chip;
  }

  function renderMonth() {
    weekEl.style.display = "none";
    gridEl.style.display = "grid";
    btnMonth.classList.add("active");
    btnWeek.classList.remove("active");

    const cursor = new Date(state.cursor.getFullYear(), state.cursor.getMonth(), 1);
    titleEl.textContent = monthTitle(cursor);
    gridEl.innerHTML = "";

    DOW.forEach((d) => {
      const h = document.createElement("div");
      h.className = "cal-dow";
      h.textContent = d;
      gridEl.appendChild(h);
    });

    const start = new Date(cursor);
    start.setDate(1 - cursor.getDay());
    const todayISO = toISODate(new Date());

    for (let i = 0; i < 42; i++) {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      const iso = toISODate(day);
      const cell = document.createElement("div");
      cell.className = "cal-cell";
      if (day.getMonth() !== cursor.getMonth()) cell.classList.add("outside");
      if (iso === todayISO) cell.classList.add("today");
      cell.innerHTML = `<div class="cal-daynum">${day.getDate()}</div>`;

      eventsForDate(iso).forEach((event) => cell.appendChild(makeEventChip(event)));
      remindersForDate(iso).forEach((reminder) => cell.appendChild(makeReminderChip(reminder)));

      cell.addEventListener("click", (ev) => {
        if (!canEditCalendar || !form || ev.target.classList.contains("cal-chip")) return;
        form.date.value = iso;
      });

      gridEl.appendChild(cell);
    }
  }

  function weekStart(d) {
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
    titleEl.textContent = `${start.toLocaleDateString("sl-SI")} - ${end.toLocaleDateString("sl-SI")}`;
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

      if (!evs.length && !rems.length) {
        right.innerHTML = `<div style="opacity:.65; font-size:13px;">Ni dogodkov.</div>`;
      } else {
        evs.forEach((event) => right.appendChild(makeEventChip(event)));
        rems.forEach((reminder) => right.appendChild(makeReminderChip(reminder)));
      }

      row.appendChild(left);
      row.appendChild(right);
      weekEl.appendChild(row);
    }
  }

  function renderListThisMonth() {
    if (!listEl) return;
    const cursor = new Date(state.cursor.getFullYear(), state.cursor.getMonth(), 1);
    const month = cursor.getMonth();
    const year = cursor.getFullYear();

    const events = getEvents()
      .filter((e) => {
        const d = new Date(e.datum);
        return d.getFullYear() === year && d.getMonth() === month;
      })
      .map((e) => ({
        kind: EVENT_KIND_META[normalizeEventKind(e)]?.label || "Dogodek",
        rawKind: normalizeEventKind(e),
        date: e.datum,
        title: e.naslov,
        time: e.cas || "",
        endTime: e.konec || "",
        location: e.lokacija || "",
        note: e.opis || "",
        color: e.color || EVENT_KIND_META[normalizeEventKind(e)]?.color || "#3498db",
      }));

    const rems = canEditCalendar
      ? getReminders()
          .filter((r) => !r.done)
          .filter((r) => {
            const d = new Date(r.datetime);
            return !Number.isNaN(d.getTime()) && d.getFullYear() === year && d.getMonth() === month;
          })
          .map((r) => ({
            kind: "Opomnik",
            date: new Date(r.datetime).toISOString(),
            title: r.title,
            color: r.color || "#2ecc71",
            datetime: r.datetime,
          }))
      : [];

    const all = [...events, ...rems].sort((a, b) => {
      const da = a.datetime ? new Date(a.datetime) : new Date(a.date);
      const db = b.datetime ? new Date(b.datetime) : new Date(b.date);
      return da - db;
    });

    listEl.innerHTML = "";
    if (!all.length) {
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
          : `${new Date(x.date).toLocaleDateString("sl-SI")}${x.time ? ` ob ${x.time}` : ""}${x.endTime ? `-${x.endTime}` : ""}`;
      item.innerHTML = `<div style="font-weight:800; margin-bottom:4px;"></div><div style="font-size:12px; opacity:.8;">${when}${x.location ? ` | ${escapeHtml(x.location)}` : ""}</div>${x.note ? `<div class="cal-list-note">${escapeHtml(x.note)}</div>` : ""}`;
      item.firstChild.appendChild(tag);
      item.firstChild.appendChild(document.createTextNode(` ${x.title || "-"}`));
      listEl.appendChild(item);
    });
  }

  function renderAll() {
    if (state.view === "month") renderMonth();
    else renderWeek();
    renderListThisMonth();
  }

  function buildPrintControls() {
    if (!printMonth || !printYear) return;
    const monthNames = Array.from({ length: 12 }, (_, i) => new Date(2026, i, 1).toLocaleDateString("sl-SI", { month: "long" }));
    printMonth.innerHTML = monthNames.map((name, index) => `<option value="${index}">${name}</option>`).join("");
    printMonth.value = String(state.cursor.getMonth());
    printYear.value = state.cursor.getFullYear();
  }

  function renderPrintCalendar() {
    const startMonth = Number(printMonth.value || 0);
    const startYear = Number(printYear.value || new Date().getFullYear());
    const count = Number(printCount.value || 1);
    const printKinds = getSelectedPrintKinds();
    const months = [];
    for (let i = 0; i < count; i++) months.push(new Date(startYear, startMonth + i, 1));

    printArea.innerHTML = `
      <div class="calendar-print-document ${months.length === 1 ? "calendar-print-document--single" : ""}">
        <header>
          <div>
            <span>Ribiška družina Mozirje</span>
            <h1>Koledar dogodkov</h1>
            <p>${escapeHtml(formatPrintPeriod(months))}</p>
          </div>
          <aside>
            <strong>Natisnjeno</strong>
            <span>${escapeHtml(new Date().toLocaleDateString("sl-SI"))}</span>
          </aside>
        </header>
        <div class="calendar-print-months">
          ${months.map((month) => renderPrintMonth(month, printKinds)).join("")}
        </div>
        <footer>${escapeHtml(calendarPrintNotice())}</footer>
      </div>
    `;
  }

  function renderPrintMonth(monthDate, printKinds) {
    const cursor = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
    const cells = [];
    const blanksBefore = cursor.getDay();
    const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();

    for (let i = 0; i < blanksBefore; i++) {
      cells.push(`<td class="calendar-print-day is-empty"></td>`);
    }

    for (let dayNumber = 1; dayNumber <= daysInMonth; dayNumber++) {
      const day = new Date(cursor.getFullYear(), cursor.getMonth(), dayNumber);
      const iso = toISODate(day);
      const evs = eventsForDate(iso).filter((event) => shouldPrintEvent(event, printKinds));
      cells.push(`
        <td class="calendar-print-day">
          <strong>${day.getDate()}</strong>
          ${evs.map((event) => `<span class="print-event print-event--${normalizeEventKind(event)}">${escapeHtml(formatPrintEvent(event))}</span>`).join("")}
        </td>
      `);
    }

    while (cells.length % 7 !== 0) {
      cells.push(`<td class="calendar-print-day is-empty"></td>`);
    }

    const rows = [];
    for (let i = 0; i < cells.length; i += 7) {
      rows.push(`<tr>${cells.slice(i, i + 7).join("")}</tr>`);
    }

    return `
      <section class="calendar-print-month">
        <h2>${escapeHtml(monthTitle(cursor))}</h2>
        <table class="calendar-print-table">
          <thead>
            <tr>${DOW.map((day) => `<th>${day}</th>`).join("")}</tr>
          </thead>
          <tbody>${rows.join("")}</tbody>
        </table>
      </section>
    `;
  }

  btnPrint?.addEventListener("click", () => {
    if (!getSelectedPrintKinds().size) {
      alert("Izberi vsaj eno vrsto zapisov za tisk.");
      return;
    }
    renderPrintCalendar();
    window.print();
  });

  btnReset?.addEventListener("click", () => {
    resetCalendarForm();
  });

  btnPrev.addEventListener("click", () => {
    if (state.view === "month") state.cursor = new Date(state.cursor.getFullYear(), state.cursor.getMonth() - 1, 1);
    else state.cursor = new Date(state.cursor.setDate(state.cursor.getDate() - 7));
    renderAll();
  });

  btnNext.addEventListener("click", () => {
    if (state.view === "month") state.cursor = new Date(state.cursor.getFullYear(), state.cursor.getMonth() + 1, 1);
    else state.cursor = new Date(state.cursor.setDate(state.cursor.getDate() + 7));
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

  form?.addEventListener("submit", (e) => {
    e.preventDefault();
    const type = form.type.value;
    const kind = form.kind?.value || "event";
    const name = form.name.value.trim();
    const date = form.date.value;
    const time = (form.time.value || "").trim();
    const endTime = (form.endTime?.value || "").trim();
    const color = form.color.value || "#2ecc71";
    const location = (form.location?.value || "").trim();
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
        cas: time,
        konec: endTime,
        lokacija: location,
        opis: note,
        kind,
        color,
      });
      saveEvents(events);
      addHistory("Koledar", `Dodano: ${name} (${date}).`);
      resetCalendarForm();
      renderAll();
      return;
    }

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
    rems.push({ id: Date.now(), title: name, datetime: dt.toISOString(), note, color, done: false, notifiedAt: 0 });
    saveReminders(rems);
    addHistory("Opomnik", `Dodano: ${name} (${dt.toLocaleString("sl-SI")}).`);
    resetCalendarForm();
    renderAll();
  });

  buildPrintControls();
  if (form) form.date.value = toISODate(new Date());
  bindKindColor();
  renderAll();

  function normalizeEventKind(event) {
    const kind = event?.kind || event?.kategorija || "event";
    return EVENT_KIND_META[kind] ? kind : "event";
  }

  function getSelectedPrintKinds() {
    return new Set(Array.from(document.querySelectorAll('input[name="printKind"]:checked')).map((input) => input.value));
  }

  function shouldPrintEvent(event, printKinds) {
    const kind = normalizeEventKind(event);
    if (printKinds.has(kind)) return true;
    return kind === "match" && printKinds.has("closed");
  }

  function formatPrintEvent(event) {
    const kind = normalizeEventKind(event);
    const time = event.cas ? ` ${event.cas}${event.konec ? `-${event.konec}` : ""}` : "";
    const location = event.lokacija ? `, ${event.lokacija}` : "";
    const title = event.naslov || EVENT_KIND_META[kind]?.label || "Dogodek";
    if (kind === "closed" || kind === "match") {
      const closedText = event.cas ? `Zaprt revir ${event.cas}${event.konec ? `-${event.konec}` : ""}` : "Zaprt revir cel dan";
      return `${closedText}: ${title}${location}`;
    }
    return `${time}${time ? " " : ""}${title}${location}`;
  }

  function formatPrintPeriod(months) {
    if (!months.length) return "Izbrano obdobje";
    const first = months[0];
    const last = months[months.length - 1];
    if (months.length === 1) return monthTitle(first);
    return `${monthTitle(first)} - ${monthTitle(last)}`;
  }

  function calendarPrintNotice() {
    return "Točni datumi in ure zaprtih revirjev so za vsak tekoči mesec objavljeni na spletni strani RD Mozirje in na naši Facebook spletni strani.";
  }

  function resetCalendarForm() {
    if (!form) return;
    form.reset();
    form.date.value = toISODate(new Date());
    form.color.value = EVENT_KIND_META.event.color;
    if (form.kind) form.kind.disabled = false;
  }

  function bindKindColor() {
    if (!form?.kind) return;
    form.kind.addEventListener("change", () => {
      const meta = EVENT_KIND_META[form.kind.value] || EVENT_KIND_META.event;
      form.color.value = meta.color;
    });
    form.querySelectorAll('input[name="type"]').forEach((input) => {
      input.addEventListener("change", () => {
        const isReminder = form.type.value === "reminder";
        form.kind.disabled = isReminder;
        if (isReminder) form.color.value = "#2ecc71";
        else form.color.value = EVENT_KIND_META[form.kind.value]?.color || EVENT_KIND_META.event.color;
      });
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  ensureDemoData();

  const user = getCurrentUser();
  const canUsePrivateCalendar = !!user && userHasModule(user, "koledar");
  const header = document.querySelector(".header");
  const userArea = document.getElementById("calendar-user-area");
  const nav = document.getElementById("app-nav");

  if (canUsePrivateCalendar) {
    initHeader(user);
    renderAppNav(user, "koledar");
    startReminderWatcher();
  } else {
    if (userArea) userArea.hidden = true;
    if (nav) nav.hidden = true;
    if (header) header.classList.add("calendar-public-header");
    enhancePageIntroWithModuleIcon("koledar");
  }

  handleKoledarPage(canUsePrivateCalendar ? user : null);

  const letoEl = document.getElementById("aktivno-leto");
  if (letoEl) letoEl.textContent = typeof AktivnoLeto === "function" ? AktivnoLeto() : "";
});
