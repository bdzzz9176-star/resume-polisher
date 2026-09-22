import { z } from "zod";

export const jobAnalysisSchema = z.object({
  contract: z.literal("job-analysis.v1"),
  provider: z.enum(["fake", "deepseek"]),
  generatedAt: z.iso.datetime(),
  requirements: z.array(
    z.object({
      id: z.string().min(1),
      sourceText: z.string().min(1),
      normalizedText: z.string().min(1),
      kind: z.enum(["responsibility", "required", "preferred", "experience", "education"]),
      priority: z.enum(["high", "medium", "low"]),
      isInference: z.boolean(),
    }),
  ),
  facts: z.array(
    z.object({
      id: z.string().min(1),
      content: z.string().min(1),
      sourceType: z.enum(["resume", "follow_up_answer", "manual_edit"]),
      sourceRef: z.string().min(1),
      confirmed: z.boolean(),
      reusable: z.boolean(),
    }),
  ),
  evidence: z.array(
    z.object({
      requirementId: z.string().min(1),
      factIds: z.array(z.string().min(1)),
      status: z.enum(["present_and_expressed", "present_but_underexpressed", "unverified", "missing"]),
      explanation: z.string().min(1),
      needsFollowUp: z.boolean(),
    }),
  ),
  summary: z.object({
    presentAndExpressed: z.number().int().min(0),
    presentButUnderexpressed: z.number().int().min(0),
    unverified: z.number().int().min(0),
    missing: z.number().int().min(0),
  }),
  warnings: z.array(z.object({ code: z.string().min(1), message: z.string().min(1) })),
});


