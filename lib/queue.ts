import { PgBoss } from "pg-boss";

let boss: PgBoss | null = null;

export async function getQueue(): Promise<PgBoss> {
  if (!boss) {
    boss = new PgBoss({
      connectionString: process.env.DATABASE_URL,
      schema: "pgboss",
    });
    await boss.start();
  }
  return boss;
}

export const QUEUE_SEND_EMAIL = "send-email";

export interface SendEmailJobData {
  sendId: string;
  campaignId: string;
  contactId: string;
  stepId: string;
}
