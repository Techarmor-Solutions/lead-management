import Anthropic from "@anthropic-ai/sdk";

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export const MODEL = "claude-sonnet-4-6";
const ENRICH_MODEL = "claude-haiku-4-5-20251001";

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
  const empty: EnrichmentResult = {
    contacts: [],
    companyLinkedIn: "",
    companySummary: "",
    recentNews: "",
    techStack: "",
  };

  const messages: Anthropic.MessageParam[] = [
    {
      role: "user",
      content: `Search the web and research the company "${companyName}" (website: ${website || "unknown"}, industry: ${industry || "unknown"}).

IMPORTANT: Your final response must be ONLY a raw JSON object. No markdown, no explanation, no preamble, no code fences. Start your response with { and end with }.

Find: decision-maker contacts (owner/CEO/marketing director), company LinkedIn URL, 2-3 sentence summary, recent news, tech stack clues.

Required JSON schema (use empty string if unknown):
{"contacts":[{"firstName":"","lastName":"","title":"","email":"","phone":"","linkedin":""}],"companyLinkedIn":"","companySummary":"","recentNews":"","techStack":""}`,
    },
  ];

  // Agentic loop — Claude may call web_search multiple times before producing the final JSON
  for (let i = 0; i < 4; i++) {
    const response = await anthropic.messages.create({
      model: ENRICH_MODEL,
      max_tokens: 1024,
      tools: [{ type: "web_search_20250305", name: "web_search" } as never],
      messages,
    });

    if (response.stop_reason === "end_turn") {
      const textBlock = response.content.find((c) => c.type === "text");
      if (!textBlock || textBlock.type !== "text") return empty;
      const text = textBlock.text;

      // Try code fence first (```json ... ``` or ``` ... ```)
      const fenceMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
      // Then try raw JSON object (greedy — find the outermost {...})
      const rawMatch = text.match(/\{[\s\S]*\}/);
      const jsonStr = fenceMatch?.[1] ?? rawMatch?.[0];

      if (!jsonStr) return { ...empty, companySummary: text.slice(0, 500) };
      try {
        return JSON.parse(jsonStr);
      } catch {
        return { ...empty, companySummary: text.slice(0, 500) };
      }
    }

    if (response.stop_reason === "tool_use") {
      // For server-side tools (web_search), results are already embedded in response.content
      messages.push({ role: "assistant", content: response.content });
      messages.push({ role: "user", content: "Please continue." });
      continue;
    }

    break;
  }

  return empty;
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
