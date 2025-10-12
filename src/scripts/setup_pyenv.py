#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os

INSTALL_VERSION = "3.6.3"

EXEC_COMMANDS = [
    "git clone https://github.com/pyenv/pyenv.git ~/.pyenv",
    "pyenv install {0}".format(INSTALL_VERSION),
    "pyenv global 3.6.3",
    "pyenv init",
    "pyenv shell 3.6.3"
]

if __name__ == "__main__":

    for cmd in EXEC_COMMANDS:
        exit_code = os.system(cmd)

        if exit_code:
            exit(1)

    exit(0)
        
