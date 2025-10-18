#!/usr/bin/env node
import { argv } from 'node:process';
import { render } from 'ink';
import App from './app.js';
import { parseCliArgs } from './cli/args.js';

const args = parseCliArgs(argv.slice(2));

render(<App args={args} />);
