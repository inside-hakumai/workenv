#!/usr/bin/env node
// Source entrypoint: bin-src/src/cli/gwm.ts

import process, { argv, exit, stderr } from 'node:process';
import { render } from 'ink';
import meow from 'meow';
import { createElement } from 'react';
import GwmApp from '../ui/gwm/App.js';
import { parseBranchInput } from './gwm/args.js';
import { handleCliFailure, registerTerminationHandlers, type FailureReporter } from './gwm/runtime.js';
import { exitCodes } from '../shared/errors.js';

const cli = meow(
  `
  Usage
    $ gwm <branch>

  Examples
    $ gwm feature/login
    $ gwm bugfix/QA-1234
`,
  {
    importMeta: import.meta,
    argv: argv.slice(2),
    allowUnknownFlags: false,
  },
);

const reporter: FailureReporter = {
  logError: message => {
    stderr.write(`${message}\n`);
  },
  setExitCode: code => {
    process.exitCode = code;
  },
};

const main = async () => {
  try {
    const { branch } = parseBranchInput({
      input: cli.input,
      showHelp: exitCode => {
        stderr.write(`${cli.help.trim()}\n`);
        process.exitCode = exitCode ?? exitCodes.configurationError;
      },
    });

    const inkInstance = render(createElement(GwmApp, { branch }));

    registerTerminationHandlers(
      (signal, handler) => process.once(signal, handler),
      () => {
        inkInstance.unmount();
        exit(exitCodes.generalError);
      },
    );

    await inkInstance.waitUntilExit();
  } catch (error) {
    handleCliFailure(error, reporter);
  }
};

void main();
