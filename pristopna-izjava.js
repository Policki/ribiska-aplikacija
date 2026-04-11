function initSignaturePad(canvas) {
  const ctx = canvas.getContext("2d");
  let drawing = false;
  let hasStroke = false;
  const currentStrokeStyle = "#0b4b4b";

  function applyBrush() {
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = currentStrokeStyle;
  }

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    const width = Math.max(1, Math.round(rect.width * ratio));
    const height = Math.max(1, Math.round(rect.height * ratio));
    const snapshot = hasStroke ? canvas.toDataURL("image/png") : "";

    if (canvas.width === width && canvas.height === height) {
      applyBrush();
      return;
    }

    canvas.width = width;
    canvas.height = height;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    applyBrush();

    if (snapshot) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        hasStroke = true;
      };
      img.src = snapshot;
    }
  }

  function point(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  function start(event) {
    event.preventDefault();
    if (event.pointerType) {
      canvas.setPointerCapture?.(event.pointerId);
    }
    drawing = true;
    const p = point(event);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  }

  function move(event) {
    if (!drawing) return;
    event.preventDefault();
    const p = point(event);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    hasStroke = true;
  }

  function end() {
    drawing = false;
  }

  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);
  canvas.addEventListener("pointerdown", start, { passive: false });
  canvas.addEventListener("pointermove", move, { passive: false });
  canvas.addEventListener("pointerup", end);
  canvas.addEventListener("pointercancel", end);
  canvas.addEventListener("pointerleave", end);

  return {
    clear() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      hasStroke = false;
    },
    toDataURL() {
      return hasStroke ? canvas.toDataURL("image/png") : "";
    },
    resize() {
      resizeCanvas();
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

function compressApplicationPhoto(file, options = {}) {
  const maxSize = options.maxSize || 900;
  const quality = options.quality || 0.78;

  return new Promise((resolve, reject) => {
    if (!file) {
      resolve("");
      return;
    }
    if (!file.type?.startsWith("image/")) {
      reject(new Error("Dodana datoteka ni slika."));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Napaka pri branju fotografije."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Fotografije ni bilo mogoče pripraviti."));
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const width = Math.max(1, Math.round(img.width * scale));
        const height = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d", { alpha: false });
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = String(reader.result || "");
    };
    reader.readAsDataURL(file);
  });
}

function toTitleCase(value) {
  return String(value || "")
    .trim()
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

async function tryLockLandscapeOrientation() {
  try {
    if (window.screen?.orientation?.lock && window.matchMedia("(max-width: 700px)").matches) {
      await window.screen.orientation.lock("landscape");
    }
  } catch {
    // Nekateri mobilni brskalniki zaklepa orientacije ne dovolijo.
  }
}

function tryUnlockOrientation() {
  try {
    window.screen?.orientation?.unlock?.();
  } catch {
    // Nekateri mobilni brskalniki odklepa ne podpirajo.
  }
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
  const submitStatus = document.getElementById("application-submit-status");
  const submitButton = document.getElementById("btn-submit-application");
  const successBox = document.getElementById("application-success");

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

  const normalizeField = (field, formatter) => {
    field?.addEventListener("blur", () => {
      field.value = formatter(field.value);
    });
  };

  normalizeField(form.ime, toTitleCase);
  normalizeField(form.priimek, (value) => String(value || "").trim().toUpperCase());
  normalizeField(form.krajRojstva, toTitleCase);
  normalizeField(form.naslov, toTitleCase);
  normalizeField(form.kraj, toTitleCase);
  normalizeField(form.telefon, normalizePhone);
  normalizeField(form.email, normalizeEmail);
  normalizeField(form.posta, normalizePosta);
  normalizeField(form.drugaRdNaziv, toTitleCase);
  normalizeField(form.parentFullName, toTitleCase);

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
    await tryLockLandscapeOrientation();
    overlayPad.resize();
    requestAnimationFrame(() => overlayPad.resize());
    window.setTimeout(() => overlayPad.resize(), 180);
    await overlayPad.loadDataURL(target === "parent" ? parentSignatureData : applicantSignatureData);
  }

  function closeSignatureOverlay() {
    overlay.hidden = true;
    document.body.style.overflow = "";
    tryUnlockOrientation();
  }

  btnOpenSignature?.addEventListener("click", () => {
    openSignatureOverlay("applicant");
  });
  btnOpenParentSignature?.addEventListener("click", () => {
    openSignatureOverlay("parent");
  });

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

    let photoData = "";
    try {
      if (submitButton) submitButton.disabled = true;
      if (submitStatus) submitStatus.textContent = "Pripravljam fotografijo in shranjujem pristopno izjavo...";
      photoData = await compressApplicationPhoto(fotografija.files[0]);
    } catch (error) {
      alert(error?.message || "Fotografije ni bilo mogoče shraniti.");
      if (submitButton) submitButton.disabled = false;
      if (submitStatus) submitStatus.textContent = "";
      return;
    }

    const applications = getMembershipApplications();
    const payload = {
      id: Date.now(),
      priimek: String(form.priimek.value || "").trim().toUpperCase(),
      ime: toTitleCase(form.ime.value),
      datumRojstva: form.datumRojstva.value,
      spol: form.spol.value,
      krajRojstva: toTitleCase(form.krajRojstva.value),
      naslov: toTitleCase(form.naslov.value),
      posta: normalizePosta(form.posta.value),
      kraj: toTitleCase(form.kraj.value),
      telefon: normalizePhone(form.telefon.value),
      email: normalizeEmail(form.email.value),
      datumVloge: form.datumVloge.value,
      tipKarte: form.tipKarte.value,
      fotografija: photoData,
      drugaRdStatus: form.drugaRdStatus.value,
      drugaRdOd: form.drugaRdOd.value,
      drugaRdDo: form.drugaRdDo.value,
      drugaRdNaziv: toTitleCase(form.drugaRdNaziv.value),
      drugaRdClanska: form.drugaRdClanska.value.trim(),
      ribiskiIzpitStatus: form.ribiskiIzpitStatus.value,
      datumRibiskegaIzpita: form.datumRibiskegaIzpita.value,
      opombe: form.opombe.value.trim(),
      isMinor,
      parentFullName: toTitleCase(form.parentFullName?.value || ""),
      termsAccepted: !!form.termsAccepted.checked,
      podpis: applicantSignatureData,
      parentPodpis: parentSignatureData,
      submittedAt: new Date().toISOString(),
      adminConfirmedAt: null,
      adminConfirmedBy: "",
    };

    try {
      applications.unshift(payload);
      saveMembershipApplications(applications);
    } catch (error) {
      const quotaMessage =
        error?.name === "QuotaExceededError"
          ? "Shranjevanje ni uspelo, ker je prostor v brskalniku poln. Poskusite z manjšo fotografijo."
          : null;
      alert(quotaMessage || "Pri shranjevanju pristopne izjave je prišlo do napake.");
      if (submitButton) submitButton.disabled = false;
      if (submitStatus) submitStatus.textContent = "";
      return;
    }

    form.reset();
    applicantSignatureData = "";
    parentSignatureData = "";
    updateSignaturePreview("applicant");
    updateSignaturePreview("parent");
    if (datumVloge) datumVloge.value = new Date().toISOString().slice(0, 10);
    syncMinorState();
    syncDrugaRdState();
    syncRibiskiIzpitState();
    if (submitStatus) submitStatus.textContent = "";
    if (submitButton) submitButton.disabled = false;
    if (successBox) {
      successBox.hidden = false;
      successBox.scrollIntoView({ behavior: "smooth", block: "center" });
    } else {
      alert("Pristopna izjava je bila uspešno oddana.");
    }
  });
});
