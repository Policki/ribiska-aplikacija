function handleTiskanjePage() {
  const btnPrintMembers = document.getElementById("btn-print-members");
  if (!btnPrintMembers) return;

  btnPrintMembers.addEventListener("click", () => {
    const currentUser = getCurrentUser();
    const visibleStatuses = getUserVisibleStatuses(currentUser);

    let members = getMembers().filter((m) => !m.arhiviran);
    if (visibleStatuses) {
      members = members.filter((m) => visibleStatuses.includes(m.status));
    }

    const win = window.open("", "_blank");
    const rows = members
      .map(
        (m, i) =>
          `<tr><td>${i + 1}</td><td>${m.status}</td><td>${m.spc}</td><td>${m.clanska}</td><td>${m.priimek}</td><td>${m.ime}</td><td>${m.email}</td><td>${m.telefon}</td></tr>`
      )
      .join("");

    win.document.write(`
      <html>
        <head>
          <title>Seznam članov - tisk</title>
          <style>
            body { font-family: Arial, sans-serif; }
            h1 { text-align:center; margin-bottom:16px; }
            table { border-collapse: collapse; width: 100%; font-size:12px; }
            th, td { border:1px solid #000; padding:4px 6px; text-align:left; }
            th { background:#eee; }
          </style>
        </head>
        <body>
          <h1>Seznam članov</h1>
          <table>
            <thead>
              <tr><th>#</th><th>STAT</th><th>SPC</th><th>ČLANSK</th><th>PRIIMEK</th><th>IME</th><th>EMAIL</th><th>TELEFON</th></tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
          <script>window.print();</script>
        </body>
      </html>
    `);

    win.document.close();
    addHistory("Tiskanje", "Natisnjen seznam članov.");
  });
}

document.addEventListener("DOMContentLoaded", () => {
  ensureDemoData();
  const user = requireAuth({ pageModuleKey: "tiskanje" });
  if (!user) return;
  initHeader(user);
  handleTiskanjePage();
});