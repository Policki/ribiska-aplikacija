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
const DEMO_DATA_VERSION = "demo_members_v5_seed_35_posta";

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
    time: now.toLocaleString("sl-SI"),
    iso: now.toISOString(),
    date: now.toISOString().slice(0, 10),
    username: user?.username || "neznano",
    action,
    details,
  };

  list.unshift(entry);

  const MAX = 3000;
  if (list.length > MAX) list.length = MAX;

  setJSON(STORAGE_KEYS.HISTORY, list);
}

// ---------- DEMO DATA ----------

function ensureDemoData() {
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
      { id: 1, naslov: "Tekmovanje na Savinji", datum: "2025-05-10", opis: "Letno tekmovanje v revirju A." },
      { id: 2, naslov: "Čistilna akcija", datum: "2025-04-06", opis: "Ureditev brežin in pobiranje odpadkov." },
    ];
    setJSON(STORAGE_KEYS.EVENTS, demoEvents);
  }

  if (!getJSON(STORAGE_KEYS.HISTORY, null)) setJSON(STORAGE_KEYS.HISTORY, []);
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
  if (!user || !user.visibleStatuses || user.visibleStatuses.includes("*")) return null;
  return user.visibleStatuses;
}

function requireAuth(options = {}) {
  const { pageModuleKey } = options;
  const user = getCurrentUser();
  if (!user) {
    window.location.href = "index.html";
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
      window.location.href = "index.html";
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

// ---------- SKUPNE FORME ----------

function readMemberForm(form) {
  return {
    priimek: form.priimek.value.trim(),
    ime: form.ime.value.trim(),
    datumRojstva: form.datumRojstva.value,
    naslov: form.naslov.value.trim(),
    posta: (form.posta?.value || "").trim(),  // ✅ NEW
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

  card.querySelector('[data-action="dismiss"]')?.addEventListener("click", () => card.remove());

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
      const shouldFire = t <= now && now - t <= 1000 * 60 * 30;
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
  const statuses = ["AM", "AA", "AP", "AČ", "ZAČ", "AŠI", "DAA", "DAM"];
  const tipKarteChoices = ["Letna", "Dnevna"];

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

  const KRAJ_TO_POSTA = {
    "Mozirje": "3330",
    "Nazarje": "3331",
    "Adlešiči": "8341",
"Ajdovščina": "5270",
"Ankaran/Ancarano": "6280",
"Apače": "9253",
"Artiče": "8253",
"Begunje na Gorenjskem": "4275",
"Begunje pri Cerknici": "1382",
"Beltinci": "9231",
"Benedikt": "2234",
"Bistrica ob Dravi": "2345",
"Bistrica ob Sotli": "3256",
"Bizeljsko": "8259",
"Blagovica": "1223",
"Blanca": "8283",
"Bled": "4260",
"Blejska Dobrava": "4273",
"Bodonci": "9265",
"Bogojina": "9222",
"Bohinjska Bela": "4263",
"Bohinjska Bistrica": "4264",
"Bohinjsko jezero": "4265",
"Borovnica": "1353",
"Boštanj": "8294",
"Bovec": "5230",
"Branik": "5295",
"Braslovče": "3314",
"Breginj": "5223",
"Brestanica": "8280",
"Bresternica": "2354",
"Brezje": "4243",
"Brezovica pri Ljubljani": "1351",
"Brežice": "8250",
"Brnik - aerodrom": "4210",
"Brusnice": "8321",
"Buče": "3255",
"Bučka": "8276",
"Cankova": "9261",
"Celje": "3000",
"Celje - poštni predali": "3001",
"Cerklje na Gorenjskem": "4207",
"Cerklje ob Krki": "8263",
"Cerknica": "1380",
"Cerkno": "5282",
"Cerkvenjak": "2236",
"Ceršak": "2215",
"Cirkovce": "2326",
"Cirkulane": "2282",
"Col": "5273",
"Čatež ob Savi": "8251",
"Čemšenik": "1413",
"Čepovan": "5253",
"Črenšovci": "9232",
"Črna na Koroškem": "2393",
"Črni Kal": "6275",
"Črni Vrh nad Idrijo": "5274",
"Črniče": "5262",
"Črnomelj": "8340",
"Dekani": "6271",
"Deskle": "5210",
"Destrnik": "2253",
"Divača": "6215",
"Dob": "1233",
"Dobje pri Planini": "3224",
"Dobova": "8257",
"Dobovec": "1423",
"Dobravlje": "5263",
"Dobrna": "3204",
"Dobrnič": "8211",
"Dobrova": "1356",
"Dobrovnik/Dobronak": "9223",
"Dobrovo v Brdih": "5212",
"Dol pri Hrastniku": "1431",
"Dol pri Ljubljani": "1262",
"Dole pri Litiji": "1273",
"Dolenja vas": "1331",
"Dolenjske Toplice": "8350",
"Domžale": "1230",
"Dornava": "2252",
"Dornberk": "5294",
"Draga": "1319",
"Dragatuš": "8343",
"Dramlje": "3222",
"Dravograd": "2370",
"Duplje": "4203",
"Dutovlje": "6221",
"Dvor": "8361",
"Fala": "2343",
"Fokovci": "9208",
"Fram": "2313",
"Frankolovo": "3213",
"Gabrovka": "1274",
"Globoko": "8254",
"Godovič": "5275",
"Golnik": "4204",
"Gomilsko": "3303",
"Gorenja vas": "4224",
"Gorica pri Slivnici": "3263",
"Gorišnica": "2272",
"Gornja Radgona": "9250",
"Gornji Grad": "3342",
"Gozd Martuljek": "4282",
"Gračišče": "6272",
"Grad": "9264",
"Gradac": "8332",
"Grahovo": "1384",
"Grahovo ob Bači": "5242",
"Grgar": "5251",
"Griže": "3302",
"Grobelno": "3231",
"Grosuplje": "1290",
"Hajdina": "2288",
"Hinje": "8362",
"Hoče": "2311",
"Hodoš/Hodos": "9205",
"Horjul": "1354",
"Hotedršica": "1372",
"Hrastnik": "1430",
"Hruševje": "6225",
"Hrušica": "4276",
"Idrija": "5280",
"Ig": "1292",
"Ilirska Bistrica": "6250",
"Ilirska Bistrica - Trnovo": "6251",
"Ivančna Gorica": "1295",
"Ivanjkovci": "2259",
"Izlake": "1411",
"Izola/Isola": "6310",
"Jakobski Dol": "2222",
"Jarenina": "2221",
"Jelšane": "6254",
"Jesenice": "4270",
"Jesenice na Dolenjskem": "8261",
"Jurklošter": "3273",
"Jurovski Dol": "2223",
"Juršinci": "2256",
"Kal nad Kanalom": "5214",
"Kalobje": "3233",
"Kamna Gorica": "4246",
"Kamnica": "2351",
"Kamnik": "1241",
"Kanal": "5213",
"Kapele": "8258",
"Kapla": "2362",
"Kidričevo": "2325",
"Kisovec": "1412",
"Knežak": "6253",
"Kobarid": "5222",
"Kobilje": "9227",
"Kočevje": "1330",
"Kočevska Reka": "1338",
"Kog": "2276",
"Kojsko": "5211",
"Komen": "6223",
"Komenda": "1218",
"Koper - Capodistria": "6000",
"Koper - Capodistria - poštni predali": "6001",
"Koprivnica": "8282",
"Kostanjevica na Krasu": "5296",
"Kostanjevica na Krki": "8311",
"Kostel": "1336",
"Košana": "6256",
"Kotlje": "2394",
"Kozina": "6240",
"Kozje": "3260",
"Kranj": "4000",
"Kranj - poštni predali": "4001",
"Kranjska Gora": "4280",
"Kresnice": "1281",
"Križe": "4294",
"Križevci": "9206",
"Križevci pri Ljutomeru": "9242",
"Krka": "1301",
"Krmelj": "8296",
"Kropa": "4245",
"Krška vas": "8262",
"Krško": "8270",
"Kuzma": "9263",
"Laporje": "2318",
"Laško": "3270",
"Laze v Tuhinju": "1219",
"Lenart v Slovenskih goricah": "2230",
"Lendava/Lendva": "9220",
"Lesce": "4248",
"Lesično": "3261",
"Leskovec pri Krškem": "8273",
"Libeliče": "2372",
"Limbuš": "2341",
"Litija": "1270",
"Ljubečna": "3202",
"Ljubljana": "1000",
"Ljubljana - poštni predali": "1001",
"Ljubljana - Črnuče": "1231",
"Ljubljana - Dobrunje": "1261",
"Ljubljana - Polje": "1260",
"Ljubljana - poštni center": "1002",
"Ljubljana - Šentvid": "1210",
"Ljubljana - Šmartno": "1211",
"Ljubno ob Savinji": "3333",
"Ljutomer": "9240",
"Loče": "3215",
"Log pod Mangartom": "5231",
"Log pri Brezovici": "1358",
"Logatec": "1370",
"Loka pri Zidanem Mostu": "1434",
"Loka pri Žusmu": "3223",
"Lokev": "6219",
"Loški Potok": "1318",
"Lovrenc na Dravskem polju": "2324",
"Lovrenc na Pohorju": "2344",
"Luče": "3334",
"Lukovica": "1225",
"Mačkovci": "9202",
"Majšperk": "2322",
"Makole": "2321",
"Mala Nedelja": "9243",
"Malečnik": "2229",
"Marezige": "6273",
"Maribor": "2000",
"Maribor - poštni predali": "2001",
"Marjeta na Dravskem polju": "2206",
"Markovci": "2281",
"Martjanci": "9221",
"Materija": "6242",
"Mavčiče": "4211",
"Medvode": "1215",
"Mengeš": "1234",
"Metlika": "8330",
"Mežica": "2392",
"Miklavž na Dravskem polju": "2204",
"Miklavž pri Ormožu": "2275",
"Miren": "5291",
"Mirna": "8233",
"Mirna Peč": "8216",
"Mislinja": "2382",
"Mojstrana": "4281",
"Mokronog": "8230",
"Moravče": "1251",
"Moravske Toplice": "9226",
"Most na Soči": "5216",
"Motnik": "1221",
"Mozirje": "3330",
"Murska Sobota": "9000",
"Murska Sobota - poštni predali": "9001",
"Muta": "2366",
"Naklo": "4202",
"Nazarje": "3331",
"Notranje Gorice": "1357",
"Nova Cerkev": "3203",
"Nova Gorica": "5000",
"Nova Gorica - poštni predali": "5001",
"Nova vas": "1385",
"Novo mesto": "8000",
"Novo mesto - poštni predali": "8001",
"Obrov": "6243",
"Odranci": "9233",
"Oplotnica": "2317",
"Orehova vas": "2312",
"Ormož": "2270",
"Ortnek": "1316",
"Osilnica": "1337",
"Otočec": "8222",
"Ožbalt": "2361",
"Pernica": "2231",
"Pesnica pri Mariboru": "2211",
"Petrovci": "9203",
"Petrovče": "3301",
"Piran/Pirano": "6330",
"Pišece": "8255",
"Pivka": "6257",
"Planina": "6232",
"Planina pri Sevnici": "3225",
"Pobegi": "6276",
"Podbočje": "8312",
"Podbrdo": "5243",
"Podčetrtek": "3254",
"Podgorci": "2273",
"Podgorje": "6216",
"Podgorje pri Slovenj Gradcu": "2381",
"Podgrad": "6244",
"Podkum": "1414",
"Podlehnik": "2286",
"Podnanos": "5272",
"Podnart": "4244",
"Podplat": "3241",
"Podsreda": "3257",
"Podvelka": "2363",
"Pohorje": "2208",
"Polenšak": "2257",
"Polhov Gradec": "1355",
"Poljane nad Škofjo Loko": "4223",
"Poljčane": "2319",
"Polšnik": "1272",
"Polzela": "3313",
"Ponikva": "3232",
"Portorož/Portorose": "6320",
"Postojna": "6230",
"Pragersko": "2331",
"Prebold": "3312",
"Preddvor": "4205",
"Prem": "6255",
"Preserje": "1352",
"Prestranek": "6258",
"Prevalje": "2391",
"Prevorje": "3262",
"Primskovo": "1276",
"Pristava pri Mestinju": "3253",
"Prosenjakovci/Partosfalva": "9207",
"Prvačina": "5297",
"Ptuj": "2250",
"Ptujska Gora": "2323",
"Puconci": "9201",
"Rače": "2327",
"Radeče": "1433",
"Radenci": "9252",
"Radlje ob Dravi": "2360",
"Radomlje": "1235",
"Radovljica": "4240",
"Raka": "8274",
"Rakek": "1381",
"Rateče - Planica": "4283",
"Ravne na Koroškem": "2390",
"Razkrižje": "9246",
"Rečica ob Savinji": "3332",
"Renče": "5292",
"Ribnica": "1310",
"Ribnica na Pohorju": "2364",
"Rimske Toplice": "3272",
"Rob": "1314",
"Ročinj": "5215",
"Rogaška Slatina": "3250",
"Rogašovci": "9262",
"Rogatec": "3252",
"Rovte": "1373",
"Ruše": "2342",
"Sava": "1282",
"Sečovlje/Sicciole": "6333",
"Selca": "4227",
"Selnica ob Dravi": "2352",
"Semič": "8333",
"Senovo": "8281",
"Senožeče": "6224",
"Sevnica": "8290",
"Sežana": "6210",
"Sladki Vrh": "2214",
"Slap ob Idrijci": "5283",
"Slovenj Gradec": "2380",
"Slovenska Bistrica": "2310",
"Slovenske Konjice": "3210",
"Smlednik": "1216",
"Soča": "5232",
"Sodražica": "1317",
"Solčava": "3335",
"Solkan": "5250",
"Sorica": "4229",
"Sovodenj": "4225",
"Spodnja Idrija": "5281",
"Spodnji Duplek": "2241",
"Spodnji Ivanjci": "9245",
"Središče ob Dravi": "2277",
"Srednja vas v Bohinju": "4267",
"Sromlje": "8256",
"Srpenica": "5224",
"Stahovica": "1242",
"Stara Cerkev": "1332",
"Stari trg ob Kolpi": "8342",
"Stari trg pri Ložu": "1386",
"Starše": "2205",
"Stoperce": "2289",
"Stopiče": "8322",
"Stranice": "3206",
"Straža": "8351",
"Struge": "1313",
"Studenec": "8293",
"Suhor": "8331",
"Sv. Duh na Ostrem Vrhu": "2353",
"Sveta Ana v Slovenskih goricah": "2233",
"Sveta Trojica v Slovenskih goricah": "2235",
"Sveti Jurij ob Ščavnici": "9244",
"Sveti Štefan": "3264",
"Sveti Tomaž": "2258",
"Šalovci": "9204",
"Šempas": "5261",
"Šempeter pri Gorici": "5290",
"Šempeter v Savinjski dolini": "3311",
"Šenčur": "4208",
"Šentilj v Slovenskih goricah": "2212",
"Šentjanž": "8297",
"Šentjanž pri Dravogradu": "2373",
"Šentjernej": "8310",
"Šentjur": "3230",
"Šentrupert": "3271",
"Šentrupert": "8232",
"Šentvid pri Stični": "1296",
"Škocjan": "8275",
"Škofije": "6281",
"Škofja Loka": "4220",
"Škofja vas": "3211",
"Škofljica": "1291",
"Šmarje": "6274",
"Šmarje - Sap": "1293",
"Šmarje pri Jelšah": "3240",
"Šmarješke Toplice": "8220",
"Šmartno na Pohorju": "2315",
"Šmartno ob Dreti": "3341",
"Šmartno ob Paki": "3327",
"Šmartno pri Litiji": "1275",
"Šmartno pri Slovenj Gradcu": "2383",
"Šmartno v Rožni dolini": "3201",
"Šoštanj": "3325",
"Štanjel": "6222",
"Štore": "3220",
"Tabor": "3304",
"Teharje": "3221",
"Tišina": "9251",
"Tolmin": "5220",
"Topolšica": "3326",
"Trbonje": "2371",
"Trbovlje": "1420",
"Trebelno": "8231",
"Trebnje": "8210",
"Trnovo pri Gorici": "5252",
"Trnovska vas": "2254",
"Trojane": "1222",
"Trzin": "1236",
"Tržič": "4290",
"Tržišče": "8295",
"Turjak": "1311",
"Turnišče": "9224",
"Uršna sela": "8323",
"Vače": "1252",
"Velenje": "3320",
"Velenje": "3322",
"Velika Loka": "8212",
"Velika Nedelja": "2274",
"Velika Polana": "9225",
"Velike Lašče": "1315",
"Veliki Gaber": "8213",
"Veržej": "9241",
"Videm - Dobrepolje": "1312",
"Videm pri Ptuju": "2284",
"Vinica": "8344",
"Vipava": "5271",
"Visoko": "4212",
"Višnja Gora": "1294",
"Vitanje": "3205",
"Vitomarci": "2255",
"Vodice": "1217",
"Vojnik": "3212",
"Volčja Draga": "5293",
"Voličina": "2232",
"Vransko": "3305",
"Vremski Britof": "6217",
"Vrhnika": "1360",
"Vuhred": "2365",
"Vuzenica": "2367",
"Zabukovje": "8292",
"Zagorje ob Savi": "1410",
"Zagradec": "1303",
"Zavrč": "2283",
"Zdole": "8272",
"Zgornja Besnica": "4201",
"Zgornja Korena": "2242",
"Zgornja Kungota": "2201",
"Zgornja Ložnica": "2316",
"Zgornja Polskava": "2314",
"Zgornja Velka": "2213",
"Zgornje Gorje": "4247",
"Zgornje Jezersko": "4206",
"Zgornji Leskovec": "2285",
"Zidani Most": "1432",
"Zreče": "3214",
"Žabnica": "4209",
"Žalec": "3310",
"Železniki": "4228",
"Žetale": "2287",
"Žiri": "4226",
"Žirovnica": "4274",
"Žužemberk": "8360",
  };

  const ulice = [
    "Savinja", "Cankarjeva", "Prešernova", "Trubarjeva", "Šolska", "Gozdna",
    "Planinska", "Sončna", "Lipova", "Mladinska", "Rečna", "Travniška"
  ];

  const seed = hashString(DEMO_DATA_VERSION);
  const rnd = mulberry32(seed);

  const members = [];
  const startId = 1;

  for (let i = 0; i < count; i++) {
    const id = startId + i;

    const spc = rnd() < 0.65 ? "M" : "Ž";
    const ime = spc === "M" ? pick(imenaM, rnd) : pick(imenaZ, rnd);
    const priimek = pick(priimki, rnd);

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

    const dob = makeDobForStatus(status, rnd);
    const datumVpisa = randomDateISO(2005, 2025, rnd);
    const clanska = String(100000 + Math.floor(rnd() * 900000));

    const ulica = pick(ulice, rnd);
    const hisna = 1 + Math.floor(rnd() * 120);
    const naslov = `${ulica} ${hisna}`;

    const kraj = pick(kraji, rnd);
    const posta = KRAJ_TO_POSTA[kraj] || ""; 

    const emailUser = `${slug(ime)}.${slug(priimek)}${String(10 + Math.floor(rnd() * 90))}`;
    const email = `${emailUser}@example.com`;

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
      posta,
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
  if (status === "AM" || status === "DAM") return randomDateISO(2008, 2016, rnd);
  if (status === "AŠI") return randomDateISO(2001, 2007, rnd);
  if (status === "AČ" || status === "ZAČ") return randomDateISO(1940, 1960, rnd);
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