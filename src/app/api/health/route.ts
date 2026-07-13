export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(
    { ok: true, timestamp: new Date().toISOString() },
    { status: 200 },
  );
}
