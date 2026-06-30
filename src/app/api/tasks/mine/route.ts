import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "@/lib/auth/server";

export async function GET(req: Request) {
  const session = await getServerSession();
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  // Admins can pass ?userId=xxx to see another user's tasks
  const url = new URL(req.url);
  const queryUserId = url.searchParams.get("userId");
  const targetUserId =
    session.accountType === "Administrator" && queryUserId ? queryUserId : session.id;

  const [tasks, notifications, ownedSteps] = await Promise.all([
    db.implementationTask.findMany({
      where: {
        assigneeId: targetUserId,
        status: { notIn: ["Complete", "Cancelled"] },
        parentTaskId: null,
      },
      include: {
        project: { select: { id: true, name: true } },
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

  return NextResponse.json({ tasks, notifications, ownedSteps });
}
