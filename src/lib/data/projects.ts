import type { NewProjectInput, Project } from "@/types/project";
import { SAMPLE_PROJECT } from "@/lib/mock/projects.mock";
import { readGlobal, writeGlobal } from "@/lib/storage/local-store";

const PROJECTS_KEY = "projects";

function loadAll(): Project[] {
  const stored = readGlobal<Project[]>(PROJECTS_KEY);
  if (stored) return stored;
  const seeded = [SAMPLE_PROJECT];
  writeGlobal(PROJECTS_KEY, seeded);
  return seeded;
}

export async function getProjects(): Promise<Project[]> {
  return loadAll();
}

export async function getProject(id: string): Promise<Project | null> {
  return loadAll().find((p) => p.id === id) ?? null;
}

export async function createProject(input: NewProjectInput): Promise<Project> {
  const all = loadAll();
  const now = new Date().toISOString();
  const project: Project = {
    id: crypto.randomUUID(),
    name: input.name,
    projectNumber: input.projectNumber,
    customerName: input.customerName,
    coordinatorGroup: input.coordinatorGroup,
    state: "BOM Review",
    createdAt: now,
    updatedAt: now,
  };
  writeGlobal(PROJECTS_KEY, [...all, project]);
  return project;
}

export async function updateProject(id: string, patch: Partial<Project>): Promise<Project> {
  const all = loadAll();
  const index = all.findIndex((p) => p.id === id);
  if (index === -1) throw new Error(`Project not found: ${id}`);
  const updated: Project = { ...all[index], ...patch, id, updatedAt: new Date().toISOString() };
  const next = [...all];
  next[index] = updated;
  writeGlobal(PROJECTS_KEY, next);
  return updated;
}
