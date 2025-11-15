import { Box, Text } from 'ink';

/**
 * プロファイル情報を表示するプロファイルサマリーコンポーネント
 */
export type ProfileSummaryProps = {
  /** 表示対象のプロファイル情報 */
  readonly profile: {
    /** プロファイル名 */
    profileName: string;
    /** プロファイルディレクトリ */
    dataDirectory: string;
    /** ロック状態 */
    locked: boolean;
    /** 最終起動日時 */
    lastLaunchedAt?: Date | undefined;
  };
};

/**
 * プロファイルディレクトリと状態復元可否を表示する
 *
 * @param props - プロファイル情報
 * @returns プロファイルサマリービュー
 */
export default function ProfileSummary({ profile }: ProfileSummaryProps) {
  const restoreMessage = profile.lastLaunchedAt
    ? `前回起動 ${profile.lastLaunchedAt.toISOString()} のデータを再利用します`
    : '初回起動のため新しいユーザーデータを作成します';

  return (
    <Box flexDirection="column">
      <Text>プロファイルディレクトリ: {profile.dataDirectory}</Text>
      <Text>状態復元: {restoreMessage}</Text>
    </Box>
  );
}
