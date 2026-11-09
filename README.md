# Planer

Lični planer obaveza i aktivnosti. Serverska aplikacija dostupna s telefona i laptopa.

## Funkcionalnosti

- Dnevni, sedmični i mjesečni pregled planera (kalendar)
- Ugniježđeni folderi za organizaciju aktivnosti (npr. Fakultet → MDP)
- Aktivnosti s nazivom, opisom, krajnjim rokom, prioritetom, procijenjenim trajanjem i naslovnom slikom
- Bočni panel s aktivnostima sortiranim po roku (najhitnije prve) i zakazivanje prevlačenjem
- Mjerenje vremena rada: start, pauza i završetak aktivnosti (samo jedan tajmer istovremeno)
- Tabla (Za uraditi / U radu / Završeno): prevlačenje u "U radu" pokreće, a u "Završeno" završava rad
- Statistika: vrijeme rada (izmjereno i procijenjeno), završene aktivnosti, rokovi, raspodjela po folderima
- Instalacija na telefon kao aplikacija (PWA)

## Tehnologije

- **Backend:** Node.js, Express, Prisma (libSQL adapter), SQLite / Turso
- **Frontend:** React, Vite, TypeScript
- **Deploy:** Render + Turso (besplatno, bez kartice) ili Docker + Caddy na vlastitom serveru

## Pokretanje (razvoj)

```bash
npm install
cp server/.env.example server/.env
npm run dev
```

Frontend: http://localhost:5173, API: http://localhost:3000/api. Baza je lokalni SQLite fajl
(`server/data/planner.db`); migracije se primjenjuju automatski pri pokretanju servera.
Nova migracija se pravi sa `cd server && npx prisma migrate dev --name <naziv>`.

## Postavljanje na internet

- **[DEPLOY-RENDER.md](DEPLOY-RENDER.md)** (preporuka): Render + Turso, besplatno i bez kartice.
- **[DEPLOY.md](DEPLOY.md)**: vlastiti (virtualni) server s Dockerom, Caddyjem i automatskim HTTPS-om.

## Baza i slike

Server koristi `DATABASE_URL`:

- `file:../data/planner.db`: lokalni SQLite fajl (putanja relativna u odnosu na `server/prisma`);
- `libsql://<baza>.turso.io` + `DATABASE_AUTH_TOKEN`: Turso baza u oblaku.

Naslovne slike se čuvaju u bazi (tabela `Image`), pa serveru ne treba trajni disk.

## Prijava

Prvi korisnik koji se registruje postaje vlasnik planera, a nakon toga se registracija zatvara.
Da bi bila otvorena za sve, postavi `ALLOW_REGISTRATION=true`. Zaboravljena lozinka se mijenja
skriptom `node scripts/reset-password.mjs <korisnik> <nova-lozinka>` (iz `server/` foldera).

## API

Sve rute osim `/api/auth/*` i `/api/health` traže header `Authorization: Bearer <token>`.

| Metoda | Ruta | Opis |
| --- | --- | --- |
| GET | `/api/auth/status` | Da li je registracija otvorena |
| POST | `/api/auth/register` | Registracija (`username`, `password`) |
| POST | `/api/auth/login` | Prijava, vraća token |
| GET | `/api/auth/me` | Trenutni korisnik |
| GET / POST | `/api/folders` | Lista / kreiranje foldera (`name`, `color`, `parentId`) |
| PATCH / DELETE | `/api/folders/:id` | Izmjena / brisanje foldera |
| GET | `/api/activities` | Lista aktivnosti (`?folderId=&recursive=true&completed=&search=`) |
| GET | `/api/activities/upcoming` | Nezavršene aktivnosti s rokom, najhitnije prve |
| GET | `/api/activities/:id` | Detalji aktivnosti s terminima |
| POST | `/api/activities` | Nova aktivnost (`title`, `description`, `deadline`, `priority` 0–2, `estimatedMinutes`, `folderId`) |
| PATCH / DELETE | `/api/activities/:id` | Izmjena (i `completed`) / brisanje |
| GET | `/api/sessions?from=&to=` | Termini u periodu (dan/sedmica/mjesec) |
| POST | `/api/sessions` | Zakazivanje (`activityId`, `start`, `end`) |
| PATCH / DELETE | `/api/sessions/:id` | Pomjeranje, označavanje `done` / brisanje |
| POST | `/api/activities/:id/start` | Pokreće tajmer (tajmer druge aktivnosti se pauzira) |
| POST | `/api/activities/:id/pause` | Pauzira tajmer |
| POST | `/api/activities/:id/finish` | Završava aktivnost i zaustavlja tajmer |
| GET | `/api/worklogs/current` | Tajmer koji trenutno radi |
| POST | `/api/worklogs` | Ručni unos perioda rada (`activityId`, `start`, `end`) |
| PATCH / DELETE | `/api/worklogs/:id` | Ispravka / brisanje perioda rada |
| PUT | `/api/activities/:id/cover` | Naslovna slika (tijelo je slika: `image/jpeg`, `image/png` ili `image/webp`, do 10 MB) |
| DELETE | `/api/activities/:id/cover` | Uklanjanje naslovne slike |
| GET | `/api/stats?from=&to=` | Podaci za statistiku u periodu (agregacija se radi u browseru, po lokalnom vremenu) |

### Vrijeme rada

Aktivnost ima status `todo` (za uraditi), `in_progress` (u radu ili pauzirano) ili `done` (završeno).
Istovremeno može raditi samo jedan tajmer. Za vrijeme rada važi:

- ako je rad mjeren tajmerom (ili ručno unesen), računa se izmjereno vrijeme;
- ako je aktivnost završena bez mjerenja, računa se njeno procijenjeno trajanje (`timeSource: "estimated"`).
