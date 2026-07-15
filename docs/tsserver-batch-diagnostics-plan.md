# 持久化 tsserver 批量文件 TypeScript 诊断方案

> 状态：方案文档（可落地）  
> 目标：在项目内使用持久化 TypeScript Language Service / tsserver，对**指定批量文件**做 TS 错误检测（语法 + 语义），并可用于本地开发、pre-commit 等场景。  
> 非目标：替代 CI 全量 `tsc --noEmit` 作为唯一合并门禁；不重写 TypeScript 编译器。

---

## 1. 背景与问题

### 1.1 现状

- VS Code 对打开文件的「飘红 / 飘黄」很快，是因为默认只对 **open / visible 文件** 请求诊断（`geterr`），而不是每次全量 `tsc`。
- 工程脚本里常见做法是 `tsc --noEmit -p tsconfig.json`，再筛选目标文件错误——**计算量仍接近全量**，只是展示变窄。
- 需求：像编辑器一样，用**持久化语言服务**，对**指定文件列表**做检查，复用项目状态以降低延迟。

### 1.2 要回答的问题

1. 技术上能否做到？  
2. 正确性边界是什么？  
3. 是否参考 VS Code 插件？要不要自研完整 tsserver / 协议？  
4. 可落地的分阶段实现路径是什么？

---

## 2. 结论摘要

| 维度 | 结论 |
|------|------|
| 可行性 | **高**。官方 tsserver 协议原生支持 `geterr(files[])` 批量诊断。 |
| 正确性 | 保证「目标文件在当前项目上下文中的错误」；**默认不保证**下游未列入文件未被破坏。 |
| 与 VS Code 关系 | **参考客户端编排逻辑**，不 fork 整仓扩展；**不实现** tsserver 本体。 |
| 实现范围 | 实现 **轻量客户端 + 进程管理 + 诊断编排（+ 可选 daemon）**；协议只做子集。 |
| 推荐分层 | 本地 / 钩子用窄范围 daemon；CI merge 仍全量 `tsc`（或等价）兜底。 |

官方依据要点：

- Language Service 按文件、按需报告诊断（[Using the Language Service API](https://github.com/microsoft/TypeScript-wiki/blob/main/Using-the-Language-Service-API.md)）。
- 多数编辑器（含 VS Code）诊断针对 **open files，而非整个项目**（[Performance.md](https://github.com/microsoft/TypeScript-wiki/blob/main/Performance.md)）。
- `geterr` 接受文件列表；`geterrForProject` 才是全项目（`protocol.d.ts`）。
- VS Code 默认 `geterr`，仅实验开关才走 `geterrForProject`（`bufferSyncSupport.ts`）。

---

## 3. 目标与非目标

### 3.1 目标

1. 输入一批绝对/相对路径的 `.ts` / `.tsx`（及配置允许的 `.js`），输出这些文件的 syntax + semantic 诊断。
2. 使用**长驻** TypeScript 语言服务进程（或等价进程内 LS），避免每次冷启动全量 Program。
3. 尊重项目 `tsconfig.json`（Configured Project），与编辑器语义尽量一致。
4. 提供 CLI；可选提供本机 daemon（socket），供 pre-commit / 内部工具调用。
5. 文档化正确性边界与和全量 `tsc` 的分工。

### 3.2 非目标

1. 重写或维护一份 TypeScript 编译器。
2. 实现完整 TS Server Protocol（补全、rename、refactor 等）。
3. 默认提供「全仓库实时 Problems 面板」级能力（可用 `geterrForProject`，但不作为默认）。
4. 用本方案完全替换 CI 全量类型检查。
5. 第一期就支持 Vue/Svelte/Angular 模板等嵌入式语言（依赖额外语言服务 / API，另立项）。

### 3.3 成功标准（可验证）

| ID | 标准 | 验证方式 |
|----|------|----------|
| S1 | 对故意错误的目标文件能报出与 `tsc` 同文件一致的核心语义错误 | 对比同文件 `tsc` 诊断 code |
| S2 | 第二次起对同项目批量检查明显快于冷启动 `tsc --noEmit` | 本地基准（大仓更明显） |
| S3 | 未列入列表的下游破坏**不会**被默认报出（符合设计） | 改 export、只查变更文件 |
| S4 | 进程崩溃可自动拉起；并发 check 不串结果 | 故障注入 + 并发测试 |
| S5 | CLI 非零退出码当且仅当目标集存在 error 级诊断 | 脚本断言 |

---

## 4. 方案选型

### 4.1 路线对比

| 路线 | 做法 | 优点 | 缺点 | 适用 |
|------|------|------|------|------|
| **A. tsserver 子进程** | spawn 官方 `tsserver`，JSON 协议 | 与 VS Code 一致、隔离好、可多调用方 | 需实现帧协议与事件聚合 | 长期 daemon、多入口 |
| **B. 进程内 Language Service** | `createLanguageService` + `get*Diagnostics` | 无 JSON、实现快、易调试 | 与宿主同进程；共享需自建 IPC | 单工具 / MVP |
| **C. 每次 `tsc` / tsc-files** | 冷编译或临时 tsconfig | 简单 | 失去持久化红利；或正确性更弱 | 偶发脚本 |
| **D. 全量 tsc 再 filter** | 全量后筛路径 | 实现简单 | 几乎不省算力 | 不推荐作为本需求主路径 |

### 4.2 推荐策略

1. **Phase 1（MVP）优先路线 B**：最快验证产品与正确性口径。  
2. **Phase 2 若需常驻多调用方，上路线 A**：客户端逻辑对齐 VS Code 的 `geterr` 编排。  
3. **诊断语义上 A/B 同类**；可先 B 后抽成 A，API 保持 `checkFiles(files[])` 不变。

### 4.3 与 VS Code 插件的关系

**可以参考，不要整仓搬运。**

应参考的源码（MIT）：

- `extensions/typescript-language-features/src/typescriptServiceClient.ts` — 进程与请求
- `extensions/typescript-language-features/src/tsServer/spawner.ts` — 拉起 tsserver
- `extensions/typescript-language-features/src/tsServer/bufferSyncSupport.ts` — `updateOpen` + **`GetErrRequest` / `geterr`**
- 类型定义：`typescript/lib/protocol.d.ts`

| 内容 | 建议 |
|------|------|
| `geterr` 请求与 diag 事件聚合 | 必参考 |
| `updateOpen` 同步文件内容 | 必参考 |
| Content-Length 帧、seq、cancellation pipe | 必实现（可自写） |
| VS Code URI / Tab / 遥测 / 补全 / 多版本 UI | 不实现 |
| Fork 整份 `typescript-language-features` | 不推荐 |

**不需要实现：**

- tsserver 服务端（使用 `node_modules/typescript/lib/tsserver.js`）
- 完整协议命令集
- 完整 LSP（除非团队已有 LSP 基建；TS7 编辑器侧偏 LSP，但「按文件取诊断」模型同构）

---

## 5. 正确性模型

### 5.1 保证什么

对请求集合 `F = {f1, f2, …}` 中每个文件：

- **语法诊断**：主要依赖单文件 parse → 快、准。
- **语义诊断**：在已加载的 Configured Project（完整 `compilerOptions` + 项目图）下，对 `fi` 做语义检查；会按需使用依赖的类型信息。

### 5.2 不保证什么

- 未列入 `F` 的文件因本次修改而被破坏（典型：改 `types.ts` export，未查 `index.ts`）。
- 未加载的其它 `tsconfig` 项目。
- 磁盘已改但未 `reload` / `updateOpen` 时的最新内容。

### 5.3 正确性档位（产品可选）

| 档位 | 文件集 | 速度 | 正确性 | 建议场景 |
|------|--------|------|--------|----------|
| L0 | 仅用户指定文件 | 最快 | 最弱 | IDE 同款、本地保存 |
| L1 | 指定文件 ∪ 直接 importers | 快 | 中 | pre-commit 推荐起点 |
| L2 | 指定文件 ∪ 逆依赖闭包（可限深） | 中 | 较强 | PR 本地预检 |
| L3 | 全项目 / `geterrForProject` / `tsc` | 慢 | 最强 | CI merge |

**默认实现 L0，配置可升级到 L1；L3 留给 CI。**

### 5.4 与 `tsc --noEmit` 的关系

```text
本地迭代 / pre-commit  →  本方案（L0/L1）
CI merge / 发布前      →  tsc --noEmit（或 tsc -b）全量
```

同版本、同 tsconfig、内容已同步时：对**同一文件**的诊断 code 应高度一致；**结果集合**因检查范围不同而不同——这是设计如此，不是 bug。

---

## 6. 系统架构

### 6.1 逻辑架构

```text
┌─────────────────────────────────────────────────┐
│ 调用方：CLI / lint-staged / 内部工具 / 编辑器插件 │
└──────────────────────────┬──────────────────────┘
                           │ 本机 IPC（socket）或直接函数调用
┌──────────────────────────▼──────────────────────┐
│ ts-batch-diagnostics（本方案交付物）              │
│  ├─ Api: checkFiles / checkAffected / health     │
│  ├─ SessionManager（生命周期、崩溃重启）           │
│  ├─ FileSync（open / updateOpen / reload）       │
│  ├─ DiagnosticsRunner（geterr 或 LS API）        │
│  ├─ AffectedExpander（可选 L1/L2）               │
│  └─ Reporter（JSON / stylish / exit code）       │
└──────────────────────────┬──────────────────────┘
                           │
          ┌────────────────┴────────────────┐
          ▼                                 ▼
┌─────────────────────┐          ┌─────────────────────┐
│ 路线 A: tsserver    │          │ 路线 B: in-process  │
│ 官方二进制 + 协议    │          │ createLanguageService│
└─────────────────────┘          └─────────────────────┘
```

### 6.2 部署形态

1. **库模式**：同进程 `checkFiles()`（路线 B 或嵌入式 client）。  
2. **CLI 模式**：`ts-batch-check check a.ts b.ts`。  
3. **Daemon 模式**：`ts-batch-check start` 后，CLI/钩子连 Unix socket（推荐路径：`$TMPDIR/ts-batch-<hash>.sock`，hash 含 repo root + typescript version）。

---

## 7. 协议与核心流程（路线 A）

### 7.1 需要实现的协议子集

| 方向 | 名称 | 用途 |
|------|------|------|
| 请求 | `configure` | hostInfo、preferences（可最小） |
| 请求 | `updateOpen` | 批量 open / close / change |
| 请求 | `geterr` | 批量异步诊断（主路径） |
| 请求 | `reload` / `reloadProjects` | 配置或依赖变更后 |
| 请求 | （可选）`status` | 健康检查 |
| 事件 | `syntaxDiag` / `semanticDiag` / `suggestionDiag` | 诊断结果 |
| 事件 | `requestCompleted` | 本轮 geterr 结束 |
| 事件 | `projectLoadingStart` / `projectLoadingFinish` | 项目就绪 |
| 事件 | `configFileDiag` | tsconfig 错误 |

**默认不使用** `geterrForProject`。

帧格式（官方）：

```text
Content-Length: <n>\r\n
\r\n
<json>
```

类型来源：依赖项目的 `typescript` 包中的 `protocol.d.ts`，避免手写脆弱类型。

### 7.2 `checkFiles` 主流程

```text
1. 规范化路径为绝对路径（与 tsserver 大小写规则一致）
2. 过滤：仅检查应纳入 TS 项目的文件；记录跳过原因
3. updateOpen：open 目标文件（内容读自磁盘；若支持 buffer 则允许传入）
4. 若项目首次加载：等待 projectLoadingFinish（带超时）
5. 取消进行中的旧 geterr（若有）
6. geterr({ files, delay: 0 })
7. 聚合事件直到 requestCompleted(request_seq 匹配)
8. （可选）close 临时 open 的文件以控内存
9. 按 category 过滤；生成报告与 exit code
```

### 7.3 取消

启动参数：`--cancellationPipeName=<prefix>*`  
新请求前取消旧 `geterr`，避免结果交错（对齐 VS Code `interruptGetErr` 思路）。

### 7.4 建议的 tsserver 启动参数

- `--suppressDiagnosticEvents`：减少主动推送，诊断以显式 `geterr` 为准（按需）
- `--cancellationPipeName=...*`
- 使用**工作区** `typescript` 版本，与 CI 对齐

环境变量：`TSS_LOG=-level verbose -file <path>` 用于排障。

---

## 8. 路线 B（进程内 LS）要点

```text
1. 解析 tsconfig（parseJsonConfigFileContent）
2. 创建 LanguageServiceHost（读写文件系统、getScriptSnapshot、versions）
3. createLanguageService(host)
4. 对每个目标文件：
   diagnostics = [
     ...ls.getSyntacticDiagnostics(file),
     ...ls.getSemanticDiagnostics(file),
     // 可选 suggestion
   ]
5. 持久化：缓存 LanguageService 实例与 version map；文件变更时 bump version
```

与路线 A 对外暴露同一 `checkFiles` 接口，便于后续替换实现。

---

## 9. 模块设计（建议仓库结构）

```text
packages/ts-batch-diagnostics/   # 或 tools/ts-batch-diagnostics/
  package.json
  README.md
  src/
    index.ts                 # 导出 checkFiles
    types.ts                 # 公共类型
    path.ts                  # 路径规范化
    config.ts                # 解析 tsconfig / 环境
    reporter.ts              # JSON / text / exit code
    affected/
      directImporters.ts     # L1
      closure.ts             # L2（可后期）
    impl/
      languageService/       # 路线 B
        host.ts
        service.ts
        runner.ts
      tsserver/              # 路线 A
        framing.ts
        process.ts
        client.ts
        fileSync.ts
        diagnostics.ts
    daemon/
      server.ts              # socket 服务
      protocol.ts            # 应用层 JSON-RPC 简化版
    cli.ts
  test/
    fixtures/
    checkFiles.test.ts
    correctness.test.ts
```

### 9.1 对外 API（稳定契约）

```ts
export interface CheckFilesOptions {
  cwd?: string;
  /** L0 默认；true 时升级到 L1 */
  expandDirectDependents?: boolean;
  includeSuggestions?: boolean;
  timeoutMs?: number;
  /** 覆盖磁盘内容：path -> content（未保存缓冲） */
  overlays?: Record<string, string>;
}

export interface DiagnosticItem {
  file: string;
  category: 'error' | 'warning' | 'suggestion' | 'message';
  code: number;
  message: string;
  line: number;      // 1-based
  offset: number;    // 1-based
  endLine?: number;
  endOffset?: number;
}

export interface CheckFilesResult {
  diagnostics: DiagnosticItem[];
  checkedFiles: string[];
  skippedFiles: Array<{ file: string; reason: string }>;
  durationMs: number;
}

export function checkFiles(
  files: string[],
  options?: CheckFilesOptions,
): Promise<CheckFilesResult>;
```

### 9.2 Daemon 应用层协议（示例）

请求：

```json
{
  "id": 1,
  "method": "checkFiles",
  "params": {
    "files": ["src/a.ts", "src/b.ts"],
    "expandDirectDependents": true,
    "includeSuggestions": false
  }
}
```

响应：

```json
{
  "id": 1,
  "result": { "diagnostics": [], "checkedFiles": [], "skippedFiles": [], "durationMs": 12 }
}
```

另提供：`health`、`shutdown`、`reloadProjects`。

---

## 10. CLI 与工程集成

### 10.1 CLI

```bash
# 一次性（库内拉起实现）
ts-batch-check check src/a.ts src/b.ts

# 从 stdin 读文件列表
git diff --name-only --diff-filter=ACM | ts-batch-check check --stdin

# daemon
ts-batch-check start --root .
ts-batch-check check --daemon src/a.ts
ts-batch-check stop
```

退出码：存在 `category === 'error'` → `1`，否则 `0`。

### 10.2 lint-staged 示例

```json
{
  "lint-staged": {
    "*.{ts,tsx}": "ts-batch-check check --expand-direct-dependents"
  }
}
```

注意：不要把文件列表拼给裸 `tsc`（会忽略 tsconfig）；本工具显式吃文件列表。

### 10.3 CI 建议

```yaml
# PR 门禁（正确性）
- run: npx tsc --noEmit -p tsconfig.json

# 可选：与本地工具同版本的 typescript
```

本地钩子加速 ≠ CI 降级。

---

## 11. 分阶段落地计划

### Phase 0：协议 / API 冒烟（0.5～1 天）

- 路线 B 或手写最小 tsserver `geterr` 脚本。
- 验收：故意类型错误文件能产出诊断。

### Phase 1：MVP CLI（路线 B 推荐）

- 实现 `checkFiles` + CLI + JSON/text 报告。
- 单测：fixtures 固定错误码。
- 验收：S1、S5。

### Phase 2：持久化

- 进程内缓存 LS **或** daemon + 路线 A client。
- 基准：连续 50 次 check，对比冷 `tsc`。
- 验收：S2、S4。

### Phase 3：L1 affected

- `expandDirectDependents`。
- 文档标明仍非全量。
- 验收：改 export + 直接 importer 能检出。

### Phase 4：研发流集成

- husky / lint-staged / 内部文档。
- 与 CI 全量策略写进 CONTRIBUTING。
- typescript 版本钉死策略。

### Phase 5（可选）：路线 A 对齐 VS Code、多 project references、L2 闭包

---

## 12. 运维与配置

| 项 | 建议 |
|----|------|
| typescript 版本 | 与仓库 `devDependencies` / CI 一致 |
| 一仓一 daemon | socket 路径含 repo root + ts version |
| 空闲回收 | 例如 30～60 分钟无请求则退出 |
| 配置变更 | 监听 `tsconfig*.json`、锁文件；`reloadProjects` 或重启 |
| 内存 | 大仓常驻可能 GB 级；提供 `--max-old-space-size` 与回收策略 |
| 日志 | daemon 日志 + 可选 `TSS_LOG` |
| 并发 | 默认队列化 check（单 worker）；避免并行多 geterr |

配置文件示例（可选）`.ts-batch-check.json`：

```json
{
  "implementation": "languageService",
  "expandDirectDependents": false,
  "includeSuggestions": false,
  "timeoutMs": 120000,
  "daemonIdleMs": 1800000
}
```

---

## 13. 测试计划

1. **单元**：路径规范化、报告序列化、exit code。  
2. **集成**：真实小 fixture 项目；对比同文件 `tsc` 错误 code。  
3. **正确性用例**：  
   - 仅查 A，B 依赖 A 被破坏 → L0 不报 B，L1 报 B。  
4. **性能**：warm vs cold；记录 p50/p95。  
5. **稳定性**：杀 tsserver 子进程后自动恢复；超时取消。

---

## 14. 风险与缓解

| 风险 | 缓解 |
|------|------|
| 被误当成全量门禁 | 文档 + CI 保留全量 tsc；CLI help 标明范围 |
| 项目未加载完就 geterr | 等待 `projectLoadingFinish` + 超时错误 |
| 路径/大小写不一致 | 统一绝对路径；敏感系统测 CI |
| 多 tsconfig / project references | 按文件归属 project；复杂 monorepo Phase 5 |
| TS 大版本（如 7）API/进程形态变化 | 抽象 `DiagnosticsBackend`；钉版本；跟进官方 LSP/原生 server |
| 嵌入式框架（Vue 等） | 明确非目标；编辑器继续用对应插件 |
| Daemon 安全 | 仅本机 socket，权限 0600，不绑公网 |

---

## 15. 明确不做清单（防范围膨胀）

1. 自研 TypeScript 类型检查器  
2. 完整 tsserver / 完整 LSP 服务器  
3. Fork VS Code `typescript-language-features` 整包  
4. 默认全项目 `geterrForProject`  
5. 第一期支持所有编辑器特性（补全、重构等）  
6. 用「全量 tsc + filter」冒充本方案的性能优化  

---

## 16. 决策记录（建议评审时确认）

| 决策点 | 建议默认 | 备选 |
|--------|----------|------|
| MVP 实现 | 路线 B（进程内 LS） | 直接路线 A |
| 默认正确性档位 | L0 | L1 |
| 持久化形态 | Phase 2 再上 daemon | MVP 即 daemon |
| CI | 保持全量 tsc | 仅 affected（不推荐作唯一门禁） |
| 与 VS Code | 参考 geterr 流程 | 不依赖 VS Code 运行时 |

---

## 17. 参考资料

1. [Using the Language Service API](https://github.com/microsoft/TypeScript-wiki/blob/main/Using-the-Language-Service-API.md)  
2. [Performance.md（open files diagnostics）](https://github.com/microsoft/TypeScript-wiki/blob/main/Performance.md)  
3. [Standalone Server (tsserver)](https://github.com/microsoft/TypeScript/wiki/Standalone-Server-(tsserver))  
4. TypeScript `protocol.d.ts`：`geterr` / `geterrForProject`  
5. VS Code：`bufferSyncSupport.ts` 中 `GetErrRequest`  
6. TypeScript #36664：closed-file / project-wide diagnostics 与单线程限制  
7. `tsc-files` / `typecheck-files`：窄范围检查的正确性讨论（下游漏检）

---

## 18. 下一步行动

1. **评审本文档**：确认路线（B→A）、默认档位（L0/L1）、是否需要 daemon。  
2. **确认后进入实现**：按 Phase 0 → Phase 1 开工（实现前需产品/负责人确认一次即可）。  
3. **并行**：定 typescript 版本策略与 CI 全量门禁文案，避免语义混淆。

---

## 附录 A：与「全量 tsc 再筛选」的对比

| | 全量 tsc + filter | 本方案 |
|--|-------------------|--------|
| 是否加载项目 | 是 | 是（持久化后摊销） |
| 是否检查未请求文件 | 是（贵） | 否（除非 L1/L2/L3） |
| 重复调用 | 每次接近全量成本 | warm 后主要付目标文件语义成本 |
| 正确性口径 | 全项目 | 目标集（可扩展） |

## 附录 B：最小 geterr 时序（路线 A）

```text
Client                         tsserver
  |-- updateOpen(openFiles) -->|
  |<-- ok / projectLoading* ---|
  |-- geterr(files, delay=0) ->|
  |<-- syntaxDiag (file1) -----|
  |<-- semanticDiag (file1) ---|
  |<-- syntaxDiag (file2) -----|
  |<-- semanticDiag (file2) ---|
  |<-- requestCompleted -------|
```

## 附录 C：术语

| 术语 | 含义 |
|------|------|
| tsserver | TypeScript 官方独立语言服务进程及其 JSON 协议 |
| geterr | 对指定文件列表异步请求诊断的命令 |
| Configured Project | 由 tsconfig/jsconfig 定义的项目 |
| L0/L1/L2/L3 | 本方案定义的正确性 / 范围档位 |
| overlay | 用内存内容覆盖磁盘文件再诊断（模拟未保存缓冲） |
