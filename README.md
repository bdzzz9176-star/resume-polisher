# AI 求职

根据用户已有简历和目标岗位 JD，生成基于真实经历的定制简历，并提供修改解释、针对性追问和岗位准备内容。

## 当前阶段

当前为单用户自用 Alpha。暂不实现公开注册、支付、短信、云存储和复杂任务队列，优先验证：

1. 简历和 JD 的结构化解析。
2. 岗位要求与真实经历证据的映射。
3. 可解释、可确认的简历修改建议。
4. Word 原排版上的局部修改和导出。

## 目录

- `apps/web`：Next.js Web 应用。
- `services/document-worker`：Python Word/PDF 文档服务。
- `packages/contracts`：跨服务数据契约。
- `packages/domain`：与框架无关的业务规则。
- `product`：PRD、页面流程和验收文档。
- `technical`：技术选型、架构和小 Spec。
- `rules`：开发过程中沉淀的可复用规则。

## 本地运行

### 一键启动（推荐）

在 Windows 里直接双击项目根目录下的：

```text
启动AI求职.cmd
```

它会自动：

1. 启动文档解析服务：`http://127.0.0.1:8001`
2. 启动网页服务：`http://localhost:3000`
3. 打开浏览器访问网页

如果第一次打开网页时还没加载出来，等 5-10 秒刷新即可。

> 如果你手动在 CMD 里切到 D 盘目录，要用 `cd /d D:\codexwork\ai求职`，只写 `cd D:\...` 不会从 C 盘切过去。

### 手动启动

依赖已安装并生成锁文件。重新安装时执行：

```powershell
pnpm install
python -m venv services/document-worker/.venv
services/document-worker/.venv/Scripts/python -m pip install -e "services/document-worker[dev]"
```

启动文档服务：

```powershell
services/document-worker/.venv/Scripts/python -m uvicorn app.main:app --app-dir services/document-worker --reload --port 8001
```

启动 Web：

```powershell
pnpm dev:web
```

复制 `.env.example` 为 `.env.local`，不要提交真实 API Key。

### 接入 DeepSeek

在项目根目录创建 `.env.local`，填写：

```env
AI_PROVIDER=deepseek
DEEPSEEK_API_URL=https://api.deepseek.com/chat/completions
DEEPSEEK_API_KEY=你的 DeepSeek API Key
DEEPSEEK_MODEL=deepseek-chat
```

然后重新双击 `启动AI求职.cmd`。如果没有配置 Key，系统会继续使用 Fake AI，占位回答会提示你如何启用真实模型。

已验证：Web lint、类型检查、生产构建、Python pytest、Ruff 和两个服务的健康检查。

## 文档入口

- `product/PRD-v0.1.md`
- `technical/tech-selection.md`
- `technical/architecture.md`
- `technical/specs/001-foundation.md`

