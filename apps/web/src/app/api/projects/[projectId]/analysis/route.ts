import { getAiProvider } from "@/server/ai-provider";
import { findProject, saveProjectAnalysis, toPublicProject } from "@/server/project-repository";

interface RouteContext {
  params: Promise<{ projectId: string }>;
}

export async function POST(_request: Request, context: RouteContext) {
  const { projectId } = await context.params;
  const project = findProject(projectId);
  if (!project) {
    return Response.json(
      { error: { code: "PROJECT_NOT_FOUND", message: "没有找到这个投递项目。" } },
      { status: 404 },
    );
  }

  try {
    const analysis = await getAiProvider().analyzeJob({
      jd: project.jd,
      document: project.document,
    });
    const updatedProject = saveProjectAnalysis(project.id, analysis);
    if (!updatedProject) {
      return Response.json(
        { error: { code: "ANALYSIS_SAVE_FAILED", message: "岗位分析保存失败，请重试。" } },
        { status: 500 },
      );
    }

    return Response.json({ project: toPublicProject(updatedProject) });
  } catch (error) {
    console.error("AI analysis failed:", error);
    const detail = error instanceof Error ? error.message : "未知错误";
    return Response.json(
      {
        error: {
          code: "AI_ANALYSIS_FAILED",
          message: `DeepSeek 岗位分析失败：${detail}`,
        },
      },
      { status: 500 },
    );
  }
}

