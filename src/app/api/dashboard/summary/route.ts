import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/server";
import { db } from "@/lib/db";

export async function GET() {
  const session = await getServerSession();
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const isAdmin = session.roleTypes.includes("Administrator");
  const userId = session.id;
  const now = new Date();

  if (isAdmin) {
    const [
      totalProjects,
      openTasks,
      overdueTasks,
      upcomingProjects,
      recentActivity,
      workloadRows,
    ] = await Promise.all([
      db.project.count(),
      db.implementationTask.count({
        where: { status: { notIn: ["Complete", "Cancelled"] }, parentTaskId: null },
      }),
      db.implementationTask.count({
        where: {
          status: { notIn: ["Complete", "Cancelled"] },
          dueDate: { lt: now },
          parentTaskId: null,
        },
      }),
      db.project.findMany({
        where: { targetCompletionDate: { gte: now } },
        select: { id: true, name: true, targetCompletionDate: true },
        orderBy: { targetCompletionDate: "asc" },
        take: 5,
      }),
      db.projectActivity.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true, projectId: true, activityType: true, userName: true,
          message: true, createdAt: true, category: true,
          project: { select: { name: true } },
        },
      }),
      (db as any).implementationTaskAssignee.groupBy({
        by: ["userId"],
        where: {
          task: {
            status: { notIn: ["Complete", "Cancelled"] },
            parentTaskId: null,
          },
        },
        _count: { taskId: true },
        orderBy: { _count: { taskId: "desc" } },
        take: 10,
      }).catch(() => [] as { userId: string; _count: { taskId: number } }[]),
    ]);

    // Resolve user names for workload
    const assigneeIds = (workloadRows as { userId: string; _count: { taskId: number } }[]).map((r) => r.userId);
    const users = assigneeIds.length > 0
      ? await db.user.findMany({
          where: { id: { in: assigneeIds } },
          select: { id: true, name: true },
        })
      : [];
    const nameById = new Map(users.map((u: { id: string; name: string }) => [u.id, u.name]));
    const workload = (workloadRows as { userId: string; _count: { taskId: number } }[]).map((r) => ({
      userId: r.userId,
      name: nameById.get(r.userId) ?? "Unknown",
      taskCount: r._count.taskId,
    }));

    return NextResponse.json({
      isAdmin: true,
      totalProjects,
      openTasks,
      overdueTasks,
      upcomingProjects,
      recentActivity,
      workload,
    });
  }

  // Member / Viewer view
  const memberFilter = {
    OR: [
      { seniorInsideId: userId },
      { insidePMId: userId },
      { fieldProjectManagerId: userId },
      { solutionsEngineerId: userId },
      { solutionsExecutiveId: userId },
      { members: { some: { userId } } },
    ],
  };

  const [
    myProjects,
    myOpenTasks,
    myOverdueTasks,
    upcomingProjects,
    recentActivity,
    myMentions,
  ] = await Promise.all([
    db.project.findMany({
      where: memberFilter,
      select: { id: true, name: true, targetCompletionDate: true },
      orderBy: { updatedAt: "desc" },
      take: 8,
    }),
    db.implementationTask.count({
      where: {
        assigneeId: userId,
        status: { notIn: ["Complete", "Cancelled"] },
        parentTaskId: null,
      },
    }),
    db.implementationTask.count({
      where: {
        assigneeId: userId,
        status: { notIn: ["Complete", "Cancelled"] },
        dueDate: { lt: now },
        parentTaskId: null,
      },
    }),
    db.project.findMany({
      where: {
        targetCompletionDate: { gte: now },
        ...memberFilter,
      },
      select: { id: true, name: true, targetCompletionDate: true },
      orderBy: { targetCompletionDate: "asc" },
      take: 5,
    }),
    db.projectActivity.findMany({
      where: { project: memberFilter },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true, projectId: true, activityType: true, userName: true,
        message: true, createdAt: true, category: true,
        project: { select: { name: true } },
      },
    }),
    db.notification.count({ where: { userId, isRead: false } }),
  ]);

  return NextResponse.json({
    isAdmin: false,
    myProjects,
    myOpenTasks,
    myOverdueTasks,
    upcomingProjects,
    recentActivity,
    myMentions,
  });
}
