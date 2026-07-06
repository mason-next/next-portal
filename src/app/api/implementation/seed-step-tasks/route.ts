import { NextResponse } from "next/server";
import { seedStepTasks, stepHasTasks, type SelectedTask } from "@/lib/data/task-templates";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const projectId = url.searchParams.get("projectId");
  const workflowStepId = url.searchParams.get("workflowStepId");
  if (!projectId || !workflowStepId) {
    return NextResponse.json({ error: "Missing projectId or workflowStepId" }, { status: 400 });
  }
  try {
    const exists = await stepHasTasks(projectId, workflowStepId);
    return NextResponse.json({ exists });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      projectId: string;
      workflowStepId: string;
      stepKey: string;
      selectedTasks?: SelectedTask[];
    };

    const { projectId, workflowStepId, stepKey, selectedTasks } = body;

    if (!projectId || !workflowStepId || !stepKey) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const result = await seedStepTasks(projectId, workflowStepId, stepKey, selectedTasks);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
