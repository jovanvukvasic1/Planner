-- CreateTable
CREATE TABLE "WorkLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "start" DATETIME NOT NULL,
    "end" DATETIME,
    "activityId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WorkLog_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WorkLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Activity" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "deadline" DATETIME,
    "priority" INTEGER NOT NULL DEFAULT 1,
    "estimatedMinutes" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'todo',
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" DATETIME,
    "folderId" INTEGER,
    "userId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Activity_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "Folder" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Activity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Activity" ("completed", "completedAt", "createdAt", "deadline", "description", "estimatedMinutes", "folderId", "id", "priority", "title", "updatedAt", "userId") SELECT "completed", "completedAt", "createdAt", "deadline", "description", "estimatedMinutes", "folderId", "id", "priority", "title", "updatedAt", "userId" FROM "Activity";
DROP TABLE "Activity";
ALTER TABLE "new_Activity" RENAME TO "Activity";
CREATE INDEX "Activity_userId_idx" ON "Activity"("userId");
CREATE INDEX "Activity_folderId_idx" ON "Activity"("folderId");
CREATE INDEX "Activity_deadline_idx" ON "Activity"("deadline");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "WorkLog_userId_start_idx" ON "WorkLog"("userId", "start");

-- CreateIndex
CREATE INDEX "WorkLog_activityId_idx" ON "WorkLog"("activityId");

-- Postojece zavrsene aktivnosti dobijaju status "done".
UPDATE "Activity" SET "status" = 'done' WHERE "completed" = true;
