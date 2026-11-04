# Planer

Lični planer obaveza i aktivnosti. Serverska aplikacija dostupna s telefona i laptopa.

## Funkcionalnosti (plan)

- Dnevni, sedmični i mjesečni pregled planera
- Ugniježđeni folderi za organizaciju aktivnosti (npr. Fakultet → MDP)
- Aktivnosti s nazivom, opisom, krajnjim rokom, prioritetom i procijenjenim trajanjem
- Bočni panel s aktivnostima sortiranim po roku (najhitnije prve)
- Zakazivanje aktivnosti u planer (jedna aktivnost može imati više termina)
- Označavanje urađenih aktivnosti i termina
- Statistika

## Tehnologije

- **Backend:** Node.js, Express, Prisma, SQLite
- **Frontend:** React, Vite, TypeScript
- **Deploy:** Docker

## Pokretanje (razvoj)

```bash
npm install
cp server/.env.example server/.env
cd server && npx prisma migrate dev && cd ..
npm run dev
```

Frontend: http://localhost:5173, API: http://localhost:3000/api

## Prijava

Prvi korisnik koji se registruje postaje vlasnik planera, a nakon toga se registracija zatvara.
Da bi bila otvorena za sve, postavi `ALLOW_REGISTRATION=true`.

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

## Pokretanje (produkcija, Docker)

```bash
JWT_SECRET="neki-dug-tajni-kljuc" docker compose up -d --build
```

Aplikacija je dostupna na portu `3000`. Baza se čuva u Docker volumenu `planner-data`.
