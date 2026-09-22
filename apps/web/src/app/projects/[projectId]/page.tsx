import Link from "next/link";
import { notFound } from "next/navigation";

import type { EvidenceStatus } from "@ai-job-search/contracts";

import { findProject, toPublicProject } from "@/server/project-repository";

import { GenerateAnalysisButton } from "./GenerateAnalysisButton";
import { OptimizedResumePanel } from "./OptimizedResumePanel";
import { ProjectChat } from "./ProjectChat";

export const dynamic = "force-dynamic";

interface ProjectPageProps {
  params: Promise<{ projectId: string }>;
}

const statusLabels: Record<EvidenceStatus, { label: string; className: string }> = {
  present_and_expressed: {
    label: "已有且已体现",
    className: "status-green",
  },
  present_but_underexpressed: {
    label: "已有但表达不足",
    className: "status-yellow",
  },
  unverified: {
    label: "尚未证明",
    className: "status-blue",
  },
  missing: {
    label: "缺口/待补齐",
    className: "status-red",
  },
};

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { projectId } = await params;
  const storedProject = findProject(projectId);
  if (!storedProject) notFound();
  const project = toPublicProject(storedProject);
  const analysis = project.analysis;
  const factsById = new Map(analysis?.facts.map((fact) => [fact.id, fact]) ?? []);
  const blocksById = new Map(project.document.blocks.map((block) => [block.id, block]));
  const evidenceByRequirementId = new Map(
    analysis?.evidence.map((evidence) => [evidence.requirementId, evidence]) ?? [],
  );
  const provider = process.env.AI_PROVIDER === "deepseek" ? "deepseek" : "fake";

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
            <Link href="/projects/new">新建投递</Link>
          </nav>
          <span className="app-pill dark">{analysis ? "已完成分析" : "待分析"}</span>
        </div>
      </header>

      <section className="app-hero compact">
        <div className="app-container app-hero-row">
          <div>
            <Link className="app-back" href="/projects">
              ← 返回我的项目
            </Link>
            <p className="app-kicker">岗位分析工作台</p>
            <h1>{project.resumeFileName}</h1>
            <p>先看岗位要求与真实经历的证据映射，再进入下一步简历改写。</p>
          </div>
          <Link className="app-secondary-link fit light" href="/projects/new">
            新建另一个 JD
          </Link>
        </div>
      </section>

      <section className="app-container workspace-grid">
        <div className="workspace-main">
          <section className="app-card">
            <div className="section-head">
              <div>
                <p className="app-kicker">Step 1</p>
                <h2>岗位匹配分析</h2>
              </div>
              {analysis ? <span className="app-pill">Provider：{analysis.provider}</span> : null}
            </div>
            <p className="section-desc">没有证据的能力不会直接写进正式简历，只会作为追问或学习缺口。</p>

            {analysis ? (
              <>
                <div className="metric-grid">
                  <Metric label="已有且已体现" value={analysis.summary.presentAndExpressed} tone="green" />
                  <Metric label="已有但表达不足" value={analysis.summary.presentButUnderexpressed} tone="yellow" />
                  <Metric label="尚未证明" value={analysis.summary.unverified} tone="blue" />
                  <Metric label="缺口/待补齐" value={analysis.summary.missing} tone="red" />
                </div>

                {analysis.warnings.map((warning) => (
                  <p className="app-alert warning" key={warning.code}>
                    {warning.message}
                  </p>
                ))}

                <div className="requirement-list">
                  {analysis.requirements.map((requirement) => {
                    const evidence = evidenceByRequirementId.get(requirement.id);
                    const status = evidence ? statusLabels[evidence.status] : null;
                    const facts = evidence?.factIds.map((factId) => factsById.get(factId)).filter(Boolean) ?? [];

                    return (
                      <article className="requirement-card" key={requirement.id}>
                        <div className="requirement-tags">
                          {status ? <span className={`status-pill ${status.className}`}>{status.label}</span> : null}
                          <span className="status-pill muted">{requirement.priority} priority</span>
                          {requirement.isInference ? <span className="status-pill status-red">系统推测</span> : null}
                        </div>
                        <h3>{requirement.normalizedText}</h3>
                        <p className="muted-text">JD 原文：{requirement.sourceText}</p>
                        {evidence ? <p>{evidence.explanation}</p> : null}

                        {facts.length > 0 ? (
                          <div className="evidence-list">
                            {facts.map((fact) => {
                              if (!fact) return null;
                              const block = blocksById.get(fact.sourceRef);
                              return (
                                <div className="evidence-card" key={fact.id}>
                                  <span>简历证据：{block ? `第 ${block.index + 1} 个内容块` : fact.sourceRef}</span>
                                  <p>{fact.content}</p>
                                </div>
                              );
                            })}
                          </div>
                        ) : null}
                      </article>
                    );
                  })}
                </div>
              </>
            ) : (
              <GenerateAnalysisButton projectId={project.id} />
            )}
          </section>
          <OptimizedResumePanel
            documentKind={project.document.documentKind}
            initialDraft={project.optimizedResume}
            projectId={project.id}
          />
          <ProjectChat projectId={project.id} provider={provider} />
        </div>

        <aside className="workspace-side">
          <section className="app-card">
            <p className="app-kicker">目标 JD</p>
            <h2>岗位原文</h2>
            <div className="scroll-box">
              <p className="pre-text">{project.jd}</p>
            </div>
          </section>

          <section className="app-card">
            <div className="section-head">
              <div>
                <p className="app-kicker">简历解析</p>
                <h2>原始内容块</h2>
              </div>
              <span className="app-pill">{project.document.blocks.length} 个</span>
            </div>
            {project.document.warnings.map((warning) => (
              <p className="app-alert warning" key={warning.code}>
                {warning.message}
              </p>
            ))}
            <div className="app-block-list tall">
              {project.document.blocks.map((block) => (
                <article className="app-doc-block" id={block.id} key={block.id}>
                  <span>{block.page ? `第 ${block.page} 页` : block.kind}</span>
                  <p>{block.text}</p>
                </article>
              ))}
            </div>
          </section>
        </aside>
      </section>
    </main>
  );
}

function Metric({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className={`metric-card ${tone}`}>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

