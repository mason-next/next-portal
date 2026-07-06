import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/server";
import { db } from "@/lib/db";

const memberProjectFilter = (userId: string) => ({
  OR: [
    { fieldProjectManagerId: userId },
    { solutionsExecutiveId: userId },
    { solutionsEngineerId: userId },
    { seniorInsideId: userId },
    { insidePMId: userId },
    { members: { some: { userId } } },
  ],
});

export async function GET() {
  const session = await getServerSession();
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const isAdmin = session.accountType === "Administrator";
  const userId = session.id;

  const activityWhere = isAdmin ? {} : { project: memberProjectFilter(userId) };

  const recentActivity = await db.projectActivity.findMany({
    where: activityWhere,
    orderBy: { createdAt: "desc" },
    take: 15,
    select: {
      id: true,
      projectId: true,
      activityType: true,
      userName: true,
      message: true,
      createdAt: true,
      category: true,
      project: { select: { name: true } },
    },
  });

  return NextResponse.json({ recentActivity });
}
