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

    localStorage.setItem(
      STORAGE_KEYS.CURRENT_USER,
      JSON.stringify({ username: user.username })
    );

    addHistory("Prijava", `Uporabnik ${user.username} se je prijavil.`);

    if (user.mustChangePassword) {
      window.location.href = "sprememba-gesla.html";
    } else {
      window.location.href = "dashboard.html";
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  ensureDemoData();
  handleLoginPage();
  startReminderWatcher();
});