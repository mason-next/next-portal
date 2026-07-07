import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "@/lib/auth/server";

export async function GET(req: Request) {
  const session = await getServerSession();
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const url = new URL(req.url);
  const queryUserId = url.searchParams.get("userId");
  const isAllTeam = session.roleTypes.includes("Administrator") && queryUserId === "all";

  if (isAllTeam) {
    const [tasks, ownedSteps] = await Promise.all([
      db.implementationTask.findMany({
        where: { status: { notIn: ["Complete", "Cancelled"] }, parentTaskId: null, projectId: { not: null } },
        include: {
          project: { select: { id: true, name: true } },
          assignee: { select: { id: true, name: true } },
          subtasks: { select: { status: true } },
          _count: { select: { subtasks: true, comments: true } },
        },
        orderBy: [{ dueDate: "asc" }, { priority: "asc" }, { createdAt: "desc" }],
      }),
      db.workflowStep.findMany({
        where: { status: { notIn: ["Complete", "NotNeeded"] } },
        include: {
          project: { select: { id: true, name: true } },
          owner: { select: { id: true, name: true } },
        },
        orderBy: [{ dueDate: "asc" }, { updatedAt: "desc" }],
      }),
    ]);
    return NextResponse.json({ tasks, notifications: [], ownedSteps, isAllTeam: true });
  }

  const targetUserId =
    session.roleTypes.includes("Administrator") && queryUserId ? queryUserId : session.id;

  const taskInclude = {
    project: { select: { id: true, name: true } },
    assignee: { select: { name: true } },
    subtasks: { select: { status: true } },
    workflowStep: { select: { id: true, name: true, section: true } },
    _count: { select: { subtasks: true, comments: true } },
  };

  // Also find tasks where this user is an additional (non-primary) assignee via the join table.
  const extraTaskIds: string[] = await (db as any).implementationTaskAssignee
    .findMany({ where: { userId: targetUserId }, select: { taskId: true } })
    .then((rows: { taskId: string }[]) => rows.map((r) => r.taskId))
    .catch(() => [] as string[]);

  const assigneeFilter = {
    OR: [{ assigneeId: targetUserId }, ...(extraTaskIds.length > 0 ? [{ id: { in: extraTaskIds } }] : [])],
  };

  const [projectTasks, personalTasks, notifications, ownedSteps] = await Promise.all([
    db.implementationTask.findMany({
      where: {
        ...assigneeFilter,
        status: { notIn: ["Complete", "Cancelled"] },
        parentTaskId: null,
        projectId: { not: null },
      },
      include: taskInclude,
      orderBy: [{ dueDate: "asc" }, { priority: "asc" }, { createdAt: "desc" }],
    }),
    (db.implementationTask.findMany as (args: unknown) => Promise<unknown[]>)({
      where: {
        ...assigneeFilter,
        status: { notIn: ["Complete", "Cancelled"] },
        parentTaskId: null,
        isPersonal: true,
      },
      include: {
        assignee: { select: { name: true } },
        subtasks: { select: { status: true } },
        _count: { select: { subtasks: true, comments: true } },
      },
      orderBy: [{ dueDate: "asc" }, { priority: "asc" }, { createdAt: "desc" }],
    }),
    db.notification.findMany({
      where: { userId: targetUserId, isRead: false },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    db.workflowStep.findMany({
      where: {
        ownerId: targetUserId,
        status: { notIn: ["Complete", "NotNeeded"] },
      },
      include: {
        project: { select: { id: true, name: true } },
      },
      orderBy: [{ dueDate: "asc" }, { updatedAt: "desc" }],
    }),
  ]);

  // Attach synthetic project stub to personal tasks
  const personalTasksMapped = personalTasks.map((t: unknown) => ({
    ...(t as Record<string, unknown>),
    project: { id: "personal", name: "Personal" },
  }));

  const tasks = [...projectTasks, ...personalTasksMapped];

  return NextResponse.json({ tasks, notifications, ownedSteps });
}
