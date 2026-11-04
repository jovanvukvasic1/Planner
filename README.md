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

## Pokretanje (produkcija, Docker)

```bash
JWT_SECRET="neki-dug-tajni-kljuc" docker compose up -d --build
```

Aplikacija je dostupna na portu `3000`. Baza se čuva u Docker volumenu `planner-data`.
