/**
 * Claude Code Monitor
 * Claude Codeの作業ログを解析し、不足スキルを検出・提案する
 */

import { nanoid } from "nanoid";
import { invokeLLM } from "./_core/llm";

// ────────────────────────────────────────────
// 型定義
// ────────────────────────────────────────────

export interface ActivityEntry {
  tool: string;
  input?: string;
  output?: string;
  timestamp: number;
  isError?: boolean;
}

export interface DetectedPatterns {
  tools: string[];           // 使用頻度の高いツール
  errorPatterns: string[];   // 繰り返し発生しているエラー
  taskTypes: string[];       // 作業タイプ（コーディング・デバッグ・リサーチ等）
  languages: string[];       // 使用言語・フレームワーク
  missingCapabilities: string[]; // 不足している能力
}

export interface SkillSuggestionResult {
  skillName: string;
  skillDescription: string;
  reason: string;
  confidence: number;
  source: "community" | "github_crawl";
  matchedSkillId?: string;
}

// ────────────────────────────────────────────
// パターン検出ロジック
// ────────────────────────────────────────────

/**
 * アクティビティログからパターンを検出する
 */
export function detectPatterns(activities: ActivityEntry[]): DetectedPatterns {
  const toolCounts: Record<string, number> = {};
  const errors: string[] = [];
  const languages = new Set<string>();
  const taskTypes = new Set<string>();

  for (const act of activities) {
    // ツール使用頻度カウント
    toolCounts[act.tool] = (toolCounts[act.tool] ?? 0) + 1;

    // エラー検出
    if (act.isError && act.output) {
      const shortErr = act.output.slice(0, 120);
      if (!errors.includes(shortErr)) errors.push(shortErr);
    }

    // 言語・フレームワーク検出
    const inputText = (act.input ?? "") + (act.output ?? "");
    if (/\.tsx?|typescript|react/i.test(inputText)) languages.add("TypeScript/React");
    if (/\.py|python/i.test(inputText)) languages.add("Python");
    if (/\.go\b|golang/i.test(inputText)) languages.add("Go");
    if (/\.rs\b|rust/i.test(inputText)) languages.add("Rust");
    if (/docker|compose/i.test(inputText)) languages.add("Docker");
    if (/sql|database|drizzle|prisma/i.test(inputText)) languages.add("Database/SQL");
    if (/git\s|github/i.test(inputText)) languages.add("Git");

    // タスクタイプ検出
    if (/test|spec|vitest|jest/i.test(inputText)) taskTypes.add("テスト作成");
    if (/fix|bug|error|exception/i.test(inputText)) taskTypes.add("デバッグ");
    if (/refactor|clean|optimize/i.test(inputText)) taskTypes.add("リファクタリング");
    if (/deploy|ci|cd|pipeline/i.test(inputText)) taskTypes.add("デプロイ/CI");
    if (/document|readme|comment/i.test(inputText)) taskTypes.add("ドキュメント作成");
    if (/api|endpoint|route/i.test(inputText)) taskTypes.add("API開発");
  }

  // 使用頻度上位ツール
  const topTools = Object.entries(toolCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([tool]) => tool);

  // 不足能力の推定
  const missingCapabilities: string[] = [];
  if (errors.length >= 3) missingCapabilities.push("エラーハンドリング");
  if (toolCounts["Bash"] >= 5 && !taskTypes.has("テスト作成")) missingCapabilities.push("自動テスト");
  if (taskTypes.has("デプロイ/CI") && !languages.has("Docker")) missingCapabilities.push("Dockerコンテナ化");

  return {
    tools: topTools,
    errorPatterns: errors.slice(0, 5),
    taskTypes: Array.from(taskTypes),
    languages: Array.from(languages),
    missingCapabilities,
  };
}

// ────────────────────────────────────────────
// LLMによるスキル提案
// ────────────────────────────────────────────

/**
 * パターンとコミュニティスキル一覧からLLMでスキル提案を生成する
 */
export async function generateSkillSuggestions(
  patterns: DetectedPatterns,
  availableSkills: Array<{ id: string; name: string; description: string | null; tags: string | null }>,
  maxSuggestions = 5
): Promise<SkillSuggestionResult[]> {
  if (availableSkills.length === 0 && patterns.tools.length === 0) {
    return [];
  }

  const skillList = availableSkills
    .slice(0, 50)
    .map((s) => `- ID:${s.id} | ${s.name}: ${(s.description ?? "").slice(0, 80)}`)
    .join("\n");

  const prompt = `あなたはClaude Codeのスキル管理アシスタントです。
ユーザーの作業パターンを分析し、最も有益なスキルを提案してください。

## ユーザーの作業パターン
- 使用ツール: ${patterns.tools.join(", ") || "なし"}
- 作業タイプ: ${patterns.taskTypes.join(", ") || "不明"}
- 使用言語/技術: ${patterns.languages.join(", ") || "不明"}
- 頻出エラー: ${patterns.errorPatterns.slice(0, 3).join(" | ") || "なし"}
- 不足能力: ${patterns.missingCapabilities.join(", ") || "なし"}

## 利用可能なスキル一覧
${skillList || "（スキルなし）"}

## 指示
上記のパターンに基づき、最大${maxSuggestions}件のスキルを提案してください。
スキル一覧にある場合はそのIDを使用し、ない場合はnullにしてください。
各提案に具体的な理由（なぜこのスキルが役立つか）を日本語で記述してください。`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: "あなたはClaude Codeのスキル推薦エンジンです。JSON形式で回答してください。" },
        { role: "user", content: prompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "skill_suggestions",
          strict: true,
          schema: {
            type: "object",
            properties: {
              suggestions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    skillName: { type: "string" },
                    skillDescription: { type: "string" },
                    reason: { type: "string" },
                    confidence: { type: "number" },
                    matchedSkillId: { type: ["string", "null"] },
                  },
                  required: ["skillName", "skillDescription", "reason", "confidence", "matchedSkillId"],
                  additionalProperties: false,
                },
              },
            },
            required: ["suggestions"],
            additionalProperties: false,
          },
        },
      },
    });

    const rawContent = response.choices?.[0]?.message?.content;
    const content = typeof rawContent === 'string' ? rawContent : null;
    if (!content) return [];

    const parsed = JSON.parse(content) as {
      suggestions: Array<{
        skillName: string;
        skillDescription: string;
        reason: string;
        confidence: number;
        matchedSkillId: string | null;
      }>;
    };

    return parsed.suggestions.map((s) => ({
      skillName: s.skillName,
      skillDescription: s.skillDescription,
      reason: s.reason,
      confidence: Math.min(100, Math.max(0, Math.round(s.confidence))),
      source: s.matchedSkillId ? ("community" as const) : ("github_crawl" as const),
      matchedSkillId: s.matchedSkillId ?? undefined,
    }));
  } catch (e) {
    console.error("[claude-monitor] LLM suggestion failed:", e);
    return [];
  }
}

// ────────────────────────────────────────────
// セッションID生成
// ────────────────────────────────────────────
export function generateSessionId(): string {
  return `session_${nanoid(16)}`;
}

export function generateSuggestionId(): string {
  return `sug_${nanoid(16)}`;
}
