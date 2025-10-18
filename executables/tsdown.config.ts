import { defineConfig as untypedDefineConfig } from 'tsdown/config';
import type { UserConfig, UserConfigFn } from 'tsdown';

type ConfigInput = UserConfig | UserConfig[] | UserConfigFn;

const defineConfig = untypedDefineConfig as (config: ConfigInput) => ConfigInput;

export default defineConfig({
  entry: ['./src/cli.tsx'],
});
