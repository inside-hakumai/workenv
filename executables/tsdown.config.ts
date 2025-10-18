import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig as untypedDefineConfig } from 'tsdown/config';
import type { UserConfig, UserConfigFn } from 'tsdown';

type ConfigInput = UserConfig | UserConfig[] | UserConfigFn;

const defineConfig = untypedDefineConfig as (config: ConfigInput) => ConfigInput;

const configDir = dirname(fileURLToPath(import.meta.url));

/**
 * tsdown設定ファイルからの相対パスを絶対パスに変換する
 *
 * @param relativePath - 変換対象の相対パス
 * @returns 絶対パス
 */
const resolveFromConfig = (relativePath: string): string => resolve(configDir, relativePath);

/**
 * 依存関係をバンドル対象にするかを判定する
 *
 * @param id - 解決対象モジュールID
 * @returns モジュールを外部扱いから除外する場合はtrue
 */
const shouldBundleDependency = (id: string): boolean => {
  if (id.startsWith('.') || id.startsWith('/') || id.startsWith('\0')) return false;
  if (id.startsWith('node:')) return false;
  return true;
};

export default defineConfig({
  entry: {
    dopen: './src/cli.tsx',
  },
  platform: 'node',
  minify: true,
  alias: {
    'react-devtools-core': resolveFromConfig('./src/stubs/react-devtools-core.ts'),
  },
  env: {
    DEV: false,
    NODE_ENV: 'production',
  },
  define: {
    'process.env.NODE_ENV': '"production"',
    'process.env.DEV': '"false"',
  },
  noExternal: id => shouldBundleDependency(id),
  outputOptions: options => ({
    ...options,
    inlineDynamicImports: true,
  }),
  outExtensions: () => ({
    js: '',
  }),
});
