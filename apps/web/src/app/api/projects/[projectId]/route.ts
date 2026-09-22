import { findProject, toPublicProject } from "@/server/project-repository";

interface RouteContext {
  params: Promise<{ projectId: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const { projectId } = await context.params;
  const project = findProject(projectId);
  if (!project) {
    return Response.json(
      { error: { code: "PROJECT_NOT_FOUND", message: "没有找到这个投递项目。" } },
      { status: 404 },
    );
  }
  return Response.json({ project: toPublicProject(project) });
}

