-- Datumi zapisani kao broj milisekundi (stari Prisma SQLite format) pretvaraju se u ISO tekst,
-- kakav zapisuje libSQL adapter, da bi poredjenja po datumu radila u svim zapisima.

UPDATE "User" SET "createdAt" = strftime('%Y-%m-%dT%H:%M:%f', "createdAt" / 1000.0, 'unixepoch') || '+00:00' WHERE typeof("createdAt") = 'integer';
UPDATE "Folder" SET "createdAt" = strftime('%Y-%m-%dT%H:%M:%f', "createdAt" / 1000.0, 'unixepoch') || '+00:00' WHERE typeof("createdAt") = 'integer';
UPDATE "Activity" SET "deadline" = strftime('%Y-%m-%dT%H:%M:%f', "deadline" / 1000.0, 'unixepoch') || '+00:00' WHERE typeof("deadline") = 'integer';
UPDATE "Activity" SET "completedAt" = strftime('%Y-%m-%dT%H:%M:%f', "completedAt" / 1000.0, 'unixepoch') || '+00:00' WHERE typeof("completedAt") = 'integer';
UPDATE "Activity" SET "createdAt" = strftime('%Y-%m-%dT%H:%M:%f', "createdAt" / 1000.0, 'unixepoch') || '+00:00' WHERE typeof("createdAt") = 'integer';
UPDATE "Activity" SET "updatedAt" = strftime('%Y-%m-%dT%H:%M:%f', "updatedAt" / 1000.0, 'unixepoch') || '+00:00' WHERE typeof("updatedAt") = 'integer';
UPDATE "Session" SET "start" = strftime('%Y-%m-%dT%H:%M:%f', "start" / 1000.0, 'unixepoch') || '+00:00' WHERE typeof("start") = 'integer';
UPDATE "Session" SET "end" = strftime('%Y-%m-%dT%H:%M:%f', "end" / 1000.0, 'unixepoch') || '+00:00' WHERE typeof("end") = 'integer';
UPDATE "Session" SET "createdAt" = strftime('%Y-%m-%dT%H:%M:%f', "createdAt" / 1000.0, 'unixepoch') || '+00:00' WHERE typeof("createdAt") = 'integer';
UPDATE "WorkLog" SET "start" = strftime('%Y-%m-%dT%H:%M:%f', "start" / 1000.0, 'unixepoch') || '+00:00' WHERE typeof("start") = 'integer';
UPDATE "WorkLog" SET "end" = strftime('%Y-%m-%dT%H:%M:%f', "end" / 1000.0, 'unixepoch') || '+00:00' WHERE typeof("end") = 'integer';
UPDATE "WorkLog" SET "createdAt" = strftime('%Y-%m-%dT%H:%M:%f', "createdAt" / 1000.0, 'unixepoch') || '+00:00' WHERE typeof("createdAt") = 'integer';
UPDATE "Image" SET "createdAt" = strftime('%Y-%m-%dT%H:%M:%f', "createdAt" / 1000.0, 'unixepoch') || '+00:00' WHERE typeof("createdAt") = 'integer';
