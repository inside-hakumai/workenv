#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os

LINK_CONFIGS = [
    {
        "title" : ".zshrc",
        "entity": os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".zshrc")),
        "link"  : os.path.join(os.path.expanduser('~'), ".zshrc")
    },
    {
        "title" : ".gitignore_global",
        "entity": os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".gitignore_global")),
        "link"  : os.path.join(os.path.expanduser('~'), ".gitignore_global")
    },
    {
        "title" : ".tmux.conf",
        "entity": os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".tmux.conf")),
        "link"  : os.path.join(os.path.expanduser('~'), ".tmux.conf")
    },
    {
        "title" : ".emacs",
        "entity": os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".emacs")),
        "link"  : os.path.join(os.path.expanduser('~'), ".emacs")
    },
    {
        "title" : "Cask",
        "entity": os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "Cask")),
        "link"  : os.path.join(os.path.expanduser('~'), ".emacs.d", "Cask")
    }
]


if __name__ == "__main__":

    for config in LINK_CONFIGS:
        if os.path.exists(config["link"]):
            print("{0:20} Skipped (file is already exists)".format("[" + config["title"] + "]"))
        else:
            os.symlink(config["entity"], config["link"])
            print("{0:20} Create symlink to {1}".format("[" + config["title"] + "]", config["link"]))

    
    
