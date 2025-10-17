#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os

NODE_VERSION = "8.9.3"

EXEC_COMMANDS = [
    "curl -L git.io/nodebrew | perl - setup".
    "nodebrew install " + NODE_VERSION,
    "nodebrew use " + NODE_VERSION
]

if __name__ == "__main__":

    for cmd in EXEC_COMMANDS:
        exit_code = os.system(cmd)

        if exit_code:
            exit(1)

    exit(0)
        
