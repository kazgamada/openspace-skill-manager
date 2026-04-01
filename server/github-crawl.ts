/**
 * GitHub Skill Crawler (v6)
 * - GitHub Code Search API で SKILL.md を検索
 * - crawl設定（user_settings）に基づく条件フィルター適用
 * - star数・fork数・更新頻度でスコアリングしてランク付け
 * - 上位 dailyLimit 件を community_skills テーブルに保存
 * - バッジ自動付与: new / repaired / derived
 */
import { nanoid } from "nanoid";
import { getDb } from "./db";
import { communitySkills, userSettings } from "../drizzle/schema";
import { eq } from "drizzle-orm";

const GITHUB_API = "https://api.github.com";

export interface CrawlOptions {
  token?: string;
  dailyLimit?: number;
  rankBy?: "stars" | "forks" | "freshness" | "composite";
  rateLimitMs?: number;
  minStars?: number;
  minForks?: number;
  maxAgeDays?: number;
  minSkillLength?: number;
  excludeRepos?: string[];
  languageFilter?: string;
  keywords?: string;
  searchPath?: string;
  duplicatePolicy?: "skip" | "update" | "version";
  duplicateWindowDays?: number;
}

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
    language?: string | null;
  };
}

interface GitHubSearchResponse {
  total_count: number;
  incomplete_results: boolean;
  items: GitHubSearchItem[];
}

function calcCrawlRank(item: GitHubSearchItem, rankBy: CrawlOptions["rankBy"] = "composite"): number {
  const repo = item.repository;
  const stars = repo.stargazers_count ?? 0;
  const forks = repo.forks_count ?? 0;
  const updatedAt = new Date(repo.pushed_at ?? repo.updated_at).getTime();
  const ageDays = (Date.now() - updatedAt) / (1000 * 60 * 60 * 24);
  const freshness = ageDays <= 30 ? 1.0 : ageDays <= 90 ? 0.7 : ageDays <= 365 ? 0.3 : 0.1;
  switch (rankBy) {
    case "stars":     return stars;
    case "forks":     return forks;
    case "freshness": return freshness * 100;
    default:          return Math.log1p(stars) * 3 + Math.log1p(forks) * 1.5 + freshness * 2;
  }
}

function determineBadge(isNew: boolean, isUpdated: boolean, existingName: string | null, newName: string): string | null {
  if (isNew) return "new";
  if (isUpdated) {
    if (existingName && existingName !== newName) return "derived";
    return "repaired";
  }
  return null;
}

async function searchGithubSkills(opts: CrawlOptions): Promise<GitHubSearchItem[]> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "OpenSpace-Skill-Manager/1.0",
  };
  if (opts.token) headers["Authorization"] = `Bearer ${opts.token}`;
  const searchPath = opts.searchPath || ".claude/skills";
  const extraKeywords = opts.keywords
    ? opts.keywords.split(",").map((k) => k.trim()).filter(Boolean)
    : [];
  const queries = [
    `filename:SKILL.md path:${searchPath}`,
    `filename:SKILL.md path:skills extension:md`,
    `"allowed-tools" "tool-version" filename:SKILL.md`,
    `"## Overview" "## Instructions" filename:SKILL.md`,
    ...extraKeywords.map((kw) => `filename:SKILL.md "${kw}"`),
  ];
  const seen = new Set<string>();
  const allItems: GitHubSearchItem[] = [];
  for (const q of queries) {
    try {
      const url = `${GITHUB_API}/search/code?q=${encodeURIComponent(q)}&per_page=100`;
      const res = await fetch(url, { headers });
      if (!res.ok) { if (res.status === 403) break; continue; }
      const data = (await res.json()) as GitHubSearchResponse;
      for (const item of data.items ?? []) {
        if (!seen.has(item.sha)) { seen.add(item.sha); allItems.push(item); }
      }
      await new Promise((r) => setTimeout(r, opts.rateLimitMs ?? 500));
    } catch { /* ignore per-query errors */ }
  }
  return allItems;
}

async function fetchSkillContent(item: GitHubSearchItem, token?: string): Promise<{ name: string; description: string; content: string } | null> {
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
    const titleMatch = raw.match(/^#\s+(.+)$/m);
    const name = titleMatch ? titleMatch[1].trim() : item.name.replace(/\.md$/i, "");
    const descMatch = raw.match(/^(?!#)(.{20,300})/m);
    const description = descMatch ? descMatch[1].trim() : "";
    return { name, description, content: raw };
  } catch { return null; }
}

export async function loadCrawlOptionsFromDB(userId?: number): Promise<CrawlOptions> {
  const db = await getDb();
  if (!db || !userId) return {};
  const rows = await db.select().from(userSettings).where(eq(userSettings.userId, userId)).limit(1);
  if (!rows.length) return {};
  const s = rows[0];
  return {
    dailyLimit:          s.crawlDailyLimit ?? 100,
    rankBy:              (s.crawlRankBy as CrawlOptions["rankBy"]) ?? "composite",
    rateLimitMs:         s.crawlRateLimitMs ?? 500,
    minStars:            s.crawlMinStars ?? 0,
    minForks:            s.crawlMinForks ?? 0,
    maxAgeDays:          s.crawlMaxAgeDays ?? 0,
    minSkillLength:      s.crawlMinSkillLength ?? 100,
    excludeRepos:        s.crawlExcludeRepos ? JSON.parse(s.crawlExcludeRepos) : [],
    languageFilter:      s.crawlLanguageFilter ?? "",
    keywords:            s.crawlKeywords ?? "",
    searchPath:          s.crawlSearchPath ?? ".claude/skills",
    duplicatePolicy:     (s.crawlDuplicatePolicy as CrawlOptions["duplicatePolicy"]) ?? "update",
    duplicateWindowDays: s.crawlDuplicateWindowDays ?? 0,
  };
}

export async function runGithubCrawl(opts: CrawlOptions = {}): Promise<{ found: number; saved: number; updated: number; skipped: number }> {
  const traceId = nanoid(6);
  console.log(`[GithubCrawl][${traceId}] Starting crawl...`);
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  const dailyLimit   = opts.dailyLimit   ?? 100;
  const rankBy       = opts.rankBy       ?? "composite";
  const rateLimitMs  = opts.rateLimitMs  ?? 500;
  const minStars     = opts.minStars     ?? 0;
  const minForks     = opts.minForks     ?? 0;
  const maxAgeDays   = opts.maxAgeDays   ?? 0;
  const minSkillLen  = opts.minSkillLength ?? 100;
  const excludeRepos = new Set(opts.excludeRepos ?? []);
  const langFilter   = (opts.languageFilter ?? "").split(",").map((l) => l.trim().toLowerCase()).filter(Boolean);
  const dupPolicy    = opts.duplicatePolicy ?? "update";

  const items = await searchGithubSkills({ ...opts, rateLimitMs });
  console.log(`[GithubCrawl][${traceId}] Found ${items.length} candidate files`);

  const filtered = items.filter((item) => {
    const repo = item.repository;
    if (excludeRepos.has(repo.full_name)) return false;
    if (repo.stargazers_count < minStars) return false;
    if (repo.forks_count < minForks) return false;
    if (maxAgeDays > 0) {
      const ageDays = (Date.now() - new Date(repo.pushed_at ?? repo.updated_at).getTime()) / (1000 * 60 * 60 * 24);
      if (ageDays > maxAgeDays) return false;
    }
    if (langFilter.length > 0 && !langFilter.includes((repo.language ?? "").toLowerCase())) return false;
    return true;
  });

  console.log(`[GithubCrawl][${traceId}] After filter: ${filtered.length} items`);

  const ranked = filtered
    .map((item) => ({ item, rank: calcCrawlRank(item, rankBy) }))
    .sort((a, b) => b.rank - a.rank);

  const topItems = ranked.slice(0, dailyLimit);
  let saved = 0; let updated = 0; let skipped = 0;

  for (const { item, rank } of topItems) {
    try {
      const repo = item.repository;
      const githubUrl = item.html_url;
      const existing = await db
        .select({ id: communitySkills.id, upstreamSha: communitySkills.upstreamSha, name: communitySkills.name })
        .from(communitySkills)
        .where(eq(communitySkills.githubUrl, githubUrl))
        .limit(1);

      if (dupPolicy === "skip" && existing.length > 0) { skipped++; continue; }

      if (existing.length > 0 && existing[0].upstreamSha === item.sha) {
        await db.update(communitySkills).set({ crawlRank: rank, stars: repo.stargazers_count, forkCount: repo.forks_count, lastSyncedAt: new Date() }).where(eq(communitySkills.githubUrl, githubUrl));
        skipped++; continue;
      }

      const parsed = await fetchSkillContent(item, opts.token);
      if (!parsed || parsed.content.length < minSkillLen) { skipped++; continue; }

      const tags = (repo.topics ?? []).slice(0, 8);
      const qualityScore = Math.min(100, rank * 5);
      const isNew = existing.length === 0;
      const isUpdated = existing.length > 0 && existing[0].upstreamSha !== item.sha;
      const badge = determineBadge(isNew, isUpdated, existing[0]?.name ?? null, parsed.name);

      if (isUpdated) {
        await db.update(communitySkills).set({
          name: parsed.name, description: parsed.description, author: repo.owner.login,
          stars: repo.stargazers_count, forkCount: repo.forks_count, qualityScore,
          crawlRank: rank, crawlSource: "github_crawl", repoOwner: repo.owner.login,
          repoName: repo.name, githubUrl, tags: JSON.stringify(tags),
          codePreview: parsed.content.slice(0, 500), upstreamSha: item.sha,
          lastSyncedAt: new Date(), ...(badge ? { badge } : {}),
        }).where(eq(communitySkills.githubUrl, githubUrl));
        updated++;
      } else {
        await db.insert(communitySkills).values({
          id: nanoid(), name: parsed.name, description: parsed.description,
          author: repo.owner.login, category: "github", tags: JSON.stringify(tags),
          stars: repo.stargazers_count, forkCount: repo.forks_count, downloads: 0,
          qualityScore, crawlRank: rank, crawlSource: "github_crawl",
          repoOwner: repo.owner.login, repoName: repo.name, githubUrl,
          codePreview: parsed.content.slice(0, 500), upstreamSha: item.sha,
          lastSyncedAt: new Date(), cachedAt: new Date(), ...(badge ? { badge } : {}),
        });
        saved++;
      }
      await new Promise((r) => setTimeout(r, rateLimitMs));
    } catch (e) {
      console.warn(`[GithubCrawl][${traceId}] Failed to process ${item.html_url}:`, e);
      skipped++;
    }
  }

  console.log(`[GithubCrawl][${traceId}] Done: found=${items.length}, filtered=${filtered.length}, saved=${saved}, updated=${updated}, skipped=${skipped}`);
  return { found: items.length, saved, updated, skipped };
}
