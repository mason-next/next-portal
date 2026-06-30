import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "@/lib/auth/server";

export async function GET() {
  const session = await getServerSession();
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const [tasks, notifications, ownedSteps] = await Promise.all([
    db.implementationTask.findMany({
      where: {
        assigneeId: session.id,
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
      where: { userId: session.id, isRead: false },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    db.workflowStep.findMany({
      where: {
        ownerId: session.id,
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
