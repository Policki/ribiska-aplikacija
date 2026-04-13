# RD Mozirje - XAMPP namestitev

## 1. Nastavitev baze

1. Zaženi XAMPP.
2. Vklopi `Apache` in `MySQL`.
3. Odpri aplikacijo v brskalniku:

   `http://localhost/ribiska-aplikacija/install.php`

Namestitev ustvari bazo `rd_mozirje`, potrebne tabele in admin uporabnika.

## 2. Prijava

Privzeti admin uporabnik:

- uporabniško ime: `epolicnik`
- začasno geslo: `admin123`

Po prvi prijavi geslo zamenjaj.

## 3. PHP način strani

Strani lahko odpiraš s končnico `.php`, na primer:

- `http://localhost/ribiska-aplikacija/dashboard.php`
- `http://localhost/ribiska-aplikacija/seznam.php`
- `http://localhost/ribiska-aplikacija/karte-čuvaji.php`

PHP usmerjevalnik v ozadju prikaže obstoječe strani in zaščitene strani preveri s PHP sejo.

## 4. Shranjevanje podatkov

Aplikacija ob nalaganju strani prebere podatke iz MySQL tabele `rd_storage` in jih začasno naloži v brskalnik.
Ko se podatki spremenijo, se sinhronizirajo nazaj v MySQL.

To je prehodna strežniška plast, ki omogoči delovanje obstoječih modulov na XAMPP in kasneje na pravem strežniku.
Naslednji večji korak je postopna pretvorba posameznih modulov v ločene SQL tabele.

## 5. Nastavitve za pravi strežnik

Podatke za povezavo z bazo spremeniš v:

`php/config.php`


## 6. Normalizirane SQL tabele

Poleg prehodne tabele `rd_storage` se podatki zdaj sproti preslikavajo tudi v ločene SQL tabele:

- `rd_members` za člane
- `rd_member_fees` za članarino
- `rd_work_hours` za delovne ure
- `rd_licenses` za letne karte
- `rd_awards` za priznanja
- `rd_officials` za funkcionarje
- `rd_events` za koledar
- `rd_membership_applications` za pristopne izjave
- `rd_animal_observations` za opažanja
- `rd_yearly_recaps` za letno rekapitulacijo
- `rd_reminders` za opomnike
- `rd_communication_groups` in `rd_communication_log` za obveščanje

Če želiš obstoječe podatke iz `rd_storage` kadarkoli ponovno preslikati v te tabele, se kot admin prijavi in odpri:

`http://localhost/ribis/RDAplikacija/ribiska-aplikacija/api/migrate.php`

Običajno tega ni treba ročno poganjati, ker `api/storage.php` sinhronizira spremembe sproti.
