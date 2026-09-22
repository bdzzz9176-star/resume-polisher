import type { OptimizedResumeContract } from "@ai-job-search/contracts";
import { z } from "zod";

import { getAiProvider } from "@/server/ai-provider";
import {
  findProject,
  saveOptimizedResume,
  toPublicProject,
} from "@/server/project-repository";

interface RouteContext {
  params: Promise<{ projectId: string }>;
}

const editableDraftSchema = z.object({
  contract: z.literal("optimized-resume.v1"),
  provider: z.enum(["fake", "deepseek"]),
  generatedAt: z.string(),
  title: z.string().min(1).max(200),
  summary: z.string().max(3000),
  sections: z.array(
    z.object({
      id: z.string().min(1),
      heading: z.string().min(1).max(100),
      items: z.array(z.string().min(1).max(3000)),
    }),
  ),
  changes: z.array(
    z.object({
      id: z.string(),
      sourceBlockId: z.string().nullable(),
      originalText: z.string(),
      optimizedText: z.string(),
      reason: z.string(),
      requirementIds: z.array(z.string()),
    }),
  ),
  warnings: z.array(z.object({ code: z.string(), message: z.string() })),
});

export async function POST(_request: Request, context: RouteContext) {
  const { projectId } = await context.params;
  const project = findProject(projectId);
  if (!project) {
    return Response.json({ error: { message: "没有找到这个投递项目。" } }, { status: 404 });
  }

  try {
    const provider = getAiProvider();
    const draft = await provider.optimizeResume({
      jd: project.jd,
      document: project.document,
      analysis: project.analysis,
    });
    const updated = saveOptimizedResume(project.id, draft);
    if (!updated) throw new Error("优化简历草稿保存失败。");
    return Response.json({ project: toPublicProject(updated), draft });
  } catch (error) {
    const message = error instanceof Error ? error.message : "生成优化简历失败。";
    return Response.json({ error: { code: "RESUME_OPTIMIZE_FAILED", message } }, { status: 500 });
  }
}

export async function PUT(request: Request, context: RouteContext) {
  const { projectId } = await context.params;
  if (!findProject(projectId)) {
    return Response.json({ error: { message: "没有找到这个投递项目。" } }, { status: 404 });
  }

  const parsed = editableDraftSchema.safeParse(await request.json());
  if (!parsed.success) {
    return Response.json({ error: { message: "简历草稿格式不正确。" } }, { status: 400 });
  }
  const updated = saveOptimizedResume(projectId, parsed.data as OptimizedResumeContract);
  if (!updated) {
    return Response.json({ error: { message: "简历草稿保存失败。" } }, { status: 500 });
  }
  return Response.json({ project: toPublicProject(updated), draft: updated.optimizedResume });
}


