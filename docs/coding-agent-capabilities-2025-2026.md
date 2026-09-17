# 近一年 Coding Agent 能力全景（约 2025.09–2026.09）

> 调研范围：Cursor、Claude Code、OpenAI Codex、GitHub Copilot、Windsurf/Devin、Kiro、Gemini CLI、Amp、OpenHands、Cline、OpenCode、Goose、Aider、Factory Droid、Amazon Q 等主流产品，以及 MCP / Agent Skills / AGENTS.md / ACP / Spec Kit 等开放标准。  
> 资料来源：各产品官网 changelog、官方文档、工程博客、GitHub 仓库、Linux Foundation 公告，以及 2026 年社区测评。  
> 目的：按「如何提升研发体验」拆解近一年真正落地的 agent 能力，并说明**它们是怎么做的**，而不是只列功能名。

---

## 0. 先看结论：这一年真正变了什么

近一年 coding agent 的主线，不是「模型更会写代码」这一件事，而是 **harness（编排层）成熟**：把模型、工具、记忆、规范、执行环境和评审闭环做成可复用系统。

可以压缩成五条行业共识：

1. **Just-in-time 上下文优于一次性塞满。** Claude Code、Cursor、Codex 都从「把仓库塞进窗口」转向「只加载技能目录 + 按需 grep/读文件」。RAG 对代码导航仍有用，但不再是默认主路径。
2. **静态规则 + 动态技能分层。** 永远生效的放 Rules / `AGENTS.md` / `CLAUDE.md`；按任务加载的放 Skills。这是近一年最重要的上下文工程实践。
3. **规范必须可执行。** 纯 prompt 会在长任务中被压缩掉。Hooks、linter/tsc、测试、self-review、Bugbot/Copilot Review 把「私有规范」从建议变成闸门。
4. **Plan → Act → Verify → PR 成为默认闭环。** Plan Mode、Spec Kit、Kiro Specs、Cloud Agents、GitHub Coding Agent 都在把研发流程从聊天变成可追踪的工作流。
5. **本地交互 + 云端异步并行。** 人在 IDE/CLI 里紧循环，长任务丢到隔离 VM / worktree，手机/Web 盯进度，PR 回来评审。

下面按你关心的五个体验维度展开，再给出各产品对照和可落地建议。

---

## 1. 提高响应速度、准确度、领域知识理解与存储

### 1.1 速度：不是只换更快的模型

近一年各家同时在四层加速：

| 层级 | 做法 | 代表 |
| --- | --- | --- |
| 模型 | 训练低延迟 agent 模型；按任务复杂度自动调节推理量 | Cursor Composer（2.0 起，到 2026 中已到 Composer 2.5）；GPT-5-Codex / GPT-5.3-Codex / GPT-5.5；Claude 系列 effort 档 |
| 工具路径 | 搜索替换代替整文件重写；Instant Grep；减少 LSP 读文件；MCP 延迟加载 | Cursor 0.50 的 search/replace、2.1 Instant Grep、2.4 MCP on-demand |
| 并行 | 子代理各自窗口；worktree / 远程机隔离；同一提示多模型竞赛 | Cursor 最多 8 路并行；Claude / Codex / Gemini CLI subagents；Factory Mission Mode |
| 环境 | 云端预热快照，避免每次 `npm i` | Cursor Cloud Agents 的 environment snapshot / build；GitHub Actions 安全环境；Devin 云电脑 |

**Cursor 怎么做速度快：**

- **Composer 系列**：专门为 agentic coding 训练，早期宣传多数 turn 在 30 秒内、比同类智能模型约 4 倍快；后续 Composer 2 / 2.5 用强化学习做长程任务，并按任务复杂度调节「想多久」。
- **工具侧**：长文件不再整文件重写，而是 search & replace；agent 的 grep 做成 Instant Grep（毫秒级）；减少用 LSP 渲染/读文件的开销。
- **并行**：2.0 起用 git worktree 或远程机隔离，最多 8 个 agent 同时跑；`/best-of-n` 让多个模型做同一题再挑赢家——这是用算力换准确度，也缩短「试错轮次」的墙钟时间。
- **云端**：Background Agent 在 1.0 全面开放，2.0 改名 Cloud Agents，强调 99.9% 可靠性与 instant startup（预构建环境快照）。

**Claude Code 怎么做：**

- 默认 **agentic search**（Glob / Grep / Read），不把整个仓库向量化进窗口。
- **Subagent 隔离上下文**：Explore / Plan / 自定义 agent 在独立窗口里做高 token 工作，只把摘要回主会话。这同时提升速度（主会话更短）和准确度（研究不被主任务污染）。
- **Programmatic Tool Calling + Tool Search**：工具 schema 不再一次性全塞进窗口；`defer_loading` 后按需发现。上千个 MCP 工具时，这是延迟和准确度的双重优化。
- **Remote Control / Managed Agents**：长任务放到托管 sandbox，本地不再阻塞。

**Codex 怎么做：**

- GPT-5-Codex 起明确按 **agentic coding** 训练；后续 5.3-Codex、5.5 继续强化工具使用。
- CLI 重建后：todo list、并行 shell、web search、MCP、会话 compact。
- 2026 年中后期加 `codex agents` 仪表盘、`codex queue`、任务 `@` 引用，减少人在多个会话间切换的成本。
- 模型路由：spec 阶段可用更便宜模型，执行阶段用更强模型（同类思路也出现在 Factory Droid 的 `--spec-model` / `--worker-model` / `--validator-model`）。

**开源侧：**

- **Aider**：tree-sitter repo map + diff 编辑，token 少、定位准；但 2025 年 8 月后功能迭代明显放缓。
- **OpenCode**：把 LSP 诊断喂给模型，比纯文本 agent 更能「一次改对」。
- **Gemini CLI**：1M token 窗口，用容量换检索；同时用 Google Search grounding 补外部知识。

### 1.2 准确度：从「一次生成」变成「带验证的循环」

各家都发现：准确度提升最大的杠杆，不是更长的 prompt，而是 **可验证目标 + 自我迭代**。

共同机制：

1. **写 → 跑测试 / lint / tsc → 读失败 → 再改**，直到绿灯。
2. **Plan 先对齐，再写代码。** 芝加哥大学研究也被 Cursor 引用：有经验的开发者更倾向于先规划。
3. **独立评审通道。** 生成 agent 和审查 agent 分开，避免自己给自己打满分。
4. **Best-of-N。** 多模型/多轨迹，人（或元 agent）选最好的。

具体产品：

- **Cursor**：Plan Mode（1.7）→ 澄清问题 UI（2.1）→ 内置 AI Code Review + GitHub/GitLab Bugbot；Debug Mode 用假设 + 插桩 + 运行时证据，而不是猜补丁。
- **GitHub Copilot Coding Agent**：实现后先跑 Copilot code review，再跑 code scanning / secret scanning / 依赖漏洞，然后才把人拉进 PR。
- **Claude Code**：内置 `/code-review`、`/verify`（较新版本改为用户显式触发，避免偷偷烧 token）；`continueOnBlock` 让 hook 拒绝后把原因喂回模型继续改。
- **Codex**：独立 `codex review` 对 uncommitted / commit / 基线分支做只读审查，不改工作树。
- **Kiro**：规格驱动 + **property-based tests**，用属性测试抓「单测过了但规格不满足」的边角。

### 1.3 领域知识：怎么「理解」和「存储」

近一年的存储分层已经相当稳定：

```
┌─────────────────────────────────────────────────────────┐
│  L0  模型权重：通用编程 + agent 工具使用（Composer / Codex） │
│  L1  仓库索引：embedding / Merkle 增量 / Instant Grep      │
│  L2  静态说明书：AGENTS.md / CLAUDE.md / .cursor/rules     │
│  L3  动态技能：SKILL.md 渐进披露（名字 → 正文 → 脚本）      │
│  L4  会话记忆：Memories / MEMORY.md / 自动笔记              │
│  L5  外部系统：MCP（Slack、Jira、Datadog、DB、Figma）      │
│  L6  过程资产：plan.md / spec.md / PR 索引 / 轨迹学习      │
└─────────────────────────────────────────────────────────┘
```

**L1 代码理解**

- **Cursor**：打开仓库即建 embedding 索引；文件变更按语法切块异步嵌入。大仓用 Merkle tree + simhash 在团队内复用相近索引，缩短「第一次能搜」的时间。另有 **PR indexing**：合并 PR 的摘要进入语义搜索，agent 可用 `@[PR number]` / commit / branch 拉历史决策。索引不存明文源码（chunk 加密、文件名混淆）。
- **GitHub Copilot Coding Agent**：用 GitHub code search + RAG 分析仓库，再在 Actions VM 里干活。
- **Amp（Sourcegraph）**：遗传了代码搜索基因，`codebase_search_agent`、Librarian（读外部库）、Oracle（规划/评审）是显式子代理。
- **Claude Code / Codex**：刻意少用仓库级向量 RAG，改用「像人一样逛仓库」——列目录、跟 import、grep。社区和 Anthropic 工程博客都强调：对代码导航，碎片化 RAG 经常有害。

**L2–L4 知识写入**

- **你写的**：Rules、`AGENTS.md`、`CLAUDE.md`、`.clinerules`、`GEMINI.md`。给「永远要知道」的事实：构建命令、目录约定、禁止事项。
- **按需加载的**：Skills。只把 `name` + `description` 放进启动上下文（约 100 token/技能），命中后再读 `SKILL.md`，脚本和 reference 更晚加载。
- **模型自己写的**：Cursor Memories（1.0 beta → 后续可审批管理）；Claude auto memory（`MEMORY.md`，纠正与偏好）；Windsurf Cascade Memories（可编辑、可搜索、可关自动生成）；Codex `~/.codex/memories/`（opt-in）。
- **组织级**：Claude 的 managed `CLAUDE.md`（`/etc/claude-code/`）；Cursor Team Rules / dashboard hooks；Windsurf Enterprise system-level rules；VS Code / Copilot 的 org instructions。

**L6 过程知识**

- Devin 明确说会读 **past session trajectories**，迁移类任务会自己写脚本把重复步骤变成一步。
- Cursor 把 plan 存进 `.cursor/plans/`，下次 agent 可接着干。
- Kiro / Spec Kit 把需求、设计、任务写成 Markdown 工件，这是「领域知识」的可审计形态。

**实践要点：** 领域知识不要全写进永远在线的规则。Cursor 官方建议：规则只写命令、模式、指向 canonical 文件的指针；完整 style guide 交给 linter；多步流程做成 Skill。Claude 建议每个 `CLAUDE.md` 控制在约 200 行，越长越不遵守。

---

## 2. 压缩上下文、减少无用信息、提高人机对话效率

这是近一年 **context engineering** 成为独立学科的一年。Anthropic 的 *Effective Context Engineering for AI Agents* 把主流手法写得很清楚。

### 2.1 五种压缩手法（各家都在用，只是名字不同）

**① 渐进披露（Progressive disclosure）**

Agent Skills 开放标准的核心：

1. Discovery：只加载技能名和描述  
2. Activation：任务匹配后再读完整 `SKILL.md`  
3. Execution：需要时才跑 `scripts/`、读 `references/`

Cursor 2.4、Claude Code、Codex、Copilot、Kiro、Goose 都已采用。MCP 侧对应 **deferred tool discovery / Tool Search**：工具定义默认不进窗口，用搜索工具按需拉取。Cursor 甚至把 MCP server 定义拆成 `.cursor` 下的 JSON，**用到才加载**。

**② 会话压缩（Compaction）**

窗口快满时，把历史交给模型总结，保留架构决策、未解决问题、实现细节，丢掉重复工具输出。然后用摘要 + 最近打开的文件重启窗口。

- Claude Code：`/compact` 与自动 compact；压缩后从磁盘重新注入根 `CLAUDE.md`、unscoped rules、auto memory；path-scoped 规则和子目录 `CLAUDE.md` **不会**自动回来，直到再次读到对应文件。被调用过的 skill 体会再注入，但有 5k/技能、总计 25k token 上限。
- Codex：`/compact`，带 PreCompact / PostCompact hooks。
- Kiro：官方把 Compaction 列为 harness 能力。
- 研究界：CAT（Context as a Tool，ACL 2026 Findings）把压缩做成 **可调用工具**，而不是被动触发；SWE-Compressor 在 SWE-Bench Verified 到 57.6%。Paritok-4B 把 agent 上下文压到约 26% token，仍保留约 86–89% 解题质量。

**③ 子代理卸载（Context offload）**

高噪声工作（全仓搜索、跑测试、读大日志）放到子代理，主会话只收摘要。这是 2026 年提升「对话理解速度」最有效的产品功能之一：人看到的主线程变短、变干净。

**④ 结构化外存（Notes outside the window）**

Agent 把进度写到 `scratchpad.md` / plan 文件 / MEMORY.md，压缩后仍能读盘恢复。Cursor 的 grind hook 模式：`stop` hook 检查 scratchpad 是否含 `DONE`，没有就 followup 继续。Claude 的 auto memory、Windsurf memories 是同一思想。

**⑤ Just-in-time 检索**

不预加载文件。Agent 拿路径、查询、URL 当指针，运行时再 Read / Grep。Anthropic 用 Claude Code 分析大型数据库时的例子：写查询、存结果、用 `head`/`tail`，从不把全量对象塞进窗口。

### 2.2 减少无用信息：什么不该进窗口

各家文档高度一致：

| 不该做 | 该做 |
| --- | --- |
| 把整本 style guide 贴进 rules | ESLint / ruff / 格式化 hook |
| 把所有 MCP 工具 schema 常驻 | defer_loading / 按需 enable |
| 一条对话从登录页做到上线 | 任务切换就新开会话，用 `@Chats` 引用旧对话 |
| 手动 @ 一堆无关文件 | 让 agent 自己搜；只 @ 你确定相关的 |
| 超长 CLAUDE.md | 拆成 path-scoped rules 和 skills |
| 把 RAG 碎片当唯一真相 | 以当前文件 + 调用链为准 |

Cursor 明确说：长对话经过多次 summarization 后噪声累积，agent 会跑题；换任务、反复犯同一错、一个逻辑单元完成，都该新开会话。用 `@Chats` 而不是复制整段历史。

### 2.3 提高人与 agent 的对话效率

近一年 UI/交互上的关键进展：

- **Plan Mode 先问再写**：Cursor 2.1 的交互式澄清问题；agent 提问时仍可继续读文件。2.4 起任意对话都能问。
- **队列与仪表盘**：Cursor 消息队列可拖拽；Claude `claude agents` 一屏看所有会话（跑着 / 等你 / 完成）；Codex `codex agents` + `codex queue`；Windsurf 可在当前任务未完成时排队下一条。
- **引用而不是粘贴**：`@Branch`、`@PR`、`@agent`、Codex 的 `@任务`。人用指针，agent 自己拉细节。
- **模式自动切换**：Cursor agent 可主动请求从 Plan 切到 Agent；Windsurf Plan Mode 开始实现时可切回 Code Mode。
- **可视化计划**：Cursor Plan 内嵌 Mermaid；Amp 有 mermaid 工具和 walkthrough skill。
- **图优于字**：贴设计稿、错误截图；agent 控浏览器自己截图验证。这比用文字描述 UI 便宜且准。

---

## 3. 提高代码生成准确度、可信度、遵守私有规范

### 3.1 为什么「写在 rules 里」不够

Claude 文档写得很直白：`CLAUDE.md` 是 **context，不是强制配置**。要挡住某个动作，用 `PreToolUse` hook。Cursor 也说：完整 style guide 应交给 linter。社区工具（Yggdrasil、AgentLint、Agent-Proof）进一步指出：长任务 + 压缩后，prompt 规范会静默丢失。

所以 2025–2026 的共识是 **三层约束**：

```
软约束（模型可见）     规则 / Skills / AGENTS.md
半硬约束（生命周期）    Hooks：格式化、禁止危险命令、stop 时跑测试
硬约束（确定性闸门）    CI、linter、tsc、frozen tests、secret scan、策略引擎
```

### 3.2 私有规范如何落地

**A. 分层说明书（各工具文件名不同，结构相同）**

| 工具 | 全局 | 项目 | 路径/文件级 | 动态流程 |
| --- | --- | --- | --- | --- |
| Cursor | Team Rules、`~/.cursor` | `.cursor/rules`、`AGENTS.md` | globs | Skills、Commands |
| Claude Code | managed / `~/.claude/CLAUDE.md` | `CLAUDE.md`、`.claude/rules` | `paths:` frontmatter | Skills、Plugins |
| Codex | `~/.codex/AGENTS.md` | 沿路径拼接 `AGENTS.md`，近处覆盖远处 | 目录级拼接 | Skills、Plugins |
| Copilot / VS Code | org / user profile | `.github/copilot-instructions.md`、`AGENTS.md` | `*.instructions.md`、nested `AGENTS.md` | Skills、`.agent.md` |
| Cline | — | `.clinerules` | — | workflows |
| Gemini CLI | user | `GEMINI.md` | — | `.gemini/agents/` |
| Windsurf | Global + Enterprise | Workspace rules | — | Workflows、Memories |
| Kiro | cloud config | Steering files | — | Specs、Powers |

**AGENTS.md** 在 2025 年 8 月由 OpenAI 发布，同年 12 月捐给 Linux Foundation AAIF，宣称 6 万+ 仓库采用（Amp、Codex、Cursor、Devin、Factory、Gemini CLI、Copilot、Jules、VS Code 等）。Claude Code **默认读 `CLAUDE.md` 不读 `AGENTS.md`**，官方建议 `CLAUDE.md` 里 `@AGENTS.md` 或做 symlink，避免双份维护。

**B. Custom Agents / 角色化**

把「怎么写代码」拆成不同角色，而不是一个全能 prompt：

- VS Code：`.github/agents/*.agent.md`（工具集、模型、子代理、handoff）
- GitHub Copilot Coding Agent：`.github/agents/` 自定义例如「先基准测试再改、再测量」
- Cursor / Claude / Codex / Gemini CLI：自定义 subagent（只读研究、只跑命令、安全评审）
- Factory Droid：Custom Droids，每个有自己的 system prompt、模型、工具策略、推理强度

这能提高规范遵守度：实现 agent 根本没有「改测试断言」的工具；评审 agent 没有写权限。

**C. Hooks：把规范变成事件**

Claude Code 的 hook 面最全：`PreToolUse`、`PostToolUse`、`Stop`、`SessionStart/End`、`UserPromptSubmit`、`PreCompact/PostCompact`、`SubagentStart/Stop`、`InstructionsLoaded` 等。可 `deny`、改 `updatedInput`、把失败原因 `continueOnBlock` 回灌模型。

Cursor：`.cursor/hooks.json`，覆盖 `preToolUse`、`beforeShellExecution`、`afterFileEdit`、`stop`、`preCompact`、`beforeSubmitPrompt` 等；企业可从 dashboard 下发；Cloud Agents 也跑仓库级 hooks（不跑本机 `~/.cursor/hooks.json`）。2.4 起 CLI 兼容 Claude Code hooks。

典型用法：

- 每次改文件后跑 formatter / eslint
- 拦截 `git push --force`、写 `.env`、泄露密钥
- agent 宣布完成时若测试未过，强制再干一轮（Cursor grind 示例、Claude `continueOnBlock`、Codex persistent goals）

**D. 生成后验证环**

- 语言服务：OpenCode / Cursor 把 LSP 诊断喂回 agent
- 测试：TDD 工作流被 Cursor、Claude、Kiro 反复推荐
- 自审：Copilot coding agent 开 PR 前自审；Cursor Review → Find Issues；Codex review 子命令
- 安全：Copilot 内置 code scanning；Cursor Bugbot；Amazon Q 漏洞扫描
- 开源闸门：Yggdrasil（规则按文件命中，脚本规则零成本，CI 用哈希复验模型 verdict）；AgentLint（77 条，跨 agent 标准化工具事件）；Agent-Proof（写前硬闸、失败循环熔断、冻结测试文件）

**E. 可信度：让人知道代码从哪来**

- **Cursor Blame**（Enterprise）：行级区分 Tab / Agent（含模型）/ 人工，并链到当时对话摘要。
- GitHub：draft PR + session log，推理和验证步骤可追溯。
- OpenHands / Devin：全程轨迹、沙箱、审计。
- Agent-Proof：in-toto 证明，把「这次构建用了哪些输入」密码学固定下来。

**准确度提升的经验公式：**

> 私有规范遵守率 ≈ 短规则（指针） × 路径作用域 × hook/CI 硬闸 × 独立评审 × 测试作为目标函数

缺任何一项，长任务后都会漂。

---

## 4. 研发流程线上化、可视化，完全闭环在 agent 中

「完全闭环」在 2026 年的现实形态是：**人设定目标和闸门，agent 跑完 Plan → 实现 → 验证 → PR → 按评论修改**，人在仪表盘/手机上审批。还不是无人值守的自主软件公司，但 issue-to-PR 已经产品化。

### 4.1 标准闭环长什么样

```
需求入口          规划              实现              验证              交付
Issue/Slack  →  Plan/Spec    →  Worktree/VM  →  Test/Lint/Browser →  Draft PR
Linear/CLI      澄清问题         子代理并行       Self-review         评论迭代
手机/Web        tasks.md         沙箱隔离         Bugbot/扫描         合并
```

### 4.2 各家如何把流程搬到线上

**GitHub Copilot Coding Agent（2025 中 GA 路线）**

这是目前和 GitHub 工作流咬合最紧的闭环：

1. 把 Issue 指派给 Copilot，或在任意 GitHub 页面用 Agents panel 丢一句话  
2. 在 Actions 安全环境起 VM、clone、用 code search 理解仓库  
3. 边做边 push 到 draft PR，session log 可见推理  
4. 自审 + 安全扫描后才喊人  
5. 人在 PR 里评论，agent 继续改  
6. VS Code / CLI 可把云会话拉回本地（`&` 推回云端）  
7. 浏览器（Playwright MCP）做 UI 验证；MCP 接内部系统  

Agents panel 出现在 github.com、Mobile、VS Code，任务不打断当前页面。Workspace 技术预览已于 2025-05-30 关闭，能力并入 Agent Mode + Coding Agent。

**Cursor Cloud Agents**

- 入口：编辑器、cursor.com/agents、手机、Slack `@Cursor`
- 环境：`.cursor/environment.json` + 快照 / Dockerfile / install&start 命令；密钥走 Secrets 而不是把 `.env` 打进快照
- 网络：出站域名限制、Tailscale、私有 SCM
- 产物：分支 + PR；可录屏证明功能（walkthrough artifacts）
- 并行：多云端任务；本地用 worktree 多开
- 可视化：Agents Window 管理计划与代理；Plan 可前台写、后台建，或并行出多份计划给人挑

**Claude Code**

- `claude agents`：所有会话一行一个状态  
- Remote Control：本机会话投到 claude.ai / 手机  
- `/schedule` Routines：cron、API、GitHub 事件在 Anthropic 云上跑  
- `claude --teleport`：Web/手机上的长任务拉回终端  
- GitHub Actions / GitLab CI、Slack 路由、Chrome 调试  
- Agent SDK / Managed Agents：把同一套 harness 嵌进自有系统和托管 sandbox  
- Goal 条件：测试全绿才停，否则自动再来一轮  

**OpenAI Codex**

- `codex cloud`：把活交到配置好的云环境，再把结果 apply 回本地  
- 任务仪表盘、queue、跨任务 `@`  
- GitHub PR reviews、thread automations  
- 插件市场：skills + MCP + hooks 打包分发  
- 计算机使用（macOS）和应用内浏览器（2026 春）把「能看见 UI」补进闭环  

**Devin / Windsurf（Cognition）**

- Devin：多小时、多仓迁移；读历史轨迹自学；Linear 标签触发；Datadog/Slack 值班；PR 评论闭环  
- 2026-04 Devin CLI：本地终端起步，不够再 handoff 到云电脑  
- Windsurf Cascade：Write/Chat/Plan；Checkpoints 可回滚到某一步；实时感知你在编辑器里的动作（减少重复交代）；Arena Mode 双模型盲测  
- Agent Command Center + Devin Cloud：编辑器和云端工程师打通  

**Kiro（AWS，2025 中后期起，后 GA）**

最接近「规格即流程」：

- Prompt → `requirements.md` + `design.md` + `tasks.md` → 并行 agent 实现 → 属性测试对照规格  
- 同一 harness 出现在 IDE、CLI、Web、Mobile；Web 会话在隔离 sandbox 里跑，关电脑不停  
- 通过 **ACP（Agent Client Protocol）** 连客户端；Steering files 跨端生效  
- Cloud automations 目前主要在 Web  

**OpenHands Agent Canvas**

开源里最像「研发控制塔」：

- 可视化工作区：多会话、文件、终端、自动化  
- 执行后端可换：本机 / Docker / VM / 云 / 企业 VPC  
- 通过 ACP 接入 Claude Code、Codex、Gemini CLI，不绑死某一家模型订阅  
- GitHub / Linear webhook、cron，把重复流程变成 automation  
- SDK 级 plugins（兼容 Claude Code 插件结构）

**Spec Kit（github/spec-kit）**

把闭环做成 **agent 无关** 的工具包（2026-08 发布 1.0.0）：

- 阶段：Constitution → Specify → Plan → Tasks → Implement → Converge  
- 每阶段产出 Markdown，下一阶段只吃工件，不吃聊天记录  
- `/speckit.analyze` 只读交叉检查 spec/plan/tasks 是否打架  
- 官方支持 30+ agent（Copilot、Claude、Codex、Cursor、Gemini、Windsurf、Kiro…）  
- 安装时把命令/技能写到各工具自己的目录（`.cursor/skills`、`.claude/skills`、`.agents/skills` 等）

这是「流程线上化」的开源最大公约数：流程在 git 里，agent 可替换。

### 4.3 可视化手段

- 任务列表 / todo：几乎所有 agent 都有，Codex 较早做成一等能力  
- Plan Markdown + Mermaid  
- Agents 仪表盘（Cursor / Claude / Codex / GitHub Agents panel / OpenHands Canvas / Kiro Web）  
- Diff 流式展示、checkpoint 时间轴（Windsurf、Cline）  
- 浏览器回放、PR session log  
- Cursor Blame 把「这段是谁写的」可视化到行级  

---

## 5. 能大幅提高研发或流程效率的能力（不限于编码）

按「省下的是哪类时间」分类。

### 5.1 把等待变并行

- 多 agent / worktree / 云端后台：修 bug 的同时开另一个做测试  
- Best-of-N：难题一次跑多个模型，减少来回重试  
- 消息队列：想好下一句先排上，不必干等  
- 子代理并行：Gemini CLI、Cursor default research/terminal/parallel stream subagents  

### 5.2 把重复流程变成斜杠命令 / 技能 / 插件

高频例子（Cursor 官方博客也在用）：

- `/pr`：diff → 提交 → `gh pr create`  
- `/fix-issue N`：拉 issue → 改 → PR  
- `/review`、`/update-deps`  
- Claude 内置 `/doctor`、`/debug`、`/batch`、`/loop`  
- Goose **Recipes**、Windsurf **Workflows**、Cline workflows、OpenHands automations  

插件把 skills + MCP + hooks + 自定义 agent 打成可安装包。Claude plugins、Codex plugins、OpenHands plugins、VS Code 的 skill/agent/prompt 文件，正在收敛到相近目录约定。

### 5.3 打通研发周边系统（MCP 是这一年的总线）

MCP 于 2024 末由 Anthropic 推出，2025 成为事实标准，2025-12 捐给 AAIF。典型连接：

- 需求：Linear、Jira、GitHub Issues  
- 沟通：Slack、Discord（Cline 甚至可从这些聊天里驱动 agent）  
- 观测：Datadog、Sentry  
- 设计：Figma → 代码  
- 数据：内部 API、仓库、浏览器  
- 云：AWS（Amazon Q 原生）、GCP、GitHub Actions  

2026 年的关键演进是 **不要把全部工具 schema 常驻窗口**（Tool Search、list_changed、按需 enable），否则 MCP 越多越蠢。

### 5.4 设计、调试、评审、迁移——编码以外的杠杆

| 场景 | 能力 | 收益 |
| --- | --- | --- |
| UI 还原 | 设计稿进模型 + 浏览器自测 | 少写描述、少来回截图 |
| 疑难 bug | Cursor Debug Mode（假设→插桩→复现→证据） | 少猜 |
| 代码评审 | Bugbot、Copilot Review、Codex review、自审 | 人审第一轮前先清垃圾 |
| 大规模迁移 | Devin 舰队、Amazon Q Transformation（Java/.NET）、OpenHands 工单委托 | 机械重复外包 |
| 值班 | Devin + Datadog/Slack；Copilot 指派 issue | 夜间也可起草 PR |
| 定时任务 | Claude Routines、OpenHands cron、Cline headless CI、Codex automations | 日报、依赖升级、flaky 调查 |
| 规范治理 | Team rules、managed CLAUDE.md、Yggdrasil CI | 新员工/新 agent 冷启动变短 |
| 多仓 | Cursor 多仓环境、Devin multi-repo、Factory 跨仓 Droid | 一次改协议两端 |

### 5.5 本地/开源路线：要控制权时的高效组合

2026 年中社区比较后的大致定位：

| 项目 | 定位 | 近一年要点 |
| --- | --- | --- |
| **Cline** | IDE + CLI + SDK，Plan/Act，11M+ 安装量级宣传 | Checkpoints、MCP 市场、`.clinerules`、headless CI、协调器+专家子代理 |
| **OpenCode** | 终端日常驾驶，星标增长极快 | 75+ 供应商、LSP、多会话、隐私（不存代码）、可用 Copilot/ChatGPT 订阅鉴权 |
| **OpenHands** | 沙箱自主平台 / Agent Canvas | Issue-to-PR、ACP 接入他家 agent、自动化、可空运隔离 |
| **Goose** | Block 出品，2026-04 捐 AAIF | 本地优先、MCP 原生、Recipes、ACP 复用 Claude/Codex 订阅 |
| **Aider** | Git 原生 pair programmer | repo map + 每次编辑即 commit；功能迭代已明显变慢 |
| **Gemini CLI** | Apache-2.0，免费额度友好 | 1M 窗口、Search grounding、subagents、GEMINI.md、checkpoint |
| **Crush** | Charm 出品 | 终端美学与脚本化 |
| **Continue.dev** | IDE 补全+聊天 | 2026 被 Cursor 收购的报道出现，CI 里跑 AI check 是其后期方向 |

开源的真实效率来自：**BYOK + 可审计 + 可进 CI**，不是功能清单比闭源更长。闭环（云 VM、PR 面板、手机）仍然是 Copilot / Cursor / Claude / Devin 更完整。

---

## 6. 各产品近一年能力速查

### Cursor

- 2025-01：`.cursor/rules` 按相关性选用；对话过长可总结后新开  
- 2025-04 前后（0.50）：Background Agent 预览、Max Mode、search/replace 编辑  
- 2025-06（1.0）：Bugbot、Memories beta、MCP 一键+OAuth、Background Agent GA、Jupyter  
- 2025-09（1.7）：Plan Mode、Browser、Hooks  
- 2025-10（2.0）：自研 Composer、Agents 界面、最多 8 并行、Cloud Agents 改名、浏览器 GA、Team commands/rules  
- 2025-11（2.1）：计划澄清问答、编辑器内 AI review、Instant Grep  
- 2026-01（2.4）：Subagents、Skills、按需 MCP、模式自动切换、Cursor Blame、图像生成  
- 持续：环境快照、PR 语义索引、worktree、`/best-of-n`、Debug Mode、Slack 触发、手机/Web  

**做法关键词：** 自研低延迟模型 + 索引/即时 grep + worktree 并行 + 云快照 + rules/skills/hooks 分层。

### Claude Code

- Skills 开放标准发起方；插件、hooks、subagents、MCP 最完整的生命周期  
- CLAUDE.md 多层 + auto memory；`/init` 可自动生成  
- compact 语义被文档化（什么会在压缩后活下来）  
- Agent SDK（Python/TS）= 同一套 loop 可编程  
- Remote Control、Routines、Teleport、Managed Agents、GitHub Code Review  
- 高级工具使用：Tool Search、Programmatic Tool Calling、tool examples  

**做法关键词：** JIT 检索 + 渐进披露 + hook 硬闸 + 会话在本地/云/手机之间传送。

### OpenAI Codex

- 2025-05 开源 CLI，随后 MCP、GitHub Actions、沙箱  
- 2025-09：GPT-5-Codex、图像上下文、todo、web search、三级权限、compact  
- 2026：Desktop App、插件/技能、subagent、computer use、PR review、agents 仪表盘、queue、goal mode、memories  
- `AGENTS.md` 发起方  

**做法关键词：** ChatGPT 账号一体 + 开源 CLI + 云委托 + 插件分发。

### GitHub Copilot

- Workspace 日落 → Agent Mode + Coding Agent  
- Issue/任意页面 → Actions VM → draft PR → 自审+扫描 → 人评 → 评论迭代  
- Custom agents、模型选择、CLI 与云互相 handoff、Agents panel、MCP、Playwright 浏览器  
- `.github/copilot-instructions.md` + `AGENTS.md` + skills + `.agent.md`  

**做法关键词：** 把 agent 嵌进已有 GitHub 真相源（issue/PR/Actions/扫描）。

### 其他闭源

- **Devin**：长程自主、轨迹学习、多仓舰队、本地 CLI ↔ 云电脑  
- **Windsurf Cascade**：实时感知编辑、Memories、Workflows、Checkpoints、Plan、Arena  
- **Kiro**：规格驱动 + 属性测试 + 多端同一 harness + ACP  
- **Amp**：Oracle/Librarian/Deep mode、可分享 thread、按量计费  
- **Factory Droid**：自定义 Droids、任务级模型路由、`droid exec` 进 CI  
- **Amazon Q**：AWS 接地、Java/.NET 现代化、IDE/CLI/GitHub agentic 体验  

---

## 7. 开放标准：这一年真正「如何做成生态」

Linux Foundation 于 **2025-12-09** 成立 **Agentic AI Foundation (AAIF)**，首批项目：

| 项目 | 捐赠方 | 解决的层 |
| --- | --- | --- |
| **MCP** | Anthropic | Agent ↔ 工具/数据 |
| **goose** | Block | 本地 agent runtime |
| **AGENTS.md** | OpenAI | 仓库如何对 agent 说话 |
| 随后 **A2A** | Google | Agent ↔ Agent |
| **agentgateway** 等 | — | 流量、多租户、身份 |

并行的事实标准：

- **Agent Skills**（`SKILL.md`，agentskills/agentskills）：跨 Cursor / Claude / Codex / Copilot  
- **ACP（Agent Client Protocol）**：Kiro、OpenHands Canvas、Goose 用来接不同客户端/不同 harness  
- **Spec Kit**：流程层，不绑定单一 agent  

对团队的含义：2026 年再为单一 IDE 写一套私有「AI 配置」会很快过时。更稳的是：

1. 仓库根放一份 **`AGENTS.md`**（构建、测试、约定、禁止事项）  
2. 多步流程放 **`.agents/skills` 或各工具都能发现的 `SKILL.md`**  
3. 硬规范放 **ESLint/tsc/CI + hooks**  
4. 外部系统走 **MCP**，并设置按需加载  
5. 大功能用 **spec/plan/tasks 工件**（Spec Kit 或 Kiro），不要只存在聊天里  

---

## 8. 「他们是怎么做的」机制对照（可直接借鉴）

### 8.1 速度

1. 为 agent 环训练专用模型（工具使用、search、短 turn）  
2. 编辑用 diff/patch，禁止整文件重写  
3. 搜索走本地 ripgrep 热路径，而不是每次 embedding  
4. 重活进子代理或云 VM；环境用快照预热  
5. 简单任务低推理、困难任务才烧 thinking token（effort / auto routing）  

### 8.2 上下文

1. 启动只放：短说明书 + 技能目录 + 少量常驻工具  
2. 代码用工具读，不预嵌入全部  
3. 技能/MCP 渐进披露  
4. 窗口满了就 compact，但 **从磁盘重新注入** 根说明书和记忆  
5. 任务边界处新开会话，用引用找回旧上下文  
6. 让 agent 把进度写到文件，文件比聊天更抗压缩  

### 8.3 规范与可信

1. 规则写短、写可验证、写指针  
2. 路径作用域：改前端才加载前端规则  
3. Hook 在 PreToolUse 拦危险操作，在 PostToolUse/Stop 跑格式化和测试  
4. 测试/类型作为目标函数，而不是事后建议  
5. 生成与评审分离；PR 机器人做第二双眼睛  
6. 需要合规时上行级归因（Blame）和确定性 CI（不要用模型在 CI 里重复「感觉审查」）  

### 8.4 闭环

1. 先 Plan/Spec，人工改计划比改一堆错代码便宜  
2. 执行隔离（worktree/VM），失败可扔  
3. 验证自动化（单测、浏览器、扫描）  
4. 唯一交付物是 git 分支 + PR，聊天只是过程  
5. 评论、CI 红灯、hook 拒绝都作为 **结构化反馈** 回到同一 agent 会话  
6. 仪表盘让人从「盯着 token 流」变成「处理例外」  

### 8.5 效率

1. 把第三次才做对的流程写成 Skill/Command 并提交 git  
2. MCP 只开当前域需要的服务器  
3. 云端跑「待办清单型」任务，本地跑需要触觉的任务  
4. 用规格和测试定义完成，而不是用「看起来对」  

---

## 9. 对团队的落地建议（按投入从小到大）

**一周内能做完的最小集**

1. 根目录 `AGENTS.md`：如何构建、测试、目录约定、三到五条「永远不要」。Claude 用户再 `@AGENTS.md` 进 `CLAUDE.md`。  
2. 打开格式化 + lint + typecheck；在 agent hook 或 CI 里跑。  
3. 删掉超长规则，改成「见 `src/components/Button.tsx`」。  
4. 约定：换任务就新开 agent 会话。  

**一个迭代**

5. 把 3 个最高频工作流写成 `SKILL.md`（发 PR、修 issue、加 API）。  
6. 启用 Plan Mode / Spec Kit 的 specify→plan→tasks。  
7. PR 上开 Bugbot 或 Copilot Review。  
8. MCP 只接 Linear/Jira + 文档，工具 defer 加载。  

**平台化**

9. 云端 agent 环境快照（Cursor environment.json 或 GitHub coding agent 的自定义环境）。  
10. 组织级 rules/hooks（安全、许可证、禁止提交密钥）。  
11. 自定义评审 agent 与实现 agent 分权。  
12. 用 OpenHands Canvas / `claude agents` / GitHub Agents panel 做统一任务入口。  
13. 对迁移/值班类机械任务，评估 Devin 或自建 Agent SDK 自动化。  

**不要做的**

- 不要把内部 wiki 整本贴进 rules。  
- 不要为每个 IDE 维护一份互斥的规范文件而不设 `AGENTS.md` 真源。  
- 不要在没有测试的仓库里追求「全自动闭环」。  
- 不要同时开几十个 MCP；上下文污染会把准确度打回去。  

---

## 10. 资料索引（调研时的主要一手来源）

- Cursor changelog / 2.0 博客 / *Best practices for coding with agents*（2026-01）/ Cloud Agents 文档 / 安全索引博客  
- Claude Code 文档：Skills、Memory、Hooks、Context window、Remote Control、Routines、Agent SDK；Anthropic *Effective context engineering*、*Advanced tool use*  
- OpenAI：Codex 升级公告、AGENTS.md 指南、Skills/Plugins 文档、GitHub `openai/codex` releases  
- GitHub Blog：Coding agent、Agents panel、Copilot 路线；github/spec-kit  
- Windsurf/Devin 文档与 Cognition 博客  
- Kiro 文档（harness、ACP、specs）  
- Gemini CLI 仓库与 Google Developers Blog（subagents）  
- OpenHands、Cline、Goose、Amp、Factory 公开文档与 2026 年比较文  
- Linux Foundation AAIF 成立公告（2025-12-09）  
- Agent Skills 规范仓库 agentskills/agentskills  
- 论文：CAT / SWE-Compressor（ACL 2026 Findings）；Paritok-4B（意图条件压缩）  

---

## 11. 一句话对照：五个体验目标各自最有效的杠杆

| 你的目标 | 近一年最有效的做法 | 优先看谁 |
| --- | --- | --- |
| 更快、更准、有领域记忆 | 专用 agent 模型 + JIT 搜索 + Skills/Memories 分层 + 预热环境 | Cursor Composer、Claude Skills/Memory、Cloud 快照 |
| 上下文更干净、对话更高效 | 渐进披露、compact、子代理卸载、任务级新会话、计划澄清 | Claude 文档化的 compact 语义、Cursor Plan/Instant Grep |
| 代码更可信、守私有规范 | 短规则 + path scope + hooks + 测试目标 + 独立评审 | Claude/Cursor hooks、Copilot 自审+扫描、Yggdrasil |
| 流程在 agent 里闭环 | Issue/Slack → 隔离执行 → 验证 → PR → 评论迭代 + 仪表盘 | GitHub Coding Agent、Cursor Cloud、Kiro/Spec Kit、OpenHands |
| 大幅提升研发效率 | 并行 worktree、斜杠工作流、MCP 总线、云端异步、规格驱动 | 全员都在做；差别在是否与你们的 GitHub/Slack/CI 咬合 |

近一年的胜负手已经很清楚：**模型是上限，harness 和工程化规范是下限。** 把说明书写短、把闸门写硬、把流程写成 git 里的工件，agent 才会在私有仓库里既快又稳。
