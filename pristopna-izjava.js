function initSignaturePad(canvas) {
  const ctx = canvas.getContext("2d");
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = "#0b4b4b";

  let drawing = false;
  let hasStroke = false;

  const point = (event) => {
    const rect = canvas.getBoundingClientRect();
    const src = event.touches ? event.touches[0] : event;
    return {
      x: ((src.clientX - rect.left) / rect.width) * canvas.width,
      y: ((src.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const start = (event) => {
    event.preventDefault();
    drawing = true;
    const p = point(event);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  };

  const move = (event) => {
    if (!drawing) return;
    event.preventDefault();
    const p = point(event);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    hasStroke = true;
  };

  const end = () => {
    drawing = false;
  };

  canvas.addEventListener("mousedown", start);
  canvas.addEventListener("mousemove", move);
  window.addEventListener("mouseup", end);
  canvas.addEventListener("touchstart", start, { passive: false });
  canvas.addEventListener("touchmove", move, { passive: false });
  window.addEventListener("touchend", end);

  return {
    clear() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      hasStroke = false;
    },
    toDataURL() {
      return hasStroke ? canvas.toDataURL("image/png") : "";
    },
    hasSignature() {
      return hasStroke;
    },
    async loadDataURL(dataUrl) {
      this.clear();
      if (!dataUrl) return;
      await new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          hasStroke = true;
          resolve();
        };
        img.onerror = () => resolve();
        img.src = dataUrl;
      });
    },
  };
}

function readImageAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      resolve("");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Napaka pri branju slike."));
    reader.readAsDataURL(file);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  ensureDemoData();

  const form = document.getElementById("application-form");
  const posta = document.getElementById("posta");
  const kraj = document.getElementById("kraj");
  const datumVloge = document.getElementById("datumVloge");
  const datumRojstva = document.getElementById("datumRojstva");
  const parentBlock = document.getElementById("parent-consent-block");
  const parentFullName = document.getElementById("parentFullName");
  const drugaRdStatus = document.getElementById("drugaRdStatus");
  const drugaRdFields = document.getElementById("druga-rd-fields");
  const drugaRdDoWrap = document.getElementById("druga-rd-do-wrap");
  const drugaRdOd = document.getElementById("drugaRdOd");
  const drugaRdDo = document.getElementById("drugaRdDo");
  const drugaRdNaziv = document.getElementById("drugaRdNaziv");
  const drugaRdClanska = document.getElementById("drugaRdClanska");
  const ribiskiIzpitStatus = document.getElementById("ribiskiIzpitStatus");
  const datumRibiskegaIzpita = document.getElementById("datumRibiskegaIzpita");
  const ribiskiIzpitDatumWrap = document.getElementById("ribiski-izpit-datum-wrap");
  const fotografija = document.getElementById("fotografija");

  const overlay = document.getElementById("signature-overlay");
  const overlayTitle = document.getElementById("signature-overlay-title");
  const overlayCanvas = document.getElementById("signature-overlay-canvas");
  const btnDone = document.getElementById("btn-signature-done");
  const btnClear = document.getElementById("btn-signature-clear");

  const btnOpenSignature = document.getElementById("btn-open-signature");
  const btnResetSignature = document.getElementById("btn-reset-signature");
  const signaturePreviewWrap = document.getElementById("signature-preview-wrap");
  const signaturePreview = document.getElementById("signature-preview");
  const signatureStatus = document.getElementById("signature-pad-status");

  const btnOpenParentSignature = document.getElementById("btn-open-parent-signature");
  const btnResetParentSignature = document.getElementById("btn-reset-parent-signature");
  const parentSignaturePreviewWrap = document.getElementById("parent-signature-preview-wrap");
  const parentSignaturePreview = document.getElementById("parent-signature-preview");
  const parentSignatureStatus = document.getElementById("parent-signature-status");

  if (!form || !overlayCanvas || !overlay) return;

  if (datumVloge && !datumVloge.value) {
    datumVloge.value = new Date().toISOString().slice(0, 10);
  }

  if (posta && kraj && typeof window.bindPostaKrajAuto === "function") {
    window.bindPostaKrajAuto(posta, kraj);
  }

  const overlayPad = initSignaturePad(overlayCanvas);
  let applicantSignatureData = "";
  let parentSignatureData = "";
  let activeSignatureTarget = "applicant";

  function updateSignaturePreview(target) {
    const isParent = target === "parent";
    const data = isParent ? parentSignatureData : applicantSignatureData;
    const wrap = isParent ? parentSignaturePreviewWrap : signaturePreviewWrap;
    const img = isParent ? parentSignaturePreview : signaturePreview;
    const status = isParent ? parentSignatureStatus : signatureStatus;
    const resetBtn = isParent ? btnResetParentSignature : btnResetSignature;

    if (data) {
      if (img) img.src = data;
      if (wrap) wrap.hidden = false;
      if (resetBtn) resetBtn.hidden = false;
      if (status) status.textContent = "Podpis je uspešno dodan.";
    } else {
      if (wrap) wrap.hidden = true;
      if (resetBtn) resetBtn.hidden = true;
      if (status) status.textContent = isParent ? "Podpis starša še ni dodan." : "Podpis še ni dodan.";
    }
  }

  async function openSignatureOverlay(target) {
    activeSignatureTarget = target;
    if (overlayTitle) {
      overlayTitle.textContent = target === "parent" ? "Podpis starša / skrbnika" : "Podpis vlagatelja";
    }
    overlay.hidden = false;
    document.body.style.overflow = "hidden";
    await overlayPad.loadDataURL(target === "parent" ? parentSignatureData : applicantSignatureData);
  }

  function closeSignatureOverlay() {
    overlay.hidden = true;
    document.body.style.overflow = "";
  }

  btnOpenSignature?.addEventListener("click", () => openSignatureOverlay("applicant"));
  btnOpenParentSignature?.addEventListener("click", () => openSignatureOverlay("parent"));

  btnDone?.addEventListener("click", () => {
    const data = overlayPad.toDataURL();
    if (activeSignatureTarget === "parent") {
      parentSignatureData = data;
      updateSignaturePreview("parent");
    } else {
      applicantSignatureData = data;
      updateSignaturePreview("applicant");
    }
    closeSignatureOverlay();
  });

  btnClear?.addEventListener("click", () => {
    overlayPad.clear();
  });

  btnResetSignature?.addEventListener("click", () => {
    applicantSignatureData = "";
    updateSignaturePreview("applicant");
  });

  btnResetParentSignature?.addEventListener("click", () => {
    parentSignatureData = "";
    updateSignaturePreview("parent");
  });

  function syncMinorState() {
    const age = getAge(datumRojstva?.value || "");
    const isMinor = age !== null && age < 18;
    if (parentBlock) parentBlock.hidden = !isMinor;
    if (parentFullName) parentFullName.required = isMinor;
    if (!isMinor) {
      parentSignatureData = "";
      updateSignaturePreview("parent");
    }
  }

  function syncDrugaRdState() {
    const value = drugaRdStatus?.value || "";
    const active = value === "bil" || value === "se";
    if (drugaRdFields) drugaRdFields.hidden = !active;
    if (drugaRdOd) drugaRdOd.required = active;
    if (drugaRdNaziv) drugaRdNaziv.required = active;
    if (drugaRdClanska) drugaRdClanska.required = active;
    if (drugaRdDoWrap) drugaRdDoWrap.hidden = value !== "bil";
    if (drugaRdDo) {
      drugaRdDo.required = value === "bil";
      if (value !== "bil") drugaRdDo.value = "";
    }
  }

  function syncRibiskiIzpitState() {
    const passed = ribiskiIzpitStatus?.value === "da";
    if (ribiskiIzpitDatumWrap) ribiskiIzpitDatumWrap.hidden = !passed;
    if (datumRibiskegaIzpita) {
      datumRibiskegaIzpita.required = passed;
      if (!passed) datumRibiskegaIzpita.value = "";
    }
  }

  datumRojstva?.addEventListener("change", syncMinorState);
  drugaRdStatus?.addEventListener("change", syncDrugaRdState);
  ribiskiIzpitStatus?.addEventListener("change", syncRibiskiIzpitState);
  updateSignaturePreview("applicant");
  updateSignaturePreview("parent");
  syncMinorState();
  syncDrugaRdState();
  syncRibiskiIzpitState();

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!applicantSignatureData) {
      alert("Prosimo, da pred oddajo dodate podpis vlagatelja.");
      return;
    }

    const age = getAge(datumRojstva?.value || "");
    const isMinor = age !== null && age < 18;
    if (isMinor && !parentSignatureData) {
      alert("Za mladoletno osebo je potreben tudi podpis starša ali skrbnika.");
      return;
    }

    if (!fotografija?.files?.[0]) {
      alert("Dodajte fotografijo člana.");
      return;
    }

    const photoData = await readImageAsDataUrl(fotografija.files[0]);

    const applications = getMembershipApplications();
    const payload = {
      id: Date.now(),
      priimek: form.priimek.value.trim().toUpperCase(),
      ime: form.ime.value.trim(),
      datumRojstva: form.datumRojstva.value,
      spol: form.spol.value,
      krajRojstva: form.krajRojstva.value.trim(),
      naslov: form.naslov.value.trim(),
      posta: form.posta.value.trim(),
      kraj: form.kraj.value.trim(),
      telefon: form.telefon.value.trim(),
      email: form.email.value.trim(),
      datumVloge: form.datumVloge.value,
      tipKarte: form.tipKarte.value,
      fotografija: photoData,
      drugaRdStatus: form.drugaRdStatus.value,
      drugaRdOd: form.drugaRdOd.value,
      drugaRdDo: form.drugaRdDo.value,
      drugaRdNaziv: form.drugaRdNaziv.value.trim(),
      drugaRdClanska: form.drugaRdClanska.value.trim(),
      ribiskiIzpitStatus: form.ribiskiIzpitStatus.value,
      datumRibiskegaIzpita: form.datumRibiskegaIzpita.value,
      opombe: form.opombe.value.trim(),
      isMinor,
      parentFullName: form.parentFullName?.value.trim() || "",
      termsAccepted: !!form.termsAccepted.checked,
      podpis: applicantSignatureData,
      parentPodpis: parentSignatureData,
      submittedAt: new Date().toISOString(),
      adminConfirmedAt: null,
      adminConfirmedBy: "",
    };

    applications.unshift(payload);
    saveMembershipApplications(applications);

    form.reset();
    applicantSignatureData = "";
    parentSignatureData = "";
    updateSignaturePreview("applicant");
    updateSignaturePreview("parent");
    if (datumVloge) datumVloge.value = new Date().toISOString().slice(0, 10);
    syncMinorState();
    syncDrugaRdState();
    syncRibiskiIzpitState();
    alert("Pristopna izjava je bila uspešno oddana.");
  });
});
