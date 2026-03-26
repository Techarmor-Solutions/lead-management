CREATE TABLE "manual_tasks" (
  "id" TEXT NOT NULL,
  "contactId" TEXT,
  "type" TEXT NOT NULL DEFAULT 'TASK',
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "dueDate" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "manual_tasks_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "manual_tasks" ADD CONSTRAINT "manual_tasks_contactId_fkey"
  FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
