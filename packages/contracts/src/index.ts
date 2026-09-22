export const CONTRACT_VERSION = "v1" as const;

export type RequirementKind =
  | "responsibility"
  | "required"
  | "preferred"
  | "experience"
  | "education";

export type EvidenceStatus =
  | "present_and_expressed"
  | "present_but_underexpressed"
  | "unverified"
  | "missing";

export interface JobRequirementContract {
  id: string;
  sourceText: string;
  normalizedText: string;
  kind: RequirementKind;
  priority: "high" | "medium" | "low";
  isInference: boolean;
}

export interface ResumeFactContract {
  id: string;
  content: string;
  sourceType: "resume" | "follow_up_answer" | "manual_edit";
  sourceRef: string;
  confirmed: boolean;
  reusable: boolean;
}

export interface EvidenceMapContract {
  requirementId: string;
  factIds: string[];
  status: EvidenceStatus;
  explanation: string;
  needsFollowUp: boolean;
}

export interface JobAnalysisContract {
  contract: "job-analysis.v1";
  provider: "fake" | "deepseek";
  generatedAt: string;
  requirements: JobRequirementContract[];
  facts: ResumeFactContract[];
  evidence: EvidenceMapContract[];
  summary: {
    presentAndExpressed: number;
    presentButUnderexpressed: number;
    unverified: number;
    missing: number;
  };
  warnings: Array<{ code: string; message: string }>;
}

export interface OptimizedResumeSectionContract {
  id: string;
  heading: string;
  items: string[];
}

export interface ResumeChangeContract {
  id: string;
  sourceBlockId: string | null;
  originalText: string;
  optimizedText: string;
  reason: string;
  requirementIds: string[];
}

export interface OptimizedResumeContract {
  contract: "optimized-resume.v1";
  provider: "fake" | "deepseek";
  generatedAt: string;
  title: string;
  summary: string;
  sections: OptimizedResumeSectionContract[];
  changes: ResumeChangeContract[];
  warnings: Array<{ code: string; message: string }>;
}

export interface RevisionSuggestionContract {
  id: string;
  targetBlockId: string;
  originalText: string;
  proposedText: string;
  reason: string;
  requirementIds: string[];
  factIds: string[];
  status: "pending" | "accepted" | "rejected" | "edited_accepted" | "inaccurate";
}

export interface DocumentTextRunContract {
  text: string;
  bold: boolean | null;
  italic: boolean | null;
  underline: boolean | null;
  fontName: string | null;
  fontSizePt: number | null;
}

export interface DocumentBlockContract {
  id: string;
  kind: "paragraph" | "table" | "pdf_text";
  text: string;
  index: number;
  page: number | null;
  styleName: string | null;
  runs: DocumentTextRunContract[];
  bbox: [number, number, number, number] | null;
}

export interface DocumentParseContract {
  contract: "document-parse.v1";
  documentKind: "docx" | "pdf";
  blocks: DocumentBlockContract[];
  plainText: string;
  warnings: Array<{ code: string; message: string }>;
}

