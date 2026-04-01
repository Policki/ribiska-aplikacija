document.addEventListener("DOMContentLoaded", () => {
  ensureDemoData();
  const user = requireAuth({ pageModuleKey: "dashboard" });
  if (!user) return;

  const params = new URLSearchParams(window.location.search);
  const id = Number(params.get("id"));
  const application = getMembershipApplications().find((item) => item.id === id);
  const host = document.getElementById("print-host");
  if (!application || !host) {
    if (host) host.innerHTML = "<p>Vloga ni bila najdena.</p>";
    return;
  }

  const formatDate = (value) => {
    if (!value) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = String(d.getFullYear());
    return `${dd}.${mm}.${yyyy}`;
  };

  const formatYear = (value) => {
    if (!value) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    return String(d.getFullYear());
  };

  const toTitleCase = (value) =>
    String(value || "")
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

  const line = (value, className = "") =>
    `<span class="application-inline-line ${className}">${value ? escapeHtml(String(value)) : "&nbsp;"}</span>`;

  const signature = (dataUrl) =>
    dataUrl
      ? `<span class="application-inline-line signature"><img class="application-inline-signature-img" src="${dataUrl}" alt="Podpis" /></span>`
      : `<span class="application-inline-line signature">&nbsp;</span>`;

  const sexMale = application.spol === "M" ? "X" : "";
  const sexFemale = application.spol === "Ž" ? "X" : "";
  const noPrevious = application.drugaRdStatus === "ne";
  const wasPrevious = application.drugaRdStatus === "bil";
  const stillOther = application.drugaRdStatus === "se";
  const examDone = application.ribiskiIzpitStatus === "da";
  const applicationDate = formatDate(application.datumVloge || application.submittedAt || "");

  host.innerHTML = `
    <div class="application-print application-print--form">
      <div class="application-print__page">
        <h1 class="application-form-title">VLOGA ZA SPREJEM V RIBIŠKO DRUŽINO MOZIRJE</h1>
        <div class="application-form-underline"></div>

        <p class="application-form-intro"><strong>Obvezni podatki</strong> (pravna podlaga: 5. člen Pravilnika RZS o varovanju osebnih podatkov-pogodbeni temelj)</p>

        <table class="application-form-table">
          <tr>
            <td class="label">ime in priimek</td>
            <td class="value" colspan="2">${escapeHtml(`${toTitleCase(application.ime || "")} ${String(application.priimek || "").trim().toUpperCase()}`.trim())}</td>
          </tr>
          <tr>
            <td class="label">datum rojstva</td>
            <td class="value" colspan="2">${escapeHtml(formatDate(application.datumRojstva || ""))}</td>
          </tr>
          <tr>
            <td class="label">spol (obkroži)</td>
            <td class="value">moški &nbsp; - &nbsp; M ${sexMale ? `<strong style="float:right;">${sexMale}</strong>` : ""}</td>
            <td class="value">ženski &nbsp; - &nbsp; Ž ${sexFemale ? `<strong style="float:right;">${sexFemale}</strong>` : ""}</td>
          </tr>
          <tr>
            <td class="label">kraj rojstva</td>
            <td class="value" colspan="2">${escapeHtml(toTitleCase(application.krajRojstva || ""))}</td>
          </tr>
          <tr>
            <td class="label">naslov bivališča</td>
            <td class="value" colspan="2">${escapeHtml(toTitleCase(application.naslov || ""))}</td>
          </tr>
          <tr>
            <td class="label">poštna koda in ime dostavne pošte</td>
            <td class="value" colspan="2">${escapeHtml([application.posta, toTitleCase(application.kraj || "")].filter(Boolean).join(" ") || "")}</td>
          </tr>
          <tr>
            <td class="label">e-pošta:</td>
            <td class="value" colspan="2">${escapeHtml(String(application.email || "").trim().toLowerCase())}</td>
          </tr>
          <tr>
            <td class="label">osebna fotografija (priloga)</td>
            <td class="photo-box" colspan="2">${application.fotografija ? `<img class="application-form-photo" src="${application.fotografija}" alt="Fotografija člana" />` : ""}</td>
          </tr>
        </table>

        <div class="application-form-note">
          (Opomba: v primeru odstopa od članstva po preteku roka 5 let RD ali smrti, upravljalec osebnih
          podatkov ohrani zgolj podatke o imenu in priimku, datumu rojstva, trajanju članstva in
          novonastalih podatkih o pridobljenih izpitih, funkcijah in priznanjih v času članstva v RD).
        </div>

        <p class="application-form-intro"><strong>Neobvezni podatki</strong> (pravna podlaga: 4. člen Pravilnika RZS o varovanju osebnih podatkov-privolitev)</p>

        <table class="application-form-table" style="margin-bottom:16px;">
          <tr>
            <td class="label">št. osebnega telefona:</td>
            <td class="value">${escapeHtml(application.telefon || "")}</td>
          </tr>
        </table>

        <div class="application-form-text">
          Podpisani kandidat želim postati član ribiške družine. Ob tem izjavljam:
        </div>

        <ul class="application-form-list">
          <li>Seznanjen sem s pogoji, ki jih RD določa za sprejem v članstvo družine.</li>
          <li>Glasilo Ribič bom prejemal na: navedeni domači naslov oz. na naslov elektronske pošte.</li>
          <li>Ravnal se bom v skladu s Statutom, kakor tudi z drugimi akti RD ter njenimi sklepi.</li>
          <li>Udeleževal se bom usposabljanj, delovnih akcij in obveznosti, na katere me bo vabila RD, prek zgoraj podanih osebnih podatkov.</li>
          <li>
            Do sedaj (obkroži oz. izpolni eno od naslednjih možnosti):
            <ul class="application-form-sublist">
              <li>Še nisem bil član nobene RD. ${noPrevious ? "<strong>X</strong>" : "&nbsp;"}</li>
              <li>
                V Sloveniji sem bil član RD ${line(toTitleCase(application.drugaRdNaziv || ""), "long")} od leta ${line(formatYear(application.drugaRdOd), "small")}
                do leta ${line(formatYear(application.drugaRdDo), "small")} in (ustrezno obkroži): imam/sem imel člansko izkaznico
                ${line(application.drugaRdClanska, "long")}. ${wasPrevious ? "<strong>X</strong>" : "&nbsp;"}
              </li>
              <li>
                V Sloveniji sem še član RD ${line(toTitleCase(application.drugaRdNaziv || ""), "long")} od leta ${line(formatYear(application.drugaRdOd), "small")}
                s člansko izkaznico ${line(application.drugaRdClanska, "long")}. Prispevek za glasilo bom plačeval v nosilni RD
                ${line(toTitleCase(application.drugaRdNaziv || ""), "long")}. ${stillOther ? "<strong>X</strong>" : "&nbsp;"}
              </li>
            </ul>
          </li>
          <li>
            Ribiški izpit sem opravil dne ${line(formatDate(application.datumRibiskegaIzpita || ""), "long")}
            kot član RD ${line(examDone ? toTitleCase(application.drugaRdNaziv || "") : "", "long")}.
          </li>
        </ul>

        <div class="application-page-number">1</div>
      </div>

      <div class="application-print__page">
        <p class="application-second-page-text">
          Seznanjen sem, da se včlanitev v RD obravnava kot pogodbeni odnos, ki je podlaga za obdelavo
          zgoraj navedenih osebnih podatkov, ki so neločljivo povezani s samim članstvom v društvu ter
          uresničevanjem mojih pravic in dolžnosti člana. Seznanjen sem, da RD obdeluje moje osebne
          podatke v okviru veljavnih prepisov in v statutu ter drugih splošnih aktih opredeljenih
          namenov, ciljev in nalog delovanja. Seznanjen sem, da lahko kadarkoli odstopim od soglasja k
          posredovanju svojih osebnih podatkov. Seznanjen sem s obvestilom posameznikom glede obdelave po 13.
          členu splošne uredbe o varstvu podatkov (GDPR) glede obdelave osebnih podatkov ribičev – članov RD.
          Seznanjen sem, da sta tako Pravilnik RZS o varovanju osebnih podatkov kot tudi celotna politika obdelave
          in varovanja osebnih podatkov na RZS dostopna na spletni strani RZS:
          <span style="text-decoration: underline; color: #1a56b7;">http://ribiska-zveza.si/dejavnosti/pravno-podrocje/varovanje-osebnih-podatkov-na-rzs</span>,
          kjer se lahko seznanim tudi z vsemi pravicami in postopki za njihovo uveljavitev. Zavedam se, da predstavlja
          navajanje zavajajočih ali netočnih podatkov v vlogi disciplinsko kršitev.
        </p>

        <div class="application-signature-row">
          <p>V/Na ${line(toTitleCase(application.kraj || ""), "long")} dne ${line(applicationDate, "long")}</p>
          <p>${signature(application.podpis)}</p>
          <div class="application-signature-caption">(lastnoročni podpis<sup>1</sup>)</div>
        </div>

        ${
          application.isMinor
            ? `
        <div class="application-signature-row">
          <p>V primeru mladoletne osebe<sup>2</sup> podpisana starša oz. skrbnik ${line(toTitleCase(application.parentFullName || ""), "signature")}</p>
          <p>, soglaša/a/m z njeno včlanitvijo v RD.</p>
          <p>${signature(application.parentPodpis)}</p>
          <div class="application-signature-caption">(lastnoročni podpis staršev ali skrbnika)</div>
        </div>`
            : `
        <div class="application-signature-row">
          <p>V primeru mladoletne osebe<sup>2</sup> podpisana starša oz. skrbnik ${line("", "signature")}</p>
          <p>, soglaša/a/m z njeno včlanitvijo v RD.</p>
          <p>${signature("")}</p>
          <div class="application-signature-caption">(lastnoročni podpis staršev ali skrbnika)</div>
        </div>`
        }
      </div>
    </div>
  `;
});
