# Postavljanje na Render + Turso (besplatno, bez kartice)

Planer radi na **Renderu** (besplatni web servis), a podaci su u **Turso** bazi (SQLite u
oblaku, besplatni plan). Oba servisa se otvaraju preko GitHub naloga. Dobiješ stalnu adresu
s HTTPS-om, npr. `https://planer-xxxx.onrender.com`, koja radi s laptopa i s telefona.

**Kako besplatni Render radi:** ako ~15 minuta niko ne otvara planer, Render ga "uspava".
Prvo otvaranje nakon toga traje 30–60 sekundi, a poslije radi normalno. Podaci se ne gube, jer
su u Turso bazi.

Uslovi besplatnih planova se mijenjaju. Ako neki servis ipak zatraži karticu, javi, pa
biramo drugi (npr. Koyeb umjesto Rendera).

---

## 1. Turso baza

1. Otvori [turso.tech](https://turso.tech) i prijavi se preko **GitHub** naloga.
2. U kontrolnoj tabli klikni **Create Database**. Naziv npr. `planer`; za lokaciju izaberi
   najbližu (npr. Evropa).
3. Otvori bazu i zapiši njen **URL**, oblika `libsql://planer-<korisnik>.turso.io`.
4. Klikni **Create Token** (ili *Generate token*): izaberi da token **ne ističe** i ima pravo
   **čitanja i pisanja**. Kopiraj token (prikazuje se samo jednom).

Tabele se prave same pri prvom pokretanju planera.

## 2. Render

1. Otvori [render.com](https://render.com) i prijavi se preko **GitHub** naloga. Dozvoli
   Renderu pristup repozitoriju `Planner`.
2. Klikni **New → Blueprint**, izaberi repozitorij `jovanvukvasic1/Planner` (grana `main`).
   Render pročita fajl `render.yaml` iz repozitorija i ponudi servis **planer** (besplatni plan).
3. Render traži dvije vrijednosti:
   - `DATABASE_URL`: URL baze iz koraka 1 (`libsql://...`)
   - `DATABASE_AUTH_TOKEN`: token iz koraka 1
   
   `JWT_SECRET` (tajni ključ za prijavu) Render generiše sam.
4. Klikni **Apply / Deploy**. Prva izgradnja traje nekoliko minuta. U logu na kraju treba da
   piše `Planner server radi na ...`.
5. Na vrhu stranice servisa je adresa, npr. `https://planer-xxxx.onrender.com`. Otvori je i
   **registruj se**. Prvi korisnik postaje vlasnik, a nakon toga se registracija zatvara.

**Ako Blueprint traži karticu ili ne radi:** napravi servis ručno preko **New → Web Service**
→ repozitorij `Planner`, s ovim postavkama:

| Polje | Vrijednost |
| --- | --- |
| Runtime / Language | Node |
| Build Command | `npm ci --include=dev && npm run build` |
| Start Command | `cd server && node dist/index.js` |
| Instance type | Free |
| Health Check Path | `/api/health` |

Pod **Environment** dodaj: `NODE_VERSION` = `22`, `NODE_ENV` = `production`, `DATABASE_URL`,
`DATABASE_AUTH_TOKEN`, `ALLOW_REGISTRATION` = `false` i `JWT_SECRET`. Za `JWT_SECRET` klikni
**Generate**, ili upiši nasumičan niz od bar 32 znaka.

## 3. Instaliraj na telefon

- **Android (Chrome):** otvori adresu planera → meni (⋮) → *Instaliraj aplikaciju* /
  *Dodaj na početni ekran*.
- **iPhone (Safari):** otvori adresu planera → dugme *Dijeli* → *Dodaj na početni ekran*.

## 4. Ažuriranje

Render automatski ponovo izgradi i pokrene planer kad god se nešto pushuje na granu `main`.
Promjene baze (migracije) primjenjuju se same pri pokretanju; podaci ostaju.

## 5. Da se planer ne uspavljuje (opcionalno)

Besplatni Render daje dovoljno sati mjesečno za jedan servis koji radi stalno. Da bi planer
uvijek bio "budan", može ga neki besplatni servis za praćenje dostupnosti (npr.
[cron-job.org](https://cron-job.org) ili [UptimeRobot](https://uptimerobot.com)) otvarati
svakih 10 minuta. Adresa za to je `https://planer-xxxx.onrender.com/api/health`.

## 6. Backup

Turso čuva istoriju baze (besplatni plan omogućava vraćanje na stanje iz bliske prošlosti).
Za vlastitu kopiju (npr. jednom sedmično) koristi Turso CLI na svom računaru:

```bash
curl -sSfL https://get.tur.so/install.sh | bash
```

```bash
turso auth login
```

```bash
turso db shell planer .dump > planer-backup.sql
```

Fajl `planer-backup.sql` sadrži sve: aktivnosti, foldere, evidenciju rada i slike.
(Na Windowsu Turso CLI radi kroz WSL.)

## Česti problemi

| Problem | Rješenje |
| --- | --- |
| Deploy pada, u logu `GRESKA: ne mogu se povezati s bazom` | Provjeri `DATABASE_URL` (mora počinjati sa `libsql://`) i `DATABASE_AUTH_TOKEN` u *Environment* postavkama servisa. |
| U logu `JWT_SECRET mora biti postavljen` | Dodaj `JWT_SECRET` (bar 32 znaka) u *Environment*. |
| Prvo otvaranje je sporo | Normalno za besplatni Render nakon 15 min neaktivnosti (vidi korak 5). |
| Zaboravljena lozinka | Besplatni Render nema konzolu, pa se lozinka mijenja s tvog računara (vidi ispod). |

**Promjena lozinke s tvog računara** (treba Node.js 22 i kopija repozitorija):

```bash
npm install && npm run build --workspace server
```

```bash
cd server && DATABASE_URL="libsql://planer-<korisnik>.turso.io" DATABASE_AUTH_TOKEN="<token>" node scripts/reset-password.mjs KORISNIK NOVA_LOZINKA
```
