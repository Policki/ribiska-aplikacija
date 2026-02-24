// =======================
// core.js – SKUPNE FUNKCIJE
// =======================

// ---------- LOCALSTORAGE ----------

const STORAGE_KEYS = {
  CURRENT_USER: "rd_current_user",
  MEMBERS: "rd_members",
  HISTORY: "rd_history",
  EVENTS: "rd_events",
  USERS: "rd_users",
  OFFICIALS: "rd_officials",
  WORK_HOURS: "rd_work_hours",
  FEES: "rd_fees",
  LICENSES: "rd_licenses",
  GUARDS: "rd_guards",
  REMINDERS: "rd_reminders",
};

// Demo “seed” verzija: ko spremeniš string, se demo podatki ponovno prepišejo
const DEMO_DATA_VERSION = "demo_members_v4_seed_35";

function getJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function setJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

// ---------- USERS ----------

function getUsers() {
  return getJSON(STORAGE_KEYS.USERS, []);
}

function saveUsers(users) {
  setJSON(STORAGE_KEYS.USERS, users);
}

// ---------- MEMBERS ----------

function getMembers() {
  return getJSON(STORAGE_KEYS.MEMBERS, []);
}

function saveMembers(members) {
  setJSON(STORAGE_KEYS.MEMBERS, members);
}

// ---------- EVENTS ----------

function getEvents() {
  return getJSON(STORAGE_KEYS.EVENTS, []);
}

function saveEvents(events) {
  setJSON(STORAGE_KEYS.EVENTS, events);
}

// ---------- HISTORY ----------

function addHistory(action, details) {
  const list = getJSON(STORAGE_KEYS.HISTORY, []);

  const now = new Date();
  const user = getCurrentUser();

  const entry = {
    id: Date.now(),
    // za prikaz (kot prej)
    time: now.toLocaleString("sl-SI"),
    // za filtriranje/grupiranje (novo)
    iso: now.toISOString(),
    date: now.toISOString().slice(0, 10), // YYYY-MM-DD
    // kdo je naredil
    username: user?.username || "neznano",
    action,
    details,
  };

  list.unshift(entry);

  // opcijsko: omeji velikost zgodovine (da localStorage ne poči)
  const MAX = 3000;
  if (list.length > MAX) list.length = MAX;

  setJSON(STORAGE_KEYS.HISTORY, list);
}

// ---------- DEMO DATA ----------

function ensureDemoData() {
  // MEMBERS: vedno prepiši demo podatke, če se verzija spremeni
  const currentDemoVer = localStorage.getItem("rd_demo_version");
  if (currentDemoVer !== DEMO_DATA_VERSION) {
    setJSON(STORAGE_KEYS.MEMBERS, buildDemoMembers(35));
    localStorage.setItem("rd_demo_version", DEMO_DATA_VERSION);
  }

  // USERS
  if (!getJSON(STORAGE_KEYS.USERS, null)) {
    const demoUsers = [
      {
        username: "admin",
        password: "admin",
        mustChangePassword: false,
        modules: ["*"],
        permissions: {
          canEditMembers: true,
          canArchiveMembers: true,
          canManageUsers: true,
          canSeeHistory: true,
        },
        visibleStatuses: ["*"],
      },
    ];
    saveUsers(demoUsers);
  }

  // EVENTS
  if (!getJSON(STORAGE_KEYS.EVENTS, null)) {
    const demoEvents = [
      {
        id: 1,
        naslov: "Tekmovanje na Savinji",
        datum: "2025-05-10",
        opis: "Letno tekmovanje v revirju A.",
      },
      {
        id: 2,
        naslov: "Čistilna akcija",
        datum: "2025-04-06",
        opis: "Ureditev brežin in pobiranje odpadkov.",
      },
    ];
    setJSON(STORAGE_KEYS.EVENTS, demoEvents);
  }

  // HISTORY
  if (!getJSON(STORAGE_KEYS.HISTORY, null)) {
    setJSON(STORAGE_KEYS.HISTORY, []);
  }

  // ostali storage ključi
  if (!getJSON(STORAGE_KEYS.OFFICIALS, null)) setJSON(STORAGE_KEYS.OFFICIALS, []);
  if (!getJSON(STORAGE_KEYS.WORK_HOURS, null)) setJSON(STORAGE_KEYS.WORK_HOURS, {});
  if (!getJSON(STORAGE_KEYS.FEES, null)) setJSON(STORAGE_KEYS.FEES, {});
  if (!getJSON(STORAGE_KEYS.LICENSES, null)) setJSON(STORAGE_KEYS.LICENSES, []);
  if (!getJSON(STORAGE_KEYS.GUARDS, null)) setJSON(STORAGE_KEYS.GUARDS, []);
  if (!getJSON(STORAGE_KEYS.REMINDERS, null)) setJSON(STORAGE_KEYS.REMINDERS, []);
}

// ---------- AUTH / PERMISSIONS ----------

function getCurrentUser() {
  const raw = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
  if (!raw) return null;
  try {
    const stored = JSON.parse(raw);
    const users = getUsers();
    return users.find((u) => u.username === stored.username) || null;
  } catch {
    return null;
  }
}

function userHasModule(user, moduleKey) {
  if (!moduleKey) return true;
  if (!user?.modules || user.modules.includes("*")) return true;
  return user.modules.includes(moduleKey);
}

function getUserVisibleStatuses(user) {
  if (!user || !user.visibleStatuses || user.visibleStatuses.includes("*")) {
    return null; // vidi vse
  }
  return user.visibleStatuses;
}

function requireAuth(options = {}) {
  const { pageModuleKey } = options;
  const user = getCurrentUser();
  if (!user) {
    window.location.href = "login.html";
    return null;
  }

  if (pageModuleKey && !userHasModule(user, pageModuleKey)) {
    alert("Nimate dovoljenja za dostop do tega modula.");
    window.location.href = "dashboard.html";
    return null;
  }

  return user;
}

function initHeader(currentUser) {
  const userNameSpan = document.getElementById("header-username");
  if (userNameSpan && currentUser) {
    userNameSpan.textContent = currentUser.username.toUpperCase();
  }

  const btnLogout = document.getElementById("btn-logout");
  if (btnLogout) {
    btnLogout.addEventListener("click", () => {
      addHistory("Odjava", `Uporabnik ${currentUser.username} se je odjavil.`);
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
      window.location.href = "login.html";
    });
  }
}

// ---------- HELPERS: leto / starost ----------

function currentYear() {
  return new Date().getFullYear().toString();
}

function getAge(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;

  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

// ---------- FUNKCIONARJI storage ----------

function getOfficials() {
  return getJSON(STORAGE_KEYS.OFFICIALS, []);
}

function saveOfficials(list) {
  setJSON(STORAGE_KEYS.OFFICIALS, list);
}

// ---------- DELOVNE URE storage ----------

function getWorkHoursYear(year) {
  const all = getJSON(STORAGE_KEYS.WORK_HOURS, {});
  return all[year] || {};
}

function setWorkHoursYear(year, map) {
  const all = getJSON(STORAGE_KEYS.WORK_HOURS, {});
  all[year] = map;
  setJSON(STORAGE_KEYS.WORK_HOURS, all);
}

// ---------- ČLANARINA storage ----------

function feeForStatus(status) {
  // prilagodi po svojih pravilih
  const map = {
    AA: 180,
    AM: 25,
    AP: 50,
    "AČ": 0,
    "ZAČ": 0,
    "AŠI": 60,
    DAA: 120,
    DAM: 25,
  };
  return map[status] ?? 0;
}

function getFeesYear(year) {
  const all = getJSON(STORAGE_KEYS.FEES, {});
  return all[year] || {};
}

function setFeesYear(year, map) {
  const all = getJSON(STORAGE_KEYS.FEES, {});
  all[year] = map;
  setJSON(STORAGE_KEYS.FEES, all);
}

// ---------- LETNE KARTE storage ----------

function getLicenses() {
  return getJSON(STORAGE_KEYS.LICENSES, []);
}

function saveLicenses(list) {
  setJSON(STORAGE_KEYS.LICENSES, list);
}

// ---------- SKUPNE FORME / TABELE (Seznam+Arhiv, Vpis+Urejanje) ----------
// (pusti, če jo uporabljaš na drugih straneh)

function renderMembersTable({ onlyArchived = false } = {}) {
  const tbody = document.getElementById("members-tbody");
  if (!tbody) return;

  const currentUser = getCurrentUser();
  const visibleStatuses = getUserVisibleStatuses(currentUser);

  let members = getMembers().filter((m) =>
    onlyArchived ? m.arhiviran : !m.arhiviran
  );

  if (visibleStatuses) {
    members = members.filter((m) => visibleStatuses.includes(m.status));
  }

  tbody.innerHTML = "";
  members.forEach((m, index) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${index + 1}</td>
      <td>${m.status || ""}</td>
      <td>${m.spc || ""}</td>
      <td>${m.clanska || ""}</td>
      <td>${m.priimek || ""}</td>
      <td>${m.ime || ""}</td>
      <td><a href="mailto:${m.email || ""}">${m.email || ""}</a></td>
      <td>${m.telefon || ""}</td>
      <td class="table-actions">
        <span class="action-icon edit" title="Uredi">✏️</span>
        <span class="action-icon delete" title="${onlyArchived ? "Izbriši" : "Arhiviraj"}">🗑️</span>
      </td>
    `;

    tr.querySelector(".edit")?.addEventListener("click", () => {
      window.location.href = `urejanje-clana.html?id=${m.id}`;
    });

    tr.querySelector(".delete")?.addEventListener("click", () => {
      if (
        onlyArchived
          ? confirm("Ali res želiš trajno izbrisati člana?")
          : confirm("Ali res želiš premakniti člana v arhiv?")
      ) {
        const list = getMembers();
        const idx = list.findIndex((x) => x.id === m.id);
        if (idx !== -1) {
          if (onlyArchived) {
            list.splice(idx, 1);
            addHistory("Izbris člana", `${m.ime} ${m.priimek} trajno izbrisan iz arhiva.`);
          } else {
            list[idx].arhiviran = true;
            list[idx].datumArhiva = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
            list[idx].arhivLeto = new Date().getFullYear();
            addHistory("Arhiviranje člana", `${m.ime} ${m.priimek} premaknjen v arhiv.`);
          }
          saveMembers(list);
          renderMembersTable({ onlyArchived });
        }
      }
    });

    tbody.appendChild(tr);
  });
}

function readMemberForm(form) {
  return {
    priimek: form.priimek.value.trim(),
    ime: form.ime.value.trim(),
    datumRojstva: form.datumRojstva.value,
    naslov: form.naslov.value.trim(),
    kraj: form.kraj.value.trim(),
    telefon: form.telefon.value.trim(),
    email: form.email.value.trim(),
    tipKarte: form.tipKarte.value.trim(),
    datumVpisa: form.datumVpisa.value,
    status: form.status.value.trim(),
    spc: form.spc.value.trim(),
    clanska: form.clanska.value.trim(),
  };
}

function AktivnoLeto() {
  const now = new Date();
  const leto = now.getMonth() >= 9 ? now.getFullYear() + 1 : now.getFullYear();
  return leto.toString();
}

// =======================
// OPOMNIKI (GLOBAL)
// =======================

function getReminders() {
  return getJSON(STORAGE_KEYS.REMINDERS, []);
}

function saveReminders(list) {
  setJSON(STORAGE_KEYS.REMINDERS, list);
}

function ensureGlobalReminderUI() {
  if (document.getElementById("reminder-toast-host")) return;

  const host = document.createElement("div");
  host.id = "reminder-toast-host";
  host.style.position = "fixed";
  host.style.right = "18px";
  host.style.bottom = "18px";
  host.style.display = "flex";
  host.style.flexDirection = "column";
  host.style.gap = "10px";
  host.style.zIndex = "9999";
  document.body.appendChild(host);
}

function showReminderToast(rem) {
  ensureGlobalReminderUI();

  const host = document.getElementById("reminder-toast-host");
  if (host.querySelector(`[data-reminder-id="${rem.id}"]`)) return;

  const card = document.createElement("div");
  card.dataset.reminderId = rem.id;
  card.style.width = "320px";
  card.style.background = "#ffffff";
  card.style.border = "2px solid #0b4b4b";
  card.style.borderRadius = "14px";
  card.style.boxShadow = "0 10px 30px rgba(0,0,0,.18)";
  card.style.padding = "12px 12px 10px 12px";
  card.style.fontFamily = "Arial, sans-serif";

  const when = new Date(rem.datetime).toLocaleString("sl-SI", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  card.innerHTML = `
    <div style="display:flex; align-items:flex-start; gap:10px;">
      <div style="width:10px; height:10px; margin-top:6px; border-radius:50%; background:${rem.color || "#2ecc71"};"></div>
      <div style="flex:1;">
        <div style="font-weight:800; font-size:14px; margin-bottom:2px;">OPOMNIK</div>
        <div style="font-weight:800; font-size:15px; margin-bottom:4px;">${escapeHtml(rem.title || "Opomnik")}</div>
        <div style="font-size:12px; opacity:.8; margin-bottom:6px;">${when}</div>
        ${rem.note ? `<div style="font-size:12px; opacity:.9; margin-bottom:8px;">${escapeHtml(rem.note)}</div>` : ""}
        <div style="display:flex; gap:8px; justify-content:flex-end;">
          <button data-action="dismiss" style="padding:6px 10px; border-radius:10px; border:1px solid #bbb; background:#fff; cursor:pointer;">Zapri</button>
          <button data-action="done" style="padding:6px 10px; border-radius:10px; border:0; background:#0b4b4b; color:#fff; cursor:pointer;">Opravljeno</button>
        </div>
      </div>
    </div>
  `;

  card.querySelector('[data-action="dismiss"]')?.addEventListener("click", () => {
    card.remove();
  });

  card.querySelector('[data-action="done"]')?.addEventListener("click", () => {
    const list = getReminders();
    const idx = list.findIndex((x) => x.id === rem.id);
    if (idx !== -1) {
      list[idx].done = true;
      saveReminders(list);
      addHistory("Opomnik", `Označen kot opravljen: ${list[idx].title}`);
    }
    card.remove();
  });

  host.appendChild(card);
}

function startReminderWatcher() {
  if (window.__rdReminderWatcherStarted) return;
  window.__rdReminderWatcherStarted = true;

  ensureGlobalReminderUI();

  setInterval(() => {
    const now = Date.now();
    const list = getReminders();

    list.forEach((r) => {
      if (!r || r.done) return;
      if (!r.datetime) return;

      const t = new Date(r.datetime).getTime();
      if (Number.isNaN(t)) return;

      const notifiedAt = r.notifiedAt ? Number(r.notifiedAt) : 0;
      const shouldFire = t <= now && now - t <= 1000 * 60 * 30; // okno 30 min nazaj
      if (shouldFire && (!notifiedAt || notifiedAt < t)) {
        r.notifiedAt = now;
        showReminderToast(r);
      }
    });

    saveReminders(list);
  }, 5000);
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// ---------- NAV RENDER ----------

function renderAppNav(user, activeKey) {
  const nav = document.getElementById("app-nav");
  if (!nav) return;

  const modules = [
    { key: "dashboard", label: "DOMOV", href: "dashboard.html" },
    { key: "seznam", label: "SEZNAM", href: "seznam.html" },
    { key: "vpis", label: "VPIS ČLANA", href: "vpis-clana.html" },
    { key: "arhiv", label: "ARHIV ČLANSTVA", href: "arhiv-clanstva.html" },
    { key: "koledar", label: "KOLEDAR", href: "koledar.html" },
    { key: "uporabniki", label: "UPORABNIKI", href: "uporabniki.html" },
    { key: "tiskanje", label: "TISKANJE", href: "tiskanje.html" },
    { key: "zgodovina", label: "ZGODOVINA DEJANJ", href: "zgodovina-dejanj.html" },
    { key: "funkcionarji", label: "FUNKCIONARJI", href: "funkcionarji.html" },
    { key: "priznanja", label: "PRIZNANJA", href: "priznanja.html" },
    { key: "delovne-ure", label: "DELOVNE URE", href: "delovne-ure.html" },
    { key: "clanarina", label: "ČLANARINA", href: "clanarina.html" },
    { key: "karte-cuvaji", label: "LETNE KARTE IN ČUVAJI", href: "karte-čuvaji.html" },
  ];

  nav.innerHTML = `<div class="header-nav-inner"></div>`;
  const inner = nav.querySelector(".header-nav-inner");

  modules.forEach((m) => {
    if (!userHasModule(user, m.key)) return;

    const a = document.createElement("a");
    a.href = m.href;
    a.textContent = m.label;

    if (activeKey === m.key) a.classList.add("active");

    inner.appendChild(a);
  });
}

// =======================
// DEMO MEMBERS GENERATOR
// =======================

function buildDemoMembers(count = 35) {
  // Statusi, kot si navedel:
  // AM mladinec
  // AA polnoletni polnopravni član
  // AP pripravnik
  // AČ častni član
  // ZAČ zaslužni častni član
  // AŠI dijak/študent z opravljenim ribiškim izpitom
  // DAA pridružen polnoletni član
  // DAM pridruženi mladinec

  const statuses = ["AM", "AA", "AP", "AČ", "ZAČ", "AŠI", "DAA", "DAM"];
  const tipKarteChoices = ["Letna", "Dnevna"];

  // Izmišljena (ne iz tvojih slik) slovenska imena/priimki
  const priimki = [
    "KRAJNC", "ZUPAN", "KOVAČIČ", "PETERNEL", "VIDMAR", "OBLAK", "KOS",
    "LUKAČ", "BOŽIČ", "PIRC", "HRIBAR", "KOREN", "GODEC", "KASTELIC",
    "MIHEVC", "SEVER", "ROZMAN", "HOČEVAR", "KNEZ", "ŠTRUKELJ",
    "POLJANEC", "PINTER", "GOLIČNIK", "GRADIŠAR", "ŽAGAR", "KRMELJ",
    "BAJEC", "TURK", "ZORC", "KOSEC", "ŠKOF", "RANT", "JEZERNIK",
    "KLEMENČIČ", "NOVINA"
  ];

  const imenaM = [
    "MIHA", "JAKA", "LUKA", "JAN", "NACE", "VID", "GAŠPER", "NEJC",
    "MATIJA", "ANŽE", "TILEN", "BLAŽ", "ŽAN", "MATIC", "ROK", "TOMA",
    "BOR", "KRISTJAN"
  ];
  const imenaZ = [
    "NIKA", "LARA", "EVA", "MAJA", "SARA", "TJAŠA", "ANJA", "URŠKA",
    "KATJA", "TINA", "NINA", "ANA", "POLONA", "TAMARA", "MIA", "LEA",
    "TEJA"
  ];

  const kraji = [
    "Mozirje", "Nazarje", "Gornji Grad", "Rečica ob Savinji", "Šoštanj",
    "Velenje", "Polzela", "Prebold", "Žalec", "Šmartno ob Paki"
  ];

  const ulice = [
    "Savinja", "Cankarjeva", "Prešernova", "Trubarjeva", "Šolska", "Gozdna",
    "Planinska", "Sončna", "Lipova", "Mladinska", "Rečna", "Travniška"
  ];

  // enostavna deterministična “random” funkcija (da je vedno isto pri istem DEMO_DATA_VERSION)
  const seed = hashString(DEMO_DATA_VERSION);
  const rnd = mulberry32(seed);

  const members = [];
  const startId = 1;

  for (let i = 0; i < count; i++) {
    const id = startId + i;

    const spc = rnd() < 0.65 ? "M" : "Ž";
    const ime = spc === "M" ? pick(imenaM, rnd) : pick(imenaZ, rnd);
    const priimek = pick(priimki, rnd);

    // status: malo več AA, nekaj AM/AP, manj AČ/ZAČ
    const r = rnd();
    let status = "AA";
    if (r < 0.18) status = "AM";
    else if (r < 0.30) status = "AP";
    else if (r < 0.38) status = "AŠI";
    else if (r < 0.52) status = "DAA";
    else if (r < 0.62) status = "DAM";
    else if (r < 0.70) status = "AČ";
    else if (r < 0.74) status = "ZAČ";
    else status = "AA";

    // datum rojstva glede na status
    const dob = makeDobForStatus(status, rnd);

    // datum vpisa (2005–2025)
    const datumVpisa = randomDateISO(2005, 2025, rnd);

    // članska: 6-mestna
    const clanska = String(100000 + Math.floor(rnd() * 900000));

    // naslov
    const ulica = pick(ulice, rnd);
    const hisna = 1 + Math.floor(rnd() * 120);
    const naslov = `${ulica} ${hisna}`;

    // kraj
    const kraj = pick(kraji, rnd);

    // email (fake)
    const emailUser = `${slug(ime)}.${slug(priimek)}${String(10 + Math.floor(rnd() * 90))}`;
    const email = `${emailUser}@example.com`;

    // telefon (SI stil)
    const telefon = makeSITelefon(rnd);

    const tipKarte = rnd() < 0.8 ? "Letna" : pick(tipKarteChoices, rnd);

    members.push({
      id,
      zapSt: id,
      status,
      spc,
      clanska,
      priimek,
      ime,
      email,
      telefon,
      naslov,
      kraj,
      tipKarte,
      datumRojstva: dob,
      datumVpisa,
      arhiviran: false,
      avatar: null,
    });
  }

  return members;
}

function makeDobForStatus(status, rnd) {
  // AM/DAM mladi: 2008–2016
  if (status === "AM" || status === "DAM") return randomDateISO(2008, 2016, rnd);

  // AŠI dijaki/študenti: 2001–2007
  if (status === "AŠI") return randomDateISO(2001, 2007, rnd);

  // AČ/ZAČ starejši: 1940–1960
  if (status === "AČ" || status === "ZAČ") return randomDateISO(1940, 1960, rnd);

  // AP/DAA/AA polnoletni: 1970–2005 (AP malo mlajši)
  if (status === "AP") return randomDateISO(1985, 2005, rnd);
  if (status === "DAA") return randomDateISO(1975, 2002, rnd);

  return randomDateISO(1970, 2003, rnd);
}

function randomDateISO(yearFrom, yearTo, rnd) {
  const y = yearFrom + Math.floor(rnd() * (yearTo - yearFrom + 1));
  const m = 1 + Math.floor(rnd() * 12);
  const d = 1 + Math.floor(rnd() * 28);
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function makeSITelefon(rnd) {
  // 03x / 04x / 05x / 07x
  const prefixes = ["031", "041", "051", "070"];
  const p = pick(prefixes, rnd);
  const rest = String(Math.floor(rnd() * 1000000)).padStart(6, "0");
  return `${p}${rest}`;
}

function pick(arr, rnd) {
  return arr[Math.floor(rnd() * arr.length)];
}

function slug(str) {
  return String(str)
    .toLowerCase()
    .replaceAll("č", "c")
    .replaceAll("š", "s")
    .replaceAll("ž", "z")
    .replaceAll("đ", "d")
    .replaceAll(" ", "")
    .replaceAll("-", "");
}

// deterministic PRNG
function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}