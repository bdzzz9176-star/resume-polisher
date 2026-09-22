import { z } from "zod";

import { getAiProvider } from "@/server/ai-provider";
import { findProject } from "@/server/project-repository";

interface RouteContext {
  params: Promise<{ projectId: string }>;
}

const chatRequestSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(4000),
      }),
    )
    .min(1)
    .max(20),
});

export async function POST(request: Request, context: RouteContext) {
  const { projectId } = await context.params;
  const project = findProject(projectId);
  if (!project) {
    return Response.json(
      { error: { code: "PROJECT_NOT_FOUND", message: "没有找到这个投递项目。" } },
      { status: 404 },
    );
  }

  const parsedBody = chatRequestSchema.safeParse(await request.json());
  if (!parsedBody.success) {
    return Response.json(
      { error: { code: "INVALID_CHAT_REQUEST", message: "对话内容格式不正确。" } },
      { status: 400 },
    );
  }

  try {
    const provider = getAiProvider();
    const answer = await provider.chatWithProject({
      jd: project.jd,
      document: project.document,
      analysis: project.analysis,
      messages: parsedBody.data.messages,
    });

    return Response.json({
      provider: provider.name,
      message: {
        role: "assistant",
        content: answer,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI 对话失败，请稍后重试。";
    return Response.json(
      { error: { code: "AI_CHAT_FAILED", message } },
      { status: 500 },
    );
  }
}


