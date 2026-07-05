import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SKILL_SOURCE = path.join(__dirname, '..', 'skills', 'sharepreview', 'SKILL.md');

const TARGETS = {
  grok: path.join(os.homedir(), '.grok', 'skills', 'sharepreview', 'SKILL.md'),
  cursor: path.join(process.cwd(), '.cursor', 'rules', 'sharepreview.mdc'),
  claude: path.join(process.cwd(), '.claude', 'skills', 'sharepreview', 'SKILL.md'),
};

export async function installSkill(target = 'grok') {
  const key = target.toLowerCase();
  if (!TARGETS[key]) {
    throw new Error(`Unknown skill target "${target}". Use grok, cursor, or claude.`);
  }

  const destination = TARGETS[key];
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(SKILL_SOURCE, destination);
  return destination;
}