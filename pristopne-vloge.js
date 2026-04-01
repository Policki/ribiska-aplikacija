function matchesApplicationSearch(application, query) {
  if (!query) return true;
  const haystack = [
    application.priimek,
    application.ime,
    application.telefon,
    application.email,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(query);
}

function toTitleCase(value) {
  return String(value || "")
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function normalizePhone(value) {
  let s = String(value || "").replaceAll(" ", "").replaceAll("-", "");
  if (s.startsWith("00386")) s = `+386${s.slice(5)}`;
  if (s.startsWith("386") && !s.startsWith("+386")) s = `+386${s.slice(3)}`;
  return s;
}

function normalizePosta(value) {
  return String(value || "").replace(/\D/g, "").slice(0, 4);
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeApplicationData(application) {
  return {
    ...application,
    priimek: String(application.priimek || "").trim().toUpperCase(),
    ime: toTitleCase(application.ime || ""),
    krajRojstva: toTitleCase(application.krajRojstva || ""),
    naslov: toTitleCase(application.naslov || ""),
    kraj: toTitleCase(application.kraj || ""),
    posta: normalizePosta(application.posta || ""),
    telefon: normalizePhone(application.telefon || ""),
    email: normalizeEmail(application.email || ""),
    drugaRdNaziv: toTitleCase(application.drugaRdNaziv || ""),
    parentFullName: toTitleCase(application.parentFullName || ""),
  };
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function suggestUniqueClanska(members) {
  const existing = new Set((members || []).map((m) => String(m.clanska || "").trim()));
  for (let i = 0; i < 2000; i += 1) {
    const candidate = String(100000 + Math.floor(Math.random() * 900000));
    if (!existing.has(candidate)) return candidate;
  }
  return String(Date.now()).slice(-6);
}

function getStatusOptions() {
  return ["AA", "AM", "AP", "AŠI", "DAA", "DAM", "AČ", "ZAČ"];
}

function readAdminMemberData(application, card) {
  return {
    status: card.querySelector(".application-admin-status")?.value || "",
    clanska: String(card.querySelector(".application-admin-clanska")?.value || "").trim(),
    datumVpisa: card.querySelector(".application-admin-datum-vpisa")?.value || application.datumVloge || todayISO(),
    potrebujeIzkaznico: !!card.querySelector(".application-admin-izkaznica")?.checked,
  };
}

function validateAdminMemberData(data, members, linkedMemberId) {
  if (!data.status) return "Izberite status člana.";
  if (!/^\d{6,7}$/.test(data.clanska)) return "Članska številka mora vsebovati 6-7 številk.";
  const duplicate = (members || []).some(
    (member) => member.id !== linkedMemberId && String(member.clanska || "").trim() === data.clanska
  );
  if (duplicate) return "Ta članska številka že obstaja.";
  if (!data.datumVpisa) return "Datum vpisa je obvezen.";
  return null;
}

function maybeRestoreArchivedApplicationMember(application, memberDraft) {
  const archived = typeof findArchivedMemberCandidate === "function" ? findArchivedMemberCandidate(application) : null;
  if (!archived) return null;

  const archiveLocation =
    typeof describeArchivedMemberLocation === "function"
      ? describeArchivedMemberLocation(archived)
      : "Arhiv članstva";

  const shouldRestore = confirm(
    [
      `V arhivu že obstaja verjetno enak član: ${archived.ime || ""} ${archived.priimek || ""}`.trim(),
      archived.datumRojstva ? `Datum rojstva: ${archived.datumRojstva}` : null,
      `Najden v: ${archiveLocation}`,
      "",
      "Ali ga želiš vrniti med aktivne?",
    ]
      .filter(Boolean)
      .join("\n")
  );

  if (!shouldRestore) return null;

  const restored =
    typeof restoreArchivedMemberWithData === "function"
      ? restoreArchivedMemberWithData(archived.id, memberDraft, { ponovniVpisOd: memberDraft.datumVpisa || todayISO() })
      : null;

  return restored || { blocked: true };
}

function upsertMemberFromApplication(application, adminData) {
  const members = getMembers();
  const normalizedApplication = normalizeApplicationData(application);
  const linkedMemberId = Number(application.memberId || 0) || null;
  const validationPool = linkedMemberId ? members : members.filter((member) => !member.arhiviran);
  const validationError = validateAdminMemberData(adminData, validationPool, linkedMemberId);

  if (validationError) {
    alert(validationError);
    return null;
  }

  const nextId = members.length ? Math.max(...members.map((member) => member.id || 0)) + 1 : 1;
  const memberId = linkedMemberId || nextId;
  const existingIndex = linkedMemberId ? members.findIndex((member) => member.id === linkedMemberId) : -1;

  const member = {
    id: memberId,
    zapSt: existingIndex >= 0 ? members[existingIndex].zapSt || memberId : memberId,
    arhiviran: false,
    avatar: normalizedApplication.fotografija || null,
    izkaznicaUrejena: adminData.potrebujeIzkaznico ? false : undefined,
    telefonVpisan: normalizedApplication.telefon ? false : true,
    priimek: normalizedApplication.priimek,
    ime: normalizedApplication.ime,
    datumRojstva: normalizedApplication.datumRojstva || "",
    naslov: normalizedApplication.naslov,
    posta: normalizedApplication.posta,
    kraj: normalizedApplication.kraj,
    telefon: normalizedApplication.telefon,
    email: normalizedApplication.email,
    tipKarte: normalizedApplication.tipKarte || "navadna",
    datumVpisa: adminData.datumVpisa,
    status: adminData.status,
    spc: normalizedApplication.spol || "",
    clanska: adminData.clanska,
    ribiskiIzpit: normalizedApplication.ribiskiIzpitStatus === "da",
    datumRibiskegaIzpita: normalizedApplication.datumRibiskegaIzpita || "",
    potrebujeIzkaznico: adminData.potrebujeIzkaznico,
  };

  if (existingIndex === -1) {
    const validationError = validateAdminMemberData(adminData, members, null);
    if (validationError) {
      alert(validationError);
      return null;
    }

    const restoredMember = maybeRestoreArchivedApplicationMember(normalizedApplication, member);
    if (restoredMember?.blocked) return null;
    if (restoredMember?.id) return restoredMember;
  }

  if (existingIndex >= 0) {
    members[existingIndex] = {
      ...members[existingIndex],
      ...member,
    };
  } else {
    members.push(member);
  }

  saveMembers(members);
  return member;
}

function renderApplicationCard(application, user, render) {
  const normalizedApplication = normalizeApplicationData(application);
  const members = getMembers();
  const linkedMember = normalizedApplication.memberId
    ? members.find((member) => member.id === normalizedApplication.memberId)
    : null;
  const defaultStatus = linkedMember?.status || normalizedApplication.suggestedStatus || "";
  const defaultClanska = linkedMember?.clanska || suggestUniqueClanska(members);
  const defaultDatumVpisa = linkedMember?.datumVpisa || normalizedApplication.datumVpisa || normalizedApplication.datumVloge || todayISO();
  const defaultIzkaznica =
    typeof linkedMember?.potrebujeIzkaznico === "boolean"
      ? linkedMember.potrebujeIzkaznico
      : normalizedApplication.tipKarte === "eLRD";

  const card = document.createElement("article");
  card.className = "member-mobile-card application-admin-card";
  card.innerHTML = `
    <div class="member-mobile-card__head">
      <div>
        <div class="member-mobile-card__name">${escapeHtml(normalizedApplication.priimek || "")} ${escapeHtml(normalizedApplication.ime || "")}</div>
        <div class="member-mobile-card__meta">
          <span class="badge ${normalizedApplication.adminConfirmedAt ? "ok" : "warn"}">${normalizedApplication.adminConfirmedAt ? "Potrjeno" : "Čaka na potrditev"}</span>
          <span class="badge neutral">${escapeHtml(normalizedApplication.datumVloge || (normalizedApplication.submittedAt || "").slice(0, 10))}</span>
          ${linkedMember ? `<span class="badge neutral">V seznamu: ${escapeHtml(linkedMember.clanska || "")}</span>` : ""}
        </div>
      </div>
    </div>
    <div class="member-mobile-card__body">
      <div class="member-mobile-card__row"><span>Telefon</span><strong>${escapeHtml(normalizedApplication.telefon || "-")}</strong></div>
      <div class="member-mobile-card__row"><span>E-mail</span><strong>${escapeHtml(normalizedApplication.email || "-")}</strong></div>
      <div class="member-mobile-card__row"><span>Naslov</span><strong>${escapeHtml([normalizedApplication.naslov, normalizedApplication.posta, normalizedApplication.kraj].filter(Boolean).join(", ") || "-")}</strong></div>
      <div class="member-mobile-card__row"><span>Tip karte</span><strong>${escapeHtml(normalizedApplication.tipKarte || "-")}</strong></div>
    </div>
    <div class="application-admin-grid">
      <label class="application-admin-field">
        <span>Status za seznam</span>
        <select class="application-admin-status">
          <option value="">Izberi status...</option>
          ${getStatusOptions()
            .map((status) => `<option value="${status}" ${status === defaultStatus ? "selected" : ""}>${status}</option>`)
            .join("")}
        </select>
      </label>
      <label class="application-admin-field">
        <span>Članska številka</span>
        <input type="text" class="application-admin-clanska" inputmode="numeric" maxlength="7" value="${escapeHtml(defaultClanska)}" />
      </label>
      <label class="application-admin-field">
        <span>Datum vpisa</span>
        <input type="date" class="application-admin-datum-vpisa" value="${escapeHtml(defaultDatumVpisa)}" />
      </label>
      <label class="application-admin-field application-admin-field--toggle">
        <span>Naročilo izkaznice</span>
        <input type="checkbox" class="application-admin-izkaznica" ${defaultIzkaznica ? "checked" : ""} />
      </label>
    </div>
    <div class="member-mobile-card__actions">
      <button type="button" class="btn btn-secondary btn-print">Natisni izjavo</button>
      <button type="button" class="btn btn-primary btn-save-member">${linkedMember ? "Shrani spremembe" : "Shrani v seznam"}</button>
    </div>
  `;

  card.querySelector(".application-admin-clanska")?.addEventListener("input", (event) => {
    event.target.value = String(event.target.value || "").replace(/\D/g, "").slice(0, 7);
  });

  card.querySelector(".btn-print")?.addEventListener("click", () => {
    window.open(`pristopna-izjava-tisk.html?id=${normalizedApplication.id}`, "_blank");
  });

  card.querySelector(".btn-save-member")?.addEventListener("click", () => {
    const adminData = readAdminMemberData(normalizedApplication, card);
    const member = upsertMemberFromApplication(normalizedApplication, adminData);
    if (!member) return;

    const applicationsAll = getMembershipApplications();
    const idx = applicationsAll.findIndex((item) => item.id === normalizedApplication.id);
    if (idx === -1) return;

    applicationsAll[idx] = {
      ...normalizeApplicationData(applicationsAll[idx]),
      adminConfirmedAt: new Date().toISOString(),
      adminConfirmedBy: user.username,
      memberId: member.id,
      suggestedStatus: adminData.status,
      datumVpisa: adminData.datumVpisa,
    };

    saveMembershipApplications(applicationsAll);
    addHistory(
      "Pristopna izjava",
      `Admin ${user.username} je shranil pristopno izjavo za ${member.ime} ${member.priimek} v seznam članov (št. ${member.clanska}).`
    );
    render();
  });

  return card;
}

document.addEventListener("DOMContentLoaded", () => {
  ensureDemoData();
  const user = requireAuth({ pageModuleKey: "dashboard" });
  if (!user) return;

  initHeader(user);
  renderAppNav(user, "dashboard");
  startReminderWatcher();

  const yearEl = document.getElementById("aktivno-leto");
  if (yearEl) yearEl.textContent = AktivnoLeto();

  const host = document.getElementById("applications-list");
  const search = document.getElementById("application-search");
  if (!host || !search) return;

  const render = () => {
    const query = search.value.trim().toLowerCase();
    const applications = getMembershipApplications()
      .map(normalizeApplicationData)
      .filter((application) => matchesApplicationSearch(application, query))
      .sort((a, b) => String(b.submittedAt || "").localeCompare(String(a.submittedAt || "")));

    host.innerHTML = "";

    if (!applications.length) {
      host.innerHTML = `<article class="member-mobile-card"><div class="member-mobile-card__name">Trenutno ni oddanih pristopnih izjav.</div></article>`;
      return;
    }

    applications.forEach((application) => {
      host.appendChild(renderApplicationCard(application, user, render));
    });
  };

  search.addEventListener("input", render);
  render();
});
