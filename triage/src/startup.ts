import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import type { TriageConfig } from './config';

export interface StartupDeps {
  configPath: string;
  dataRoot: string;
  listStories: () => string[];
  loadConfig: () => TriageConfig | null;
  saveConfig: (c: TriageConfig) => void;
  scaffoldStory: (slug: string) => void;
}

export async function resolveStartup(deps: StartupDeps): Promise<TriageConfig> {
  const existing = deps.loadConfig();
  if (existing) {
    if (!existsSync(existing.photoFolder)) {
      console.error(`Photo folder no longer exists: ${existing.photoFolder}`);
      console.error(`Edit ${deps.configPath} to fix, or delete it to re-run setup.`);
      process.exit(1);
    }
    console.log(`Active story: ${existing.slug}`);
    console.log(`Photos:       ${existing.photoFolder}`);
    return existing;
  }

  const rl = createInterface({ input: stdin, output: stdout });
  try {
    const stories = deps.listStories();
    console.log('No triage config found. Setting up.\n');
    console.log('Available stories:');
    stories.forEach((s, i) => console.log(`  ${i + 1}. ${s}`));
    console.log(`  ${stories.length + 1}. + Create new story`);

    const pick = (await rl.question(`\nChoose [1-${stories.length + 1}]: `)).trim();
    const idx = Number(pick);
    let slug: string;
    if (idx >= 1 && idx <= stories.length) {
      slug = stories[idx - 1];
    } else if (idx === stories.length + 1) {
      const raw = (await rl.question('New story slug (e.g. our-story): ')).trim();
      slug = raw || 'our-story';
      deps.scaffoldStory(slug);
      console.log(`Scaffolded data/${slug}/`);
    } else {
      console.error('Invalid choice.');
      process.exit(1);
    }

    const folderRaw = (await rl.question('Photo folder path: ')).trim();
    const photoFolder = resolve(folderRaw);
    if (!existsSync(photoFolder)) {
      console.error(`Folder does not exist: ${photoFolder}`);
      process.exit(1);
    }

    const config = { slug, photoFolder };
    deps.saveConfig(config);
    console.log(`\nSaved config to ${deps.configPath}\n`);
    return config;
  } finally {
    rl.close();
  }
}
