"use client";

import type { DocumentParseContract } from "@ai-job-search/contracts";
import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";

interface ProjectResult {
  id: string;
  status: string;
  resumeFileName: string;
  jd: string;
  document: DocumentParseContract;
}

const MAX_FILE_BYTES = 10 * 1024 * 1024;

function formatFileSize(bytes: number) {
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export default function NewProjectPage() {
  const [resume, setResume] = useState<File | null>(null);
  const [jd, setJd] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisWarning, setAnalysisWarning] = useState<string | null>(null);
  const [project, setProject] = useState<ProjectResult | null>(null);

  const canSubmit = useMemo(
    () => Boolean(resume && jd.trim().length >= 30 && agreed && !loading),
    [resume, jd, agreed, loading],
  );

  function chooseResume(file: File | null) {
    setError(null);
    setAnalysisWarning(null);
    setProject(null);
    if (!file) {
      setResume(null);
      return;
    }
    const lowerName = file.name.toLowerCase();
    if (!lowerName.endsWith(".docx") && !lowerName.endsWith(".pdf")) {
      setResume(null);
      setError("仅支持 .docx 和 .pdf 文件。");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setResume(null);
      setError("简历文件不能超过 10 MB。");
      return;
    }
    setResume(file);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!resume || !canSubmit) return;

    setLoading(true);
    setError(null);
    setProject(null);
    const form = new FormData();
    form.set("resume", resume);
    form.set("jd", jd.trim());

    try {
      const response = await fetch("/api/projects", { method: "POST", body: form });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error?.message ?? "创建投递项目失败，请稍后重试。");
        return;
      }
      setProject(result.project);
      setAnalysisWarning(result.analysisWarning ?? null);
    } catch {
      setError("网络请求失败，请确认本地服务已经启动。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="app-page">
      <header className="app-topbar">
        <div className="app-topbar-inner">
          <Link className="app-logo" href="/">
            AI 求职
          </Link>
          <nav className="app-nav">
            <Link href="/">首页</Link>
            <Link href="/projects">我的项目</Link>
            <Link className="active" href="/projects/new">
              新建投递
            </Link>
          </nav>
          <span className="app-pill dark">单用户 Alpha</span>
        </div>
      </header>

      <section className="app-hero compact">
        <div className="app-container">
          <p className="app-kicker">新建投递项目</p>
          <h1>上传简历与目标 JD</h1>
          <p>先读取你的真实简历内容，再分析岗位要求。当前不会改写简历，也不会加入未经确认的信息。</p>
        </div>
      </section>

      <section className="app-container app-two-column">
        <form className="app-card app-form" onSubmit={submit}>
          <div className="app-step-title">
            <span>01</span>
            <div>
              <h2>上传你的简历</h2>
              <p>推荐 Word，排版保留和后续导出效果更好；PDF 也可以先用来验证流程。</p>
            </div>
          </div>

          <label className="app-upload" htmlFor="resume">
            <input
              accept=".docx,.pdf"
              id="resume"
              onChange={(event) => chooseResume(event.target.files?.[0] ?? null)}
              type="file"
            />
            <strong>{resume ? resume.name : "点击选择 Word / PDF 简历"}</strong>
            <span>{resume ? formatFileSize(resume.size) : "支持 .docx / .pdf，最大 10 MB"}</span>
          </label>
          <p className="app-help">建议先删除身份证号等投递不需要的敏感信息。</p>

          <div className="app-step-title spaced">
            <span>02</span>
            <div>
              <h2>粘贴目标岗位 JD</h2>
              <p>岗位职责、任职要求、加分项都可以粘贴进来。</p>
            </div>
          </div>

          <textarea
            className="app-textarea"
            id="jd"
            onChange={(event) => {
              setJd(event.target.value);
              setProject(null);
            }}
            placeholder="例如：负责嵌入式 Linux 摄像头链路开发，熟悉 C/C++、V4L2、驱动调试，有图像采集经验优先……"
            value={jd}
          />
          <div className="app-field-row">
            <span>{jd.trim().length < 30 ? "至少输入 30 个字" : "内容长度可用"}</span>
            <span>{jd.length} 字</span>
          </div>

          <label className="app-check">
            <input checked={agreed} onChange={(event) => setAgreed(event.target.checked)} type="checkbox" />
            <span>我确认上传内容属于本人，并同意系统为创建本次投递项目进行解析。</span>
          </label>

          {error ? <p className="app-alert error">{error}</p> : null}

          <button className="app-primary-button" disabled={!canSubmit} type="submit">
            {loading ? "正在解析并生成岗位分析..." : "创建项目并进入分析"}
          </button>
        </form>

        <aside className="app-card app-preview">
          <p className="app-kicker">MVP 输出</p>
          {!project ? (
            <>
              <h2>创建后你会看到什么？</h2>
              <div className="app-mini-list">
                <div>
                  <strong>岗位要求拆解</strong>
                  <span>把 JD 拆成可判断的要求。</span>
                </div>
                <div>
                  <strong>简历证据映射</strong>
                  <span>找出你简历中能证明要求的经历。</span>
                </div>
                <div>
                  <strong>缺口与追问</strong>
                  <span>没有证据的地方不会乱写，会标记待确认。</span>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="app-success">
                <strong>创建成功</strong>
                <span>
                  已解析并保存 {project.document.blocks.length} 个内容块。
                </span>
              </div>
              {analysisWarning ? <p className="app-alert warning">{analysisWarning}</p> : null}
              <Link className="app-primary-link" href={`/projects/${project.id}`}>
                进入岗位分析工作台 →
              </Link>
              <Link className="app-secondary-link" href="/projects">
                查看我的投递项目
              </Link>
              {project.document.warnings.map((warning) => (
                <p className="app-alert warning" key={warning.code}>
                  {warning.message}
                </p>
              ))}
              <div className="app-block-list">
                {project.document.blocks.slice(0, 6).map((block) => (
                  <article className="app-doc-block" key={block.id}>
                    <span>{block.kind}</span>
                    <p>{block.text}</p>
                  </article>
                ))}
              </div>
            </>
          )}
        </aside>
      </section>
    </main>
  );
}

