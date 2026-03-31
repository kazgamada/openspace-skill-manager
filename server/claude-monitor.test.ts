/**
 * Claude Code Monitor テスト
 * detectPatterns / generateSkillSuggestions のユニットテスト
 */
import { describe, it, expect, vi } from "vitest";
import { detectPatterns, type ActivityEntry } from "./claude-monitor";

// ─── detectPatterns テスト ─────────────────────────────────────────────────

describe("detectPatterns", () => {
  it("空のアクティビティリストで空のパターンを返す", () => {
    const result = detectPatterns([]);
    expect(result.tools).toEqual([]);
    expect(result.errorPatterns).toEqual([]);
    expect(result.taskTypes).toEqual([]);
    expect(result.languages).toEqual([]);
    expect(result.missingCapabilities).toEqual([]);
  });

  it("ツール使用頻度を正しくカウントする", () => {
    const activities: ActivityEntry[] = [
      { tool: "Bash", timestamp: Date.now() },
      { tool: "Bash", timestamp: Date.now() },
      { tool: "Read", timestamp: Date.now() },
      { tool: "Bash", timestamp: Date.now() },
    ];
    const result = detectPatterns(activities);
    expect(result.tools[0]).toBe("Bash");
    expect(result.tools).toContain("Read");
  });

  it("エラーアクティビティを検出する", () => {
    const activities: ActivityEntry[] = [
      { tool: "Bash", timestamp: Date.now(), isError: true, output: "TypeError: Cannot read property 'x' of undefined" },
      { tool: "Bash", timestamp: Date.now(), isError: true, output: "SyntaxError: Unexpected token" },
      { tool: "Bash", timestamp: Date.now(), isError: true, output: "ReferenceError: foo is not defined" },
    ];
    const result = detectPatterns(activities);
    expect(result.errorPatterns.length).toBe(3);
    expect(result.missingCapabilities).toContain("エラーハンドリング");
  });

  it("TypeScript/Reactを言語として検出する", () => {
    const activities: ActivityEntry[] = [
      { tool: "Read", timestamp: Date.now(), input: "src/App.tsx", output: "import React from 'react'" },
    ];
    const result = detectPatterns(activities);
    expect(result.languages).toContain("TypeScript/React");
  });

  it("Pythonを言語として検出する", () => {
    const activities: ActivityEntry[] = [
      { tool: "Bash", timestamp: Date.now(), input: "python3 main.py" },
    ];
    const result = detectPatterns(activities);
    expect(result.languages).toContain("Python");
  });

  it("テスト作成タスクタイプを検出する", () => {
    const activities: ActivityEntry[] = [
      { tool: "Bash", timestamp: Date.now(), input: "npx vitest run", output: "PASS 5 tests" },
    ];
    const result = detectPatterns(activities);
    expect(result.taskTypes).toContain("テスト作成");
  });

  it("デバッグタスクタイプを検出する", () => {
    const activities: ActivityEntry[] = [
      { tool: "Bash", timestamp: Date.now(), input: "fix bug in auth module", output: "error: null pointer exception" },
    ];
    const result = detectPatterns(activities);
    expect(result.taskTypes).toContain("デバッグ");
  });

  it("API開発タスクタイプを検出する", () => {
    const activities: ActivityEntry[] = [
      { tool: "Write", timestamp: Date.now(), input: "server/api/endpoint.ts", output: "route handler created" },
    ];
    const result = detectPatterns(activities);
    expect(result.taskTypes).toContain("API開発");
  });

  it("Git操作を言語として検出する", () => {
    const activities: ActivityEntry[] = [
      { tool: "Bash", timestamp: Date.now(), input: "git commit -m 'feat: add feature'" },
    ];
    const result = detectPatterns(activities);
    expect(result.languages).toContain("Git");
  });

  it("重複エラーパターンを除外する", () => {
    const sameError = "TypeError: Cannot read property";
    const activities: ActivityEntry[] = [
      { tool: "Bash", timestamp: Date.now(), isError: true, output: sameError },
      { tool: "Bash", timestamp: Date.now(), isError: true, output: sameError },
    ];
    const result = detectPatterns(activities);
    // 同じエラーは1件のみ
    expect(result.errorPatterns.length).toBe(1);
  });

  it("上位10ツールのみを返す", () => {
    const tools = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];
    const activities: ActivityEntry[] = tools.map((t) => ({ tool: t, timestamp: Date.now() }));
    const result = detectPatterns(activities);
    expect(result.tools.length).toBeLessThanOrEqual(10);
  });

  it("Docker使用を言語として検出する", () => {
    const activities: ActivityEntry[] = [
      { tool: "Bash", timestamp: Date.now(), input: "docker compose up -d" },
    ];
    const result = detectPatterns(activities);
    expect(result.languages).toContain("Docker");
  });

  it("Database/SQLを言語として検出する", () => {
    const activities: ActivityEntry[] = [
      { tool: "Bash", timestamp: Date.now(), input: "pnpm db:push", output: "drizzle migration applied" },
    ];
    const result = detectPatterns(activities);
    expect(result.languages).toContain("Database/SQL");
  });

  it("Bash多用かつテストなしで自動テスト不足を検出する", () => {
    const activities: ActivityEntry[] = Array.from({ length: 6 }, () => ({
      tool: "Bash",
      timestamp: Date.now(),
      input: "npm run build",
    }));
    const result = detectPatterns(activities);
    expect(result.missingCapabilities).toContain("自動テスト");
  });
});
