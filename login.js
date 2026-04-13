function handleLoginPage() {
  const form = document.getElementById("login-form");
  if (!form) return;

  const errorBox = document.getElementById("login-error");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = form.username.value.trim();
    const password = form.password.value.trim();

    if (!username || !password) {
      errorBox.textContent = "Vnesite uporabniško ime in geslo.";
      return;
    }

    const serverUser = await tryServerLogin(username, password);
    if (serverUser) {
      localStorage.setItem(
        STORAGE_KEYS.CURRENT_USER,
        JSON.stringify({ username: serverUser.username })
      );

      const users = getUsers();
      const existingIndex = users.findIndex((u) => u.username === serverUser.username);
      if (existingIndex === -1) users.unshift(serverUser);
      else users[existingIndex] = { ...users[existingIndex], ...serverUser };
      saveUsers(users);

      addHistory("Prijava", `Uporabnik ${serverUser.username} se je prijavil.`);
      window.location.href = serverUser.mustChangePassword ? rdPageUrl("sprememba-gesla.html") : rdPageUrl("dashboard.html");
      return;
    }

    const users = getUsers();
    const user = users.find((u) => u.username === username);
    if (!user || user.password !== password) {
      errorBox.textContent = "Napačno uporabniško ime ali geslo.";
      return;
    }

    localStorage.setItem(
      STORAGE_KEYS.CURRENT_USER,
      JSON.stringify({ username: user.username })
    );

    addHistory("Prijava", `Uporabnik ${user.username} se je prijavil.`);

    if (user.mustChangePassword) {
      window.location.href = rdPageUrl("sprememba-gesla.html");
    } else {
      window.location.href = rdPageUrl("dashboard.html");
    }
  });
}

async function tryServerLogin(username, password) {
  if (window.location.protocol === "file:") return null;

  try {
    const response = await fetch("api/login.php", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ username, password }),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.ok || !payload.user) {
      return null;
    }
    return payload.user;
  } catch {
    return null;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  ensureDemoData();
  handleLoginPage();
  startReminderWatcher();
});
