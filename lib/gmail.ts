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
