#!/usr/bin/env node

import { run } from '../src/cli.mjs';

run(process.argv.slice(2))
  .then((code) => process.exit(code))
  .catch((error) => {
    console.error(error.message || error);
    process.exit(1);
  });