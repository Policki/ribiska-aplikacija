function handleChangePasswordPage() {
  const form = document.getElementById("change-password-form");
  if (!form) return;

  const user = requireAuth();
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

document.addEventListener("DOMContentLoaded", () => {
  ensureDemoData();
  const user = requireAuth();
  if (!user) return;
  initHeader(user);
  handleChangePasswordPage();
});