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
  const avatarDrop = document.getElementById("avatar-drop");
  const btnAvatarRemove = document.getElementById("btn-avatar-remove");

  const pillClanska = document.getElementById("pill-clanska");

  let avatarDataUrl = null;

  const members = getMembers();
  const member = members.find((m) => m.id === id);
  if (!member) {
    alert("Član ni najden.");
    window.location.href = "seznam.html";
    return;
  }

  // fill form
  form.priimek.value = member.priimek || "";
  form.ime.value = member.ime || "";
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

  if (pillClanska) pillClanska.textContent = member.clanska || "—";

  avatarDataUrl = member.avatar || null;
  if (avatarDataUrl && avatarImg) avatarImg.src = avatarDataUrl;

  // uppercase priimek (live)
  form.priimek.addEventListener("input", () => {
    const start = form.priimek.selectionStart;
    const end = form.priimek.selectionEnd;
    form.priimek.value = (form.priimek.value || "").toUpperCase();
    if (start !== null && end !== null) form.priimek.setSelectionRange(start, end);
  });

  // avatar: click drop -> open file
  if (avatarDrop && avatarInput) {
    avatarDrop.addEventListener("click", () => avatarInput.click());

    avatarDrop.addEventListener("dragover", (e) => {
      e.preventDefault();
      avatarDrop.style.borderColor = "rgba(11,75,75,.7)";
    });
    avatarDrop.addEventListener("dragleave", () => {
      avatarDrop.style.borderColor = "rgba(11,75,75,.35)";
    });
    avatarDrop.addEventListener("drop", (e) => {
      e.preventDefault();
      avatarDrop.style.borderColor = "rgba(11,75,75,.35)";
      const file = e.dataTransfer.files?.[0];
      if (file) loadAvatarFile(file);
    });
  }

  if (avatarInput) {
    avatarInput.addEventListener("change", (e) => {
      const file = e.target.files?.[0];
      if (file) loadAvatarFile(file);
    });
  }

  if (btnAvatarRemove) {
    btnAvatarRemove.addEventListener("click", () => {
      avatarDataUrl = null;
      if (avatarImg) avatarImg.src = "https://via.placeholder.com/300x300.png?text=CLAN";
    });
  }

  function loadAvatarFile(file) {
    if (!file.type.startsWith("image/")) {
      alert("Prosimo izberi sliko (JPG/PNG/WebP).");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      alert("Slika je prevelika. Največ 2 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      avatarDataUrl = ev.target.result;
      if (avatarImg) avatarImg.src = avatarDataUrl;
    };
    reader.readAsDataURL(file);
  }

  // submit
  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const data = readMemberForm(form);

    if (!data.priimek || !data.ime) {
      alert("Priimek in ime sta obvezna.");
      return;
    }
    if (!data.status || !data.spc) {
      alert("Status in SPC sta obvezna.");
      return;
    }

    const list = getMembers();
    const idx = list.findIndex((m) => m.id === id);
    if (idx === -1) return;

    list[idx] = {
      ...list[idx],
      ...data,
      priimek: String(data.priimek || "").toUpperCase(),
      avatar: avatarDataUrl,
    };

    saveMembers(list);
    addHistory("Urejanje člana", `Posodobljen član: ${list[idx].ime} ${list[idx].priimek}.`);
    alert("Podatki člana posodobljeni.");
    window.location.href = "seznam.html";
  });
}

document.addEventListener("DOMContentLoaded", () => {
  ensureDemoData();
  const user = requireAuth({ pageModuleKey: "seznam" });
  if (!user) return;

  initHeader(user);
  renderAppNav(user, "seznam"); // <-- pomembno: pravilno označi aktivni modul
  handleUrejanjeClanaPage();
  startReminderWatcher();

  const el = document.getElementById("aktivno-leto");
  if (el && typeof AktivnoLeto === "function") el.textContent = AktivnoLeto();
});