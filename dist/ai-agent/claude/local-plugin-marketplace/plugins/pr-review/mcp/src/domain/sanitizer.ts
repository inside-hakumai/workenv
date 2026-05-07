const CONTROL_CHARS = new RegExp("[\\u0000-\\u0009\\u000b-\\u001f\\u007f]", "g");
const PATH_UNSAFE_CHARS = new RegExp("[\\u0000-\\u001f\\u007f\\u2028-\\u202e]", "g");

export function sanitizeString(s: string, maxLength = 200): string {
  return s.replace(CONTROL_CHARS, " ").trim().slice(0, maxLength);
}

export function sanitizePath(p: string): string {
  return p.replace(PATH_UNSAFE_CHARS, " ").trim();
}

export function sanitizeBody(body: string, lineMaxLength = 150): string {
  return body
    .replace(CONTROL_CHARS, " ")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => (line.length > lineMaxLength ? line.slice(0, lineMaxLength) + "..." : line))
    .join(" / ");
}

export function sanitizeBodyPreview(body: string, maxLength = 200): string {
  const firstLine = body.split("\n")[0] ?? "";
  return sanitizeString(firstLine, maxLength);
}
