function handleZgodovinaPage() {
  const currentUser = getCurrentUser();
  if (!currentUser) return;

  if (!currentUser.permissions?.canSeeHistory) {
    alert("Nimate dovoljenja za ogled zgodovine dejanj.");
    window.location.href = "dashboard.html";
    return;
  }

  const elSearch = document.getElementById("hist-search");
  const elUser = document.getElementById("hist-user");
  const elAction = document.getElementById("hist-action");
  const elFrom = document.getElementById("hist-from");
  const elTo = document.getElementById("hist-to");
  const btnReset = document.getElementById("hist-reset");
  const btnClear = document.getElementById("hist-clear");

  const container = document.getElementById("hist-container");
  const meta = document.getElementById("hist-meta");

  if (!elSearch || !elUser || !elAction || !elFrom || !elTo || !btnReset || !btnClear || !container || !meta) return;

  const all = normalizeHistory(getJSON(STORAGE_KEYS.HISTORY, []));

  // fill dropdowns
  fillSelect(elUser, uniqueSorted(all.map((x) => x.username)));
  fillSelect(elAction, uniqueSorted(all.map((x) => x.action)));

  // listeners
  [elSearch, elUser, elAction, elFrom, elTo].forEach((el) => el.addEventListener("input", render));
  [elUser, elAction].forEach((el) => el.addEventListener("change", render));

  btnReset.addEventListener("click", () => {
    elSearch.value = "";
    elUser.value = "";
    elAction.value = "";
    elFrom.value = "";
    elTo.value = "";
    render();
  });

  btnClear.addEventListener("click", () => {
    if (!confirm("Res želiš počistiti celotno zgodovino dejanj?")) return;
    setJSON(STORAGE_KEYS.HISTORY, []);
    addHistory("Zgodovina", `Uporabnik ${currentUser.username} je počistil zgodovino dejanj.`);
    // reload local list
    window.location.reload();
  });

  render();

  function render() {
    const q = (elSearch.value || "").trim().toLowerCase();
    const user = elUser.value;
    const action = elAction.value;
    const from = elFrom.value; // YYYY-MM-DD
    const to = elTo.value;     // YYYY-MM-DD

    let list = normalizeHistory(getJSON(STORAGE_KEYS.HISTORY, []));

    // filters
    if (user) list = list.filter((x) => x.username === user);
    if (action) list = list.filter((x) => x.action === action);
    if (from) list = list.filter((x) => x.date >= from);
    if (to) list = list.filter((x) => x.date <= to);

    if (q) {
      list = list.filter((x) => {
        const hay = `${x.username} ${x.action} ${x.details} ${x.time}`.toLowerCase();
        return hay.includes(q);
      });
    }

    // group by date (YYYY-MM-DD)
    const groups = groupBy(list, (x) => x.date);

    const dates = Object.keys(groups).sort((a, b) => b.localeCompare(a)); // newest first
    meta.textContent = `Prikazanih: ${list.length} • Dni: ${dates.length}`;

    container.innerHTML = "";

    if (!list.length) {
      container.innerHTML = `<div class="small-hint">Ni zadetkov za izbrane filtre.</div>`;
      return;
    }

    dates.forEach((dateKey) => {
      const dayList = groups[dateKey].sort((a, b) => b.iso.localeCompare(a.iso));

      const details = document.createElement("details");
      details.className = "hist-day";

      const sum = document.createElement("summary");
      sum.innerHTML = `
        <div class="hist-day-title">
          <span>${formatDateTitle(dateKey)}</span>
          <span class="hist-count">${dayList.length}</span>
        </div>
      `;
      details.appendChild(sum);

      const listEl = document.createElement("div");
      listEl.className = "hist-list";

      dayList.forEach((h) => {
        const item = document.createElement("div");
        item.className = "hist-item";

        item.innerHTML = `
          <div class="hist-left">
            <div class="hist-time">${formatTimeOnly(h)}</div>
            <div class="hist-user">${escapeHtml(h.username)}</div>
          </div>
          <div class="hist-main">
            <div class="hist-action">${escapeHtml(h.action)}</div>
            <div class="hist-details">${escapeHtml(h.details || "")}</div>
          </div>
        `;

        listEl.appendChild(item);
      });

      details.appendChild(listEl);
      container.appendChild(details);
    });
  }
}

/* -------- helpers -------- */

function normalizeHistory(list) {
  const now = new Date();
  return (Array.isArray(list) ? list : []).map((x) => {
    const iso = x.iso || tryParseLocaleToISO(x.time) || now.toISOString();
    const d = iso.slice(0, 10);
    return {
      id: x.id || Date.now(),
      time: x.time || new Date(iso).toLocaleString("sl-SI"),
      iso,
      date: x.date || d,
      username: x.username || "neznano",
      action: x.action || "",
      details: x.details || "",
    };
  });
}

// best-effort: stari zapisi imajo sl-SI time, ne vedno parsable -> fallback null
function tryParseLocaleToISO(localeStr) {
  if (!localeStr) return null;
  const d = new Date(localeStr);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function groupBy(arr, fn) {
  return arr.reduce((acc, item) => {
    const k = fn(item);
    (acc[k] ||= []).push(item);
    return acc;
  }, {});
}

function uniqueSorted(arr) {
  return Array.from(new Set(arr.filter(Boolean))).sort((a, b) =>
    String(a).localeCompare(String(b), "sl", { sensitivity: "base" })
  );
}

function fillSelect(select, values) {
  // keep first option
  const first = select.querySelector("option");
  select.innerHTML = "";
  if (first) select.appendChild(first);
  values.forEach((v) => {
    const opt = document.createElement("option");
    opt.value = v;
    opt.textContent = v;
    select.appendChild(opt);
  });
}

function formatDateTitle(yyyyMmDd) {
  // 2026-02-24 -> 24.02.2026
  const [y, m, d] = String(yyyyMmDd).split("-");
  return `${d}.${m}.${y}`;
}

function formatTimeOnly(h) {
  // if time is "24. 02. 2026 18:32:10" -> try extract time
  const iso = h.iso || "";
  if (iso) {
    const d = new Date(iso);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleTimeString("sl-SI", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    }
  }
  // fallback from locale string
  const m = String(h.time || "").match(/(\d{1,2}:\d{2}:\d{2})/);
  return m ? m[1] : "";
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/* -------- init -------- */
document.addEventListener("DOMContentLoaded", () => {
  ensureDemoData();
  const user = requireAuth({ pageModuleKey: "zgodovina" });
  if (!user) return;

  initHeader(user);
  renderAppNav(user, "zgodovina");
  handleZgodovinaPage();
  startReminderWatcher();

  const el = document.getElementById("aktivno-leto");
  if (el && typeof AktivnoLeto === "function") el.textContent = AktivnoLeto();
});