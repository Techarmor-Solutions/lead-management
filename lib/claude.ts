import Anthropic from "@anthropic-ai/sdk";

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export const MODEL = "claude-sonnet-4-6";

export interface EnrichmentResult {
  contacts: {
    firstName: string;
    lastName: string;
    title: string;
    email: string;
    phone: string;
    linkedin: string;
  }[];
  companyLinkedIn: string;
  companySummary: string;
  recentNews: string;
  techStack: string;
}

export async function enrichCompany(
  companyName: string,
  website: string,
  industry: string
): Promise<EnrichmentResult> {
  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 2000,
    tools: [
      {
        name: "web_search",
        type: "computer_20250124" as never,
      } as never,
    ],
    messages: [
      {
        role: "user",
        content: `Research the company "${companyName}" (website: ${website || "unknown"}, industry: ${industry || "unknown"}).

Find and return as JSON:
1. Decision-maker contacts (owner, CEO, marketing director, etc.) with: firstName, lastName, title, email (if findable), phone, linkedinUrl
2. Company LinkedIn URL
3. Brief company summary (2-3 sentences)
4. Any recent news or notable mentions
5. Technology stack hints (what software/tools they use)

Search their website, LinkedIn, and the web. Return ONLY valid JSON matching this schema:
{
  "contacts": [{"firstName":"","lastName":"","title":"","email":"","phone":"","linkedin":""}],
  "companyLinkedIn": "",
  "companySummary": "",
  "recentNews": "",
  "techStack": ""
}`,
      },
    ],
  });

  const textContent = message.content.find((c) => c.type === "text");
  if (!textContent || textContent.type !== "text") {
    return {
      contacts: [],
      companyLinkedIn: "",
      companySummary: "",
      recentNews: "",
      techStack: "",
    };
  }

  try {
    const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found");
    return JSON.parse(jsonMatch[0]);
  } catch {
    return {
      contacts: [],
      companyLinkedIn: "",
      companySummary: "Could not parse enrichment data.",
      recentNews: "",
      techStack: "",
    };
  }
}

export async function generateCampaignCopy(params: {
  agencyProfile: {
    name: string;
    services: string[];
    valueProposition: string;
    targetIndustries: string[];
    painPoints: string[];
  };
  targetCompany: { name: string; industry: string; website: string };
  stepCount: number;
  historicalInsights?: string;
}): Promise<{ subject: string; body: string; label: string }[]> {
  const { agencyProfile, targetCompany, stepCount, historicalInsights } = params;

  const prompt = `You are a cold email copywriter for ${agencyProfile.name}, a web design/marketing agency.

Agency services: ${agencyProfile.services.join(", ")}
Value proposition: ${agencyProfile.valueProposition}
Target industries: ${agencyProfile.targetIndustries.join(", ")}
Common pain points addressed: ${agencyProfile.painPoints.join(", ")}

Target company: ${targetCompany.name} (${targetCompany.industry})
Website: ${targetCompany.website || "unknown"}

${historicalInsights ? `Historical performance insights: ${historicalInsights}` : ""}

Write a ${stepCount}-step cold email sequence. Each email should naturally evolve:
- Step 1: Warm intro, establish relevance, soft CTA
- Step 2: Pivot/add value, acknowledge no response, different angle
- Step 3+: Short, punchy, pattern interrupt or final nudge

Use personalization tags: {{first_name}}, {{company_name}}, {{sender_name}}

Return ONLY valid JSON array:
[
  {"label": "Initial Outreach", "subject": "...", "body": "..."},
  {"label": "Follow-up", "subject": "...", "body": "..."}
]

Body should be plain text with paragraph breaks (\\n\\n). Keep emails concise (under 150 words each).`;

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 3000,
    messages: [{ role: "user", content: prompt }],
  });

  const textContent = message.content.find((c) => c.type === "text");
  if (!textContent || textContent.type !== "text") return [];

  try {
    const jsonMatch = textContent.text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error("No JSON array found");
    return JSON.parse(jsonMatch[0]);
  } catch {
    return [];
  }
}
