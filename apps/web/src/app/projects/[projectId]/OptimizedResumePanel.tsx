"use client";

import type { OptimizedResumeContract } from "@ai-job-search/contracts";
import { useState } from "react";

export function OptimizedResumePanel({
  projectId,
  initialDraft,
  documentKind,
}: {
  projectId: string;
  initialDraft: OptimizedResumeContract | null;
  documentKind: "docx" | "pdf";
}) {
  const [draft, setDraft] = useState<OptimizedResumeContract | null>(initialDraft);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function generateDraft() {
    setIsGenerating(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/resume-draft`, { method: "POST" });
      const body = (await response.json()) as {
        draft?: OptimizedResumeContract;
        error?: { message?: string };
      };
      if (!response.ok || !body.draft) {
        throw new Error(body.error?.message ?? "生成优化简历失败。");
      }
      setDraft(body.draft);
      setMessage("优化简历已生成并保存。你可以继续手动修改。");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "生成优化简历失败。");
    } finally {
      setIsGenerating(false);
    }
  }

  async function saveDraft() {
    if (!draft) return false;
    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/resume-draft`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const body = (await response.json()) as { error?: { message?: string } };
      if (!response.ok) throw new Error(body.error?.message ?? "草稿保存失败。");
      setMessage("修改已保存。");
      return true;
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "草稿保存失败。");
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  async function download(format: "docx" | "pdf") {
    if (!(await saveDraft())) return;
    window.location.href = `/api/projects/${projectId}/export/${format}`;
  }

  function updateItem(sectionIndex: number, itemIndex: number, value: string) {
    if (!draft) return;
    const sections = draft.sections.map((section, currentSectionIndex) => ({
      ...section,
      items:
        currentSectionIndex === sectionIndex
          ? section.items.map((item, currentItemIndex) => (currentItemIndex === itemIndex ? value : item))
          : section.items,
    }));
    setDraft({ ...draft, sections });
  }

  return (
    <section className="app-card resume-output-card">
      <div className="section-head">
        <div>
          <p className="app-kicker">Step 2</p>
          <h2>优化后的定制简历</h2>
        </div>
        {draft ? <span className="app-pill">Provider：{draft.provider}</span> : null}
      </div>
      <p className="section-desc">
        AI 只允许重组和优化真实经历。生成后请逐条检查，你可以直接修改文本，再下载 Word/PDF。
      </p>
      <p className={`app-alert ${documentKind === "docx" ? "success" : "warning"}`}>
        {documentKind === "docx"
          ? "你上传的是 Word，下载 Word 时会尽量沿用原简历的页面设置、字体和标题层级。"
          : "你上传的是 PDF，系统无法可靠保留原 PDF 排版；想让优化简历更接近原风格，建议上传 Word 版简历。"}
      </p>

      {!draft ? (
        <div className="generate-box">
          <span>📝</span>
          <h3>生成第一版定制简历</h3>
          <p>根据当前 JD、原简历和岗位分析生成完整草稿，并附上修改前后与理由。</p>
          <button
            className="app-primary-button fit"
            disabled={isGenerating}
            onClick={() => void generateDraft()}
            type="button"
          >
            {isGenerating ? "DeepSeek 正在生成..." : "生成优化简历"}
          </button>
        </div>
      ) : (
        <>
          <div className="resume-editor">
            <label>
              <span>简历标题 / 求职方向</span>
              <input onChange={(event) => setDraft({ ...draft, title: event.target.value })} value={draft.title} />
            </label>
            <label>
              <span>职业摘要</span>
              <textarea
                onChange={(event) => setDraft({ ...draft, summary: event.target.value })}
                value={draft.summary}
              />
            </label>

            {draft.sections.map((section, sectionIndex) => (
              <div className="resume-section-editor" key={section.id}>
                <input
                  className="resume-heading-input"
                  onChange={(event) => {
                    const sections = draft.sections.map((current, index) =>
                      index === sectionIndex ? { ...current, heading: event.target.value } : current,
                    );
                    setDraft({ ...draft, sections });
                  }}
                  value={section.heading}
                />
                {section.items.map((item, itemIndex) => (
                  <textarea
                    key={`${section.id}-${itemIndex}`}
                    onChange={(event) => updateItem(sectionIndex, itemIndex, event.target.value)}
                    value={item}
                  />
                ))}
              </div>
            ))}
          </div>

          {draft.warnings.map((warning) => (
            <p className="app-alert warning" key={warning.code}>
              {warning.message}
            </p>
          ))}

          {draft.changes.length > 0 ? (
            <details className="changes-panel">
              <summary>查看修改前后与修改理由（{draft.changes.length} 项）</summary>
              <div>
                {draft.changes.map((change) => (
                  <article key={change.id}>
                    <p>
                      <strong>修改前：</strong>
                      {change.originalText || "原文无独立内容"}
                    </p>
                    <p>
                      <strong>修改后：</strong>
                      {change.optimizedText}
                    </p>
                    <p>
                      <strong>理由：</strong>
                      {change.reason}
                    </p>
                  </article>
                ))}
              </div>
            </details>
          ) : null}

          <div className="resume-actions">
            <button disabled={isSaving} onClick={() => void saveDraft()} type="button">
              {isSaving ? "保存中..." : "保存修改"}
            </button>
            <button onClick={() => void download("docx")} type="button">
              下载 Word（优先保留原风格）
            </button>
            <button onClick={() => void download("pdf")} type="button">
              下载 PDF
            </button>
            <button className="secondary" disabled={isGenerating} onClick={() => void generateDraft()} type="button">
              重新生成
            </button>
          </div>
        </>
      )}

      {message ? <p className="app-alert success">{message}</p> : null}
      {error ? <p className="app-alert error">{error}</p> : null}
    </section>
  );
}

