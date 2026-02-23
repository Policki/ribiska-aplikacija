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

  function renderUsers() {
    const users = getUsers();
    tbody.innerHTML = "";
    users.forEach((u, index) => {
      const moduleText = u.modules.includes("*") ? "Vsi" : u.modules.join(", ");
      const statusesText = u.visibleStatuses ? u.visibleStatuses.join(", ") : "Vsi";

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

    const modules = Array.from(form.querySelectorAll('input[name="module"]:checked'))
      .map((el) => el.value);

    const visibleStatuses = visibleStatusesInput
      ? visibleStatusesInput.split(",").map((s) => s.trim()).filter(Boolean)
      : ["*"];

    const newUser = {
      username,
      password,
      mustChangePassword: true,
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

document.addEventListener("DOMContentLoaded", () => {
  ensureDemoData();
  const user = requireAuth({ pageModuleKey: "uporabniki" });
  if (!user) return;
  initHeader(user);
  handleUporabnikiPage();
});