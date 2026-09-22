import { readFile } from "node:fs/promises";
import path from "node:path";

import { getStoredFilePath } from "@/server/file-storage";
import { findProject } from "@/server/project-repository";

interface RouteContext {
  params: Promise<{ projectId: string; format: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const { projectId, format } = await context.params;
  if (format !== "docx" && format !== "pdf") {
    return Response.json({ error: { message: "仅支持 Word 和 PDF 导出。" } }, { status: 400 });
  }

  const project = findProject(projectId);
  if (!project) {
    return Response.json({ error: { message: "没有找到这个投递项目。" } }, { status: 404 });
  }
  if (!project.optimizedResume) {
    return Response.json({ error: { message: "请先生成并保存优化简历。" } }, { status: 400 });
  }

  const documentServiceUrl = process.env.DOCUMENT_SERVICE_URL ?? "http://127.0.0.1:8001";
  try {
    let sourceDocxBase64: string | null = null;
    if (format === "docx" && path.extname(project.resumeFileName).toLowerCase() === ".docx") {
      sourceDocxBase64 = (await readFile(getStoredFilePath(project.sourceFileKey))).toString("base64");
    }

    const response = await fetch(`${documentServiceUrl}/v1/resumes/export/${format}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: project.optimizedResume.title,
        summary: project.optimizedResume.summary,
        sections: project.optimizedResume.sections.map((section) => ({
          heading: section.heading,
          items: section.items,
        })),
        sourceFileName: project.resumeFileName,
        sourceDocxBase64,
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      return Response.json({ error: { message: "文档服务导出失败，请重试。" } }, { status: 502 });
    }

    const content = await response.arrayBuffer();
    const mediaType =
      format === "docx"
        ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        : "application/pdf";
    return new Response(content, {
      headers: {
        "Content-Type": mediaType,
        "Content-Disposition": `attachment; filename="optimized-resume.${format}"`,
      },
    });
  } catch {
    return Response.json({ error: { message: "文档服务暂时不可用。" } }, { status: 503 });
  }
}

