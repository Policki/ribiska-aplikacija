function toTitleCase(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function getOptionalCurrentUser() {
  try {
    return getCurrentUser();
  } catch {
    return null;
  }
}

function isObservationAdmin(user) {
  return !!(user?.permissions?.canManageUsers || user?.username === "admin");
}

function setObservationStatus(message) {
  const status = document.getElementById("observation-submit-status");
  if (status) status.textContent = message || "";
}

function compressImageFile(file, options = {}) {
  const maxSize = options.maxSize || 1400;
  const quality = options.quality || 0.72;

  return new Promise((resolve, reject) => {
    if (!file?.type?.startsWith("image/")) {
      reject(new Error("Dovoljene so samo slike."));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Napaka pri branju slike."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Slike ni bilo mogoče pripraviti za shranjevanje."));
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

async function readFilesAsCompressedDataUrls(files) {
  const selected = Array.from(files || []);
  if (!selected.length) return [];

  const images = [];
  for (let i = 0; i < selected.length; i += 1) {
    setObservationStatus(`Pripravljam sliko ${i + 1}/${selected.length} ...`);
    images.push(await compressImageFile(selected[i]));
  }
  setObservationStatus("");
  return images;
}

function formatCoordinate(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return "";
  return num.toFixed(6);
}

async function reverseGeocode(lat, lng) {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}`
  );
  if (!response.ok) throw new Error("Povratno iskanje lokacije ni uspelo.");
  return response.json();
}

async function searchGeocode(query) {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(query)}`
  );
  if (!response.ok) throw new Error("Iskanje lokacije ni uspelo.");
  return response.json();
}

function renderObservationList(user) {
  const host = document.getElementById("animal-observations-list");
  const panel = document.getElementById("animal-observations-admin-panel");
  if (!host || !panel) return;

  const canView = isObservationAdmin(user);
  panel.hidden = !canView;
  host.hidden = !canView;
  if (!canView) {
    host.innerHTML = "";
    return;
  }

  const observations = getAnimalObservations().sort(
    (a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || ""))
  );

  host.innerHTML = "";

  if (!observations.length) {
    host.innerHTML = `<article class="member-mobile-card"><div class="member-mobile-card__name">Trenutno še ni shranjenih opažanj.</div></article>`;
    return;
  }

  observations.forEach((observation) => {
    const card = document.createElement("article");
    card.className = "member-mobile-card observation-card";
    card.innerHTML = `
      <div class="member-mobile-card__head">
        <div>
          <div class="member-mobile-card__name">${escapeHtml(observation.title || "")}</div>
          <div class="member-mobile-card__meta">
            <span class="badge neutral">${escapeHtml(observation.date || "")}</span>
            <span class="badge neutral">${escapeHtml(observation.place || "")}</span>
          </div>
        </div>
      </div>
      <div class="member-mobile-card__body">
        <div class="member-mobile-card__row">
          <span>Prijavil</span>
          <strong>${escapeHtml(`${observation.firstName || ""} ${observation.lastName || ""}`.trim() || "-")}</strong>
        </div>
        <div class="member-mobile-card__row">
          <span>Opis</span>
          <strong>${escapeHtml(observation.description || "-")}</strong>
        </div>
        <div class="member-mobile-card__row">
          <span>Koordinate</span>
          <strong>${observation.latitude && observation.longitude ? `${escapeHtml(observation.latitude)}, ${escapeHtml(observation.longitude)}` : "-"}</strong>
        </div>
        <div class="member-mobile-card__row">
          <span>Dodano</span>
          <strong>${escapeHtml(observation.createdBy || "Javni vnos")}</strong>
        </div>
      </div>
      <div class="observation-gallery">
        ${(observation.images || [])
          .map((image, index) => `<img src="${image}" alt="Opažanje ${index + 1}" class="observation-gallery__img" />`)
          .join("")}
      </div>
      <div class="member-mobile-card__actions">
        <button type="button" class="btn btn-secondary btn-print-observation">Pripravi za tisk</button>
      </div>
    `;

    card.querySelector(".btn-print-observation")?.addEventListener("click", () => {
      window.open(`opazanja-ribojedih-zivali-tisk.html?id=${observation.id}`, "_blank");
    });

    host.appendChild(card);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  ensureDemoData();
  const user = getOptionalCurrentUser();
  const header = document.getElementById("observation-admin-header");

  if (user) {
    initHeader(user);
    renderAppNav(user, "opazanja-zivali");
    startReminderWatcher();
  } else if (header) {
    header.hidden = true;
    document.body.classList.add("public-observation-page");
  }

  const yearEl = document.getElementById("aktivno-leto");
  if (yearEl && typeof AktivnoLeto === "function") {
    yearEl.textContent = AktivnoLeto();
  }

  const form = document.getElementById("animal-observation-form");
  if (!form) return;

  const firstNameField = document.getElementById("observation-first-name");
  const lastNameField = document.getElementById("observation-last-name");
  const dateField = document.getElementById("observation-date");
  const placeField = document.getElementById("observation-place");
  const mapSearchField = document.getElementById("observation-map-search");
  const btnMapSearch = document.getElementById("btn-map-search");
  const btnMapGeolocate = document.getElementById("btn-map-geolocate");
  const mapStatus = document.getElementById("observation-map-status");
  const latitudeField = document.getElementById("observation-latitude");
  const longitudeField = document.getElementById("observation-longitude");
  const btnSave = document.getElementById("btn-save-observation");
  const thankYou = document.getElementById("observation-thank-you");

  if (dateField && !dateField.value) {
    dateField.value = todayISO();
  }

  firstNameField?.addEventListener("blur", () => {
    firstNameField.value = toTitleCase(firstNameField.value);
  });
  lastNameField?.addEventListener("blur", () => {
    lastNameField.value = toTitleCase(lastNameField.value);
  });
  form.title?.addEventListener("blur", () => {
    form.title.value = toTitleCase(form.title.value);
  });
  placeField?.addEventListener("blur", () => {
    placeField.value = toTitleCase(placeField.value);
  });

  let map = null;
  let marker = null;

  function setStatus(message) {
    if (mapStatus) mapStatus.textContent = message;
  }

  function updateCoordinates(lat, lng) {
    if (latitudeField) latitudeField.value = formatCoordinate(lat);
    if (longitudeField) longitudeField.value = formatCoordinate(lng);
  }

  async function applyLocation(lat, lng, shouldFillPlace = false) {
    updateCoordinates(lat, lng);
    if (marker) marker.setLatLng([lat, lng]);
    if (map) map.setView([lat, lng], Math.max(map.getZoom(), 15));

    if (shouldFillPlace) {
      try {
        const reverse = await reverseGeocode(lat, lng);
        const label =
          reverse?.display_name ||
          [reverse?.address?.road, reverse?.address?.village, reverse?.address?.town, reverse?.address?.city]
            .filter(Boolean)
            .join(", ");
        if (label && placeField && !placeField.value.trim()) {
          placeField.value = toTitleCase(label);
        }
      } catch {
        // Koordinate ostanejo shranjene tudi, če poimenovanja lokacije ni mogoče pridobiti.
      }
    }

    setStatus(`Izbrana lokacija: ${formatCoordinate(lat)}, ${formatCoordinate(lng)}`);
  }

  if (window.L) {
    const defaultLat = 46.33944;
    const defaultLng = 14.96333;

    map = window.L.map("observation-map", { zoomControl: true }).setView([defaultLat, defaultLng], 13);

    window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap",
    }).addTo(map);

    marker = window.L.marker([defaultLat, defaultLng], { draggable: true }).addTo(map);
    updateCoordinates(defaultLat, defaultLng);

    map.on("click", (event) => {
      applyLocation(event.latlng.lat, event.latlng.lng, true);
    });

    marker.on("dragend", () => {
      const point = marker.getLatLng();
      applyLocation(point.lat, point.lng, true);
    });

    setStatus("Lokacijo izberite s klikom na zemljevid, iskanjem ali z gumbom Moja lokacija.");
  } else {
    setStatus("Zemljevida ni bilo mogoče naložiti. Koordinate trenutno niso na voljo.");
  }

  btnMapSearch?.addEventListener("click", async () => {
    const query = String(mapSearchField?.value || placeField?.value || "").trim();
    if (!query) {
      setStatus("Najprej vpišite naslov, kraj ali revir za iskanje.");
      return;
    }

    try {
      setStatus("Iščem lokacijo na zemljevidu...");
      const results = await searchGeocode(query);
      if (!results.length) {
        setStatus("Lokacije ni bilo mogoče najti. Poskusite z bolj natančnim opisom.");
        return;
      }
      const match = results[0];
      const lat = Number(match.lat);
      const lng = Number(match.lon);
      if (placeField && !placeField.value.trim()) {
        placeField.value = toTitleCase(match.display_name || query);
      }
      await applyLocation(lat, lng, false);
      setStatus("Lokacija je bila najdena in označena na zemljevidu.");
    } catch (error) {
      setStatus(error?.message || "Iskanje lokacije trenutno ni uspelo.");
    }
  });

  btnMapGeolocate?.addEventListener("click", () => {
    if (!navigator.geolocation) {
      setStatus("Ta naprava ne podpira samodejne lokacije.");
      return;
    }

    setStatus("Pridobivam trenutno lokacijo...");
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        await applyLocation(position.coords.latitude, position.coords.longitude, true);
        setStatus("Uporabljena je trenutna lokacija naprave.");
      },
      () => {
        setStatus("Trenutne lokacije ni bilo mogoče pridobiti.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const imageInput = form.images;
    if (!imageInput?.files?.length) {
      alert("Dodajte vsaj eno sliko opažanja.");
      return;
    }

    if (!latitudeField?.value || !longitudeField?.value) {
      alert("Izberite lokacijo opažanja na zemljevidu.");
      return;
    }

    try {
      if (btnSave) btnSave.disabled = true;
      setObservationStatus("Pripravljam opažanje za shranjevanje...");

      const images = await readFilesAsCompressedDataUrls(imageInput.files);
      const observations = getAnimalObservations();
      const observation = {
        id: Date.now(),
        firstName: toTitleCase(firstNameField?.value || ""),
        lastName: toTitleCase(lastNameField?.value || ""),
        title: toTitleCase(form.title.value),
        date: form.date.value || todayISO(),
        place: toTitleCase(placeField?.value || ""),
        description: String(form.description.value || "").trim(),
        latitude: latitudeField.value,
        longitude: longitudeField.value,
        images,
        createdAt: new Date().toISOString(),
        createdBy: user?.username || "Javni vnos",
      };

      observations.unshift(observation);
      saveAnimalObservations(observations);
      addHistory("Opažanja ribojedih ptic", `Dodano opažanje: ${observation.title} (${observation.place}).`);

      form.reset();
      if (dateField) dateField.value = todayISO();
      if (window.L && marker && map) {
        const defaultLat = 46.33944;
        const defaultLng = 14.96333;
        marker.setLatLng([defaultLat, defaultLng]);
        map.setView([defaultLat, defaultLng], 13);
        updateCoordinates(defaultLat, defaultLng);
      }

      setStatus("Lokacijo izberite s klikom na zemljevid, iskanjem ali z gumbom Moja lokacija.");
      setObservationStatus("");
      if (thankYou) {
        thankYou.hidden = false;
        thankYou.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      renderObservationList(user);
    } catch (error) {
      const quotaMessage =
        error?.name === "QuotaExceededError"
          ? "Shranjevanje ni uspelo, ker je prostor v brskalniku poln. Poskusite z manj slikami."
          : null;
      alert(quotaMessage || error?.message || "Pri shranjevanju opažanja je prišlo do napake.");
    } finally {
      if (btnSave) btnSave.disabled = false;
      setObservationStatus("");
    }
  });

  renderObservationList(user);
});
