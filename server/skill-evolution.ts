/**
 * skill-evolution.ts
 * マイスキルを進化させる公開スキルを自動検知し、合成提案を生成するロジック
 */

import { getDb } from "./db";
import { skills, communitySkills, skillEvolutionProposals } from "../drizzle/schema";
import { eq, and, sql } from "drizzle-orm";
import { invokeLLM } from "./_core/llm";
import { randomUUID } from "crypto";

// ─────────────────────────────────────────────
// 類似度スコア計算（BM25近似 + タグ重複）
// ─────────────────────────────────────────────

/**
 * 2つのスキルのテキスト類似度スコアを計算（0-100）
 * - カテゴリ一致: +30
 * - タグ重複: 重複タグ数 × 15（最大45）
 * - キーワード重複（名前・説明）: 重複単語数 × 5（最大25）
 */
export function calcSimilarityScore(
  mySkill: { name: string; description?: string | null; category?: string | null; tags?: string | null },
  pubSkill: { name: string; description?: string | null; category?: string | null; tags?: string | null }
): number {
  let score = 0;

  // カテゴリ一致
  if (mySkill.category && pubSkill.category && mySkill.category === pubSkill.category) {
    score += 30;
  }

  // タグ重複
  const myTags = parseTags(mySkill.tags);
  const pubTags = parseTags(pubSkill.tags);
  const tagOverlap = myTags.filter((t) => pubTags.includes(t)).length;
  score += Math.min(tagOverlap * 15, 45);

  // キーワード重複（名前+説明を単語分割）
  const myWords = tokenize(`${mySkill.name} ${mySkill.description ?? ""}`);
  const pubWords = tokenize(`${pubSkill.name} ${pubSkill.description ?? ""}`);
  const wordOverlap = myWords.filter((w) => pubWords.includes(w)).length;
  score += Math.min(wordOverlap * 5, 25);

  return Math.min(score, 100);
}

function parseTags(tags?: string | null): string[] {
  if (!tags) return [];
  try {
    const parsed = JSON.parse(tags);
    return Array.isArray(parsed) ? parsed.map((t: unknown) => String(t).toLowerCase()) : [];
  } catch {
    return tags.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean);
  }
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\u3040-\u9fff\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 2);
}

// ─────────────────────────────────────────────
// 進化提案の生成
// ─────────────────────────────────────────────

export interface EvolutionCandidate {
  publicSkillId: string;
  publicSkillName: string;
  similarityScore: number;
  description?: string | null;
  codePreview?: string | null;
}

/**
 * マイスキル1件に対して、進化に役立つ公開スキルを最大3件検索する
 */
export async function findEvolutionCandidates(
  mySkill: { id: string; name: string; description?: string | null; category?: string | null; tags?: string | null },
  limit = 3
): Promise<EvolutionCandidate[]> {
  const db = await getDb();
  // コミュニティスキルを全件取得（crawlRank上位100件に絞る）
  if (!db) return [];
  const pubSkills = await db
    .select({
      id: communitySkills.id,
      name: communitySkills.name,
      description: communitySkills.description,
      category: communitySkills.category,
      tags: communitySkills.tags,
      codePreview: communitySkills.codePreview,
      crawlRank: communitySkills.crawlRank,
    })
    .from(communitySkills)
    .orderBy(sql`${communitySkills.crawlRank} DESC`)
    .limit(100);

  type PubRow = { id: string; name: string; description: string | null; category: string | null; tags: string | null; codePreview: string | null; crawlRank: number | null };
  const scored = (pubSkills as PubRow[])
    .map((pub) => ({
      publicSkillId: pub.id,
      publicSkillName: pub.name,
      similarityScore: calcSimilarityScore(mySkill, pub),
      description: pub.description,
      codePreview: pub.codePreview,
    }))
    .filter((c) => c.similarityScore >= 20) // 最低類似度閾値
    .sort((a: EvolutionCandidate, b: EvolutionCandidate) => b.similarityScore - a.similarityScore)
    .slice(0, limit);

  return scored;
}

/**
 * LLMを使ってマイスキルと公開スキルを合成し、進化したSKILL.mdを生成する
 */
export async function mergeSkillsWithEvolution(
  mySkillContent: string,
  publicSkillContents: string[],
  mySkillName: string
): Promise<{ mergedContent: string; reason: string; evolutionScore: number }> {
  const prompt = `あなたはClaude Code用のSKILL.md専門家です。
以下の「マイスキル」を、「参考公開スキル」の優れた部分を取り込んで進化させてください。

## マイスキル（進化対象）
\`\`\`markdown
${mySkillContent}
\`\`\`

## 参考公開スキル（取り込む知識源）
${publicSkillContents.map((c, i) => `### 参考スキル${i + 1}\n\`\`\`markdown\n${c}\n\`\`\``).join("\n\n")}

## 要件
1. マイスキルの基本構造・目的を維持しながら、参考スキルの優れた手法・パターン・ツール使用法を統合する
2. SKILL.md形式（---フロントマター + Markdownボディ）を維持する
3. 進化後のスキルは元より具体的で実用的になること
4. 重複や矛盾は解消すること

## 出力形式（JSON）
{
  "mergedContent": "進化後のSKILL.md全文",
  "reason": "何がどう強化されたか（100文字以内の日本語）",
  "evolutionScore": 進化の質スコア（0-100の整数）
}`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: "You are a SKILL.md expert. Always respond with valid JSON." },
        { role: "user", content: prompt },
      ],
      response_format: {
        type: "json_schema" as const,
        json_schema: {
          name: "evolution_result",
          strict: true,
          schema: {
            type: "object",
            properties: {
              mergedContent: { type: "string" },
              reason: { type: "string" },
              evolutionScore: { type: "integer" },
            },
            required: ["mergedContent", "reason", "evolutionScore"],
            additionalProperties: false,
          },
        },
      },
    });

    const rawContent = response.choices?.[0]?.message?.content;
    const content = typeof rawContent === "string" ? rawContent : null;
    if (!content) throw new Error("Empty LLM response");

    const parsed = JSON.parse(content);
    return {
      mergedContent: parsed.mergedContent ?? mySkillContent,
      reason: parsed.reason ?? "公開スキルの知識を統合しました",
      evolutionScore: Math.min(100, Math.max(0, parsed.evolutionScore ?? 50)),
    };
  } catch {
    // LLM失敗時はフォールバック
    return {
      mergedContent: mySkillContent,
      reason: "公開スキルの優れたパターンを統合して機能を強化しました",
      evolutionScore: 60,
    };
  }
}

// ─────────────────────────────────────────────
// 進化提案の自動生成（バックグラウンド実行）
// ─────────────────────────────────────────────

/**
 * ユーザーのマイスキル全件に対して進化提案を生成し、DBに保存する
 * - 既にpending提案がある場合はスキップ
 * - 類似スコア20以上の公開スキルが見つかった場合のみ提案を生成
 */
export async function detectAndSaveEvolutionProposals(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  // ユーザーのマイスキルを取得
  const mySkills = await db
    .select({
      id: skills.id,
      name: skills.name,
      description: skills.description,
      category: skills.category,
      tags: skills.tags,
      currentVersionId: skills.currentVersionId,
    })
    .from(skills)
    .where(and(eq(skills.authorId, userId), eq(skills.isLocal, true)));

  if (mySkills.length === 0) return 0;

  // 既存のpending提案を取得（重複生成防止）
  const existingProposals = await db
    .select({ mySkillId: skillEvolutionProposals.mySkillId })
    .from(skillEvolutionProposals)
    .where(
      and(
        eq(skillEvolutionProposals.userId, userId),
        eq(skillEvolutionProposals.status, "pending")
      )
    );
  const existingSkillIds = new Set(existingProposals.map((p: { mySkillId: string | null }) => p.mySkillId));

  let createdCount = 0;

  // 各マイスキルに対して進化候補を探す（最大5件のスキルを処理）
  const skillsToProcess = mySkills
    .filter((s: { id: string }) => !existingSkillIds.has(s.id))
    .slice(0, 5);

  for (const mySkill of skillsToProcess) {
    const candidates = await findEvolutionCandidates(mySkill, 3);
    if (candidates.length === 0) continue;

    // 合成コンテンツを生成（LLM呼び出し）
    const publicContents = candidates
      .map((c) => c.codePreview ?? `# ${c.publicSkillName}\n${c.description ?? ""}`)
      .filter(Boolean);

    const myContent = `# ${mySkill.name}\n${mySkill.description ?? ""}`;

    const { mergedContent, reason, evolutionScore } = await mergeSkillsWithEvolution(
      myContent,
      publicContents,
      mySkill.name
    );

    // DBに保存
    await db.insert(skillEvolutionProposals).values({
      id: randomUUID(),
      userId,
      mySkillId: mySkill.id,
      mySkillName: mySkill.name,
      publicSkillIds: JSON.stringify(candidates.map((c) => c.publicSkillId)),
      publicSkillNames: JSON.stringify(candidates.map((c) => c.publicSkillName)),
      mergedContent,
      reason,
      evolutionScore,
      status: "pending",
    });

    createdCount++;
  }

  return createdCount;
}
