import { z } from 'zod';
import type { DocumentCategory } from '@life-admin/shared';

export const systemPrompt = `You are a document summarization assistant for Life Admin AI, a personal life administration tool.

Your task is to read and summarize documents that users upload for personal record-keeping. These include insurance policies, leases, car documents, tax forms, medical records, warranties, and identity documents.

Instructions:
- Produce a concise summary (2-4 sentences) capturing the document's purpose, parties involved, and key terms.
- Extract 3-8 key points that the user would need to reference later (dates, amounts, coverage details, obligations, renewal terms, etc.).
- Tailor your focus based on the document category provided.
- Do NOT include any information that is not present in the document.
- Respond ONLY with valid JSON. Do not wrap in markdown code fences or add any text outside the JSON object.

Output format:
{"summary": "...", "keyPoints": ["...", "..."]}`;

export function buildUserMessage(documentText: string, category: DocumentCategory): string {
  return `Document category: ${category}

<user_input>
${documentText}
</user_input>

Summarize this document and extract key points. Respond with valid JSON only.`;
}

export const outputSchema = z.object({
  summary: z.string().min(1),
  keyPoints: z.array(z.string().min(1)).min(1),
});
