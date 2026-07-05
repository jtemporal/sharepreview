import { spawn } from 'node:child_process';
import { fetchPageMeta } from './meta.mjs';
import { fetchImageInfo } from './image-dimensions.mjs';
import { validatePreview } from './validate.mjs';
import { startPreviewServer } from './server.mjs';
import { capturePreviewScreenshot } from './screenshot.mjs';
import { installSkill } from './install-skill.mjs';

function printHelp() {
  console.log(`sharepreview — preview Open Graph share cards from localhost

Usage:
  sharepreview <url> [options]
  sharepreview install-skill --target <grok|cursor|claude>

Options:
  --json          Print machine-readable result to stdout
  --port <n>      Preview server port (default: 4711)
  --open          Open the preview in your default browser
  --validate      Exit 1 when required og tags are missing
  --screenshot [file]  Save a PNG of the preview page (requires puppeteer)
  --help          Show this help

Examples:
  sharepreview http://127.0.0.1:4000/my-post/
  sharepreview http://127.0.0.1:4000/my-post/ --json
  sharepreview install-skill --target grok
`);
}

function parseArgs(argv) {
  if (argv.length === 0 || argv.includes('--help') || argv.includes('-h')) {
    return { help: true };
  }

  if (argv[0] === 'install-skill') {
    const targetIndex = argv.indexOf('--target');
    return {
      command: 'install-skill',
      target: targetIndex >= 0 ? argv[targetIndex + 1] : 'grok',
    };
  }

  const flags = new Set(argv.filter((arg) => arg.startsWith('--')));
  const portIndex = argv.indexOf('--port');
  const port = portIndex >= 0 ? Number(argv[portIndex + 1]) : 4711;
  const screenshotIndex = argv.indexOf('--screenshot');
  const screenshotPath = screenshotIndex >= 0
    ? (argv[screenshotIndex + 1] && !argv[screenshotIndex + 1].startsWith('--')
      ? argv[screenshotIndex + 1]
      : 'share-preview.png')
    : null;
  const positionals = [];

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      if (arg === '--port' || arg === '--screenshot') i += 1;
      continue;
    }
    positionals.push(arg);
  }

  return {
    command: 'preview',
    url: positionals[0],
    json: flags.has('--json'),
    open: flags.has('--open'),
    validate: flags.has('--validate'),
    screenshot: screenshotPath,
    port: Number.isFinite(port) ? port : 4711,
  };
}

function openInBrowser(url) {
  const platform = process.platform;
  const command = platform === 'darwin' ? 'open' : platform === 'win32' ? 'start' : 'xdg-open';
  const child = spawn(command, [url], { detached: true, stdio: 'ignore' });
  child.unref();
}

export async function run(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);

  if (args.help) {
    printHelp();
    return 0;
  }

  if (args.command === 'install-skill') {
    const destination = await installSkill(args.target);
    console.log(`Installed skill to ${destination}`);
    return 0;
  }

  if (!args.url) {
    console.error('Error: missing URL. Example: sharepreview http://127.0.0.1:4000/my-post/');
    return 1;
  }

  let sourceUrl;
  try {
    sourceUrl = new URL(args.url).href;
  } catch {
    console.error(`Error: invalid URL: ${args.url}`);
    return 1;
  }

  const preview = await fetchPageMeta(sourceUrl);
  if (preview.og.image) {
    preview.image_info = await fetchImageInfo(preview.og.image);
    if (preview.image_info?.warnings?.length) {
      preview.warnings.push(...preview.image_info.warnings);
    }
  }

  const validation = validatePreview(preview);
  preview.valid = validation.valid;
  preview.missing = validation.missing;

  const server = await startPreviewServer(preview, { port: args.port });

  const result = {
    source_url: preview.source_url,
    preview_url: server.preview_url,
    preview_port: server.port,
    valid: validation.valid,
    missing: validation.missing,
    og: preview.og,
    twitter: preview.twitter,
    image_info: preview.image_info ?? null,
    warnings: preview.warnings,
  };

  if (!args.screenshot) {
    if (args.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(`Share preview: ${server.preview_url}`);
      console.log(`Source:      ${preview.source_url}`);
      if (!validation.valid) {
        console.log(`Missing:     ${validation.missing.join(', ')}`);
      }
      if (preview.warnings.length) {
        preview.warnings.forEach((warning) => console.log(`Warning:     ${warning}`));
      }
      console.log('Press Ctrl+C to stop the preview server.');
    }
  }

  if (args.screenshot) {
    try {
      const saved = await capturePreviewScreenshot(server.preview_url, args.screenshot);
      result.screenshot = saved;
      if (args.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log(`Screenshot: ${saved}`);
      }
    } catch (error) {
      console.error(error.message);
      await server.close();
      return 1;
    }
    await server.close();
    return args.validate && !validation.valid ? 1 : 0;
  }

  if (args.validate && !validation.valid) {
    await server.close();
    return 1;
  }

  if (args.open) {
    openInBrowser(server.preview_url);
  }

  await new Promise((resolve) => {
    const shutdown = async () => {
      await server.close();
      resolve();
    };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  });

  return 0;
}