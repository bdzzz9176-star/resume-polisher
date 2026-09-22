import { randomUUID } from "node:crypto";

import type { DocumentParseContract } from "@ai-job-search/contracts";

import { removeProjectFiles, saveProjectSource } from "@/server/file-storage";
import { getAiProvider } from "@/server/ai-provider";
import {
  createProject,
  listProjects,
  saveProjectAnalysis,
  toPublicProject,
} from "@/server/project-repository";

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MIN_JD_LENGTH = 30;
const SUPPORTED_EXTENSIONS = [".docx", ".pdf"];

function errorResponse(code: string, message: string, status: number) {
  return Response.json({ error: { code, message } }, { status });
}

export async function GET() {
  const projects = listProjects().map(toPublicProject);
  return Response.json({ projects });
}

export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get("resume");
  const jd = form.get("jd");

  if (!(file instanceof File)) {
    return errorResponse("RESUME_REQUIRED", "请上传一份 Word 或 PDF 简历。", 400);
  }
  if (typeof jd !== "string" || jd.trim().length < MIN_JD_LENGTH) {
    return errorResponse("JD_TOO_SHORT", "请粘贴更完整的岗位职责或任职要求。", 400);
  }
  if (file.size > MAX_FILE_BYTES) {
    return errorResponse("FILE_TOO_LARGE", "简历文件不能超过 10 MB。", 413);
  }

  const lowerName = file.name.toLowerCase();
  if (!SUPPORTED_EXTENSIONS.some((extension) => lowerName.endsWith(extension))) {
    return errorResponse("UNSUPPORTED_FILE_TYPE", "仅支持 .docx 和 .pdf 文件。", 400);
  }

  const documentForm = new FormData();
  documentForm.set("file", file, file.name);
  const documentServiceUrl = process.env.DOCUMENT_SERVICE_URL ?? "http://127.0.0.1:8001";

  try {
    const parseResponse = await fetch(`${documentServiceUrl}/v1/documents/parse`, {
      method: "POST",
      body: documentForm,
      cache: "no-store",
    });

    const parseBody = (await parseResponse.json()) as DocumentParseContract | {
      detail?: { code?: string; message?: string };
    };

    if (!parseResponse.ok) {
      const detail = "detail" in parseBody ? parseBody.detail : undefined;
      return errorResponse(
        detail?.code ?? "DOCUMENT_PARSE_FAILED",
        detail?.message ?? "简历解析失败，请检查文件后重试。",
        parseResponse.status,
      );
    }

    const projectId = randomUUID();
    let sourceFileSaved = false;
    try {
      const sourceFileKey = await saveProjectSource(projectId, file);
      sourceFileSaved = true;
      const now = new Date().toISOString();
      const project = createProject({
        id: projectId,
        status: "parsed",
        resumeFileName: file.name,
        sourceFileKey,
        jd: jd.trim(),
        document: parseBody as DocumentParseContract,
        analysis: null,
        optimizedResume: null,
        createdAt: now,
        updatedAt: now,
      });

      try {
        const analysis = await getAiProvider().analyzeJob({
          jd: jd.trim(),
          document: parseBody as DocumentParseContract,
        });
        const analyzedProject = saveProjectAnalysis(projectId, analysis);
        return Response.json({
          project: toPublicProject(analyzedProject ?? project),
          analysisWarning: null,
        });
      } catch (analysisError) {
        console.error("Project saved, but AI analysis failed:", analysisError);
        return Response.json({
          project: toPublicProject(project),
          analysisWarning: "简历已经解析并保存，但 AI 岗位分析暂时失败。请进入项目后重试。",
        });
      }
    } catch {
      if (sourceFileSaved) await removeProjectFiles(projectId);
      return errorResponse("PROJECT_SAVE_FAILED", "项目保存失败，请重试。", 500);
    }
  } catch {
    return errorResponse(
      "DOCUMENT_SERVICE_UNAVAILABLE",
      "文档服务暂时不可用，请确认本地文档服务已经启动。",
      503,
    );
  }
}

