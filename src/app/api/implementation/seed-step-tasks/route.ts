import { NextResponse } from "next/server";
import { seedStepTasks } from "@/lib/data/task-templates";

export async function POST(request: Request) {
  try {
    const { projectId, workflowStepId, stepKey } = (await request.json()) as {
      projectId: string;
      workflowStepId: string;
      stepKey: string;
    };

    if (!projectId || !workflowStepId || !stepKey) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const result = await seedStepTasks(projectId, workflowStepId, stepKey);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
