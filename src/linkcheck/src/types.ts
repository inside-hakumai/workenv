export type LinkKind = "file" | "directory";

export interface LinkEntry {
  source: string;
  target: string;
  kind: LinkKind;
}

export type LinkStatus =
  | "ok"
  | "missing"
  | "conflict-file"
  | "conflict-symlink";

export interface LinkState {
  entry: LinkEntry;
  status: LinkStatus;
  actualTarget?: string;
}
