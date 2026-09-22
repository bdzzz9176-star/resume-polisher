# AI 求职：技术选型 v0.1

| 项目 | 选择 |
|---|---|
| 当前阶段 | 单用户自用 Alpha |
| 最终形态 | 中国大陆市场的 Web SaaS |
| 开发策略 | 先验证核心链路，保留升级边界，不提前建设复杂基础设施 |
| 文档日期 | 2026-06-20 |

## 1. 选型原则

1. 优先解决最难验证的业务能力：简历解析、JD 匹配、事实约束、Word 修改和导出。
2. 自用 Alpha 不做支付、公开注册、短信、复杂会员和分布式队列。
3. 未来 SaaS 需要的用户隔离、异步任务、对象存储和支付能力保留清晰接口。
4. AI 模型、文件存储和身份认证都通过适配器接入，避免锁死供应商。
5. 所有 AI 结构化结果必须通过 Schema 校验，不能让自由文本直接修改正式简历。

## 2. 总体选型

### 2.1 Web 应用

- Next.js App Router
- React
- TypeScript 严格模式
- Tailwind CSS
- ESLint
- pnpm workspace

选择理由：

- 一套项目能够完成网页界面、服务端页面和轻量 API。
- 适合快速实现项目列表、工作台、修改卡片和预览界面。
- TypeScript 可以让前端页面、业务接口和结构化 AI 输出共享类型。

版本策略：创建项目时使用当时的稳定版本并生成锁文件；之后按 Spec 升级，不长期依赖 `latest`。

当前已锁定的核心版本：

- Next.js 16.2.9。
- React 19.2.7。
- TypeScript 6.0.3。
- Tailwind CSS 4.3.1。
- Zod 4.4.3。
- ESLint 9.x；未采用 ESLint 10，因为当前 React lint 插件存在兼容问题。

### 2.2 文档处理服务

- Python 3.12
- FastAPI
- Pydantic
- python-docx
- PyMuPDF
- Uvicorn

选择理由：

- Python 的 Word/PDF 解析与生成生态更成熟。
- FastAPI 和 Pydantic 适合定义严格的文档处理请求与返回结构。
- 文档服务独立后，可单独进行格式测试，不把二进制文档逻辑塞进 Web 页面代码。

注意：当前机器没有检测到 LibreOffice。Alpha 第一阶段先验证 DOCX 解析与生成；高质量 DOCX 转 PDF 需要后续安装 LibreOffice 或接入可控的文档转换服务。

### 2.3 数据库

- Alpha：SQLite
- SaaS：PostgreSQL
- Alpha 数据访问：Node.js 内置 SQLite + `ProjectRepository` 边界
- SaaS 数据访问：迁移时选择与 PostgreSQL 配套的 ORM

选择理由：

- SQLite 不需要本机安装 Docker 或数据库服务，适合先自用。
- Node.js 内置 SQLite 不增加本地服务和原生数据库包，适合单用户自用。
- 通过仓储接口隔离 SQL，公开上线前替换 PostgreSQL 实现。
- 数据模型避免依赖 SQLite 私有特性，降低迁移成本。

限制：Node.js 24 当前仍会对内置 SQLite 输出实验性功能警告，因此它只用于本地 Alpha，不作为公开 SaaS 的生产数据库客户端。

迁移边界：JSON、全文搜索、并发任务锁和高级索引不在 Alpha 中依赖 SQLite 私有实现。

### 2.4 文件存储

- Alpha：工作空间内的受控本地存储目录。
- SaaS：S3 兼容对象存储。
- 统一接口：`FileStorage`。

本地文件不能由浏览器直接拼接路径访问，必须经过应用权限检查。

### 2.5 AI 接入

- OpenAI Responses API。
- 使用 Structured Outputs/JSON Schema 约束岗位拆解、证据映射、修改建议和追问结果。
- 通过 `AiProvider` 接口封装。
- 模型通过环境变量配置，不散落硬编码在业务代码中。
- 提供 `FakeAiProvider`，无 API Key 时也能开发页面和流程。

模型策略：

- 自用 Alpha 首先使用一个通用推理模型完成全流程，减少过早优化。
- 轻量拆解和分类任务可在真实使用后再评估低成本模型。
- 当前远程官方文档连接不可用，因此不在代码中预设未经在线核实的具体模型 ID；接入 API Key 时再核对可用模型并写入本地环境变量。

### 2.6 异步任务

- Alpha：数据库任务记录 + 应用内顺序执行。
- SaaS：独立 Worker + 可靠队列。
- 统一任务状态：待执行、执行中、成功、失败、可重试。

Alpha 仍然先建立任务对象和幂等键，避免未来重写整个生成流程。

### 2.7 身份认证

- Alpha：单用户开发模式，不开放公网注册。
- SaaS：邮箱/手机号验证码登录，通过 `AuthProvider` 接口接入。

即使是单用户模式，所有核心表仍保留 `userId` 所有权字段，防止后续迁移时补数据隔离。

### 2.8 支付

- Alpha：不实现。
- SaaS：在核心价值验证后，再接入订单、支付和权益模块。

现阶段界面不显示虚假的购买入口，但业务文档保留付费边界。

### 2.9 测试

- Web 单元测试：Vitest。
- Web 端到端测试：Playwright。
- Python 测试：pytest。
- 接口契约：JSON Schema 样例和契约测试。
- 文档质量：使用脱敏 DOCX/PDF 固定样本做回归测试。

## 3. Alpha 与 SaaS 的差异

| 能力 | 自用 Alpha | 公开 SaaS |
|---|---|---|
| 用户 | 单用户 | 多用户注册与隔离 |
| 数据库 | SQLite | PostgreSQL |
| 文件 | 本地受控目录 | 对象存储 |
| AI | 一个可配置供应商 | 多模型路由与成本控制 |
| 任务 | 应用内执行 | 队列和独立 Worker |
| 导出 | 先保证 DOCX | DOCX + 稳定 PDF |
| 支付 | 不做 | 单次/套餐/订阅 |
| 部署 | 本机运行 | 中国大陆合规云环境 |

## 4. 暂不引入的技术

- 微服务治理框架。
- Kubernetes。
- Redis，仅在可靠队列或缓存确有需要时引入。
- 向量数据库，当前核心关系可由结构化事实和证据映射表达。
- 复杂事件总线。
- 富文本协同编辑器。
- 自建 OCR 和模型训练平台。

## 5. 环境变量边界

计划使用：

- `APP_MODE=single-user`
- `DATABASE_URL`
- `FILE_STORAGE_ROOT`
- `DOCUMENT_SERVICE_URL`
- `AI_PROVIDER=openai|fake`
- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `APP_DATA_ENCRYPTION_KEY`（公开部署前启用）

密钥只能放在本地未提交的环境文件或部署平台密钥系统中。

## 6. 当前环境结论

- Node.js 24.14.0 可用。
- pnpm 11.5.3 可用。
- Python 3.12.13 可用。
- 当前未检测到 Docker。
- 当前未检测到 LibreOffice/`soffice`。
- Web 与 Python 项目依赖已安装，Web 已生成 `pnpm-lock.yaml`。

## 7. 需要后续验证的高风险技术点

1. 不同 Word 模板在局部改写后的样式和分页保持程度。
2. PDF 解析后重建可编辑 Word 的可接受质量。
3. AI 结构化输出在真实简历和复杂 JD 下的稳定性。
4. 要求—事实—修改建议链路能否完全追溯。
5. 长文本生成耗时、失败重试和 API 成本。
6. DOCX 转 PDF 在本机和未来云环境中的一致性。

