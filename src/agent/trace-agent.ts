import { Agent } from "agents";
import { type Comparison, compareRuns } from "./compare";
import { estimateNeurons, neuronsToUsd } from "./cost";
import { runDetectors } from "./detectors";
import { buildExplainMessages, buildTraceDigest, DEFAULT_QUESTION } from "./explain";
import demoRuns from "./fixtures/demo-runs.json";
import { type AiClient, type ChatMessageIn, executeAgentRun, parseModelReply } from "./runner";
import { getScenario, modelParams } from "./scenarios";
import { SCHEMA_STATEMENTS } from "./schema";
import {
  type ChatMessage,
  type FaultId,
  type Finding,
  fail,
  type NewFinding,
  type NewSpan,
  ok,
  type Result,
  type Run,
  type RunDetail,
  type RunStatus,
  type RunSummary,
  type Span,
  type StartRunInput,
} from "./types";

export type TraceAgentState = {
  active: { runId: string; step: number; status: "running" | "done" } | null;
  updatedAt: number;
};

/** Runs stuck in "running" longer than this are treated as crashed. */
const STALE_RUN_MS = 10 * 60 * 1000;

type Row = Record<string, SqlStorageValue>;

interface DemoFixture {
  run: Run;
  spans: Span[];
  findings: Finding[];
}

const toRun = (r: Row): Run => ({
  id: String(r.id),
  scenario: r.scenario as Run["scenario"],
  goal: String(r.goal),
  faults: JSON.parse(String(r.faults ?? "[]")) as FaultId[],
  model: String(r.model),
  status: r.status as RunStatus,
  final_answer: (r.final_answer as string | null) ?? null,
  error: (r.error as string | null) ?? null,
  steps: Number(r.steps),
  prompt_tokens: Number(r.prompt_tokens),
  completion_tokens: Number(r.completion_tokens),
  neurons: Number(r.neurons),
  cost_usd: Number(r.cost_usd),
  started_at: Number(r.started_at),
  ended_at: r.ended_at == null ? null : Number(r.ended_at),
  is_demo: Number(r.is_demo) === 1,
});

const toSummary = (r: Row): RunSummary => {
  const run = toRun(r);
  return {
    ...run,
    duration_ms: run.ended_at == null ? null : run.ended_at - run.started_at,
    findings_count: Number(r.findings_count ?? 0),
    crit_count: Number(r.crit_count ?? 0),
  };
};

const toSpan = (r: Row): Span => ({
  id: String(r.id),
  run_id: String(r.run_id),
  seq: Number(r.seq),
  step: Number(r.step),
  kind: r.kind as Span["kind"],
  name: String(r.name),
  status: r.status as Span["status"],
  input: (r.input as string | null) ?? null,
  output: (r.output as string | null) ?? null,
  error: (r.error as string | null) ?? null,
  prompt_tokens: r.prompt_tokens == null ? null : Number(r.prompt_tokens),
  completion_tokens: r.completion_tokens == null ? null : Number(r.completion_tokens),
  neurons: r.neurons == null ? null : Number(r.neurons),
  started_at: Number(r.started_at),
  ended_at: Number(r.ended_at),
  latency_ms: Number(r.latency_ms),
  gateway_log_id: (r.gateway_log_id as string | null) ?? null,
});

const toFinding = (r: Row): Finding => ({
  id: String(r.id),
  run_id: String(r.run_id),
  detector: String(r.detector),
  severity: r.severity as Finding["severity"],
  span_seq: r.span_seq == null ? null : Number(r.span_seq),
  message: String(r.message),
  evidence: (r.evidence as string | null) ?? null,
});

const toChat = (r: Row): ChatMessage => ({
  id: String(r.id),
  run_id: String(r.run_id),
  role: r.role as ChatMessage["role"],
  content: String(r.content),
  prompt_tokens: r.prompt_tokens == null ? null : Number(r.prompt_tokens),
  completion_tokens: r.completion_tokens == null ? null : Number(r.completion_tokens),
  neurons: r.neurons == null ? null : Number(r.neurons),
  created_at: Number(r.created_at),
});

const SUMMARY_SELECT = `
  SELECT r.*,
    (SELECT COUNT(*) FROM findings f WHERE f.run_id = r.id) AS findings_count,
    (SELECT COUNT(*) FROM findings f WHERE f.run_id = r.id AND f.severity = 'crit') AS crit_count
  FROM runs r`;

const startOfUtcDay = (ms: number) => {
  const d = new Date(ms);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
};

/**
 * TraceAgent — one Durable Object instance ("default") that runs the sample agent,
 * records every LLM and tool step in SQLite, detects failures and answers Ask-AI questions.
 */
export class TraceAgent extends Agent<Env, TraceAgentState> {
  initialState: TraceAgentState = { active: null, updatedAt: 0 };

  async onStart() {
    for (const statement of SCHEMA_STATEMENTS) this.ctx.storage.sql.exec(statement);
    this.seedDemoRuns();
  }

  // ─── SQL helpers ────────────────────────────────────────────────────────────
  private rows(query: string, ...params: SqlStorageValue[]): Row[] {
    return this.ctx.storage.sql.exec(query, ...params).toArray() as Row[];
  }

  private exec(query: string, ...params: SqlStorageValue[]) {
    this.ctx.storage.sql.exec(query, ...params);
  }

  private insertRun(run: Run) {
    this.exec(
      `INSERT INTO runs (id, scenario, goal, faults, model, status, final_answer, error, steps, prompt_tokens,
         completion_tokens, neurons, cost_usd, started_at, ended_at, is_demo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      run.id,
      run.scenario,
      run.goal,
      JSON.stringify(run.faults),
      run.model,
      run.status,
      run.final_answer,
      run.error,
      run.steps,
      run.prompt_tokens,
      run.completion_tokens,
      run.neurons,
      run.cost_usd,
      run.started_at,
      run.ended_at,
      run.is_demo ? 1 : 0,
    );
  }

  private insertSpan(span: Span) {
    this.exec(
      `INSERT INTO spans (id, run_id, seq, step, kind, name, status, input, output, error, prompt_tokens,
         completion_tokens, neurons, started_at, ended_at, latency_ms, gateway_log_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      span.id,
      span.run_id,
      span.seq,
      span.step,
      span.kind,
      span.name,
      span.status,
      span.input,
      span.output,
      span.error,
      span.prompt_tokens,
      span.completion_tokens,
      span.neurons,
      span.started_at,
      span.ended_at,
      span.latency_ms,
      span.gateway_log_id,
    );
  }

  private insertFinding(f: Finding) {
    this.exec(
      `INSERT INTO findings (id, run_id, detector, severity, span_seq, message, evidence) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      f.id,
      f.run_id,
      f.detector,
      f.severity,
      f.span_seq,
      f.message,
      f.evidence,
    );
  }

  private insertChat(m: ChatMessage) {
    this.exec(
      `INSERT INTO chat_messages (id, run_id, role, content, prompt_tokens, completion_tokens, neurons, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      m.id,
      m.run_id,
      m.role,
      m.content,
      m.prompt_tokens,
      m.completion_tokens,
      m.neurons,
      m.created_at,
    );
  }

  /** Inserts pre-recorded demo runs once, when the store is empty and SEED_DEMO is "true". */
  private seedDemoRuns() {
    if (this.env.SEED_DEMO !== "true") return;
    const fixtures = demoRuns as unknown as DemoFixture[];
    if (!fixtures.length) return;
    const [{ n }] = this.rows("SELECT COUNT(*) AS n FROM runs");
    if (Number(n) > 0) return;
    this.ctx.storage.transactionSync(() => {
      for (const fx of fixtures) {
        this.insertRun({ ...fx.run, is_demo: true });
        for (const s of fx.spans) this.insertSpan(s);
        for (const f of fx.findings) this.insertFinding(f);
      }
    });
  }

  private aiClient(runId: string): AiClient {
    return {
      chat: async ({ model, messages, tools, maxTokens, step }) => {
        const input: Record<string, unknown> = {
          messages,
          max_tokens: maxTokens,
          temperature: 0.2,
          ...modelParams(model),
        };
        if (tools?.length) input.tools = tools;
        const raw = await this.env.AI.run(model as keyof AiModels, input as never, {
          gateway: { id: this.env.AI_GATEWAY_ID, metadata: { runId, step } },
        });
        return { raw, gatewayLogId: this.env.AI.aiGatewayLogId ?? null };
      },
    };
  }

  private loadDetail(id: string): RunDetail | null {
    const [row] = this.rows(`${SUMMARY_SELECT} WHERE r.id = ?`, id);
    if (!row) return null;
    return {
      run: toSummary(row),
      spans: this.rows("SELECT * FROM spans WHERE run_id = ? ORDER BY seq", id).map(toSpan),
      findings: this.rows(
        "SELECT * FROM findings WHERE run_id = ? ORDER BY CASE severity WHEN 'crit' THEN 0 WHEN 'warn' THEN 1 ELSE 2 END, span_seq",
        id,
      ).map(toFinding),
      chat: this.rows("SELECT * FROM chat_messages WHERE run_id = ? ORDER BY created_at", id).map(toChat),
    };
  }

  /** Marks crashed runs (stuck in "running") as failed so they stop blocking new runs. */
  private expireStaleRuns(now: number) {
    this.exec(
      `UPDATE runs SET status = 'failed', error = 'Run did not finish (worker restarted or timed out)', ended_at = ?
       WHERE status = 'running' AND started_at < ?`,
      now,
      now - STALE_RUN_MS,
    );
  }

  // ─── RPC methods (called by Next.js route handlers) ─────────────────────────
  async listRuns(options: { limit?: number; status?: RunStatus } = {}): Promise<Result<{ runs: RunSummary[] }>> {
    this.expireStaleRuns(Date.now());
    const limit = Math.min(Math.max(options.limit ?? 50, 1), 200);
    const rows = options.status
      ? this.rows(`${SUMMARY_SELECT} WHERE r.status = ? ORDER BY r.started_at DESC LIMIT ?`, options.status, limit)
      : this.rows(`${SUMMARY_SELECT} ORDER BY r.started_at DESC LIMIT ?`, limit);
    return ok({ runs: rows.map(toSummary) });
  }

  async getRun(id: string): Promise<Result<RunDetail>> {
    this.expireStaleRuns(Date.now());
    const detail = this.loadDetail(id);
    return detail ? ok(detail) : fail(404, `Run ${id} not found`);
  }

  async startRun(input: StartRunInput): Promise<Result<{ runId: string; status: "running" }>> {
    const now = Date.now();
    this.expireStaleRuns(now);
    const scenario = getScenario(input.scenarioId);
    if (!scenario) return fail(400, `Unknown scenario ${input.scenarioId}`);

    const [{ running }] = this.rows("SELECT COUNT(*) AS running FROM runs WHERE status = 'running'");
    if (Number(running) > 0) return fail(429, "Another run is still running. Wait for it to finish.");

    const cap = Number(this.env.MAX_RUNS_PER_DAY) || 30;
    const [{ today }] = this.rows(
      "SELECT COUNT(*) AS today FROM runs WHERE is_demo = 0 AND started_at >= ?",
      startOfUtcDay(now),
    );
    if (Number(today) >= cap) return fail(429, `Daily run cap reached (${cap} runs per day). It resets at 00:00 UTC.`);

    const runId = crypto.randomUUID();
    this.insertRun({
      id: runId,
      scenario: scenario.id,
      goal: input.goal?.trim() || scenario.goal,
      faults: input.faults,
      model: input.model,
      status: "running",
      final_answer: null,
      error: null,
      steps: 0,
      prompt_tokens: 0,
      completion_tokens: 0,
      neurons: 0,
      cost_usd: 0,
      started_at: now,
      ended_at: null,
      is_demo: false,
    });
    this.setState({ active: { runId, step: 0, status: "running" }, updatedAt: now });
    await this.schedule(0, "executeRun", { runId });
    return ok({ runId, status: "running" });
  }

  /** Scheduled callback: runs the agent loop for one run and finalises it. */
  async executeRun(payload: { runId: string }) {
    const [row] = this.rows("SELECT * FROM runs WHERE id = ?", payload.runId);
    if (!row) return;
    const run = toRun(row);
    if (run.status !== "running") return;

    let seq = 0;
    const result = await executeAgentRun(
      { model: run.model, goal: run.goal, scenario: run.scenario, faults: run.faults, startedAt: run.started_at },
      {
        ai: this.aiClient(run.id),
        now: () => Date.now(),
        maxSteps: Number(this.env.MAX_STEPS) || 8,
        recordSpan: (span: NewSpan) => {
          seq += 1;
          this.insertSpan({ ...span, id: crypto.randomUUID(), run_id: run.id, seq });
        },
        onProgress: (step) => {
          this.exec("UPDATE runs SET steps = ? WHERE id = ?", step, run.id);
          this.setState({ active: { runId: run.id, step, status: "running" }, updatedAt: Date.now() });
        },
      },
    ).catch((error: unknown) => ({
      status: "failed" as const,
      finalAnswer: null,
      error: `Runner crashed: ${error instanceof Error ? error.message : String(error)}`,
      steps: 0,
    }));

    this.finishRun(run, result);
  }

  private finishRun(
    run: Run,
    result: { status: Exclude<RunStatus, "running">; finalAnswer: string | null; error: string | null; steps: number },
  ) {
    const spans = this.rows("SELECT * FROM spans WHERE run_id = ? ORDER BY seq", run.id).map(toSpan);
    let promptTokens = 0;
    let completionTokens = 0;
    let neurons = 0;
    for (const s of spans.filter((x) => x.kind === "llm")) {
      promptTokens += s.prompt_tokens ?? 0;
      completionTokens += s.completion_tokens ?? 0;
      neurons += estimateNeurons(run.model, s.prompt_tokens ?? 0, s.completion_tokens ?? 0, s.neurons);
    }
    const endedAt = Date.now();
    const findings: NewFinding[] = runDetectors(
      { status: result.status, final_answer: result.finalAnswer, started_at: run.started_at },
      spans,
      getScenario(run.scenario),
    );
    const steps = Math.max(result.steps, ...spans.map((s) => s.step), 0);

    this.ctx.storage.transactionSync(() => {
      this.exec("DELETE FROM findings WHERE run_id = ?", run.id);
      for (const f of findings) this.insertFinding({ ...f, id: crypto.randomUUID(), run_id: run.id });
      this.exec(
        `UPDATE runs SET status = ?, final_answer = ?, error = ?, steps = ?, prompt_tokens = ?, completion_tokens = ?,
           neurons = ?, cost_usd = ?, ended_at = ? WHERE id = ?`,
        result.status,
        result.finalAnswer,
        result.error,
        steps,
        promptTokens,
        completionTokens,
        neurons,
        neuronsToUsd(neurons),
        endedAt,
        run.id,
      );
    });
    this.setState({ active: { runId: run.id, step: steps, status: "done" }, updatedAt: endedAt });
  }

  async explain(
    runId: string,
    message: string,
    model?: string,
  ): Promise<Result<{ answer: string; chat: ChatMessage[] }>> {
    const detail = this.loadDetail(runId);
    if (!detail) return fail(404, `Run ${runId} not found`);
    if (detail.run.status === "running") return fail(409, "The run is still running. Ask again when it finishes.");

    const question = message.trim() || DEFAULT_QUESTION;
    const useModel = model || detail.run.model;
    const messages: ChatMessageIn[] = buildExplainMessages(
      buildTraceDigest(detail.run, detail.spans, detail.findings),
      detail.chat,
      question,
    );

    let raw: unknown;
    try {
      raw = await this.env.AI.run(
        useModel as keyof AiModels,
        { messages, max_tokens: 700, temperature: 0.2, ...modelParams(useModel) } as never,
        { gateway: { id: this.env.AI_GATEWAY_ID, metadata: { runId, purpose: "explain" } } },
      );
    } catch (error) {
      const text = error instanceof Error ? error.message : String(error);
      const quota = /4006|daily free allocation|neurons/i.test(text);
      return fail(quota ? 429 : 502, quota ? `Workers AI daily quota reached: ${text}` : `Model call failed: ${text}`);
    }

    const reply = parseModelReply(raw, 0);
    if (!reply.text) return fail(502, "The model returned an empty answer. Try again or switch models.");
    const answer = reply.text;
    const now = Date.now();
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      run_id: runId,
      role: "user",
      content: question,
      prompt_tokens: null,
      completion_tokens: null,
      neurons: null,
      created_at: now,
    };
    const botMsg: ChatMessage = {
      id: crypto.randomUUID(),
      run_id: runId,
      role: "assistant",
      content: answer,
      prompt_tokens: reply.promptTokens,
      completion_tokens: reply.completionTokens,
      neurons: estimateNeurons(useModel, reply.promptTokens, reply.completionTokens, reply.neurons),
      created_at: now + 1,
    };
    this.ctx.storage.transactionSync(() => {
      this.insertChat(userMsg);
      this.insertChat(botMsg);
    });
    return ok({
      answer,
      chat: this.rows("SELECT * FROM chat_messages WHERE run_id = ? ORDER BY created_at", runId).map(toChat),
    });
  }

  async compare(a: string, b: string): Promise<Result<Comparison>> {
    if (a === b) return fail(400, "Pick two different runs to compare");
    const da = this.loadDetail(a);
    const db = this.loadDetail(b);
    if (!da || !db) return fail(404, `Run ${!da ? a : b} not found`);
    return ok(compareRuns(da, db));
  }

  async deleteRun(id: string): Promise<Result<{ deleted: true }>> {
    const [row] = this.rows("SELECT status FROM runs WHERE id = ?", id);
    if (!row) return fail(404, `Run ${id} not found`);
    if (row.status === "running") return fail(409, "The run is still running");
    this.ctx.storage.transactionSync(() => {
      this.exec("DELETE FROM chat_messages WHERE run_id = ?", id);
      this.exec("DELETE FROM findings WHERE run_id = ?", id);
      this.exec("DELETE FROM spans WHERE run_id = ?", id);
      this.exec("DELETE FROM runs WHERE id = ?", id);
    });
    return ok({ deleted: true });
  }
}
