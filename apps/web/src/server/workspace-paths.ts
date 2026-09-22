import { existsSync } from "node:fs";
import path from "node:path";

let cachedWorkspaceRoot: string | null = null;

export function findWorkspaceRoot() {
  if (cachedWorkspaceRoot) return cachedWorkspaceRoot;

  let current = process.cwd();
  while (true) {
    if (existsSync(path.join(current, "pnpm-workspace.yaml"))) {
      cachedWorkspaceRoot = current;
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      throw new Error("无法定位项目工作空间根目录。");
    }
    current = parent;
  }
}

export function resolveWorkspacePath(configuredPath: string | undefined, fallback: string) {
  const value = configuredPath?.trim() || fallback;
  return path.isAbsolute(value) ? value : path.resolve(findWorkspaceRoot(), value);
}

