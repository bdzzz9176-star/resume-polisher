import type {
  DocumentBlockContract,
  DocumentParseContract,
  EvidenceStatus,
  JobAnalysisContract,
  JobRequirementContract,
  OptimizedResumeContract,
  RequirementKind,
  ResumeFactContract,
} from "@ai-job-search/contracts";
import { z } from "zod";

import { jobAnalysisSchema } from "./job-analysis-schema";

interface AnalyzeJobInput {
  jd: string;
  document: DocumentParseContract;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatWithProjectInput {
  jd: string;
  document: DocumentParseContract;
  analysis: JobAnalysisContract | null;
  messages: ChatMessage[];
}

interface OptimizeResumeInput {
  jd: string;
  document: DocumentParseContract;
  analysis: JobAnalysisContract | null;
}

export interface AiProvider {
  name: JobAnalysisContract["provider"];
  analyzeJob(input: AnalyzeJobInput): Promise<JobAnalysisContract>;
  chatWithProject(input: ChatWithProjectInput): Promise<string>;
  optimizeResume(input: OptimizeResumeInput): Promise<OptimizedResumeContract>;
}

const KEYWORD_RULES: Array<{
  id: string;
  keywords: string[];
  normalizedText: string;
  kind: RequirementKind;
  priority: JobRequirementContract["priority"];
}> = [
  {
    id: "camera",
    keywords: ["摄像头", "camera", "图像", "视频", "v4l2", "isp"],
    normalizedText: "具备摄像头、图像采集或视频链路相关经验",
    kind: "required",
    priority: "high",
  },
  {
    id: "linux",
    keywords: ["linux", "驱动", "内核", "嵌入式", "rtos"],
    normalizedText: "熟悉嵌入式 Linux/驱动/系统调试",
    kind: "required",
    priority: "high",
  },
  {
    id: "cpp",
    keywords: ["c++", "c语言", "c 语言", "c/c++", "数据结构"],
    normalizedText: "具备 C/C++ 编程和基础数据结构能力",
    kind: "required",
    priority: "medium",
  },
  {
    id: "communication",
    keywords: ["沟通", "协作", "需求", "产品", "运营", "跨部门"],
    normalizedText: "能进行跨团队沟通、需求理解和结果推进",
    kind: "responsibility",
    priority: "medium",
  },
];

function findSourceText(jd: string, keywords: string[]) {
  const lines = jd
    .split(/\r?\n|。|；|;/)
    .map((line) => line.trim())
    .filter(Boolean);
  return lines.find((line) => keywords.some((keyword) => line.toLowerCase().includes(keyword.toLowerCase()))) ?? "";
}

function findBlock(document: DocumentParseContract, keywords: string[]): DocumentBlockContract | null {
  return (
    document.blocks.find((block) =>
      keywords.some((keyword) => block.text.toLowerCase().includes(keyword.toLowerCase())),
    ) ?? null
  );
}

function makeFact(id: string, block: DocumentBlockContract, content: string): ResumeFactContract {
  return {
    id,
    content,
    sourceType: "resume",
    sourceRef: block.id,
    confirmed: false,
    reusable: true,
  };
}

function countStatuses(evidence: Array<{ status: EvidenceStatus }>) {
  return {
    presentAndExpressed: evidence.filter((item) => item.status === "present_and_expressed").length,
    presentButUnderexpressed: evidence.filter((item) => item.status === "present_but_underexpressed").length,
    unverified: evidence.filter((item) => item.status === "unverified").length,
    missing: evidence.filter((item) => item.status === "missing").length,
  };
}

const deepSeekAnalysisPayloadSchema = z.object({
  requirements: jobAnalysisSchema.shape.requirements,
  facts: jobAnalysisSchema.shape.facts,
  evidence: jobAnalysisSchema.shape.evidence,
  warnings: jobAnalysisSchema.shape.warnings.optional(),
});

const optimizedResumePayloadSchema = z.object({
  title: z.string().min(1),
  summary: z.string(),
  sections: z.array(
    z.object({
      id: z.string().min(1),
      heading: z.string().min(1),
      items: z.array(z.string().min(1)),
    }),
  ),
  changes: z.array(
    z.object({
      id: z.string().min(1),
      sourceBlockId: z.string().nullable(),
      originalText: z.string(),
      optimizedText: z.string().min(1),
      reason: z.string().min(1),
      requirementIds: z.array(z.string()),
    }),
  ),
  warnings: z.array(z.object({ code: z.string(), message: z.string() })).optional(),
});

function compactResumeBlocks(document: DocumentParseContract) {
  const maxChars = 12000;
  let usedChars = 0;
  const lines: string[] = [];

  for (const block of document.blocks) {
    const text = block.text.trim();
    if (!text) continue;
    const line = `[${block.id}] ${text}`;
    if (usedChars + line.length > maxChars) break;
    lines.push(line);
    usedChars += line.length;
  }

  return lines.join("\n");
}

export class FakeAiProvider implements AiProvider {
  name = "fake" as const;

  async analyzeJob({ jd, document }: AnalyzeJobInput): Promise<JobAnalysisContract> {
    const requirements: JobRequirementContract[] = [];
    const facts: ResumeFactContract[] = [];
    const evidence: JobAnalysisContract["evidence"] = [];

    const activeRules = KEYWORD_RULES.filter((rule) => findSourceText(jd, rule.keywords)).slice(0, 4);
    const selectedRules =
      activeRules.length > 0
        ? activeRules
        : [
            {
              id: "general-project",
              keywords: ["项目", "负责", "能力"],
              normalizedText: "具备与目标岗位相关的项目落地经验",
              kind: "experience" as const,
              priority: "high" as const,
            },
          ];

    selectedRules.forEach((rule, index) => {
      const requirementId = `req_${index + 1}_${rule.id}`;
      const matchedBlock = findBlock(document, rule.keywords);
      const sourceText = findSourceText(jd, rule.keywords) || rule.normalizedText;
      requirements.push({
        id: requirementId,
        sourceText,
        normalizedText: rule.normalizedText,
        kind: rule.kind,
        priority: rule.priority,
        isInference: sourceText === rule.normalizedText,
      });

      if (matchedBlock) {
        const factId = `fact_${index + 1}_${rule.id}`;
        const fact = makeFact(factId, matchedBlock, matchedBlock.text.slice(0, 180));
        facts.push(fact);
        const isClearlyExpressed = matchedBlock.text.length >= 60 && sourceText !== rule.normalizedText;
        evidence.push({
          requirementId,
          factIds: [factId],
          status: isClearlyExpressed ? "present_and_expressed" : "present_but_underexpressed",
          explanation: isClearlyExpressed
            ? "简历中已经出现相关经历，可以作为后续定制简历的直接证据。"
            : "简历中能看到相关经历，但表达偏泛，需要后续改写时把与 JD 更贴近的部分讲清楚。",
          needsFollowUp: !isClearlyExpressed,
        });
      } else {
        evidence.push({
          requirementId,
          factIds: [],
          status: "unverified",
          explanation: "JD 提到了这项要求，但当前简历文本里没有找到可直接引用的证据，需要向用户追问是否真实做过。",
          needsFollowUp: true,
        });
      }
    });

    const missingRequirementId = "req_missing_gap";
    requirements.push({
      id: missingRequirementId,
      sourceText: "岗位常见隐含要求：能说清核心原理、调试方法和项目取舍。",
      normalizedText: "补齐岗位相关原理、调试方法和面试表达",
      kind: "preferred",
      priority: "medium",
      isInference: true,
    });
    evidence.push({
      requirementId: missingRequirementId,
      factIds: [],
      status: "missing",
      explanation: "这是系统根据岗位方向推测的面试准备缺口，不代表用户不会，只代表当前简历没有证据。",
      needsFollowUp: false,
    });

    const analysis: JobAnalysisContract = {
      contract: "job-analysis.v1",
      provider: this.name,
      generatedAt: new Date(0).toISOString(),
      requirements,
      facts,
      evidence,
      summary: countStatuses(evidence),
      warnings: [
        {
          code: "FAKE_PROVIDER",
          message: "当前结果由 Fake AI 生成，用于跑通产品流程；接入 DeepSeek 后会替换为真实模型分析。",
        },
      ],
    };

    return jobAnalysisSchema.parse(analysis);
  }

  async chatWithProject({ messages, analysis }: ChatWithProjectInput): Promise<string> {
    const lastQuestion = messages.at(-1)?.content ?? "";
    const underexpressed = analysis?.summary.presentButUnderexpressed ?? 0;
    const missing = analysis?.summary.missing ?? 0;
    return [
      "当前还在 Fake AI 模式，我可以先给你一个占位回答：",
      "",
      `你刚刚问的是：「${lastQuestion.slice(0, 120)}」`,
      "",
      `从当前岗位分析看，有 ${underexpressed} 项“已有但表达不足”，${missing} 项“缺口/待补齐”。`,
      "下一步建议优先追问：这些能力你是否真实做过？如果做过，要补充项目背景、你的动作、技术细节和结果。",
      "",
      "如果要启用真实 DeepSeek 对话，请在 `.env.local` 中配置 `AI_PROVIDER=deepseek` 和 `DEEPSEEK_API_KEY`，然后重启服务。",
    ].join("\n");
  }

  async optimizeResume({ document }: OptimizeResumeInput): Promise<OptimizedResumeContract> {
    const items = document.blocks
      .map((block) => block.text.trim())
      .filter(Boolean)
      .slice(0, 20);
    return {
      contract: "optimized-resume.v1",
      provider: this.name,
      generatedAt: new Date(0).toISOString(),
      title: "目标岗位定制简历",
      summary: "当前为 Fake AI 草稿。接入 DeepSeek 后会根据 JD 和真实简历内容进行针对性优化。",
      sections: [{ id: "section_experience", heading: "相关经历", items }],
      changes: [],
      warnings: [{ code: "FAKE_PROVIDER", message: "当前草稿由 Fake AI 生成，仅用于跑通产品流程。" }],
    };
  }
}

export class DeepSeekProvider implements AiProvider {
  name = "deepseek" as const;

  async analyzeJob({ jd, document }: AnalyzeJobInput): Promise<JobAnalysisContract> {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      throw new Error("DEEPSEEK_API_KEY is required when AI_PROVIDER=deepseek.");
    }

    const model = process.env.DEEPSEEK_MODEL ?? "deepseek-chat";
    const endpoint = process.env.DEEPSEEK_API_URL ?? "https://api.deepseek.com/chat/completions";
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "你是一个严谨的中文求职简历分析助手。只基于用户简历原文和 JD 做证据映射，不虚构经历。输出必须是 JSON。",
          },
          {
            role: "user",
            content: [
              "请分析下面的 JD 和简历，只输出 JSON，字段名和字段类型必须与模板完全一致：",
              "{",
              '  "requirements": [',
              "    {",
              '      "id": "req_1",',
              '      "sourceText": "JD 中对应的原文",',
              '      "normalizedText": "归一化后的岗位要求",',
              '      "kind": "required",',
              '      "priority": "high",',
              '      "isInference": false',
              "    }",
              "  ],",
              '  "facts": [',
              "    {",
              '      "id": "fact_1",',
              '      "content": "简历中的真实原文或基于原文提取的事实",',
              '      "sourceType": "resume",',
              '      "sourceRef": "block_1",',
              '      "confirmed": false,',
              '      "reusable": true',
              "    }",
              "  ],",
              '  "evidence": [',
              "    {",
              '      "requirementId": "req_1",',
              '      "factIds": ["fact_1"],',
              '      "status": "present_and_expressed",',
              '      "explanation": "判断理由",',
              '      "needsFollowUp": false',
              "    }",
              "  ],",
              '  "warnings": [',
              '    { "code": "OPTIONAL_WARNING", "message": "可选提示；没有时输出空数组" }',
              "  ]",
              "}",
              "字段要求：",
              "- requirement.kind 只能是 responsibility|required|preferred|experience|education。",
              "- requirement.priority 只能是 high|medium|low，不能输出中文。",
              "- evidence.status 只能是 present_and_expressed|present_but_underexpressed|unverified|missing。",
              "- facts.sourceRef 必须引用简历块 id，例如 block_1；未确认事实 confirmed=false。",
              "- 如果简历为空或没有事实，facts 必须输出空数组；不得编造 fact。",
              "- evidence.requirementId 必须引用 requirements 中真实存在的 id。",
              "- evidence.factIds 只能引用 facts 中真实存在的 id；没有证据时输出空数组。",
              "- 不要把尚未证明的能力写成用户已经掌握。",
              "- JD 明确要求和系统推测必须用 isInference 区分。",
              "- 所有字段都必须使用模板里的英文 camelCase 名称，不得改成中文或 snake_case。",
              "",
              "JD：",
              jd,
              "",
              "简历块：",
              compactResumeBlocks(document),
            ].join("\n"),
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`DeepSeek request failed: ${response.status}`);
    }

    const body = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = body.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("DeepSeek response did not contain message content.");
    }

    const payload = deepSeekAnalysisPayloadSchema.parse(JSON.parse(content));
    const analysis: JobAnalysisContract = {
      contract: "job-analysis.v1",
      provider: this.name,
      generatedAt: new Date().toISOString(),
      requirements: payload.requirements,
      facts: payload.facts,
      evidence: payload.evidence,
      summary: countStatuses(payload.evidence),
      warnings: payload.warnings ?? [],
    };
    return jobAnalysisSchema.parse(analysis);
  }

  async chatWithProject({ jd, document, analysis, messages }: ChatWithProjectInput): Promise<string> {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      throw new Error("DEEPSEEK_API_KEY is required when AI_PROVIDER=deepseek.");
    }

    const model = process.env.DEEPSEEK_MODEL ?? "deepseek-chat";
    const endpoint = process.env.DEEPSEEK_API_URL ?? "https://api.deepseek.com/chat/completions";
    const analysisText = analysis
      ? JSON.stringify(
          {
            summary: analysis.summary,
            requirements: analysis.requirements,
            evidence: analysis.evidence,
            facts: analysis.facts,
          },
          null,
          2,
        )
      : "暂无岗位分析结果。";

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.4,
        messages: [
          {
            role: "system",
            content: [
              "你是一个严谨的中文求职助手，帮助用户理解岗位 JD、优化简历表达、准备面试。",
              "必须遵守：不虚构经历；如果简历没有证据，要明确说需要用户确认；回答要具体、可执行。",
              "当用户要求改简历时，先给修改建议和理由，不要声称已经掌握未被证明的能力。",
            ].join("\n"),
          },
          {
            role: "user",
            content: [
              "以下是当前投递项目上下文，请你在后续对话中使用：",
              "",
              "【JD】",
              jd,
              "",
              "【简历内容块】",
              compactResumeBlocks(document),
              "",
              "【岗位分析 JSON】",
              analysisText,
            ].join("\n"),
          },
          ...messages.map((message) => ({
            role: message.role,
            content: message.content,
          })),
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`DeepSeek chat request failed: ${response.status}`);
    }

    const body = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = body.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("DeepSeek response did not contain message content.");
    }
    return content;
  }

  async optimizeResume({ jd, document, analysis }: OptimizeResumeInput): Promise<OptimizedResumeContract> {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      throw new Error("DEEPSEEK_API_KEY is required when AI_PROVIDER=deepseek.");
    }

    const model = process.env.DEEPSEEK_MODEL ?? "deepseek-chat";
    const endpoint = process.env.DEEPSEEK_API_URL ?? "https://api.deepseek.com/chat/completions";
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.25,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: [
              "你是严谨的中文简历优化专家。",
              "只能使用原简历中真实存在的信息，不得虚构工作年限、项目、技术、成果或数据。",
              "针对 JD 调整表达顺序、关键词和重点；没有证据的要求只能放到 warnings，不能写进优化简历。",
              "输出必须是合法 JSON。",
            ].join("\n"),
          },
          {
            role: "user",
            content: [
              "请生成一份可直接编辑和导出的定制简历草稿，只输出以下结构的 JSON：",
              "{",
              '  "title": "目标岗位或求职方向",',
              '  "summary": "基于真实经历的2-4句职业摘要；无足够信息可为空字符串",',
              '  "sections": [',
              '    { "id": "section_1", "heading": "教育经历", "items": ["一条完整内容"] },',
              '    { "id": "section_2", "heading": "项目经历", "items": ["使用动词开头、突出与JD相关技术和结果"] }',
              "  ],",
              '  "changes": [',
              "    {",
              '      "id": "change_1",',
              '      "sourceBlockId": "block_1",',
              '      "originalText": "简历原文",',
              '      "optimizedText": "优化后文本",',
              '      "reason": "为什么更匹配JD",',
              '      "requirementIds": ["req_1"]',
              "    }",
              "  ],",
              '  "warnings": [{ "code": "UNVERIFIED_GAP", "message": "没有证据、不能写入简历的要求" }]',
              "}",
              "要求：",
              "- sections 必须覆盖原简历的重要内容，不能只输出局部建议。",
              "- 每个 item 是一个可独立编辑的完整条目。",
              "- sourceBlockId 必须引用下面的真实 block id；无法对应时为 null。",
              "- requirementIds 只能引用岗位分析中真实存在的 id。",
              "- 保留姓名、联系方式、学校、时间等原始信息，不得擅自修改。",
              "",
              "【JD】",
              jd,
              "",
              "【岗位分析】",
              analysis ? JSON.stringify(analysis) : "暂无",
              "",
              "【原简历内容块】",
              compactResumeBlocks(document),
            ].join("\n"),
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`DeepSeek optimize request failed: ${response.status}`);
    }
    const body = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = body.choices?.[0]?.message?.content;
    if (!content) throw new Error("DeepSeek response did not contain message content.");

    const payload = optimizedResumePayloadSchema.parse(JSON.parse(content));
    return {
      contract: "optimized-resume.v1",
      provider: this.name,
      generatedAt: new Date().toISOString(),
      title: payload.title,
      summary: payload.summary,
      sections: payload.sections,
      changes: payload.changes,
      warnings: payload.warnings ?? [],
    };
  }
}

export function getAiProvider(): AiProvider {
  const provider = process.env.AI_PROVIDER ?? "fake";
  if (provider === "fake") return new FakeAiProvider();
  if (provider === "deepseek") return new DeepSeekProvider();
  return new FakeAiProvider();
}

