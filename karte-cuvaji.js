function handleKarteCuvajiPage() {
  const fileInput = document.getElementById("licenses-file");
  const tbody = document.getElementById("licenses-tbody");
  const form = document.getElementById("license-form");
  if (!tbody || !form) return;

  function render() {
    const list = getLicenses();
    tbody.innerHTML = "";
    list.forEach((x, i) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${i + 1}</td>
        <td>${x.name}</td>
        <td>${x.number}</td>
        <td class="table-actions">
          <span class="action-icon delete" data-id="${x.id}">🗑️</span>
        </td>
      `;
      tbody.appendChild(tr);
    });

    tbody.querySelectorAll(".delete").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = Number(btn.dataset.id);
        const next = getLicenses().filter((x) => x.id !== id);
        saveLicenses(next);
        render();
      });
    });
  }

  render();

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = form.licenseName.value.trim();
    const number = form.licenseNumber.value.trim();
    if (!name || !number) {
      alert("Vnesi ime in številko dovolilnice.");
      return;
    }
    const list = getLicenses();
    list.push({ id: Date.now(), name, number });
    saveLicenses(list);
    form.reset();
    render();
  });

  if (fileInput) {
    fileInput.addEventListener("change", async () => {
      const file = fileInput.files?.[0];
      if (!file) return;

      if (typeof XLSX === "undefined") {
        alert("Manjka knjižnica XLSX (SheetJS).");
        return;
      }

      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

      const parsed = [];
      for (let r = 0; r < rows.length; r++) {
        const row = rows[r];
        if (!row || row.length < 2) continue;
        const name = String(row[0] ?? "").trim();
        const number = String(row[1] ?? "").trim();
        if (!name || !number) continue;
        parsed.push({ id: Date.now() + r, name, number });
      }

      saveLicenses(parsed);
      render();
      alert(`Uvoženih ${parsed.length} dovolilnic.`);
      fileInput.value = "";
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  ensureDemoData();
  const user = requireAuth({ pageModuleKey: "karte-cuvaji" });
  if (!user) return;
  initHeader(user);
  handleKarteCuvajiPage();
});