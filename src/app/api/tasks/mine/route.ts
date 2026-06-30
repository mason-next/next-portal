import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "@/lib/auth/server";

export async function GET() {
  const session = await getServerSession();
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const [tasks, notifications] = await Promise.all([
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
  ]);

  return NextResponse.json({ tasks, notifications });
}
