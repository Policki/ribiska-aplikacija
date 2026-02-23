function handleVpisClanaPage() {
  const form = document.getElementById("vpis-clana-form");
  if (!form) return;

  const avatarInput = document.getElementById("avatar-input");
  const avatarImg = document.getElementById("avatar-img");
  let avatarDataUrl = null;

  if (avatarInput) {
    avatarInput.addEventListener("change", (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        avatarDataUrl = ev.target.result;
        if (avatarImg) avatarImg.src = avatarDataUrl;
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

document.addEventListener("DOMContentLoaded", () => {
  ensureDemoData();
  const user = requireAuth({ pageModuleKey: "vpis" });
  if (!user) return;
  initHeader(user);
  handleVpisClanaPage();
});

document.addEventListener("DOMContentLoaded", () => {
  const _aktivnoLetoEl = document.getElementById('aktivno-leto');
  if (_aktivnoLetoEl) {
    if (typeof AktivnoLeto === 'function') {
      try {
        _aktivnoLetoEl.textContent = AktivnoLeto();
      } catch (err) {
        _aktivnoLetoEl.textContent = '';
      }
    } else {
      _aktivnoLetoEl.textContent = '';
    }
  }
});