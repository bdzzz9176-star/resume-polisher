import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import type {
  DocumentParseContract,
  JobAnalysisContract,
  OptimizedResumeContract,
} from "@ai-job-search/contracts";

import { resolveWorkspacePath } from "./workspace-paths";

const LOCAL_USER_ID = "local-user";

export interface StoredProject {
  id: string;
  status: "parsed" | "analyzed";
  resumeFileName: string;
  sourceFileKey: string;
  jd: string;
  document: DocumentParseContract;
  analysis: JobAnalysisContract | null;
  optimizedResume: OptimizedResumeContract | null;
  createdAt: string;
  updatedAt: string;
}

export type PublicProject = Omit<StoredProject, "sourceFileKey">;

interface ProjectRow {
  id: string;
  status: "parsed" | "analyzed";
  resume_file_name: string;
  source_file_key: string;
  jd: string;
  document_json: string;
  analysis_json: string | null;
  optimized_resume_json: string | null;
  created_at: string;
  updated_at: string;
}

let database: DatabaseSync | null = null;

function databasePath() {
  const configured = process.env.DATABASE_URL?.replace(/^file:/, "");
  return resolveWorkspacePath(configured, "storage/dev.db");
}

function getDatabase() {
  if (database) return database;

  const filePath = databasePath();
  mkdirSync(path.dirname(filePath), { recursive: true });
  database = new DatabaseSync(filePath);
  database.exec("PRAGMA journal_mode = WAL;");
  database.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      status TEXT NOT NULL,
      resume_file_name TEXT NOT NULL,
      source_file_key TEXT NOT NULL,
      jd TEXT NOT NULL,
      document_json TEXT NOT NULL,
      analysis_json TEXT,
      optimized_resume_json TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS projects_user_updated_idx
      ON projects(user_id, updated_at DESC);
  `);
  ensureColumn(database, "projects", "analysis_json", "TEXT");
  ensureColumn(database, "projects", "optimized_resume_json", "TEXT");
  return database;
}

function ensureColumn(db: DatabaseSync, tableName: string, columnName: string, columnType: string) {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all() as unknown as Array<{ name: string }>;
  if (!columns.some((column) => column.name === columnName)) {
    db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnType};`);
  }
}

function mapProject(row: ProjectRow): StoredProject {
  return {
    id: row.id,
    status: row.status,
    resumeFileName: row.resume_file_name,
    sourceFileKey: row.source_file_key,
    jd: row.jd,
    document: JSON.parse(row.document_json) as DocumentParseContract,
    analysis: row.analysis_json ? (JSON.parse(row.analysis_json) as JobAnalysisContract) : null,
    optimizedResume: row.optimized_resume_json
      ? (JSON.parse(row.optimized_resume_json) as OptimizedResumeContract)
      : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toPublicProject(project: StoredProject): PublicProject {
  return {
    id: project.id,
    status: project.status,
    resumeFileName: project.resumeFileName,
    jd: project.jd,
    document: project.document,
    analysis: project.analysis,
    optimizedResume: project.optimizedResume,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  };
}

export function createProject(project: StoredProject) {
  getDatabase()
    .prepare(`
      INSERT INTO projects (
        id, user_id, status, resume_file_name, source_file_key,
        jd, document_json, analysis_json, optimized_resume_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      project.id,
      LOCAL_USER_ID,
      project.status,
      project.resumeFileName,
      project.sourceFileKey,
      project.jd,
      JSON.stringify(project.document),
      project.analysis ? JSON.stringify(project.analysis) : null,
      project.optimizedResume ? JSON.stringify(project.optimizedResume) : null,
      project.createdAt,
      project.updatedAt,
    );
  return project;
}

export function listProjects() {
  const rows = getDatabase()
    .prepare(`
      SELECT id, status, resume_file_name, source_file_key, jd,
             document_json, analysis_json, optimized_resume_json, created_at, updated_at
      FROM projects
      WHERE user_id = ?
      ORDER BY updated_at DESC
    `)
    .all(LOCAL_USER_ID) as unknown as ProjectRow[];
  return rows.map(mapProject);
}

export function findProject(projectId: string) {
  const row = getDatabase()
    .prepare(`
      SELECT id, status, resume_file_name, source_file_key, jd,
             document_json, analysis_json, optimized_resume_json, created_at, updated_at
      FROM projects
      WHERE user_id = ? AND id = ?
    `)
    .get(LOCAL_USER_ID, projectId) as unknown as ProjectRow | undefined;
  return row ? mapProject(row) : null;
}

export function saveProjectAnalysis(projectId: string, analysis: JobAnalysisContract) {
  const now = new Date().toISOString();
  const result = getDatabase()
    .prepare(`
      UPDATE projects
      SET status = ?, analysis_json = ?, updated_at = ?
      WHERE user_id = ? AND id = ?
    `)
    .run("analyzed", JSON.stringify(analysis), now, LOCAL_USER_ID, projectId);

  if (result.changes === 0) return null;
  return findProject(projectId);
}

export function saveOptimizedResume(projectId: string, optimizedResume: OptimizedResumeContract) {
  const now = new Date().toISOString();
  const result = getDatabase()
    .prepare(`
      UPDATE projects
      SET optimized_resume_json = ?, updated_at = ?
      WHERE user_id = ? AND id = ?
    `)
    .run(JSON.stringify(optimizedResume), now, LOCAL_USER_ID, projectId);

  if (result.changes === 0) return null;
  return findProject(projectId);
}

