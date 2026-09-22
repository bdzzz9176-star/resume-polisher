import Link from "next/link";

const hotJobs = ["嵌入式软件", "前端开发", "Java", "产品经理", "内容运营", "数据分析", "测试开发"];

const categories = [
  ["互联网/AI", "Java", "C/C++", "前端"],
  ["嵌入式", "Linux 驱动", "摄像头", "RTOS"],
  ["产品", "产品经理", "产品运营", "数据产品"],
  ["运营", "内容运营", "用户运营", "电商运营"],
  ["求职材料", "简历优化", "JD 匹配", "面试准备"],
  ["学习补齐", "知识清单", "项目复盘", "路线规划"],
];

const featureCards = [
  {
    eyebrow: "JD 匹配",
    title: "把同一份经历，写成更像这个岗位的人",
    description: "识别岗位要求，把你简历里真实做过但没突出写的部分找出来。",
    tone: "purple",
  },
  {
    eyebrow: "不虚构",
    title: "每一次改写，都能追溯到原始经历",
    description: "没有证据的能力不会直接写进简历，而是先变成追问或学习缺口。",
    tone: "blue",
  },
  {
    eyebrow: "面试准备",
    title: "告诉你 JD 背后真正要补什么",
    description: "按岗位方向生成知识清单、复习重点和面试表达提示。",
    tone: "cyan",
  },
];

export default function HomePage() {
  return (
    <main className="boss-page">
      <header className="boss-nav">
        <div className="boss-nav-inner">
          <Link className="boss-logo" href="/">
            AI 求职
          </Link>
          <nav className="boss-menu" aria-label="主导航">
            <Link href="/">首页</Link>
            <Link href="/projects/new">创建投递</Link>
            <Link href="/projects">我的项目</Link>
            <a href="#features">功能</a>
            <a href="#jobs">岗位方向</a>
          </nav>
          <div className="boss-actions">
            <span>自用 Alpha</span>
            <Link className="boss-login" href="/projects">
              进入工作台
            </Link>
          </div>
        </div>
      </header>

      <section className="boss-hero">
        <div className="boss-container">
          <div className="boss-search-card">
            <div className="boss-search-tabs">
              <button type="button">简历定制</button>
              <button type="button">岗位理解</button>
              <button type="button">面试准备</button>
            </div>
            <div className="boss-search-bar">
              <div className="boss-select">岗位类型</div>
              <div className="boss-input">粘贴 JD，上传简历，让 AI 帮你生成更匹配的投递版本</div>
              <Link className="boss-search-button" href="/projects/new">
                开始分析
              </Link>
            </div>
            <div className="boss-hot-row">
              <span>热门方向：</span>
              {hotJobs.map((job) => (
                <Link href="/projects/new" key={job}>
                  {job}
                </Link>
              ))}
            </div>
          </div>

          <div className="boss-main-grid">
            <aside className="boss-category-card" id="jobs">
              {categories.map((row) => (
                <div className="boss-category-row" key={row[0]}>
                  <strong>{row[0]}</strong>
                  {row.slice(1).map((item) => (
                    <Link href="/projects/new" key={item}>
                      {item}
                    </Link>
                  ))}
                  <span>›</span>
                </div>
              ))}
              <div className="boss-category-footer">
                <span>1 / 3</span>
                <div>
                  <button type="button">‹</button>
                  <button type="button">›</button>
                </div>
              </div>
            </aside>

            <section className="boss-banner-grid" id="features">
              {featureCards.map((card) => (
                <Link className={`boss-banner-card ${card.tone}`} href="/projects/new" key={card.title}>
                  <span>{card.eyebrow}</span>
                  <h2>{card.title}</h2>
                  <p>{card.description}</p>
                  <div className="boss-illustration" aria-hidden="true">
                    <i />
                    <b />
                    <em />
                  </div>
                </Link>
              ))}
              <div className="boss-banner-card wide">
                <span>完整闭环</span>
                <h2>上传简历 → 分析 JD → 找证据 → 生成修改建议</h2>
                <p>先做第一版，再让你逐条确认；适合国内互联网技术岗、产品/运营岗。</p>
              </div>
            </section>
          </div>
        </div>
      </section>

      <section className="boss-section">
        <div className="boss-container">
          <h2>你接下来可以做什么</h2>
          <div className="boss-step-grid">
            <Link href="/projects/new">
              <strong>01</strong>
              <h3>新建投递项目</h3>
              <p>上传 Word/PDF 简历，粘贴目标岗位 JD。</p>
            </Link>
            <Link href="/projects">
              <strong>02</strong>
              <h3>查看岗位分析</h3>
              <p>看哪些经历已匹配、哪些表达不足、哪些需要追问。</p>
            </Link>
            <Link href="/projects/new">
              <strong>03</strong>
              <h3>生成定制简历</h3>
              <p>下一步会把分析结果变成可确认的修改建议。</p>
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

