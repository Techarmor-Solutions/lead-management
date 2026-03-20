import { google } from "googleapis";
import { prisma } from "./db";

export function getOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    process.env.GMAIL_REDIRECT_URI
  );
}

export function getAuthUrl(): string {
  const oauth2Client = getOAuthClient();
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: [
      "https://www.googleapis.com/auth/gmail.send",
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/userinfo.email",
    ],
    prompt: "consent",
  });
}

export async function getAuthorizedClient() {
  const cred = await prisma.gmailCredential.findFirst();
  if (!cred) throw new Error("Gmail not connected. Please authorize Gmail first.");

  const oauth2Client = getOAuthClient();
  oauth2Client.setCredentials({
    access_token: cred.accessToken,
    refresh_token: cred.refreshToken,
    expiry_date: Number(cred.expiryDate),
  });

  // Auto-refresh if expired
  oauth2Client.on("tokens", async (tokens) => {
    await prisma.gmailCredential.updateMany({
      data: {
        accessToken: tokens.access_token ?? cred.accessToken,
        expiryDate: BigInt(tokens.expiry_date ?? cred.expiryDate),
      },
    });
  });

  return oauth2Client;
}

export async function sendEmail(params: {
  to: string;
  subject: string;
  htmlBody: string;
  textBody: string;
}) {
  const auth = await getAuthorizedClient();
  const gmail = google.gmail({ version: "v1", auth });

  const cred = await prisma.gmailCredential.findFirst();
  const from = cred?.email || "me";

  const messageParts = [
    `From: ${from}`,
    `To: ${params.to}`,
    `Subject: ${params.subject}`,
    "MIME-Version: 1.0",
    'Content-Type: multipart/alternative; boundary="boundary"',
    "",
    "--boundary",
    "Content-Type: text/plain; charset=UTF-8",
    "",
    params.textBody,
    "",
    "--boundary",
    "Content-Type: text/html; charset=UTF-8",
    "",
    params.htmlBody,
    "",
    "--boundary--",
  ];

  const raw = Buffer.from(messageParts.join("\r\n"))
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  await gmail.users.messages.send({
    userId: "me",
    requestBody: { raw },
  });
}

export async function getGmailSignature(): Promise<string> {
  try {
    const auth = await getAuthorizedClient();
    const gmail = google.gmail({ version: "v1", auth });
    const res = await gmail.users.settings.sendAs.list({ userId: "me" });
    const sendAs = res.data.sendAs || [];
    const primary = sendAs.find((s) => s.isPrimary) || sendAs[0];
    return primary?.signature || "";
  } catch {
    return "";
  }
}

function getMessageBody(payload: { parts?: Array<{ mimeType?: string; body?: { data?: string } }>; body?: { data?: string } } | undefined): string {
  if (!payload) return "";
  for (const part of payload.parts || []) {
    if (part.mimeType === "text/plain" && part.body?.data) {
      return Buffer.from(part.body.data, "base64").toString("utf-8");
    }
  }
  if (payload.body?.data) {
    return Buffer.from(payload.body.data, "base64").toString("utf-8");
  }
  return "";
}

export async function pollForBounces(): Promise<string[]> {
  const auth = await getAuthorizedClient();
  const gmail = google.gmail({ version: "v1", auth });

  // Gmail bounce notifications come from mailer-daemon / postmaster
  const res = await gmail.users.messages.list({
    userId: "me",
    q: '(from:mailer-daemon OR from:postmaster) newer_than:7d is:unread',
    maxResults: 25,
  });

  const messages = res.data.messages || [];
  const bouncedEmails: string[] = [];

  for (const msg of messages) {
    const detail = await gmail.users.messages.get({
      userId: "me",
      id: msg.id!,
      format: "full",
    });

    const body = getMessageBody(detail.data.payload as Parameters<typeof getMessageBody>[0]);
    const snippet = detail.data.snippet || "";
    const content = snippet + "\n" + body;

    // DSN format: "Final-Recipient: rfc822; user@example.com"
    const dsnMatch = content.match(/Final-Recipient\s*:\s*rfc822\s*;\s*([^\s\r\n,]+@[^\s\r\n,]+)/i)
      || content.match(/Original-Recipient\s*:\s*rfc822\s*;\s*([^\s\r\n,]+@[^\s\r\n,]+)/i);

    // Plain-text bounce: "does not exist: email@example.com" or similar
    const textMatch = !dsnMatch && (
      content.match(/(?:does not exist|no such user|unknown user|invalid address|user unknown)[^a-zA-Z0-9]*([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/i)
      || content.match(/(?:address not found|delivery failed)[^\n]*\n[^\n]*?([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/i)
    );

    const match = dsnMatch || textMatch;
    if (match) {
      bouncedEmails.push(match[1].toLowerCase().trim());
    }

    // Mark as read so we don't process it again
    await gmail.users.messages.modify({
      userId: "me",
      id: msg.id!,
      requestBody: { removeLabelIds: ["UNREAD"] },
    });
  }

  return [...new Set(bouncedEmails)];
}

export async function pollForReplies(contactEmails: string[]): Promise<string[]> {
  if (contactEmails.length === 0) return [];

  const auth = await getAuthorizedClient();
  const gmail = google.gmail({ version: "v1", auth });

  const emailQuery = contactEmails
    .slice(0, 20) // Gmail query has limits
    .map((e) => `from:${e}`)
    .join(" OR ");

  const res = await gmail.users.messages.list({
    userId: "me",
    q: `(${emailQuery}) newer_than:30d`,
    maxResults: 50,
  });

  const messages = res.data.messages || [];
  const repliedEmails: string[] = [];

  for (const msg of messages) {
    const detail = await gmail.users.messages.get({
      userId: "me",
      id: msg.id!,
      format: "metadata",
      metadataHeaders: ["From"],
    });

    const fromHeader = detail.data.payload?.headers?.find(
      (h) => h.name === "From"
    )?.value || "";

    const emailMatch = fromHeader.match(/<(.+)>/) || fromHeader.match(/(\S+@\S+)/);
    if (emailMatch) {
      const email = emailMatch[1].toLowerCase();
      if (contactEmails.map((e) => e.toLowerCase()).includes(email)) {
        repliedEmails.push(email);
      }
    }
  }

  return [...new Set(repliedEmails)];
}
