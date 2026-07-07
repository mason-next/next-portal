import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "@/lib/auth/server";
import { createTask } from "@/lib/data/implementation";
import type { TaskPriority } from "@/types/implementation";

interface ImportRow {
  title: string;
  projectId: string | null;
  isPersonal: boolean;
  priority: TaskPriority;
  dueDate: string | null; // ISO date string (YYYY-MM-DD) or null
  assigneeIds: string[];
  description: string;
}

export async function POST(req: Request) {
  const session = await getServerSession();
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body || !Array.isArray(body.rows)) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const rows: ImportRow[] = body.rows;
  let created = 0, duplicates = 0, errors = 0, personal = 0, project = 0;

  for (const row of rows) {
    try {
      // Build duplicate check WHERE clause
      const dueDateStart = row.dueDate ? new Date(`${row.dueDate}T00:00:00`) : null;
      const dueDateEnd   = row.dueDate ? new Date(`${row.dueDate}T23:59:59`) : null;

      const primaryAssigneeId = row.assigneeIds[0] ?? null;
      const existing = await db.implementationTask.findFirst({
        where: {
          title: { equals: row.title, mode: "insensitive" },
          assigneeId: primaryAssigneeId,
          projectId: row.projectId ?? null,
          ...(dueDateStart && dueDateEnd
            ? { dueDate: { gte: dueDateStart, lte: dueDateEnd } }
            : { dueDate: null }),
        },
        select: { id: true },
      });

      if (existing) {
        duplicates++;
        continue;
      }

      await createTask({
        title: row.title,
        description: row.description,
        projectId: row.projectId,
        isPersonal: row.isPersonal,
        priority: row.priority,
        dueDate: row.dueDate ? new Date(row.dueDate).toISOString() : null,
        assigneeIds: row.assigneeIds,
      });

      created++;
      if (row.isPersonal) personal++;
      else project++;
    } catch {
      errors++;
    }
  }

  return NextResponse.json({ created, duplicates, errors, personal, project });
}
