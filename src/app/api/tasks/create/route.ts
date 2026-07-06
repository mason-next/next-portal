import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/server";
import { createTask } from "@/lib/data/implementation";

export async function POST(req: Request) {
  const session = await getServerSession();
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const body = await req.json();
  const task = await createTask({
    title: body.title,
    description: body.description ?? "",
    projectId: body.projectId ?? null,
    workflowStepId: body.workflowStepId ?? null,
    assigneeId: body.assigneeId ?? session.id,
    priority: body.priority ?? "Medium",
    dueDate: body.dueDate ?? null,
    isPersonal: !body.projectId,
  });
  return NextResponse.json(task);
}
