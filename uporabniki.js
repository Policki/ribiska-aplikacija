function handleUporabnikiPage() {
  const tbody = document.getElementById("users-tbody");
  const form = document.getElementById("user-form");
  if (!tbody || !form) return;

  const currentUser = requireAuth({ pageModuleKey: "uporabniki" });
  if (!currentUser) return;

  if (!currentUser.permissions?.canManageUsers) {
    alert("Nimate dovoljenja za upravljanje z uporabniki.");
    window.location.href = "dashboard.html";
    return;
  }

  // --- UI refs
  const editUsernameEl = document.getElementById("edit-username");
  const usernameEl = form.username;
  const passwordEl = form.password;

  const btnSubmit = document.getElementById("btn-submit");
  const btnCancelEdit = document.getElementById("btn-cancel-edit");
  const btnCloseView = document.getElementById("btn-close-view");
  const formTitle = document.getElementById("form-title");
  const userViewHint = document.getElementById("user-view-hint");

  const statusHost = document.getElementById("status-checks");
  const moduleHost = document.getElementById("module-checks");

  // password tools
  const btnGenPass = document.getElementById("btn-gen-pass");
  const btnTogglePass = document.getElementById("btn-toggle-pass");
  const btnCopyPass = document.getElementById("btn-copy-pass");

  // status quick
  const btnStatusAll = document.getElementById("status-all");
  const btnStatusNone = document.getElementById("status-none");
  const btnStatusCommon = document.getElementById("status-common");

  // modules quick
  const btnModulesAll = document.getElementById("modules-all");
  const btnModulesReadonly = document.getElementById("modules-readonly");
  const btnModulesNone = document.getElementById("modules-none");

  // permissions
  const canEditMembers = document.getElementById("canEditMembers");
  const canArchiveMembers = document.getElementById("canArchiveMembers");
  const canManageUsers = document.getElementById("canManageUsers");
  const canSeeHistory = document.getElementById("canSeeHistory");
  let isViewMode = false;

  // --- Config (same keys as in app)
  const STATUS_OPTIONS = [
    { key: "AA", label: "AA - polnoletni polnopravni" },
    { key: "AM", label: "AM - mladinec" },
    { key: "AP", label: "AP - pripravnik" },
    { key: "AŠI", label: "AŠI - dijak/študent (izpit)" },
    { key: "DAA", label: "DAA - pridružen polnoletni" },
    { key: "DAM", label: "DAM - pridružen mladinec" },
    { key: "AČ", label: "AČ - častni" },
    { key: "ZAČ", label: "ZAČ - zaslužni častni" },
  ];

  const MODULE_OPTIONS = [
    { key: "dashboard", label: "Dashboard" },
    { key: "seznam", label: "Seznam članov" },
    { key: "vpis", label: "Vpis člana" },
    { key: "arhiv", label: "Arhiv članstva" },
    { key: "koledar", label: "Koledar" },
    { key: "uporabniki", label: "Uporabniki" },
    { key: "tiskanje", label: "Tiskanje" },
    { key: "zgodovina", label: "Zgodovina dejanj" },
    { key: "funkcionarji", label: "Funkcionarji" },
    { key: "priznanja", label: "Priznanja" },
    { key: "delovne-ure", label: "Delovne ure" },
    { key: "clanarina", label: "Članarina" },
    { key: "karte-cuvaji", label: "Letne karte in čuvaji" },
    { key: "pripravniki-izpiti", label: "Pripravniki in izpiti" },
    { key: "clanske-izkaznice", label: "Naročilo izkaznic" },
    { key: "obvescanje", label: "Obveščanje" },
    { key: "opazanja-zivali", label: "Opažanja ribojedih ptic" },
  ];

  // --- Build checkboxes
  function buildStatusChecks() {
    statusHost.innerHTML = "";
    STATUS_OPTIONS.forEach((s) => {
      const id = `status_${cssSafe(s.key)}`;
      const label = document.createElement("label");
      label.innerHTML = `<input type="checkbox" data-status="${escapeAttr(s.key)}" id="${id}"> ${s.label}`;
      statusHost.appendChild(label);
    });
  }

  function buildModuleChecks() {
    moduleHost.innerHTML = "";
    MODULE_OPTIONS.forEach((m) => {
      const id = `module_${m.key}`;
      const label = document.createElement("label");
      label.innerHTML = `<input type="checkbox" data-module="${m.key}" id="${id}"> ${m.label}`;
      moduleHost.appendChild(label);
    });
  }

  buildStatusChecks();
  buildModuleChecks();

  // --- Helpers
  function checkedStatuses() {
    const picked = Array.from(statusHost.querySelectorAll('input[type="checkbox"]:checked'))
      .map((el) => el.getAttribute("data-status"))
      .filter(Boolean);
    return picked;
  }

  function setCheckedStatuses(list) {
    const set = new Set(list || []);
    statusHost.querySelectorAll('input[type="checkbox"]').forEach((el) => {
      const k = el.getAttribute("data-status");
      el.checked = set.has(k);
    });
  }

  function checkedModules() {
    const picked = Array.from(moduleHost.querySelectorAll('input[type="checkbox"]:checked'))
      .map((el) => el.getAttribute("data-module"))
      .filter(Boolean);
    return picked;
  }

  function setCheckedModules(list) {
    const set = new Set(list || []);
    moduleHost.querySelectorAll('input[type="checkbox"]').forEach((el) => {
      const k = el.getAttribute("data-module");
      el.checked = set.has(k);
    });
  }

  function resetFormToAdd() {
    isViewMode = false;
    editUsernameEl.value = "";
    formTitle.textContent = "Dodaj uporabnika";
    btnSubmit.textContent = "DODAJ UPORABNIKA";
    btnSubmit.style.display = "";
    btnCancelEdit.style.display = "none";
    btnCloseView.style.display = "none";
    userViewHint.style.display = "none";

    form.reset();
    usernameEl.disabled = false;
    form.querySelectorAll("input, select").forEach((el) => {
      el.disabled = false;
    });
    form.querySelectorAll("button").forEach((el) => {
      if (el.id === "btn-submit" || el.id === "btn-cancel-edit" || el.id === "btn-close-view") return;
      el.disabled = false;
    });
    // default: basic module dashboard
    setCheckedModules(["dashboard"]);
    // statuses: empty means all -> we leave all unchecked
    setCheckedStatuses([]);
  }

  function fillFormForEdit(user) {
    isViewMode = false;
    editUsernameEl.value = user.username;
    formTitle.textContent = `Uredi uporabnika: ${user.username}`;
    btnSubmit.textContent = "SHRANI SPREMEMBE";
    btnSubmit.style.display = "";
    btnCancelEdit.style.display = "inline-block";
    btnCloseView.style.display = "none";
    userViewHint.style.display = "none";

    usernameEl.value = user.username;
    usernameEl.disabled = true;

    passwordEl.value = user.password || "";
    // statuses
    if (!user.visibleStatuses || user.visibleStatuses.includes("*")) {
      setCheckedStatuses([]); // empty = all
    } else {
      setCheckedStatuses(user.visibleStatuses);
    }

    // modules
    if (user.modules?.includes("*")) {
      // show as all checked (UX)
      setCheckedModules(MODULE_OPTIONS.map((m) => m.key));
    } else {
      setCheckedModules(user.modules || []);
    }

    // permissions
    canEditMembers.checked = !!user.permissions?.canEditMembers;
    canArchiveMembers.checked = !!user.permissions?.canArchiveMembers;
    canManageUsers.checked = !!user.permissions?.canManageUsers;
    canSeeHistory.checked = !!user.permissions?.canSeeHistory;
  }

  function fillFormForView(user) {
    fillFormForEdit(user);
    isViewMode = true;
    formTitle.textContent = `Podroben pogled: ${user.username}`;
    btnSubmit.style.display = "none";
    btnCancelEdit.style.display = "none";
    btnCloseView.style.display = "inline-block";
    userViewHint.style.display = "block";

    form.querySelectorAll("input, select").forEach((el) => {
      el.disabled = true;
    });
    form.querySelectorAll("button").forEach((el) => {
      if (el.id === "btn-close-view") return;
      el.disabled = true;
    });
  }

  function isSelf(username) {
    return String(username || "") === String(currentUser.username || "");
  }

  function renderUsers() {
    const users = getUsers();
    tbody.innerHTML = "";

    users.forEach((u, index) => {
      const modulesText = u.modules?.includes("*") ? "Vsi" : (u.modules || []).join(", ");
      const statusesText = (!u.visibleStatuses || u.visibleStatuses.includes("*")) ? "Vsi" : u.visibleStatuses.join(", ");

      const perms = u.permissions || {};
      const permsBadges = [
        perms.canEditMembers ? `<span class="badge ok">Urejanje</span>` : `<span class="badge neutral">Brez urejanja</span>`,
        perms.canArchiveMembers ? `<span class="badge ok">Arhiv</span>` : `<span class="badge neutral">Brez arhiva</span>`,
        perms.canSeeHistory ? `<span class="badge ok">Zgodovina</span>` : `<span class="badge neutral">Brez zgodovine</span>`,
        perms.canManageUsers ? `<span class="badge warn">Uporabniki</span>` : `<span class="badge neutral">Brez uporabnikov</span>`,
      ].join(" ");

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${index + 1}</td>
        <td style="font-weight:900;">${escapeHtml(u.username)}</td>
        <td>${escapeHtml(modulesText)}</td>
        <td>${escapeHtml(statusesText)}</td>
        <td>${permsBadges}</td>
        <td class="table-actions">
          <span class="action-icon edit" title="Uredi">✎</span>
          <span class="action-icon delete" title="Izbriši">🗑</span>
        </td>
      `;

      tr.querySelector(".edit").addEventListener("click", () => {
        fillFormForEdit(u);
      });

      tr.querySelector(".delete").addEventListener("click", () => {
        if (u.username === "admin") {
          alert("Admina ne moreš izbrisati.");
          return;
        }
        if (isSelf(u.username)) {
          alert("Ne moreš izbrisati samega sebe.");
          return;
        }
        if (confirm(`Izbrišem uporabnika "${u.username}"?`)) {
          const list = getUsers().filter((x) => x.username !== u.username);
          saveUsers(list);
          addHistory("Uporabniki", `Izbrisan uporabnik ${u.username}.`);
          renderUsersWithView();
          resetFormToAdd();
          usernameEl.disabled = false;
        }
      });

      tbody.appendChild(tr);
    });
  }

  function renderUsersWithView() {
    const users = getUsers();
    tbody.innerHTML = "";
    const mobileHost = document.getElementById("users-mobile-cards");
    if (mobileHost) mobileHost.innerHTML = "";

    users.forEach((u, index) => {
      const modulesText = u.modules?.includes("*") ? "Vsi" : (u.modules || []).join(", ");
      const statusesText = (!u.visibleStatuses || u.visibleStatuses.includes("*")) ? "Vsi" : u.visibleStatuses.join(", ");

      const perms = u.permissions || {};
      const permsBadges = [
        perms.canEditMembers ? `<span class="badge ok">Urejanje</span>` : `<span class="badge neutral">Brez urejanja</span>`,
        perms.canArchiveMembers ? `<span class="badge ok">Arhiv</span>` : `<span class="badge neutral">Brez arhiva</span>`,
        perms.canSeeHistory ? `<span class="badge ok">Zgodovina</span>` : `<span class="badge neutral">Brez zgodovine</span>`,
        perms.canManageUsers ? `<span class="badge warn">Uporabniki</span>` : `<span class="badge neutral">Brez uporabnikov</span>`,
      ].join(" ");

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${index + 1}</td>
        <td style="font-weight:900;">${escapeHtml(u.username)}</td>
        <td>${escapeHtml(modulesText)}</td>
        <td>${escapeHtml(statusesText)}</td>
        <td>${permsBadges}</td>
        <td class="table-actions">
          <span class="action-icon view" title="Podroben pogled">👁</span>
          <span class="action-icon edit" title="Uredi">✎</span>
          <span class="action-icon delete" title="Izbriši">🗑</span>
        </td>
      `;

      tr.querySelector(".view").addEventListener("click", () => {
        fillFormForView(u);
      });

      tr.querySelector(".edit").addEventListener("click", () => {
        fillFormForEdit(u);
      });

      tr.querySelector(".delete").addEventListener("click", () => {
        if (u.username === "admin") {
          alert("Admina ne moreš izbrisati.");
          return;
        }
        if (isSelf(u.username)) {
          alert("Ne moreš izbrisati samega sebe.");
          return;
        }
        if (confirm(`Izbrišem uporabnika "${u.username}"?`)) {
          const list = getUsers().filter((x) => x.username !== u.username);
          saveUsers(list);
          addHistory("Uporabniki", `Izbrisan uporabnik ${u.username}.`);
          renderUsersWithView();
          resetFormToAdd();
          usernameEl.disabled = false;
        }
      });

      tbody.appendChild(tr);

      if (mobileHost) {
        const card = document.createElement("article");
        card.className = "member-mobile-card";
        card.innerHTML = `
          <div class="member-mobile-card__head">
            <div>
              <div class="member-mobile-card__name">${escapeHtml(u.username)}</div>
              <div class="member-mobile-card__meta">
                <span class="badge neutral">${u.modules?.includes("*") ? "Vsi moduli" : `${(u.modules || []).length} modulov`}</span>
                <span class="badge neutral">${(!u.visibleStatuses || u.visibleStatuses.includes("*")) ? "Vsi statusi" : `${u.visibleStatuses.length} statusov`}</span>
              </div>
            </div>
            <div class="member-mobile-card__index">#${index + 1}</div>
          </div>
          <div class="member-mobile-card__body">
            <div class="member-mobile-card__row">
              <span>Moduli</span>
              <strong>${escapeHtml(modulesText || "-")}</strong>
            </div>
            <div class="member-mobile-card__row">
              <span>Vidni statusi</span>
              <strong>${escapeHtml(statusesText || "-")}</strong>
            </div>
            <div class="member-mobile-card__row">
              <span>Pravice</span>
              <strong>${escapeHtml([
                perms.canEditMembers ? "Urejanje" : null,
                perms.canArchiveMembers ? "Arhiv" : null,
                perms.canSeeHistory ? "Zgodovina" : null,
                perms.canManageUsers ? "Uporabniki" : null,
              ].filter(Boolean).join(", ") || "Osnovne")}</strong>
            </div>
          </div>
          <div class="member-mobile-card__actions">
            <button type="button" class="btn btn-secondary mobile-view">Podroben pogled</button>
            <button type="button" class="btn btn-primary mobile-edit">Uredi</button>
            <button type="button" class="btn btn-secondary mobile-delete">Izbriši</button>
          </div>
        `;

        card.querySelector(".mobile-view")?.addEventListener("click", () => fillFormForView(u));
        card.querySelector(".mobile-edit")?.addEventListener("click", () => fillFormForEdit(u));
        card.querySelector(".mobile-delete")?.addEventListener("click", () => tr.querySelector(".delete")?.click());
        mobileHost.appendChild(card);
      }
    });
  }

  // --- Password buttons
  btnGenPass.addEventListener("click", () => {
    passwordEl.value = generatePassword(12);
    passwordEl.focus();
  });

  btnTogglePass.addEventListener("click", () => {
    const isPwd = passwordEl.type === "password";
    passwordEl.type = isPwd ? "text" : "password";
    btnTogglePass.textContent = isPwd ? "Skrij" : "Pokaži";
  });

  btnCopyPass.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(passwordEl.value || "");
      alert("Geslo kopirano.");
    } catch {
      alert("Kopiranje ni uspelo (brskalnik).");
    }
  });

  // --- Quick status actions
  btnStatusAll.addEventListener("click", () => setCheckedStatuses(STATUS_OPTIONS.map((s) => s.key)));
  btnStatusNone.addEventListener("click", () => setCheckedStatuses([]));
  btnStatusCommon.addEventListener("click", () => setCheckedStatuses(["AA", "AM", "AP"]));

  // --- Quick modules actions
  btnModulesAll.addEventListener("click", () => setCheckedModules(MODULE_OPTIONS.map((m) => m.key)));
  btnModulesNone.addEventListener("click", () => setCheckedModules([]));
  btnModulesReadonly.addEventListener("click", () => setCheckedModules(["dashboard", "seznam", "koledar"]));

  // --- Cancel edit
  btnCancelEdit.addEventListener("click", () => {
    usernameEl.disabled = false;
    resetFormToAdd();
  });

  btnCloseView.addEventListener("click", () => {
    resetFormToAdd();
  });

  // --- Initial render
  renderUsersWithView();
  resetFormToAdd();

  // --- Submit (add or edit)
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (isViewMode) return;

    const editing = !!editUsernameEl.value;
    const username = String(usernameEl.value || "").trim();
    const password = String(passwordEl.value || "").trim();

    if (!username || !password) {
      alert("Vnesi uporabniško ime in začasno geslo.");
      return;
    }
    if (!/^[a-zA-Z0-9._-]{2,30}$/.test(username)) {
      alert("Uporabniško ime naj bo 2-30 znakov (črke/številke/._-), brez presledkov.");
      return;
    }

    // modules
    const modulesPicked = checkedModules();
    const allModulesPicked = modulesPicked.length === MODULE_OPTIONS.length;
    const modules = allModulesPicked ? ["*"] : (modulesPicked.length ? modulesPicked : ["dashboard"]);

    // statuses
    const statusesPicked = checkedStatuses();
    const visibleStatuses = statusesPicked.length ? statusesPicked : ["*"];

    // permissions
    const permissions = {
      canEditMembers: canEditMembers.checked,
      canArchiveMembers: canArchiveMembers.checked,
      canManageUsers: canManageUsers.checked,
      canSeeHistory: canSeeHistory.checked,
    };

    const users = getUsers();

    if (!editing) {
      if (users.some((u) => u.username === username)) {
        alert("Uporabnik s tem imenom že obstaja.");
        return;
      }

      const newUser = {
        username,
        password,
        mustChangePassword: true,
        modules,
        permissions,
        visibleStatuses,
      };

      users.push(newUser);
      saveUsers(users);
      addHistory("Uporabniki", `Dodani uporabnik ${username}.`);
      renderUsersWithView();
      resetFormToAdd();
      return;
    }

    // editing
    const target = users.find((u) => u.username === editUsernameEl.value);
    if (!target) {
      alert("Uporabnika ni mogoče najti (osveži stran).");
      return;
    }

    // varovalo: če urejaš sebe, si ne smeš vzeti canManageUsers
    if (isSelf(target.username) && target.permissions?.canManageUsers && !permissions.canManageUsers) {
      alert("Ne moreš si odvzeti pravice 'Lahko upravlja uporabnike'.");
      return;
    }

    target.password = password;
    target.mustChangePassword = true;
    target.modules = modules;
    target.permissions = permissions;
    target.visibleStatuses = visibleStatuses;

    saveUsers(users);
    addHistory("Uporabniki", `Urejen uporabnik ${target.username}.`);

    renderUsersWithView();
    usernameEl.disabled = false;
    resetFormToAdd();
  });
}

/* ---------- helpers ---------- */

function generatePassword(len = 12) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

function cssSafe(s) {
  return String(s)
    .replaceAll("Š", "S")
    .replaceAll("Č", "C")
    .replaceAll("Ž", "Z")
    .replaceAll("š", "s")
    .replaceAll("č", "c")
    .replaceAll("ž", "z");
}
function escapeAttr(s) {
  return String(s).replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/* ---------- init ---------- */

document.addEventListener("DOMContentLoaded", () => {
  ensureDemoData();
  const user = requireAuth({ pageModuleKey: "uporabniki" });
  if (!user) return;

  initHeader(user);
  renderAppNav(user, "uporabniki");
  handleUporabnikiPage();
  startReminderWatcher();

  const el = document.getElementById("aktivno-leto");
  if (el && typeof AktivnoLeto === "function") el.textContent = AktivnoLeto();
});
