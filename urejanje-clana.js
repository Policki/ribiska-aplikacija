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

  // ✅ NEW: reference za pošto/kraj (kraj je že v form)
  const postaEl = document.getElementById("posta");
  const krajEl = document.getElementById("kraj");

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
  if (form.posta) form.posta.value = member.posta || ""; // ✅ NEW
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

  // ✅ NEW: Pošta -> samodejni kraj
  let lastAutoKraj = "";

  function normalizePosta(raw) {
    return String(raw || "").replace(/\D/g, "").slice(0, 4);
  }

  // isti slovar kot pri vpisu (dopolni po potrebi)
  const POSTA_TO_KRAJ = {
       "Mozirje": "3330",
    "Nazarje": "3331",
    "Adlešiči": "8341",
"Ajdovščina": "5270",
"Ankaran/Ancarano": "6280",
"Apače": "9253",
"Artiče": "8253",
"Begunje na Gorenjskem": "4275",
"Begunje pri Cerknici": "1382",
"Beltinci": "9231",
"Benedikt": "2234",
"Bistrica ob Dravi": "2345",
"Bistrica ob Sotli": "3256",
"Bizeljsko": "8259",
"Blagovica": "1223",
"Blanca": "8283",
"Bled": "4260",
"Blejska Dobrava": "4273",
"Bodonci": "9265",
"Bogojina": "9222",
"Bohinjska Bela": "4263",
"Bohinjska Bistrica": "4264",
"Bohinjsko jezero": "4265",
"Borovnica": "1353",
"Boštanj": "8294",
"Bovec": "5230",
"Branik": "5295",
"Braslovče": "3314",
"Breginj": "5223",
"Brestanica": "8280",
"Bresternica": "2354",
"Brezje": "4243",
"Brezovica pri Ljubljani": "1351",
"Brežice": "8250",
"Brnik - aerodrom": "4210",
"Brusnice": "8321",
"Buče": "3255",
"Bučka": "8276",
"Cankova": "9261",
"Celje": "3000",
"Celje - poštni predali": "3001",
"Cerklje na Gorenjskem": "4207",
"Cerklje ob Krki": "8263",
"Cerknica": "1380",
"Cerkno": "5282",
"Cerkvenjak": "2236",
"Ceršak": "2215",
"Cirkovce": "2326",
"Cirkulane": "2282",
"Col": "5273",
"Čatež ob Savi": "8251",
"Čemšenik": "1413",
"Čepovan": "5253",
"Črenšovci": "9232",
"Črna na Koroškem": "2393",
"Črni Kal": "6275",
"Črni Vrh nad Idrijo": "5274",
"Črniče": "5262",
"Črnomelj": "8340",
"Dekani": "6271",
"Deskle": "5210",
"Destrnik": "2253",
"Divača": "6215",
"Dob": "1233",
"Dobje pri Planini": "3224",
"Dobova": "8257",
"Dobovec": "1423",
"Dobravlje": "5263",
"Dobrna": "3204",
"Dobrnič": "8211",
"Dobrova": "1356",
"Dobrovnik/Dobronak": "9223",
"Dobrovo v Brdih": "5212",
"Dol pri Hrastniku": "1431",
"Dol pri Ljubljani": "1262",
"Dole pri Litiji": "1273",
"Dolenja vas": "1331",
"Dolenjske Toplice": "8350",
"Domžale": "1230",
"Dornava": "2252",
"Dornberk": "5294",
"Draga": "1319",
"Dragatuš": "8343",
"Dramlje": "3222",
"Dravograd": "2370",
"Duplje": "4203",
"Dutovlje": "6221",
"Dvor": "8361",
"Fala": "2343",
"Fokovci": "9208",
"Fram": "2313",
"Frankolovo": "3213",
"Gabrovka": "1274",
"Globoko": "8254",
"Godovič": "5275",
"Golnik": "4204",
"Gomilsko": "3303",
"Gorenja vas": "4224",
"Gorica pri Slivnici": "3263",
"Gorišnica": "2272",
"Gornja Radgona": "9250",
"Gornji Grad": "3342",
"Gozd Martuljek": "4282",
"Gračišče": "6272",
"Grad": "9264",
"Gradac": "8332",
"Grahovo": "1384",
"Grahovo ob Bači": "5242",
"Grgar": "5251",
"Griže": "3302",
"Grobelno": "3231",
"Grosuplje": "1290",
"Hajdina": "2288",
"Hinje": "8362",
"Hoče": "2311",
"Hodoš/Hodos": "9205",
"Horjul": "1354",
"Hotedršica": "1372",
"Hrastnik": "1430",
"Hruševje": "6225",
"Hrušica": "4276",
"Idrija": "5280",
"Ig": "1292",
"Ilirska Bistrica": "6250",
"Ilirska Bistrica - Trnovo": "6251",
"Ivančna Gorica": "1295",
"Ivanjkovci": "2259",
"Izlake": "1411",
"Izola/Isola": "6310",
"Jakobski Dol": "2222",
"Jarenina": "2221",
"Jelšane": "6254",
"Jesenice": "4270",
"Jesenice na Dolenjskem": "8261",
"Jurklošter": "3273",
"Jurovski Dol": "2223",
"Juršinci": "2256",
"Kal nad Kanalom": "5214",
"Kalobje": "3233",
"Kamna Gorica": "4246",
"Kamnica": "2351",
"Kamnik": "1241",
"Kanal": "5213",
"Kapele": "8258",
"Kapla": "2362",
"Kidričevo": "2325",
"Kisovec": "1412",
"Knežak": "6253",
"Kobarid": "5222",
"Kobilje": "9227",
"Kočevje": "1330",
"Kočevska Reka": "1338",
"Kog": "2276",
"Kojsko": "5211",
"Komen": "6223",
"Komenda": "1218",
"Koper - Capodistria": "6000",
"Koper - Capodistria - poštni predali": "6001",
"Koprivnica": "8282",
"Kostanjevica na Krasu": "5296",
"Kostanjevica na Krki": "8311",
"Kostel": "1336",
"Košana": "6256",
"Kotlje": "2394",
"Kozina": "6240",
"Kozje": "3260",
"Kranj": "4000",
"Kranj - poštni predali": "4001",
"Kranjska Gora": "4280",
"Kresnice": "1281",
"Križe": "4294",
"Križevci": "9206",
"Križevci pri Ljutomeru": "9242",
"Krka": "1301",
"Krmelj": "8296",
"Kropa": "4245",
"Krška vas": "8262",
"Krško": "8270",
"Kuzma": "9263",
"Laporje": "2318",
"Laško": "3270",
"Laze v Tuhinju": "1219",
"Lenart v Slovenskih goricah": "2230",
"Lendava/Lendva": "9220",
"Lesce": "4248",
"Lesično": "3261",
"Leskovec pri Krškem": "8273",
"Libeliče": "2372",
"Limbuš": "2341",
"Litija": "1270",
"Ljubečna": "3202",
"Ljubljana": "1000",
"Ljubljana - poštni predali": "1001",
"Ljubljana - Črnuče": "1231",
"Ljubljana - Dobrunje": "1261",
"Ljubljana - Polje": "1260",
"Ljubljana - poštni center": "1002",
"Ljubljana - Šentvid": "1210",
"Ljubljana - Šmartno": "1211",
"Ljubno ob Savinji": "3333",
"Ljutomer": "9240",
"Loče": "3215",
"Log pod Mangartom": "5231",
"Log pri Brezovici": "1358",
"Logatec": "1370",
"Loka pri Zidanem Mostu": "1434",
"Loka pri Žusmu": "3223",
"Lokev": "6219",
"Loški Potok": "1318",
"Lovrenc na Dravskem polju": "2324",
"Lovrenc na Pohorju": "2344",
"Luče": "3334",
"Lukovica": "1225",
"Mačkovci": "9202",
"Majšperk": "2322",
"Makole": "2321",
"Mala Nedelja": "9243",
"Malečnik": "2229",
"Marezige": "6273",
"Maribor": "2000",
"Maribor - poštni predali": "2001",
"Marjeta na Dravskem polju": "2206",
"Markovci": "2281",
"Martjanci": "9221",
"Materija": "6242",
"Mavčiče": "4211",
"Medvode": "1215",
"Mengeš": "1234",
"Metlika": "8330",
"Mežica": "2392",
"Miklavž na Dravskem polju": "2204",
"Miklavž pri Ormožu": "2275",
"Miren": "5291",
"Mirna": "8233",
"Mirna Peč": "8216",
"Mislinja": "2382",
"Mojstrana": "4281",
"Mokronog": "8230",
"Moravče": "1251",
"Moravske Toplice": "9226",
"Most na Soči": "5216",
"Motnik": "1221",
"Mozirje": "3330",
"Murska Sobota": "9000",
"Murska Sobota - poštni predali": "9001",
"Muta": "2366",
"Naklo": "4202",
"Nazarje": "3331",
"Notranje Gorice": "1357",
"Nova Cerkev": "3203",
"Nova Gorica": "5000",
"Nova Gorica - poštni predali": "5001",
"Nova vas": "1385",
"Novo mesto": "8000",
"Novo mesto - poštni predali": "8001",
"Obrov": "6243",
"Odranci": "9233",
"Oplotnica": "2317",
"Orehova vas": "2312",
"Ormož": "2270",
"Ortnek": "1316",
"Osilnica": "1337",
"Otočec": "8222",
"Ožbalt": "2361",
"Pernica": "2231",
"Pesnica pri Mariboru": "2211",
"Petrovci": "9203",
"Petrovče": "3301",
"Piran/Pirano": "6330",
"Pišece": "8255",
"Pivka": "6257",
"Planina": "6232",
"Planina pri Sevnici": "3225",
"Pobegi": "6276",
"Podbočje": "8312",
"Podbrdo": "5243",
"Podčetrtek": "3254",
"Podgorci": "2273",
"Podgorje": "6216",
"Podgorje pri Slovenj Gradcu": "2381",
"Podgrad": "6244",
"Podkum": "1414",
"Podlehnik": "2286",
"Podnanos": "5272",
"Podnart": "4244",
"Podplat": "3241",
"Podsreda": "3257",
"Podvelka": "2363",
"Pohorje": "2208",
"Polenšak": "2257",
"Polhov Gradec": "1355",
"Poljane nad Škofjo Loko": "4223",
"Poljčane": "2319",
"Polšnik": "1272",
"Polzela": "3313",
"Ponikva": "3232",
"Portorož/Portorose": "6320",
"Postojna": "6230",
"Pragersko": "2331",
"Prebold": "3312",
"Preddvor": "4205",
"Prem": "6255",
"Preserje": "1352",
"Prestranek": "6258",
"Prevalje": "2391",
"Prevorje": "3262",
"Primskovo": "1276",
"Pristava pri Mestinju": "3253",
"Prosenjakovci/Partosfalva": "9207",
"Prvačina": "5297",
"Ptuj": "2250",
"Ptujska Gora": "2323",
"Puconci": "9201",
"Rače": "2327",
"Radeče": "1433",
"Radenci": "9252",
"Radlje ob Dravi": "2360",
"Radomlje": "1235",
"Radovljica": "4240",
"Raka": "8274",
"Rakek": "1381",
"Rateče - Planica": "4283",
"Ravne na Koroškem": "2390",
"Razkrižje": "9246",
"Rečica ob Savinji": "3332",
"Renče": "5292",
"Ribnica": "1310",
"Ribnica na Pohorju": "2364",
"Rimske Toplice": "3272",
"Rob": "1314",
"Ročinj": "5215",
"Rogaška Slatina": "3250",
"Rogašovci": "9262",
"Rogatec": "3252",
"Rovte": "1373",
"Ruše": "2342",
"Sava": "1282",
"Sečovlje/Sicciole": "6333",
"Selca": "4227",
"Selnica ob Dravi": "2352",
"Semič": "8333",
"Senovo": "8281",
"Senožeče": "6224",
"Sevnica": "8290",
"Sežana": "6210",
"Sladki Vrh": "2214",
"Slap ob Idrijci": "5283",
"Slovenj Gradec": "2380",
"Slovenska Bistrica": "2310",
"Slovenske Konjice": "3210",
"Smlednik": "1216",
"Soča": "5232",
"Sodražica": "1317",
"Solčava": "3335",
"Solkan": "5250",
"Sorica": "4229",
"Sovodenj": "4225",
"Spodnja Idrija": "5281",
"Spodnji Duplek": "2241",
"Spodnji Ivanjci": "9245",
"Središče ob Dravi": "2277",
"Srednja vas v Bohinju": "4267",
"Sromlje": "8256",
"Srpenica": "5224",
"Stahovica": "1242",
"Stara Cerkev": "1332",
"Stari trg ob Kolpi": "8342",
"Stari trg pri Ložu": "1386",
"Starše": "2205",
"Stoperce": "2289",
"Stopiče": "8322",
"Stranice": "3206",
"Straža": "8351",
"Struge": "1313",
"Studenec": "8293",
"Suhor": "8331",
"Sv. Duh na Ostrem Vrhu": "2353",
"Sveta Ana v Slovenskih goricah": "2233",
"Sveta Trojica v Slovenskih goricah": "2235",
"Sveti Jurij ob Ščavnici": "9244",
"Sveti Štefan": "3264",
"Sveti Tomaž": "2258",
"Šalovci": "9204",
"Šempas": "5261",
"Šempeter pri Gorici": "5290",
"Šempeter v Savinjski dolini": "3311",
"Šenčur": "4208",
"Šentilj v Slovenskih goricah": "2212",
"Šentjanž": "8297",
"Šentjanž pri Dravogradu": "2373",
"Šentjernej": "8310",
"Šentjur": "3230",
"Šentrupert": "3271",
"Šentrupert": "8232",
"Šentvid pri Stični": "1296",
"Škocjan": "8275",
"Škofije": "6281",
"Škofja Loka": "4220",
"Škofja vas": "3211",
"Škofljica": "1291",
"Šmarje": "6274",
"Šmarje - Sap": "1293",
"Šmarje pri Jelšah": "3240",
"Šmarješke Toplice": "8220",
"Šmartno na Pohorju": "2315",
"Šmartno ob Dreti": "3341",
"Šmartno ob Paki": "3327",
"Šmartno pri Litiji": "1275",
"Šmartno pri Slovenj Gradcu": "2383",
"Šmartno v Rožni dolini": "3201",
"Šoštanj": "3325",
"Štanjel": "6222",
"Štore": "3220",
"Tabor": "3304",
"Teharje": "3221",
"Tišina": "9251",
"Tolmin": "5220",
"Topolšica": "3326",
"Trbonje": "2371",
"Trbovlje": "1420",
"Trebelno": "8231",
"Trebnje": "8210",
"Trnovo pri Gorici": "5252",
"Trnovska vas": "2254",
"Trojane": "1222",
"Trzin": "1236",
"Tržič": "4290",
"Tržišče": "8295",
"Turjak": "1311",
"Turnišče": "9224",
"Uršna sela": "8323",
"Vače": "1252",
"Velenje": "3320",
"Velenje": "3322",
"Velika Loka": "8212",
"Velika Nedelja": "2274",
"Velika Polana": "9225",
"Velike Lašče": "1315",
"Veliki Gaber": "8213",
"Veržej": "9241",
"Videm - Dobrepolje": "1312",
"Videm pri Ptuju": "2284",
"Vinica": "8344",
"Vipava": "5271",
"Visoko": "4212",
"Višnja Gora": "1294",
"Vitanje": "3205",
"Vitomarci": "2255",
"Vodice": "1217",
"Vojnik": "3212",
"Volčja Draga": "5293",
"Voličina": "2232",
"Vransko": "3305",
"Vremski Britof": "6217",
"Vrhnika": "1360",
"Vuhred": "2365",
"Vuzenica": "2367",
"Zabukovje": "8292",
"Zagorje ob Savi": "1410",
"Zagradec": "1303",
"Zavrč": "2283",
"Zdole": "8272",
"Zgornja Besnica": "4201",
"Zgornja Korena": "2242",
"Zgornja Kungota": "2201",
"Zgornja Ložnica": "2316",
"Zgornja Polskava": "2314",
"Zgornja Velka": "2213",
"Zgornje Gorje": "4247",
"Zgornje Jezersko": "4206",
"Zgornji Leskovec": "2285",
"Zidani Most": "1432",
"Zreče": "3214",
"Žabnica": "4209",
"Žalec": "3310",
"Železniki": "4228",
"Žetale": "2287",
"Žiri": "4226",
"Žirovnica": "4274",
"Žužemberk": "8360",
  };

  function lookupKrajByPosta(posta) {
    const p = normalizePosta(posta);
    return POSTA_TO_KRAJ[p] || "";
  }

  function maybeAutofillKraj() {
    if (!postaEl || !krajEl) return;

    const p = normalizePosta(postaEl.value);
    postaEl.value = p;

    const found = lookupKrajByPosta(p);
    if (!found) return;

    const currentKraj = String(krajEl.value || "").trim();

    // prepiši samo, če je prazen ali je bil prej auto
    if (!currentKraj || currentKraj === lastAutoKraj) {
      krajEl.value = found;
      lastAutoKraj = found;
    }
  }

  if (postaEl) {
    postaEl.addEventListener("input", () => {
      if (normalizePosta(postaEl.value).length === 4) {
        maybeAutofillKraj();
      }
    });

    postaEl.addEventListener("blur", () => {
      maybeAutofillKraj();
    });
  }

  if (krajEl) {
    krajEl.addEventListener("input", () => {
      const v = String(krajEl.value || "").trim();
      if (v && v !== lastAutoKraj) lastAutoKraj = "";
    });
  }

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

    // ✅ NEW: normaliziraj pošto na 4 cifre
    data.posta = normalizePosta(data.posta);

    if (!data.priimek || !data.ime) {
      alert("Priimek in ime sta obvezna.");
      return;
    }
    if (!data.status || !data.spc) {
      alert("Status in SPC sta obvezna.");
      return;
    }

    // opcijsko: validacija pošte
    if (data.posta && !/^\d{4}$/.test(String(data.posta))) {
      alert("Št. pošte mora vsebovati 4 številke.");
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