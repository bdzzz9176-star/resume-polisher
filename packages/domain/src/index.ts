import type { ResumeFactContract, RevisionSuggestionContract } from "@ai-job-search/contracts";

export type SuggestionValidation =
  | { ok: true }
  | { ok: false; missingFactIds: string[]; reason: string };

export function validateSuggestionFacts(
  suggestion: RevisionSuggestionContract,
  facts: ResumeFactContract[],
): SuggestionValidation {
  const usableFacts = new Set(
    facts.filter((fact) => fact.confirmed).map((fact) => fact.id),
  );
  const missingFactIds = suggestion.factIds.filter((factId) => !usableFacts.has(factId));

  if (missingFactIds.length > 0) {
    return {
      ok: false,
      missingFactIds,
      reason: "建议引用了未确认或不存在的简历事实。",
    };
  }

  return { ok: true };
}

