// テスト用スクリプト: 同期ロジックを直接テスト
// 実行: node --import tsx/esm test-sync.mjs

const { syncSkillSource } = await import('./server/github-sync.ts');
const { createSkillSource, getAllSkillSources } = await import('./server/db.ts');

async function test() {
  try {
    const sources = await getAllSkillSources();
    console.log('Existing sources:', sources.length);
    
    let sourceId;
    if (sources.length > 0) {
      sourceId = sources[0].id;
      console.log('Using existing source id:', sourceId, sources[0].name);
    } else {
      sourceId = await createSkillSource({
        name: 'everything-claude-code',
        repoOwner: 'affaan-m',
        repoName: 'everything-claude-code',
        skillsPath: 'skills',
        branch: 'main',
        autoSync: true,
        syncIntervalHours: 6,
        lastSyncStatus: 'idle',
        totalSkills: 0,
        newSkillsLastSync: 0,
        updatedSkillsLastSync: 0,
      });
      console.log('Created new source id:', sourceId);
    }
    
    console.log('Starting sync...');
    const result = await syncSkillSource(sourceId);
    console.log('Sync result:', JSON.stringify(result, null, 2));
  } catch(e) {
    console.error('Error:', e.message);
    console.error(e.stack);
  }
  process.exit(0);
}
test();
