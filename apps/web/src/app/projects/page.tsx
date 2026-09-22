import Link from "next/link";

import { listProjects, toPublicProject } from "@/server/project-repository";

export const dynamic = "force-dynamic";

function jdTitle(jd: string) {
  const firstLine = jd.split(/\r?\n/).find((line) => line.trim());
  return firstLine?.trim().slice(0, 42) || "未命名岗位";
}

function jdExcerpt(jd: string) {
  return jd.replace(/\s+/g, " ").trim().slice(0, 120);
}

export default function ProjectsPage() {
  const projects = listProjects().map(toPublicProject);

  return (
    <main className="app-page">
      <header className="app-topbar">
        <div className="app-topbar-inner">
          <Link className="app-logo" href="/">
            AI 求职
          </Link>
          <nav className="app-nav">
            <Link href="/">首页</Link>
            <Link className="active" href="/projects">
              我的项目
            </Link>
            <Link href="/projects/new">新建投递</Link>
          </nav>
          <Link className="app-topbar-button" href="/projects/new">
            + 新建
          </Link>
        </div>
      </header>

      <section className="app-hero compact">
        <div className="app-container app-hero-row">
          <div>
            <p className="app-kicker">我的投递项目</p>
            <h1>每一个 JD，都单独维护一份分析</h1>
            <p>点击项目卡片进入岗位分析工作台，查看匹配情况、简历证据和能力缺口。</p>
          </div>
          <Link className="app-primary-link fit" href="/projects/new">
            创建新投递
          </Link>
        </div>
      </section>

      <section className="app-container">
        {projects.length === 0 ? (
          <div className="app-empty">
            <span>📄</span>
            <h2>还没有投递项目</h2>
            <p>上传一份简历和一个目标 JD，先跑通你的第一个岗位分析。</p>
            <Link className="app-primary-link fit" href="/projects/new">
              开始创建
            </Link>
          </div>
        ) : (
          <div className="project-grid">
            {projects.map((project) => (
              <Link className="project-card" href={`/projects/${project.id}`} key={project.id}>
                <div className="project-card-head">
                  <span className="app-pill">{project.analysis ? "已完成岗位分析" : "简历已解析"}</span>
                  <time>{new Date(project.updatedAt).toLocaleString("zh-CN")}</time>
                </div>
                <h2>{jdTitle(project.jd)}</h2>
                <p>{jdExcerpt(project.jd)}</p>
                <div className="project-card-foot">
                  <span>{project.resumeFileName}</span>
                  <strong>进入工作台 →</strong>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

