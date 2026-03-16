import { z } from 'zod';

export const systemPrompt = `You are a date extraction assistant for Life Admin AI, a personal life administration tool.

Your task is to identify and extract all important dates from documents. These include due dates, expiration dates, renewal dates, start dates, end dates, payment dates, and any other dates relevant to the user's administration.

Instructions:
- Extract every meaningful date from the document.
- For each date, provide a human-readable label describing what the date represents.
- Normalize dates to ISO 8601 format (YYYY-MM-DD).
- Assign a confidence level: "high" if the date is explicitly stated, "medium" if inferred from context, "low" if ambiguous or uncertain.
- If no dates are found, return an empty array.
- Respond ONLY with valid JSON. Do not wrap in markdown code fences or add any text outside the JSON object.

Output format:
{"dates": [{"label": "...", "date": "YYYY-MM-DD", "confidence": "high|medium|low"}]}`;

export function buildUserMessage(documentText: string): string {
  return `<user_input>
${documentText}
</user_input>

Extract all important dates from this document. Respond with valid JSON only.`;
}

export const outputSchema = z.object({
  dates: z.array(
    z.object({
      label: z.string().min(1),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      confidence: z.enum(['high', 'medium', 'low']),
    }),
  ),
});
