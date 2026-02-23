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
};

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
  const entry = {
    id: Date.now(),
    time: new Date().toLocaleString("sl-SI"),
    action,
    details,
  };
  list.unshift(entry);
  setJSON(STORAGE_KEYS.HISTORY, list);
}

// ---------- DEMO DATA ----------

function ensureDemoData() {
  if (!getJSON(STORAGE_KEYS.MEMBERS, null)) {
    const demoMembers = [
      {
        id: 1,
        zapSt: 1,
        status: "AA",
        spc: "M",
        clanska: "936651",
        priimek: "ATELŠEK",
        ime: "TOMAŽ",
        email: "tomaz.atelsek@example.com",
        telefon: "031649949",
        naslov: "Glavna ulica 1",
        kraj: "Mozirje",
        tipKarte: "Letna",
        datumRojstva: "1985-03-12",
        datumVpisa: "2020-01-10",
        arhiviran: false,
        avatar: null,
      },
      {
        id: 2,
        zapSt: 2,
        status: "AA",
        spc: "M",
        clanska: "865953",
        priimek: "BASTL",
        ime: "JERNEJ",
        email: "jernej.bastl@example.com",
        telefon: "041966005",
        naslov: "Lipova 3",
        kraj: "Šoštanj",
        tipKarte: "Dnevna",
        datumRojstva: "1990-06-02",
        datumVpisa: "2021-03-15",
        arhiviran: false,
        avatar: null,
        lastAwardName: "Bronasto priznanje",
        lastAwardYear: "2023",
      },
    ];
    setJSON(STORAGE_KEYS.MEMBERS, demoMembers);
  }

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

  if (!getJSON(STORAGE_KEYS.EVENTS, null)) {
    const demoEvents = [
      {
        id: 1,
        naslov: "Tekmovanje na Savinji",
        datum: "2025-05-10",
        opis: "Letno tekmovanje v revirju A.",
      },
    ];
    setJSON(STORAGE_KEYS.EVENTS, demoEvents);
  }

  if (!getJSON(STORAGE_KEYS.HISTORY, null)) {
    setJSON(STORAGE_KEYS.HISTORY, []);
  }

  if (!getJSON(STORAGE_KEYS.OFFICIALS, null)) setJSON(STORAGE_KEYS.OFFICIALS, []);
  if (!getJSON(STORAGE_KEYS.WORK_HOURS, null)) setJSON(STORAGE_KEYS.WORK_HOURS, {});
  if (!getJSON(STORAGE_KEYS.FEES, null)) setJSON(STORAGE_KEYS.FEES, {});
  if (!getJSON(STORAGE_KEYS.LICENSES, null)) setJSON(STORAGE_KEYS.LICENSES, []);
  if (!getJSON(STORAGE_KEYS.GUARDS, null)) setJSON(STORAGE_KEYS.GUARDS, []);
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
  const map = { AA: 180, AM: 25, "AČ": 70, "ZAČ": 0 };
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
      <td>${m.status}</td>
      <td>${m.spc}</td>
      <td>${m.clanska}</td>
      <td>${m.priimek}</td>
      <td>${m.ime}</td>
      <td><a href="mailto:${m.email}">${m.email}</a></td>
      <td>${m.telefon}</td>
      <td class="table-actions">
        <span class="action-icon edit" title="Uredi">✏️</span>
        <span class="action-icon delete" title="${
          onlyArchived ? "Izbriši" : "Arhiviraj"
        }">🗑️</span>
      </td>
    `;

    tr.querySelector(".edit").addEventListener("click", () => {
      window.location.href = `urejanje-clana.html?id=${m.id}`;
    });

    tr.querySelector(".delete").addEventListener("click", () => {
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
            addHistory(
              "Izbris člana",
              `${m.ime} ${m.priimek} trajno izbrisan iz arhiva.`
            );
          } else {
            list[idx].arhiviran = true;
            addHistory(
              "Arhiviranje člana",
              `${m.ime} ${m.priimek} premaknjen v arhiv.`
            );
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