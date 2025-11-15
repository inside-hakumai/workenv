#!/usr/bin/env node
// Source entrypoint: bin-src/src/cli.tsx

import { argv } from 'node:process';
import { render } from 'ink';
import App from './app.js';
import { parseCliArgs } from './cli/args.js';

const args = parseCliArgs(argv.slice(2));

render(<App args={args} />);
