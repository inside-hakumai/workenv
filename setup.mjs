#!/usr/bin/env zx

import path from 'path';
import os from "os";

/**
 * @param {string} path
 */
const exists = async (path) => {
    try {
        await $`test -e ${path}`.quiet();
    } catch (e) {
        return false;
    }

    return true;
}

const HOME = os.homedir();

const symlinkList = [
    {src: path.join(__dirname, 'fish/fish_plugins'), dest: `${HOME}/.config/fish/fish_plugins`},
    {src: path.join(__dirname, 'git/.gitignore_global'), dest: `${HOME}/.gitignore_global`},
    {src: path.join(__dirname, 'tmux/.tmux.conf'), dest: `${HOME}/.tmux.conf`},
    {src: path.join(__dirname, 'zsh/.zshrc'), dest: `${HOME}/.zshrc`}
]

console.table(symlinkList)

for (let symlink of symlinkList) {
    if (!await exists(symlink.src)) {
        console.error(`ファイルが存在しません: ${symlink.src}`)
        continue;
    }

    if (await exists(symlink.dest)) {
        console.error(`ファイルが既に存在します: ${symlink.dest}`)
        continue;
    }

    await $`ln -s ${symlink.dest}, ${symlink.dest}`;
    console.log(`シンボリックリンクを作成しました: ${symlink.dest}`)
}


