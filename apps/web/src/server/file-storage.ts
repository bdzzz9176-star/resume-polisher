import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { resolveWorkspacePath } from "./workspace-paths";

const LOCAL_USER_ID = "local-user";

function storageRoot() {
  return resolveWorkspacePath(process.env.FILE_STORAGE_ROOT, "storage/files");
}

function projectDirectory(projectId: string) {
  return path.join(storageRoot(), LOCAL_USER_ID, projectId);
}

export async function saveProjectSource(projectId: string, file: File) {
  const extension = path.extname(file.name).toLowerCase();
  const directory = projectDirectory(projectId);
  const filePath = path.join(directory, `source${extension}`);
  await mkdir(directory, { recursive: true });
  await writeFile(filePath, Buffer.from(await file.arrayBuffer()));
  return path.relative(storageRoot(), filePath).replaceAll(path.sep, "/");
}

export async function removeProjectFiles(projectId: string) {
  await rm(projectDirectory(projectId), { recursive: true, force: true });
}

export function getStoredFilePath(sourceFileKey: string) {
  return path.join(storageRoot(), sourceFileKey);
}

