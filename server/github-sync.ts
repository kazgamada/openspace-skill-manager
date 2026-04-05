/**
 * github-sync.ts
 * GitHub リポジトリからスキル（SKILL.md）を動的に取得・差分同期するモジュール。
 *
 * 高速化戦略:
 *  1. Git Tree API（recursive=1）で1リクエストにより全ファイルのSHAを一括取得
 *  2. SHA比較で変更があったスキルのみ内容を取得（差分同期）
 *  3. Promise.allSettled で最大CONCURRENCY並列取得
 *  4. DB upsert は Promise.allSettled で並列実行
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

interface GitHubTreeResponse {
  sha: string;
  url: string;
  tree: GitHubTreeItem[];
  truncated: boolean;
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
    else if (/security|auth|safe|phi|compliance/i.test(name)) category = "security";
    else if (/frontend|react|vue|svelte|css|ui|nextjs|nuxt|liquid/i.test(name)) category = "frontend";
    else if (/backend|api|server|rest|grpc|fastapi/i.test(name)) category = "backend";
    else if (/docker|deploy|k8s|kubernetes|ci|cd|devops/i.test(name)) category = "devops";
    else if (/agent|autonomous|loop|harness|agentic/i.test(name)) category = "agent";
    else if (/python|golang|rust|kotlin|swift|java|cpp|perl|php/i.test(name)) category = "language";
    else if (/django|laravel|springboot|rails|express/i.test(name)) category = "framework";
    else if (/database|postgres|mysql|sql|migration|mongo/i.test(name)) category = "database";
    else if (/research|market|investor|content|deep/i.test(name)) category = "research";
    else if (/ai|llm|gpt|claude|gemini|embedding/i.test(name)) category = "ai";
  }

  return { name, description, tags, category };
}

// ─── GitHub API ヘルパー ──────────────────────────────────────────────────────

const GITHUB_API = "https://api.github.com";
const CONCURRENCY = 10; // 並列取得数

async function githubFetch(url: string, token?: string): Promise<Response> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "OpenSpace-Skill-Manager/1.0",
  };
  if (token) headers["Authorization"] = `token ${token}`;
  return fetch(url, { headers });
}

/** 配列をチャンクに分割 */
function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
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
    // ── Step 1: Git Tree API で全ファイルのSHAを一括取得（1リクエスト）──
    const treeUrl = `${GITHUB_API}/repos/${source.repoOwner}/${source.repoName}/git/trees/${source.branch}?recursive=1`;
    const treeRes = await githubFetch(treeUrl, token);

    if (!treeRes.ok) {
      throw new Error(`GitHub Tree API error: ${treeRes.status} ${treeRes.statusText}`);
    }

    const treeData: GitHubTreeResponse = await treeRes.json();

    // skillsPath/*/SKILL.md にマッチするファイルを抽出
    const skillsPath = source.skillsPath.replace(/\/$/, ""); // 末尾スラッシュ除去
    const skillMdPattern = new RegExp(`^${skillsPath}/([^/]+)/SKILL\\.md$`);

    const skillFiles = treeData.tree.filter(
      (item) => item.type === "blob" && skillMdPattern.test(item.path)
    );

    result.totalSkills = skillFiles.length;
    console.log(`[Sync] Source ${sourceId}: Found ${skillFiles.length} SKILL.md files in tree`);

    if (skillFiles.length === 0) {
      throw new Error(`No SKILL.md files found in ${skillsPath}/ (tree has ${treeData.tree.length} items, truncated=${treeData.truncated})`);
    }

    // ── Step 2: 既存スキルのSHAマップを取得（差分比較用）──
    const existing = await db
      .select({ id: communitySkills.id, upstreamSha: communitySkills.upstreamSha })
      .from(communitySkills)
      .where(eq(communitySkills.sourceId, sourceId));
    const existingMap = new Map(
      existing.map((e: { id: string; upstreamSha: string | null }) => [e.id, e.upstreamSha])
    );

    // ── Step 3: 変更があったスキルのみ内容を取得（並列）──
    const toUpdate = skillFiles.filter((file) => {
      const match = file.path.match(skillMdPattern);
      if (!match) return false;
      const dirName = match[1];
      const skillId = `src${sourceId}-${dirName}`.slice(0, 64);
      return existingMap.get(skillId) !== file.sha; // SHA変更 or 新規
    });

    console.log(`[Sync] Source ${sourceId}: ${toUpdate.length} skills need update (${skillFiles.length - toUpdate.length} unchanged)`);

    // チャンク単位で並列取得
    const batches = chunk(toUpdate, CONCURRENCY);
    for (const batch of batches) {
      await Promise.allSettled(
        batch.map(async (file) => {
          const match = file.path.match(skillMdPattern)!;
          const dirName = match[1];
          const skillId = `src${sourceId}-${dirName}`.slice(0, 64);
          const isNew = !existingMap.has(skillId);

          try {
            // raw.githubusercontent.com から直接取得（APIコール節約）
            const rawUrl = `https://raw.githubusercontent.com/${source.repoOwner}/${source.repoName}/${source.branch}/${file.path}`;
            const rawRes = await githubFetch(rawUrl, token);
            if (!rawRes.ok) {
              result.errors.push(`${dirName}: HTTP ${rawRes.status}`);
              return;
            }

            const content = await rawRes.text();
            const meta = parseSkillMd(content, dirName);
            const now = new Date();

            await db
              .insert(communitySkills)
              .values({
                id: skillId,
                remoteId: `${source.repoOwner}/${source.repoName}/${file.path}`,
                name: meta.name,
                description: meta.description,
                author: source.repoOwner,
                category: meta.category,
                tags: JSON.stringify(meta.tags),
                stars: 0,
                downloads: 0,
                qualityScore: 75,
                latestVersion: "v1.0.0",
                generationCount: 1,
                codePreview: content.slice(0, 500),
                isInstalled: false,
                sourceId: sourceId,
                upstreamSha: file.sha,
                lastSyncedAt: now,
                cachedAt: now,
              })
              .onConflictDoUpdate({
                target: communitySkills.id,
                set: {
                  name: meta.name,
                  description: meta.description,
                  category: meta.category,
                  tags: JSON.stringify(meta.tags),
                  codePreview: content.slice(0, 500),
                  upstreamSha: file.sha,
                  lastSyncedAt: now,
                },
              });

            if (isNew) result.newSkills++;
            else result.updatedSkills++;
          } catch (err) {
            result.errors.push(`${dirName}: ${err instanceof Error ? err.message : String(err)}`);
          }
        })
      );
    }

    // ── Step 4: ソースの統計を更新 ──
    await db
      .update(skillSources)
      .set({
        lastSyncStatus: result.errors.length > 0 && result.newSkills + result.updatedSkills === 0 ? "error" : "success",
        lastSyncedAt: new Date(),
        lastSyncError: result.errors.length > 0 ? result.errors.slice(0, 3).join("; ") : null,
        totalSkills: result.totalSkills,
        newSkillsLastSync: result.newSkills,
        updatedSkillsLastSync: result.updatedSkills,
      })
      .where(eq(skillSources.id, sourceId));

    console.log(`[Sync] Source ${sourceId}: Done. new=${result.newSkills} updated=${result.updatedSkills} errors=${result.errors.length}`);
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
