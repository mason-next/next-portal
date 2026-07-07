import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/server";
import { getTask } from "@/lib/data/implementation";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const session = await getServerSession();
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const { taskId } = await params;
  const task = await getTask(taskId);
  if (!task) return new NextResponse("Not Found", { status: 404 });

  const isAdmin = session.roleTypes.includes("Administrator");
  if (
    !isAdmin &&
    !task.assignees.some((a) => a.id === session.id) &&
    task.createdById !== session.id
  ) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  return NextResponse.json(task);
}
