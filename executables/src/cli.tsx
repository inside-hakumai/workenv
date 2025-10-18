#!/usr/bin/env node
import { render } from 'ink';
import App from './app.js';
import { parseCliArgs } from './cli/args.js';

const args = parseCliArgs(process.argv.slice(2));

render(<App args={args} />);
