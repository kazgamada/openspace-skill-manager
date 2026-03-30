/**
 * github-sync.ts
 * GitHub リポジトリからスキル（SKILL.md）を動的に取得・差分同期するモジュール。
 *
 * 仕組み:
 *  1. GitHub Contents API でスキルディレクトリ一覧を取得
 *  2. 各サブディレクトリの SKILL.md を取得（blob SHA で変更検知）
 *  3. SHA が変わっていれば community_skills を upsert
 *  4. skill_sources の統計・ステータスを更新
 */

import { getDb } from "./db";
import { skillSources, communitySkills } from "../drizzle/schema";
import { eq } from "drizzle-orm";

// ─── 型定義 ──────────────────────────────────────────────────────────────────

interface GitHubTreeItem {
  path: string;
  type: "blob" | "tree";
  sha: string;
  url: string;
}

interface GitHubContentsItem {
  name: string;
  path: string;
  sha: string;
  type: "file" | "dir";
  download_url: string | null;
}

interface ParsedSkillMeta {
  name: string;
  description: string;
  tags: string[];
  category: string;
}

// ─── SKILL.md フロントマター解析 ─────────────────────────────────────────────

function parseSkillMd(content: string, fallbackName: string): ParsedSkillMeta {
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  let name = fallbackName;
  let description = "";
  let tags: string[] = [];
  let category = "general";

  if (frontmatterMatch) {
    const fm = frontmatterMatch[1];
    const nameMatch = fm.match(/^name:\s*(.+)$/m);
    const descMatch = fm.match(/^description:\s*(.+)$/m);
    const tagsMatch = fm.match(/^tags:\s*\[(.+)\]$/m);
    const categoryMatch = fm.match(/^category:\s*(.+)$/m);

    if (nameMatch) name = nameMatch[1].trim();
    if (descMatch) description = descMatch[1].trim();
    if (tagsMatch) tags = tagsMatch[1].split(",").map((t) => t.trim().replace(/['"]/g, ""));
    if (categoryMatch) category = categoryMatch[1].trim();
  }

  // description が空なら本文の最初の段落を使用
  if (!description) {
    const bodyMatch = content.replace(/^---[\s\S]*?---\n/, "").match(/^#+\s.+\n+([\s\S]+?)(\n\n|$)/);
    if (bodyMatch) description = bodyMatch[1].replace(/\n/g, " ").trim().slice(0, 300);
  }

  // カテゴリをスキル名から推定
  if (category === "general") {
    if (/tdd|test|spec|coverage/i.test(name)) category = "testing";
    else if (/security|auth|safe/i.test(name)) category = "security";
    else if (/frontend|react|vue|svelte|css|ui/i.test(name)) category = "frontend";
    else if (/backend|api|server|rest|grpc/i.test(name)) category = "backend";
    else if (/docker|deploy|k8s|kubernetes|ci|cd/i.test(name)) category = "devops";
    else if (/agent|autonomous|loop|harness/i.test(name)) category = "agent";
    else if (/python|golang|rust|kotlin|swift|java|cpp|perl|php/i.test(name)) category = "language";
    else if (/django|laravel|springboot|nextjs|nuxt/i.test(name)) category = "framework";
    else if (/database|postgres|mysql|sql|migration/i.test(name)) category = "database";
    else if (/research|market|investor|content/i.test(name)) category = "research";
  }

  return { name, description, tags, category };
}

// ─── GitHub API ヘルパー ──────────────────────────────────────────────────────

const GITHUB_API = "https://api.github.com";
const RATE_LIMIT_DELAY_MS = 200; // レート制限対策

async function githubFetch(url: string, token?: string): Promise<Response> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "OpenSpace-Skill-Manager/1.0",
  };
  if (token) headers["Authorization"] = `token ${token}`;
  return fetch(url, { headers });
}

async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── メイン同期関数 ───────────────────────────────────────────────────────────

export interface SyncResult {
  sourceId: number;
  newSkills: number;
  updatedSkills: number;
  totalSkills: number;
  errors: string[];
}

export async function syncSkillSource(
  sourceId: number,
  token?: string
): Promise<SyncResult> {
  const result: SyncResult = {
    sourceId,
    newSkills: 0,
    updatedSkills: 0,
    totalSkills: 0,
    errors: [],
  };

  // DB接続を取得
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  // ソース情報を取得
  const sources = await db
    .select()
    .from(skillSources)
    .where(eq(skillSources.id, sourceId));
  if (!sources.length) throw new Error(`Source ${sourceId} not found`);
  const source = sources[0];

  // 同期中ステータスに更新
  await db
    .update(skillSources)
    .set({ lastSyncStatus: "syncing" })
    .where(eq(skillSources.id, sourceId));

  try {
    // スキルディレクトリ一覧を取得
    const contentsUrl = `${GITHUB_API}/repos/${source.repoOwner}/${source.repoName}/contents/${source.skillsPath}?ref=${source.branch}`;
    const contentsRes = await githubFetch(contentsUrl, token);

    if (!contentsRes.ok) {
      throw new Error(`GitHub API error: ${contentsRes.status} ${contentsRes.statusText}`);
    }

    const contents: GitHubContentsItem[] = await contentsRes.json();
    const skillDirs = contents.filter((item) => item.type === "dir");
    result.totalSkills = skillDirs.length;

    // 既存の community_skills を sourceId でまとめて取得（SHA比較用）
    const existing = await db
      .select({ id: communitySkills.id, upstreamSha: communitySkills.upstreamSha })
      .from(communitySkills)
      .where(eq(communitySkills.sourceId, sourceId));
    const existingMap = new Map(existing.map((e: { id: string; upstreamSha: string | null }) => [e.id, e.upstreamSha]));

    // 各スキルディレクトリを処理
    for (const dir of skillDirs) {
      await delay(RATE_LIMIT_DELAY_MS);

      try {
        // SKILL.md の blob SHA を取得（変更検知）
        const skillMdUrl = `${GITHUB_API}/repos/${source.repoOwner}/${source.repoName}/contents/${source.skillsPath}/${dir.name}/SKILL.md?ref=${source.branch}`;
        const skillMdRes = await githubFetch(skillMdUrl, token);

        if (!skillMdRes.ok) continue; // SKILL.md が存在しないディレクトリはスキップ

        const skillMdMeta: GitHubContentsItem = await skillMdRes.json();
        const currentSha = skillMdMeta.sha;

        // ユニークIDを生成（source + ディレクトリ名）
        const skillId = `src${sourceId}-${dir.name}`.slice(0, 64);
        const existingSha = existingMap.get(skillId);

        // SHA が同じなら更新不要
        if (existingSha === currentSha) continue;

        // SKILL.md の内容を取得
        await delay(RATE_LIMIT_DELAY_MS);
        const rawUrl =
          skillMdMeta.download_url ||
          `https://raw.githubusercontent.com/${source.repoOwner}/${source.repoName}/${source.branch}/${source.skillsPath}/${dir.name}/SKILL.md`;
        const rawRes = await githubFetch(rawUrl, token);
        if (!rawRes.ok) continue;

        const content = await rawRes.text();
        const meta = parseSkillMd(content, dir.name);

        const now = new Date();
        const isNew = !existingSha;

        // upsert（INSERT ... ON DUPLICATE KEY UPDATE 相当）
        await db
          .insert(communitySkills)
          .values({
            id: skillId,
            remoteId: `${source.repoOwner}/${source.repoName}/skills/${dir.name}`,
            name: meta.name,
            description: meta.description,
            author: source.repoOwner,
            category: meta.category,
            tags: JSON.stringify(meta.tags),
            stars: 0,
            downloads: 0,
            qualityScore: 75, // デフォルトスコア
            latestVersion: "v1.0.0",
            generationCount: 1,
            codePreview: content.slice(0, 500),
            isInstalled: false,
            sourceId: sourceId,
            upstreamSha: currentSha,
            lastSyncedAt: now,
            cachedAt: now,
          })
          .onDuplicateKeyUpdate({
            set: {
              name: meta.name,
              description: meta.description,
              category: meta.category,
              tags: JSON.stringify(meta.tags),
              codePreview: content.slice(0, 500),
              upstreamSha: currentSha,
              lastSyncedAt: now,
            },
          });

        if (isNew) result.newSkills++;
        else result.updatedSkills++;
      } catch (err) {
        result.errors.push(`${dir.name}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    // ソースの統計を更新
    await db
      .update(skillSources)
      .set({
        lastSyncStatus: "success",
        lastSyncedAt: new Date(),
        lastSyncError: null,
        totalSkills: result.totalSkills,
        newSkillsLastSync: result.newSkills,
        updatedSkillsLastSync: result.updatedSkills,
      })
      .where(eq(skillSources.id, sourceId));
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    result.errors.push(errorMsg);
    await db
      .update(skillSources)
      .set({
        lastSyncStatus: "error",
        lastSyncError: errorMsg,
        lastSyncedAt: new Date(),
      })
      .where(eq(skillSources.id, sourceId));
    throw err;
  }

  return result;
}

// ─── 全ソースの自動同期（スケジューラーから呼ぶ） ─────────────────────────────

export async function syncAllSources(token?: string): Promise<SyncResult[]> {
  const db = await getDb();
  if (!db) return [];

  const sources = await db
    .select()
    .from(skillSources)
    .where(eq(skillSources.autoSync, true));

  const results: SyncResult[] = [];
  for (const source of sources) {
    // 同期間隔チェック
    if (source.lastSyncedAt) {
      const hoursSinceSync =
        (Date.now() - source.lastSyncedAt.getTime()) / (1000 * 60 * 60);
      if (hoursSinceSync < source.syncIntervalHours) continue;
    }
    try {
      const result = await syncSkillSource(source.id, token);
      results.push(result);
    } catch {
      // エラーは syncSkillSource 内で DB に記録済み
    }
  }
  return results;
}
