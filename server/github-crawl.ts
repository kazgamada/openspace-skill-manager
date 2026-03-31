/**
 * GitHub Skill Crawler
 * - GitHub Code Search API で `.claude/skills/*.md` を検索
 * - star数・fork数・更新頻度でスコアリングしてランク付け
 * - 上位から1日100件を community_skills テーブルに保存
 */
import { nanoid } from "nanoid";
import { getDb } from "./db";
import { communitySkills } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";

const GITHUB_API = "https://api.github.com";
const DAILY_LIMIT = 100;

interface GitHubSearchItem {
  name: string;
  path: string;
  sha: string;
  url: string;
  git_url: string;
  html_url: string;
  repository: {
    id: number;
    full_name: string;
    owner: { login: string };
    name: string;
    html_url: string;
    description: string | null;
    stargazers_count: number;
    forks_count: number;
    updated_at: string;
    pushed_at: string;
    topics?: string[];
  };
}

interface GitHubSearchResponse {
  total_count: number;
  incomplete_results: boolean;
  items: GitHubSearchItem[];
}

/**
 * スキルのランクスコアを計算する
 * - star数（最重要）
 * - fork数
 * - 最近の更新（新しいほど高スコア）
 */
function calcCrawlRank(item: GitHubSearchItem): number {
  const repo = item.repository;
  const stars = repo.stargazers_count ?? 0;
  const forks = repo.forks_count ?? 0;
  const updatedAt = new Date(repo.pushed_at ?? repo.updated_at).getTime();
  const ageMs = Date.now() - updatedAt;
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  // 更新鮮度スコア: 30日以内=1.0, 90日=0.7, 365日=0.3, それ以上=0.1
  const freshness = ageDays <= 30 ? 1.0 : ageDays <= 90 ? 0.7 : ageDays <= 365 ? 0.3 : 0.1;
  // 総合スコア
  return Math.log1p(stars) * 3 + Math.log1p(forks) * 1.5 + freshness * 2;
}

/**
 * GitHub Code Search APIでスキルファイルを検索
 * 複数クエリを組み合わせてより多くのスキルを発見する
 */
async function searchGithubSkills(token?: string): Promise<GitHubSearchItem[]> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "OpenSpace-Skill-Manager/1.0",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  // 複数の検索クエリで幅広く収集
  const queries = [
    "filename:SKILL.md path:.claude/skills",
    "filename:SKILL.md path:skills extension:md",
    "\"allowed-tools\" \"tool-version\" filename:SKILL.md",
    "\"## Overview\" \"## Instructions\" filename:SKILL.md",
  ];

  const seen = new Set<string>(); // sha で重複排除
  const allItems: GitHubSearchItem[] = [];

  for (const q of queries) {
    try {
      // GitHub Code Search は1ページ最大30件, 最大10ページ(300件)
      for (let page = 1; page <= 3; page++) {
        const url = `${GITHUB_API}/search/code?q=${encodeURIComponent(q)}&per_page=30&page=${page}`;
        const res = await fetch(url, { headers });
        if (!res.ok) {
          if (res.status === 403) {
            console.warn("[GithubCrawl] Rate limited, stopping search");
            break;
          }
          break;
        }
        const data = (await res.json()) as GitHubSearchResponse;
        for (const item of data.items) {
          if (!seen.has(item.sha)) {
            seen.add(item.sha);
            allItems.push(item);
          }
        }
        if (data.items.length < 30) break; // 最終ページ
        // Rate limit対策: 1秒待機
        await new Promise((r) => setTimeout(r, 1200));
      }
    } catch (e) {
      console.warn(`[GithubCrawl] Search query failed: ${q}`, e);
    }
    // クエリ間の待機
    await new Promise((r) => setTimeout(r, 2000));
  }

  return allItems;
}

/**
 * スキルファイルの内容を取得してパース
 */
async function fetchSkillContent(
  item: GitHubSearchItem,
  token?: string
): Promise<{ name: string; description: string; content: string } | null> {
  try {
    const headers: Record<string, string> = {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "OpenSpace-Skill-Manager/1.0",
    };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(item.git_url, { headers });
    if (!res.ok) return null;
    const blob = (await res.json()) as { content?: string; encoding?: string };
    if (!blob.content || blob.encoding !== "base64") return null;

    const raw = Buffer.from(blob.content.replace(/\n/g, ""), "base64").toString("utf-8");

    // スキル名を抽出（# タイトル または ファイル名から）
    const titleMatch = raw.match(/^#\s+(.+)$/m);
    const name = titleMatch
      ? titleMatch[1].trim()
      : item.name.replace(/\.md$/i, "");

    // 説明を抽出（最初の段落）
    const descMatch = raw.match(/^(?!#)(.{20,300})/m);
    const description = descMatch ? descMatch[1].trim() : "";

    return { name, description, content: raw };
  } catch {
    return null;
  }
}

/**
 * メイン: GitHub全体を回遊してスキルを収集し、ランク付けして上位100件を保存
 */
export async function runGithubCrawl(token?: string): Promise<{
  found: number;
  saved: number;
  updated: number;
  skipped: number;
}> {
  const traceId = nanoid(6);
  console.log(`[GithubCrawl][${traceId}] Starting crawl...`);

  const db = await getDb();
  if (!db) throw new Error("DB not available");

  // 1. GitHub Code Searchでスキルを検索
  const items = await searchGithubSkills(token);
  console.log(`[GithubCrawl][${traceId}] Found ${items.length} candidate files`);

  // 2. ランクスコアで降順ソート
  const ranked = items
    .map((item) => ({ item, rank: calcCrawlRank(item) }))
    .sort((a, b) => b.rank - a.rank);

  // 3. 上位DAILY_LIMIT件を処理
  const topItems = ranked.slice(0, DAILY_LIMIT);
  let saved = 0;
  let updated = 0;
  let skipped = 0;

  for (const { item, rank } of topItems) {
    try {
      const repo = item.repository;
      const githubUrl = item.html_url;

      // 既存チェック（upstreamShaで変更検知）
      const existing = await db
        .select({ id: communitySkills.id, upstreamSha: communitySkills.upstreamSha })
        .from(communitySkills)
        .where(eq(communitySkills.githubUrl, githubUrl))
        .limit(1);

      if (existing.length > 0 && existing[0].upstreamSha === item.sha) {
        // 変更なし → ランクスコアだけ更新
        await db
          .update(communitySkills)
          .set({
            crawlRank: rank,
            stars: repo.stargazers_count,
            forkCount: repo.forks_count,
            lastSyncedAt: new Date(),
          })
          .where(eq(communitySkills.githubUrl, githubUrl));
        skipped++;
        continue;
      }

      // 内容を取得
      const parsed = await fetchSkillContent(item, token);
      if (!parsed) {
        skipped++;
        continue;
      }

      const tags = (repo.topics ?? []).slice(0, 8);
      const qualityScore = Math.min(100, rank * 5);

      if (existing.length > 0) {
        // 更新
        await db
          .update(communitySkills)
          .set({
            name: parsed.name,
            description: parsed.description,
            author: repo.owner.login,
            stars: repo.stargazers_count,
            forkCount: repo.forks_count,
            qualityScore,
            crawlRank: rank,
            crawlSource: "github_crawl",
            repoOwner: repo.owner.login,
            repoName: repo.name,
            githubUrl,
            tags: JSON.stringify(tags),
            codePreview: parsed.content.slice(0, 500),
            upstreamSha: item.sha,
            lastSyncedAt: new Date(),
          })
          .where(eq(communitySkills.githubUrl, githubUrl));
        updated++;
      } else {
        // 新規登録
        await db.insert(communitySkills).values({
          id: nanoid(),
          name: parsed.name,
          description: parsed.description,
          author: repo.owner.login,
          category: "github",
          tags: JSON.stringify(tags),
          stars: repo.stargazers_count,
          forkCount: repo.forks_count,
          downloads: 0,
          qualityScore,
          crawlRank: rank,
          crawlSource: "github_crawl",
          repoOwner: repo.owner.login,
          repoName: repo.name,
          githubUrl,
          codePreview: parsed.content.slice(0, 500),
          upstreamSha: item.sha,
          lastSyncedAt: new Date(),
          cachedAt: new Date(),
        });
        saved++;
      }

      // API rate limit対策
      await new Promise((r) => setTimeout(r, 500));
    } catch (e) {
      console.warn(`[GithubCrawl][${traceId}] Failed to process ${item.html_url}:`, e);
      skipped++;
    }
  }

  console.log(
    `[GithubCrawl][${traceId}] Done: found=${items.length}, saved=${saved}, updated=${updated}, skipped=${skipped}`
  );
  return { found: items.length, saved, updated, skipped };
}
