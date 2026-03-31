/**
 * github-autosync.ts
 * GitHub個人リポジトリの自動同期ロジック（スケジューラーから呼び出し可能なエクスポート版）
 *
 * routers.ts の runGithubAutoSync と同じロジックを共有モジュールとして切り出す。
 * server/_core/index.ts の日次スケジューラーからインポートして使用する。
 */
import { nanoid } from "nanoid";
import {
  createGithubSyncLog,
  updateGithubSyncLog,
  getSkillsByUser,
  getVersionsBySkill,
  createSkill,
  createSkillVersion,
  updateSkill,
  findSkillByNameForUser,
} from "./db";
import { broadcastEvolutionEvent } from "./_core/index";

// ─────────────────────────────────────────────
// SKILL.md parser (minimal, mirrors routers.ts)
// ─────────────────────────────────────────────
function parseSkillMd(raw: string): {
  name: string;
  description: string;
  category: string;
  frontmatter: Record<string, string>;
} {
  try {
    const fmMatch = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/m);
    const frontmatter: Record<string, string> = {};
    let content = raw.trim();
    if (fmMatch) {
      const yamlBlock = fmMatch[1];
      content = fmMatch[2].trim();
      for (const line of yamlBlock.split("\n")) {
        const m = line.match(/^([\w-]+):\s*(.*)$/);
        if (m) frontmatter[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
      }
    }
    const name = frontmatter["name"] ?? "untitled-skill";
    const description = frontmatter["description"] ?? content.split("\n")[0]?.slice(0, 200) ?? "";
    const catMap: [RegExp, string][] = [
      [/code|debug|test|lint|format/i, "development"],
      [/deploy|build|ci|cd|docker/i, "devops"],
      [/write|document|explain|summarize/i, "writing"],
      [/search|fetch|api|http/i, "integration"],
      [/analyze|review|check|audit/i, "analysis"],
    ];
    const category = catMap.find(([re]) => re.test(description))?.[1] ?? "general";
    return { name, description, category, frontmatter };
  } catch {
    return { name: "untitled-skill", description: "", category: "general", frontmatter: {} };
  }
}

function mapAllowedToolsToTags(allowedTools: string[], description: string): string[] {
  const TOOL_TAG_MAP: Record<string, string[]> = {
    Bash: ["shell", "automation"],
    Read: ["file-io"], Write: ["file-io"], Edit: ["file-io"],
    WebFetch: ["web", "research"], WebSearch: ["web", "research"],
    Task: ["orchestration"], TodoRead: ["productivity"], TodoWrite: ["productivity"],
  };
  const tags = new Set<string>();
  for (const tool of allowedTools) {
    for (const tag of (TOOL_TAG_MAP[tool] ?? [])) tags.add(tag);
  }
  return Array.from(tags);
}

function bumpVersion(version: string): string {
  const match = version.match(/^v(\d+)\.(\d+)(?:\.(\d+))?$/);
  if (!match) return "v1.1";
  const [, major, minor] = match;
  return `v${major}.${parseInt(minor) + 1}`;
}

// ─────────────────────────────────────────────
// Main exported function
// ─────────────────────────────────────────────
export async function runGithubAutoSyncExported(
  userId: number,
  token: string,
  logId: number
): Promise<void> {
  const traceId = Math.random().toString(36).slice(2, 8).toUpperCase();
  console.log(`[GithubAutoSync][${traceId}] Starting for user ${userId}`);

  const headers = {
    Authorization: `token ${token}`,
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "OSM/1.0",
  };

  try {
    // 1. Fetch all repos
    const reposRes = await fetch(
      "https://api.github.com/user/repos?per_page=100&sort=pushed&type=owner",
      { headers }
    );
    if (!reposRes.ok) {
      const errText = await reposRes.text();
      throw new Error(`GitHub API error (${reposRes.status}): ${errText.slice(0, 200)}`);
    }
    const repos = await reposRes.json() as {
      name: string; full_name: string; html_url: string; default_branch: string;
    }[];
    console.log(`[GithubAutoSync][${traceId}] Found ${repos.length} repos`);

    // 2. Collect all skills from .claude/skills/ in each repo
    const allSkills: {
      name: string; path: string; raw: string; repoUrl: string; contentHash: string;
    }[] = [];

    const CONCURRENCY = 5;
    for (let i = 0; i < repos.length; i += CONCURRENCY) {
      const batch = repos.slice(i, i + CONCURRENCY);
      await Promise.all(batch.map(async (repo) => {
        try {
          const treeRes = await fetch(
            `https://api.github.com/repos/${repo.full_name}/git/trees/${repo.default_branch}?recursive=1`,
            { headers }
          );
          if (!treeRes.ok) return;
          const tree = await treeRes.json() as {
            tree: { path: string; type: string; sha: string; url: string }[];
          };
          const skillFiles = tree.tree.filter(
            (f) => f.type === "blob" && /^\.claude\/skills\/.+\.md$/i.test(f.path)
          );
          await Promise.all(skillFiles.map(async (file) => {
            try {
              const blobRes = await fetch(file.url, { headers });
              if (!blobRes.ok) return;
              const blob = await blobRes.json() as { content?: string; encoding?: string };
              if (!blob.content || blob.encoding !== "base64") return;
              const raw = Buffer.from(blob.content.replace(/\n/g, ""), "base64").toString("utf-8");
              const parsed = parseSkillMd(raw);
              const name = parsed.name !== "untitled-skill"
                ? parsed.name
                : file.path.split("/").pop()?.replace(/\.md$/i, "") ?? "untitled-skill";
              const contentHash = Buffer.from(raw).toString("base64").slice(0, 32);
              allSkills.push({ name, path: file.path, raw, repoUrl: repo.html_url, contentHash });
            } catch {}
          }));
        } catch {}
      }));
    }

    console.log(`[GithubAutoSync][${traceId}] Total skills found: ${allSkills.length}`);

    // 3. Diff: skip skills whose content hasn't changed
    const existingSkills = await getSkillsByUser(userId);
    const existingByName = new Map(existingSkills.map((s) => [s.name.toLowerCase(), s]));

    const toImport: typeof allSkills = [];
    let skipped = 0;
    for (const skill of allSkills) {
      const existing = existingByName.get(skill.name.toLowerCase());
      if (existing) {
        const storedHash = existing.description?.match(/\|hash:([A-Za-z0-9+/]{32})/)?.[1];
        if (storedHash === skill.contentHash) {
          skipped++;
          continue;
        }
      }
      toImport.push(skill);
    }

    console.log(`[GithubAutoSync][${traceId}] To import: ${toImport.length}, skipped: ${skipped}`);

    // 4. Import changed/new skills
    let created = 0;
    let updated = 0;
    const now = new Date();

    for (const item of toImport) {
      try {
        const parsed = parseSkillMd(item.raw);
        const allowedTools = (parsed.frontmatter["allowed-tools"] ?? "")
          .split(/[,\s]+/).map((t) => t.trim()).filter(Boolean);
        const tags = mapAllowedToolsToTags(allowedTools, parsed.description);
        const descWithHash = `${parsed.description}|hash:${item.contentHash}`;
        const existing = existingByName.get(item.name.toLowerCase());

        if (existing) {
          const versions = await getVersionsBySkill(existing.id);
          const latestVersion = versions[0]?.version ?? "v1.0";
          const nextVersion = bumpVersion(latestVersion);
          const versionId = nanoid();
          await createSkillVersion({
            id: versionId,
            skillId: existing.id,
            version: nextVersion,
            parentId: versions[0]?.id,
            evolutionType: "fix",
            triggerType: "manual",
            qualityScore: 85,
            successRate: 100,
            codeContent: item.raw,
            changeLog: `GitHub自動同期: ${item.repoUrl}/${item.path}`,
            createdAt: now,
          });
          await updateSkill(existing.id, {
            currentVersionId: versionId,
            description: descWithHash,
            tags: JSON.stringify(tags),
            allowedTools: JSON.stringify(allowedTools),
            sourceRepo: item.repoUrl,
            sourceFile: item.path,
            updatedAt: now,
          });
          updated++;
        } else {
          const skillId = nanoid();
          const versionId = nanoid();
          await createSkill({
            id: skillId,
            name: item.name,
            description: descWithHash,
            category: parsed.category,
            authorId: userId,
            isLocal: true,
            isPublic: false,
            tags: JSON.stringify(tags),
            allowedTools: JSON.stringify(allowedTools),
            sourceRepo: item.repoUrl,
            sourceFile: item.path,
            currentVersionId: versionId,
            createdAt: now,
            updatedAt: now,
          });
          await createSkillVersion({
            id: versionId,
            skillId,
            version: "v1.0",
            evolutionType: "create",
            triggerType: "manual",
            qualityScore: 80,
            successRate: 100,
            codeContent: item.raw,
            changeLog: `GitHub自動同期インポート: ${item.repoUrl}/${item.path}`,
            createdAt: now,
          });
          created++;
        }
      } catch (e) {
        console.warn(`[GithubAutoSync][${traceId}] Failed to import ${item.name}:`, e);
      }
    }

    // 5. Update sync log
    await updateGithubSyncLog(logId, {
      status: "success",
      reposScanned: repos.length,
      skillsFound: allSkills.length,
      created,
      updated,
      skipped,
      finishedAt: new Date(),
    });

    console.log(`[GithubAutoSync][${traceId}] Done: created=${created}, updated=${updated}, skipped=${skipped}`);
    broadcastEvolutionEvent({
      type: "github_sync_complete",
      userId,
      created,
      updated,
      skipped,
      timestamp: Date.now(),
    });

  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error(`[GithubAutoSync][${traceId}] Error:`, errMsg);
    await updateGithubSyncLog(logId, {
      status: "error",
      errorMessage: errMsg,
      finishedAt: new Date(),
    });
  }
}
