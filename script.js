// ---------- POMOŽNE FUNKCIJE LOCALSTORAGE ----------

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

function getUsers() {
  return getJSON(STORAGE_KEYS.USERS, []);
}

function saveUsers(users) {
  setJSON(STORAGE_KEYS.USERS, users);
}


// ---------- DEMO PODATKI PRI PRVEM ZAGONU ----------

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

    // DEMO UPORABNIK – ADMIN
  if (!getJSON(STORAGE_KEYS.USERS, null)) {
    const demoUsers = [
      {
        username: "admin",
        password: "admin",          // prijava: admin / admin
        mustChangePassword: false,  
        modules: ["*"],             // vidi vse
        permissions: {
          canEditMembers: true,
          canArchiveMembers: true,
          canManageUsers: true,
          canSeeHistory: true,
        },
        visibleStatuses: ["*"],     // vidi vse člane
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
  
  if (!getJSON(STORAGE_KEYS.OFFICIALS, null)) {
    setJSON(STORAGE_KEYS.OFFICIALS, []);
  }
  if (!getJSON(STORAGE_KEYS.WORK_HOURS, null)) setJSON(STORAGE_KEYS.WORK_HOURS, {});
  if (!getJSON(STORAGE_KEYS.FEES, null)) setJSON(STORAGE_KEYS.FEES, {});
  if (!getJSON(STORAGE_KEYS.LICENSES, null)) setJSON(STORAGE_KEYS.LICENSES, []);
  if (!getJSON(STORAGE_KEYS.GUARDS, null)) setJSON(STORAGE_KEYS.GUARDS, []);

}

//-----------uporabniki za role------
// vrne poln objekt trenutnega uporabnika
function getCurrentUser() {
  const raw = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
  if (!raw) return null;
  try {
    const stored = JSON.parse(raw); // { username: "nekdo" }
    const users = getUsers();
    return users.find((u) => u.username === stored.username) || null;
  } catch {
    return null;
  }
}

function userHasModule(user, moduleKey) {
  if (!moduleKey) return true;
  if (!user.modules || user.modules.includes("*")) return true;
  return user.modules.includes(moduleKey);
}

function getUserVisibleStatuses(user) {
  if (!user || !user.visibleStatuses || user.visibleStatuses.includes("*")) {
    return null; // null = vidi vse
  }
  return user.visibleStatuses;
}


// ---------- ZGODOVINA ----------

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

// ---------- LOGIN / AUTH ----------

function handleLoginPage() {
  const form = document.getElementById("login-form");
  if (!form) return;

  const errorBox = document.getElementById("login-error");

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const username = form.username.value.trim();
    const password = form.password.value.trim();

    if (!username || !password) {
      errorBox.textContent = "Vnesite uporabniško ime in geslo.";
      return;
    }

    const users = getUsers();
    const user = users.find((u) => u.username === username);

    if (!user || user.password !== password) {
      errorBox.textContent = "Napačno uporabniško ime ali geslo.";
      return;
    }

    // shrani trenutnega
    localStorage.setItem(
      STORAGE_KEYS.CURRENT_USER,
      JSON.stringify({ username: user.username })
    );

    addHistory("Prijava", `Uporabnik ${user.username} se je prijavil.`);

    // če mora zamenjati geslo → na stran za spremembo gesla
    if (user.mustChangePassword) {
      window.location.href = "sprememba-gesla.html";
    } else {
      window.location.href = "dashboard.html";
    }
  });
}
function handleDashboardPage(currentUser) {
  const cards = document.querySelectorAll(".dashboard-card");
  cards.forEach((card) => {
    const moduleKey = card.dataset.module; // npr. "seznam"
    if (!userHasModule(currentUser, moduleKey)) {
      card.style.display = "none";
    }
  });
}


// options: { pageModuleKey?: string }
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

//-----sprememba gesla--------
function handleChangePasswordPage() {
  const form = document.getElementById("change-password-form");
  if (!form) return;

  const user = requireAuth(); // samo prijavljen uporabnik
  if (!user) return;

  const errorBox = document.getElementById("change-pass-error");

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const oldPass = form.oldPassword.value.trim();
    const newPass1 = form.newPassword1.value.trim();
    const newPass2 = form.newPassword2.value.trim();

    if (!oldPass || !newPass1 || !newPass2) {
      errorBox.textContent = "Izpolnite vsa polja.";
      return;
    }

    if (oldPass !== user.password) {
      errorBox.textContent = "Staro geslo ni pravilno.";
      return;
    }

    if (newPass1 !== newPass2) {
      errorBox.textContent = "Novi gesli se ne ujemata.";
      return;
    }

    if (newPass1.length < 4) {
      errorBox.textContent = "Novo geslo naj bo vsaj 4 znake.";
      return;
    }

    const users = getUsers();
    const idx = users.findIndex((u) => u.username === user.username);
    if (idx === -1) {
      errorBox.textContent = "Napaka: uporabnik ne obstaja.";
      return;
    }

    users[idx].password = newPass1;
    users[idx].mustChangePassword = false;
    saveUsers(users);

    addHistory("Sprememba gesla", `Uporabnik ${user.username} je spremenil geslo.`);

    alert("Geslo je bilo uspešno spremenjeno.");
    window.location.href = "dashboard.html";
  });
}

// ---------- ČLANI ----------

function getMembers() {
  return getJSON(STORAGE_KEYS.MEMBERS, []);
}

function saveMembers(members) {
  setJSON(STORAGE_KEYS.MEMBERS, members);
}

function renderMembersTable({ onlyArchived = false } = {}) {
  const tbody = document.getElementById("members-tbody");
  if (!tbody) return;

  const currentUser = getCurrentUser();
  const visibleStatuses = getUserVisibleStatuses(currentUser); // null = vsi

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

    const editBtn = tr.querySelector(".edit");
    editBtn.addEventListener("click", () => {
      window.location.href = `urejanje-clana.html?id=${m.id}`;
    });

    const deleteBtn = tr.querySelector(".delete");
    deleteBtn.addEventListener("click", () => {
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

function handleSeznamPage() {
  renderMembersTable({ onlyArchived: false });
}

function handleArhivPage() {
  renderMembersTable({ onlyArchived: true });
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

function handleVpisClanaPage() {
  const form = document.getElementById("vpis-clana-form");
  if (!form) return;

  const avatarInput = document.getElementById("avatar-input");
  const avatarImg = document.getElementById("avatar-img");
  let avatarDataUrl = null;

  if (avatarInput) {
    avatarInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        avatarDataUrl = ev.target.result;
        avatarImg.src = avatarDataUrl;
      };
      reader.readAsDataURL(file);
    });
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const data = readMemberForm(form);
    const members = getMembers();
    const newId = members.length ? Math.max(...members.map((m) => m.id)) + 1 : 1;

    const member = {
      id: newId,
      zapSt: newId,
      arhiviran: false,
      avatar: avatarDataUrl,
      ...data,
    };

    members.push(member);
    saveMembers(members);
    addHistory(
      "Vpis člana",
      `Dodan član: ${member.ime} ${member.priimek} (št. ${member.clanska}).`
    );
    alert("Član uspešno dodan.");
    window.location.href = "seznam.html";
  });
}

function handleUrejanjeClanaPage() {
  const params = new URLSearchParams(window.location.search);
  const id = Number(params.get("id"));
  if (!id) {
    alert("Manjkajoč ID člana.");
    window.location.href = "seznam.html";
    return;
  }

  const form = document.getElementById("urejanje-clana-form");
  if (!form) return;

  const avatarInput = document.getElementById("avatar-input");
  const avatarImg = document.getElementById("avatar-img");
  let avatarDataUrl = null;

  const members = getMembers();
  const member = members.find((m) => m.id === id);
  if (!member) {
    alert("Član ni najden.");
    window.location.href = "seznam.html";
    return;
  }

  // napolni formo
  form.priimek.value = member.priimek;
  form.ime.value = member.ime;
  form.datumRojstva.value = member.datumRojstva || "";
  form.naslov.value = member.naslov || "";
  form.kraj.value = member.kraj || "";
  form.telefon.value = member.telefon || "";
  form.email.value = member.email || "";
  form.tipKarte.value = member.tipKarte || "";
  form.datumVpisa.value = member.datumVpisa || "";
  form.status.value = member.status || "";
  form.spc.value = member.spc || "";
  form.clanska.value = member.clanska || "";

  avatarDataUrl = member.avatar || null;
  if (avatarDataUrl) {
    avatarImg.src = avatarDataUrl;
  }

  if (avatarInput) {
    avatarInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        avatarDataUrl = ev.target.result;
        avatarImg.src = avatarDataUrl;
      };
      reader.readAsDataURL(file);
    });
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const data = readMemberForm(form);
    const list = getMembers();
    const idx = list.findIndex((m) => m.id === id);
    if (idx === -1) return;

    list[idx] = {
      ...list[idx],
      ...data,
      avatar: avatarDataUrl,
    };

    saveMembers(list);
    addHistory(
      "Urejanje člana",
      `Posodobljen član: ${list[idx].ime} ${list[idx].priimek}.`
    );
    alert("Podatki člana posodobljeni.");
    window.location.href = "seznam.html";
  });
}
// ---------- PRIZNANJA ----------

function handlePriznanjaPage() {
  const selectMember = document.getElementById("award-member");
  const inputName = document.getElementById("award-name");
  const inputYear = document.getElementById("award-year");
  const tbody = document.getElementById("awards-tbody");
  if (!selectMember || !tbody) return;

  function activeMembers() {
    return getMembers().filter((m) => !m.arhiviran);
  }

  function fillMemberSelect(selectedId) {
    const members = activeMembers();
    selectMember.innerHTML = "";
    members.forEach((m) => {
      const opt = document.createElement("option");
      opt.value = m.id;
      opt.textContent = `${m.priimek} ${m.ime} (št. ${m.clanska})`;
      if (selectedId && selectedId === m.id) opt.selected = true;
      selectMember.appendChild(opt);
    });
  }

  function renderTable() {
    const members = activeMembers();
    tbody.innerHTML = "";
    members.forEach((m) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${m.priimek}</td>
        <td>${m.ime}</td>
        <td>${m.lastAwardName || "-"}</td>
        <td>${m.lastAwardYear || "-"}</td>
        <td class="table-actions">
          <span class="action-icon edit" title="Uredi priznanje">✏️</span>
        </td>
      `;
      tr.querySelector(".edit").addEventListener("click", () => {
        // napolni formo za tega člana
        fillMemberSelect(m.id);
        inputName.value = m.lastAwardName || "";
        inputYear.value = m.lastAwardYear || "";
      });
      tbody.appendChild(tr);
    });
  }

  // inicialno
  fillMemberSelect();
  renderTable();

  const form = document.getElementById("award-form");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const memberId = Number(selectMember.value);
    const name = inputName.value.trim();
    const year = inputYear.value.trim();

    if (!memberId || !name || !year) {
      alert("Izberi člana in vpiši naziv priznanja ter leto.");
      return;
    }

    const members = getMembers();
    const idx = members.findIndex((m) => m.id === memberId);
    if (idx === -1) return;

    members[idx].lastAwardName = name;
    members[idx].lastAwardYear = year;
    saveMembers(members);

    addHistory(
      "Priznanje",
      `Članu ${members[idx].ime} ${members[idx].priimek} dodeljeno priznanje "${name}" (${year}).`
    );

    form.reset();
    fillMemberSelect();
    renderTable();
  });
}

// ---------- FUNKCIONARJI ----------

function getOfficials() {
  return getJSON(STORAGE_KEYS.OFFICIALS, []);
}

function saveOfficials(list) {
  setJSON(STORAGE_KEYS.OFFICIALS, list);
}

function handleFunkcionarjiPage() {
  const selectMember = document.getElementById("official-member");
  const selectRole = document.getElementById("official-role");
  const tbody = document.getElementById("officials-tbody");
  const form = document.getElementById("official-form");
  if (!selectMember || !selectRole || !tbody || !form) return;

  function activeMembers() {
    return getMembers().filter((m) => !m.arhiviran);
  }

  function fillMemberSelect() {
    const members = activeMembers();
    selectMember.innerHTML = "";
    members.forEach((m) => {
      const opt = document.createElement("option");
      opt.value = m.id;
      opt.textContent = `${m.priimek} ${m.ime} (št. ${m.clanska})`;
      selectMember.appendChild(opt);
    });
  }

  function renderTable() {
    const officials = getOfficials();
    const members = getMembers();
    tbody.innerHTML = "";

    officials.forEach((o, index) => {
      const member = members.find((m) => m.id === o.memberId);
      const name = member
        ? `${member.priimek} ${member.ime}`
        : "(član ne obstaja)";

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${index + 1}</td>
        <td>${name}</td>
        <td>${o.role}</td>
        <td class="table-actions">
          <span class="action-icon delete" title="Odstrani funkcionarja">🗑️</span>
        </td>
      `;
      tr.querySelector(".delete").addEventListener("click", () => {
        if (!confirm("Odstranim funkcionarja?")) return;
        const list = getOfficials().filter((x) => x.id !== o.id);
        saveOfficials(list);
        addHistory("Funkcionarji", `Odstranjen funkcionar: ${name} (${o.role}).`);
        renderTable();
      });

      tbody.appendChild(tr);
    });
  }

  fillMemberSelect();
  renderTable();

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const memberId = Number(selectMember.value);
    const role = selectRole.value.trim();
    if (!memberId || !role) {
      alert("Izberi člana in funkcijo.");
      return;
    }

    const officials = getOfficials();

    // prepreči dvojnik iste kombinacije
    if (officials.some((o) => o.memberId === memberId && o.role === role)) {
      alert("Ta član že ima to funkcijo.");
      return;
    }

    officials.push({
      id: Date.now(),
      memberId,
      role,
    });
    saveOfficials(officials);

    const member = getMembers().find((m) => m.id === memberId);
    const name = member ? `${member.priimek} ${member.ime}` : "neznan član";

    addHistory("Funkcionarji", `Dodan funkcionar: ${name} (${role}).`);

    renderTable();
  });
}

// ---------- KOLEDAR ----------

function getEvents() {
  return getJSON(STORAGE_KEYS.EVENTS, []);
}

function saveEvents(events) {
  setJSON(STORAGE_KEYS.EVENTS, events);
}

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
    const newEvent = {
      id: Date.now(),
      naslov,
      datum,
      opis,
    };
    events.push(newEvent);
    saveEvents(events);
    addHistory("Dogodek", `Dodano: ${naslov} (${datum}).`);
    form.reset();
    renderEvents();
  });
}

// ---------- UPORABNIKI ----------

function getUsers() {
  return getJSON(STORAGE_KEYS.USERS, []);
}

function saveUsers(users) {
  setJSON(STORAGE_KEYS.USERS, users);
}

function handleUporabnikiPage() {
  const tbody = document.getElementById("users-tbody");
  const form = document.getElementById("user-form");
  if (!tbody || !form) return;

  const currentUser = requireAuth({ pageModuleKey: "uporabniki" });
  if (!currentUser) return;

  // samo tisti, ki imajo pravico, lahko upravljajo uporabnike
  if (!currentUser.permissions || !currentUser.permissions.canManageUsers) {
    alert("Nimate dovoljenja za upravljanje z uporabniki.");
    window.location.href = "dashboard.html";
    return;
  }

  function renderUsers() {
    const users = getUsers();
    tbody.innerHTML = "";
    users.forEach((u, index) => {
      const moduleText = u.modules.includes("*")
        ? "Vsi"
        : u.modules.join(", ");
      const statusesText = u.visibleStatuses
        ? u.visibleStatuses.join(", ")
        : "Vsi";

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${index + 1}</td>
        <td>${u.username}</td>
        <td>${moduleText}</td>
        <td>${statusesText}</td>
        <td class="table-actions">
          <span class="action-icon delete" title="Izbriši">🗑️</span>
        </td>
      `;

      tr.querySelector(".delete").addEventListener("click", () => {
        if (u.username === "admin") {
          alert("Admina ne moreš izbrisati.");
          return;
        }
        if (confirm("Izbrišem uporabnika?")) {
          const list = getUsers().filter((x) => x.username !== u.username);
          saveUsers(list);
          addHistory("Uporabniki", `Izbrisan uporabnik ${u.username}.`);
          renderUsers();
        }
      });

      tbody.appendChild(tr);
    });
  }

  renderUsers();

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const username = form.username.value.trim();
    const password = form.password.value.trim();
    const visibleStatusesInput = form.visibleStatuses.value.trim();

    if (!username || !password) {
      alert("Vnesi uporabniško ime in geslo.");
      return;
    }

    const users = getUsers();
    if (users.some((u) => u.username === username)) {
      alert("Uporabnik s tem imenom že obstaja.");
      return;
    }

    const modules = Array.from(
      form.querySelectorAll('input[name="module"]:checked')
    ).map((el) => el.value);

    const visibleStatuses = visibleStatusesInput
      ? visibleStatusesInput
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : ["*"]; // če prazno -> vidi vse

    const newUser = {
      username,
      password,
      mustChangePassword: true, // obvezna sprememba gesla ob prvi prijavi
      modules: modules.length ? modules : ["dashboard"],

      permissions: {
        canEditMembers: form.canEditMembers.checked,
        canArchiveMembers: form.canArchiveMembers.checked,
        canManageUsers: form.canManageUsers.checked,
        canSeeHistory: form.canSeeHistory.checked,
      },

      visibleStatuses,
    };

    users.push(newUser);
    saveUsers(users);

    addHistory("Uporabniki", `Dodani uporabnik ${username}.`);

    form.reset();
    renderUsers();
  });
}



// ---------- ZGODOVINA DEJANJ ----------

function handleZgodovinaPage() {
  const container = document.getElementById("history-list");
  if (!container) return;

  const history = getJSON(STORAGE_KEYS.HISTORY, []);
  container.innerHTML = "";
  history.forEach((h) => {
    const div = document.createElement("div");
    div.className = "history-item";
    div.innerHTML = `<strong>${h.time}</strong> — ${h.action}<br><small>${h.details}</small>`;
    container.appendChild(div);
  });
}

// ---------- TISKANJE ----------

function handleTiskanjePage() {
  const btnPrintMembers = document.getElementById("btn-print-members");
  if (!btnPrintMembers) return;

  btnPrintMembers.addEventListener("click", () => {
    const currentUser = getCurrentUser();
    const visibleStatuses = getUserVisibleStatuses(currentUser);
    let members = getMembers().filter((m) => !m.arhiviran);
     if (visibleStatuses) {
     members = members.filter((m) => visibleStatuses.includes(m.status));
     }
    const win = window.open("", "_blank");
    const rows = members
    
      .map(
        (m, i) =>
          `<tr><td>${i + 1}</td><td>${m.status}</td><td>${m.spc}</td><td>${
            m.clanska
          }</td><td>${m.priimek}</td><td>${m.ime}</td><td>${m.email}</td><td>${
            m.telefon
          }</td></tr>`
      )
      .join("");
    win.document.write(`
      <html>
        <head>
          <title>Seznam članov - tisk</title>
          <style>
            body { font-family: Arial, sans-serif; }
            h1 { text-align:center; margin-bottom:16px; }
            table { border-collapse: collapse; width: 100%; font-size:12px; }
            th, td { border:1px solid #000; padding:4px 6px; text-align:left; }
            th { background:#eee; }
          </style>
        </head>
        <body>
          <h1>Seznam članov</h1>
          <table>
            <thead>
              <tr><th>#</th><th>STAT</th><th>SPC</th><th>ČLANSK</th><th>PRIIMEK</th><th>IME</th><th>EMAIL</th><th>TELEFON</th></tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
          <script>window.print();</script>
        </body>
      </html>
    `);
    win.document.close();
    addHistory("Tiskanje", "Natisnjen seznam članov.");
  });
}
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

//------------DELOVNE URE---------------
function getWorkHoursYear(year) {
  const all = getJSON(STORAGE_KEYS.WORK_HOURS, {});
  return all[year] || {};
}

function setWorkHoursYear(year, map) {
  const all = getJSON(STORAGE_KEYS.WORK_HOURS, {});
  all[year] = map;
  setJSON(STORAGE_KEYS.WORK_HOURS, all);
}

function handleDelovneUrePage() {
  const year = currentYear();
  const tbody = document.getElementById("workhours-tbody");
  const donut = document.getElementById("workhours-donut");
  const donutText = document.getElementById("workhours-donut-text");
  if (!tbody) return;

  const hoursMap = getWorkHoursYear(year);

  function render() {
    const members = getMembers().filter(m => !m.arhiviran);
    tbody.innerHTML = "";

    // kdo mora opravit ure: age < 70
    const must = [];
    const done = [];

    members.forEach(m => {
      const age = getAge(m.datumRojstva);
      const mustDo = age !== null ? age < 70 : true; // če ne poznamo starosti, privzeto naj šteje
      const hours = Number(hoursMap[m.id] ?? 0);
      const ok = mustDo ? hours >= 10 : true;

      if (mustDo) {
        must.push(m);
        if (hours >= 10) done.push(m);
      }

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${m.priimek}</td>
        <td>${m.ime}</td>
        <td>${age === null ? "-" : age}</td>
        <td>${mustDo ? "DA" : "NE"}</td>
        <td>
          <input type="number" min="0" step="1" value="${hours}" data-member-id="${m.id}" style="width:80px; padding:6px;">
        </td>
        <td>${ok ? "✅" : "❌"}</td>
      `;
      tbody.appendChild(tr);
    });

    // % graf
    const total = must.length;
    const completed = done.length;
    const pct = total === 0 ? 100 : Math.round((completed / total) * 100);

    if (donut && donutText) {
      // “donut” preko conic-gradient (čist CSS, brez canvas)
      donut.style.background = `conic-gradient(#2ecc71 ${pct}%, #e0e0e0 0)`;
      donutText.textContent = `${pct}%`;
      document.getElementById("workhours-stats").textContent =
        `Opravljeno: ${completed}/${total} (število članov, ki morajo opraviti ure)`;
    }

    // listenerji za inpute ur
    tbody.querySelectorAll('input[type="number"][data-member-id]').forEach(inp => {
      inp.addEventListener("change", () => {
        const id = Number(inp.dataset.memberId);
        const val = Math.max(0, Number(inp.value || 0));
        hoursMap[id] = val;
        setWorkHoursYear(year, hoursMap);
      });
    });
  }

  render();
}


//------------ČLANARINA---------------
function feeForStatus(status) {
  const map = { "AA": 180, "AM": 25, "AČ": 70, "ZAČ": 0 };
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

function handleClanarinaPage() {
  const year = currentYear();
  const tbody = document.getElementById("fees-tbody");
  if (!tbody) return;

  const feesMap = getFeesYear(year);

  function render() {
    const members = getMembers().filter(m => !m.arhiviran);
    tbody.innerHTML = "";

    members.forEach(m => {
      const amount = feeForStatus(m.status);
      const color = feesMap[m.id] || ""; // "red" | "green" | ""
      const tr = document.createElement("tr");

      tr.innerHTML = `
        <td>${m.priimek}</td>
        <td>${m.ime}</td>
        <td>${m.naslov || "-"}</td>
        <td>${m.kraj || "-"}</td>
        <td>
          <div class="fee-box ${color}" data-member-id="${m.id}">
            ${amount} €
          </div>
          <div class="fee-picker" data-member-id="${m.id}" style="display:none;">
            <button type="button" class="fee-pick red" title="Neplačano"></button>
            <button type="button" class="fee-pick green" title="Plačano"></button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });

    // klik na znesek pokaže picker
    tbody.querySelectorAll(".fee-box").forEach(box => {
      box.addEventListener("click", () => {
        const id = box.dataset.memberId;
        const picker = tbody.querySelector(`.fee-picker[data-member-id="${id}"]`);
        picker.style.display = picker.style.display === "none" ? "flex" : "none";
      });
    });

    // izbira barve
    tbody.querySelectorAll(".fee-picker .fee-pick").forEach(btn => {
      btn.addEventListener("click", () => {
        const picker = btn.closest(".fee-picker");
        const id = Number(picker.dataset.memberId);
        const color = btn.classList.contains("green") ? "green" : "red";
        feesMap[id] = color;
        setFeesYear(year, feesMap);
        render();
      });
    });
  }

  render();
}

//-------------LETNE KARTE-------------

function getLicenses() {
  return getJSON(STORAGE_KEYS.LICENSES, []);
}
function saveLicenses(list) {
  setJSON(STORAGE_KEYS.LICENSES, list);
}

function handleKarteCuvajiPage() {
  const fileInput = document.getElementById("licenses-file");
  const tbody = document.getElementById("licenses-tbody");
  const form = document.getElementById("license-form");
  if (!tbody || !form) return;

  function render() {
    const list = getLicenses();
    tbody.innerHTML = "";
    list.forEach((x, i) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${i + 1}</td>
        <td>${x.name}</td>
        <td>${x.number}</td>
        <td class="table-actions">
          <span class="action-icon delete" data-id="${x.id}">🗑️</span>
        </td>
      `;
      tbody.appendChild(tr);
    });

    tbody.querySelectorAll(".delete").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = Number(btn.dataset.id);
        const next = getLicenses().filter(x => x.id !== id);
        saveLicenses(next);
        render();
      });
    });
  }

  render();

  // ročno dodajanje
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = form.licenseName.value.trim();
    const number = form.licenseNumber.value.trim();
    if (!name || !number) {
      alert("Vnesi ime in številko dovolilnice.");
      return;
    }
    const list = getLicenses();
    list.push({ id: Date.now(), name, number });
    saveLicenses(list);
    form.reset();
    render();
  });

  // uvoz excel
  if (fileInput) {
    fileInput.addEventListener("change", async () => {
      const file = fileInput.files?.[0];
      if (!file) return;

      // SheetJS mora bit naložen (xlsx)
      if (typeof XLSX === "undefined") {
        alert("Manjka knjižnica XLSX (SheetJS). Dodaj <script> za xlsx.full.min.js.");
        return;
      }

      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

      // pričakujemo: [ [imePriimek, stDovolilnice], ... ]
      const parsed = [];
      for (let r = 0; r < rows.length; r++) {
        const row = rows[r];
        if (!row || row.length < 2) continue;
        const name = String(row[0] ?? "").trim();
        const number = String(row[1] ?? "").trim();
        if (!name || !number) continue;

        parsed.push({ id: Date.now() + r, name, number });
      }

      // zamenjaj ali dodaj? (jaz: zamenjam, ker si rekel “seznam ki se ga uvozi”)
      saveLicenses(parsed);
      render();
      alert(`Uvoženih ${parsed.length} dovolilnic.`);
      fileInput.value = "";
    });
  }
}


// ---------- INIT GLEDE NA STRAN ----------


document.addEventListener("DOMContentLoaded", () => {
  ensureDemoData();

  const page = document.body.dataset.page;

  if (page === "login") {
    handleLoginPage();
    return;
  }

  if (page === "change-password") {
    // stran za spremembo gesla
    handleChangePasswordPage();
    return;
  }

  // mapiranje strani na "module key"
  const PAGE_MODULE_MAP = {
    dashboard: "dashboard",
    seznam: "seznam",
    "vpis-clana": "vpis",
    "urejanje-clana": "seznam",
    "arhiv-clanstva": "arhiv",
    koledar: "koledar",
    funkcionarji: "funkcionarji",
    priznanja: "priznanja",
    uporabniki: "uporabniki",
    tiskanje: "tiskanje",
    zgodovina: "zgodovina",
    "delovne-ure": "delovne-ure",
    clanarina: "clanarina",
    "karte-cuvaji": "karte-cuvaji",

  };
  
  


  const pageModuleKey = PAGE_MODULE_MAP[page];

  const currentUser = requireAuth({ pageModuleKey });
  if (!currentUser) return;

  initHeader(currentUser);


  switch (page) {
    case "dashboard":
    handleDashboardPage(currentUser);
    break;
    case "seznam":
      handleSeznamPage();
      break;
    case "vpis-clana":
      handleVpisClanaPage();
      break;
    case "urejanje-clana":
      handleUrejanjeClanaPage();
      break;
    case "arhiv-clanstva":
      handleArhivPage();
      break;
    case "koledar":
      handleKoledarPage();
      break;
    case "funkcionarji":
      handleFunkcionarjiPage();
      break;
    case "priznanja":
      handlePriznanjaPage();
      break;
    case "uporabniki":
      handleUporabnikiPage();
      break;
    case "tiskanje":
      handleTiskanjePage();
      break;
    case "zgodovina":
      handleZgodovinaPage();
      break;
    case "delovne-ure":
      handleDelovneUrePage();
      break;
    case "clanarina":
      handleClanarinaPage();
      break;
    case "karte-cuvaji":
      handleKarteCuvajiPage();
      break;
  }
});

