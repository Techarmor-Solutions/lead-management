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
  industry: string,
  city?: string,
  state?: string
): Promise<EnrichmentResult> {
  const empty: EnrichmentResult = {
    contacts: [],
    companyLinkedIn: "",
    companySummary: "",
    recentNews: "",
    techStack: "",
  };

  const location = [city, state].filter(Boolean).join(", ");

  const messages: Anthropic.MessageParam[] = [
    {
      role: "user",
      content: `You are a B2B research assistant. Use web search to find detailed information about this business.

Business: "${companyName}"
${location ? `Location: ${location}` : ""}
${website ? `Website: ${website}` : ""}
Industry: ${industry || "unknown"}

Your goal is to find:
1. The owner's or decision-maker's FULL NAME, EMAIL ADDRESS, phone, and LinkedIn profile. Search their website's contact page, About page, Google Business listing, Facebook page, LinkedIn, and any press mentions.
2. The company's LinkedIn page URL.
3. A 2-3 sentence description of what they do.
4. Any recent news or notable info.
5. What software/tools/platforms they use (website builder, CRM, booking system, etc).

Search aggressively — try multiple queries like:
- "${companyName} ${location} owner email"
- "${companyName} contact"
- "${companyName} site:linkedin.com"
- "${companyName} ${location} owner name"

After all searches, respond with ONLY a raw JSON object (no markdown, no explanation, no code fences):
{"contacts":[{"firstName":"","lastName":"","title":"","email":"","phone":"","linkedin":""}],"companyLinkedIn":"","companySummary":"","recentNews":"","techStack":""}

Use empty string for any field you cannot find. Include as many contacts as you find.`,
    },
  ];

  // Agentic loop — runs until end_turn or 8 iterations
  for (let i = 0; i < 8; i++) {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 2048,
      tools: [{ type: "web_search_20250305", name: "web_search" } as never],
      messages,
    });

    if (response.stop_reason === "end_turn") {
      const textBlock = response.content.find((c) => c.type === "text");
      if (!textBlock || textBlock.type !== "text") return empty;
      const text = textBlock.text.trim();

      const fenceMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
      const rawMatch = text.match(/\{[\s\S]*\}/);
      const jsonStr = fenceMatch?.[1] ?? rawMatch?.[0];

      if (!jsonStr) return empty;
      try {
        return JSON.parse(jsonStr);
      } catch {
        return empty;
      }
    }

    if (response.stop_reason === "tool_use") {
      // Add assistant message with tool_use blocks
      messages.push({ role: "assistant", content: response.content });
      // Add empty tool_result blocks for each tool_use (web_search is server-side)
      const toolResults = response.content
        .filter((c): c is Anthropic.ToolUseBlock => c.type === "tool_use")
        .map((c) => ({
          type: "tool_result" as const,
          tool_use_id: c.id,
          content: "",
        }));
      if (toolResults.length > 0) {
        messages.push({ role: "user", content: toolResults });
      }
      continue;
    }

    break;
  }

  return empty;
}

export async function enrichCompanyLite(
  companyName: string,
  website: string,
  industry: string,
  city?: string,
  state?: string
): Promise<EnrichmentResult> {
  const empty: EnrichmentResult = {
    contacts: [],
    companyLinkedIn: "",
    companySummary: "",
    recentNews: "",
    techStack: "",
  };

  const location = [city, state].filter(Boolean).join(", ");

  const messages: Anthropic.MessageParam[] = [
    {
      role: "user",
      content: `You are a B2B contact finder. Use ONE web search to find the owner or decision-maker at this business.

Business: "${companyName}"
${location ? `Location: ${location}` : ""}
${website ? `Website: ${website}` : ""}
Industry: ${industry || "unknown"}

Search for: "${companyName} ${location} owner"

Find ONLY: first name, last name, job title, and email address of the owner or primary decision-maker.

Respond with ONLY a raw JSON object (no markdown, no explanation):
{"contacts":[{"firstName":"","lastName":"","title":"","email":"","phone":"","linkedin":""}],"companyLinkedIn":"","companySummary":"","recentNews":"","techStack":""}

Use empty string for any field you cannot find.`,
    },
  ];

  for (let i = 0; i < 2; i++) {
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
      tools: [{ type: "web_search_20250305", name: "web_search" } as never],
      messages,
    });

    if (response.stop_reason === "end_turn") {
      const textBlock = response.content.find((c) => c.type === "text");
      if (!textBlock || textBlock.type !== "text") return empty;
      const text = textBlock.text.trim();

      const fenceMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
      const rawMatch = text.match(/\{[\s\S]*\}/);
      const jsonStr = fenceMatch?.[1] ?? rawMatch?.[0];

      if (!jsonStr) return empty;
      try {
        return JSON.parse(jsonStr);
      } catch {
        return empty;
      }
    }

    if (response.stop_reason === "tool_use") {
      messages.push({ role: "assistant", content: response.content });
      const toolResults = response.content
        .filter((c): c is Anthropic.ToolUseBlock => c.type === "tool_use")
        .map((c) => ({
          type: "tool_result" as const,
          tool_use_id: c.id,
          content: "",
        }));
      if (toolResults.length > 0) {
        messages.push({ role: "user", content: toolResults });
      }
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
