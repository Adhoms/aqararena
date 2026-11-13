import { db } from "@/lib/db";
import { buildProjectUnitsWorkbook } from "@/lib/admin/import/workbook";
import { currentAccount } from "@/lib/portal/session";

// GET /portal/projects/<id>/units/export → the project's units as an Excel file to edit and upload back.
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await currentAccount();
  if (!me || me.mustChangePassword) return new Response("Unauthorized", { status: 401 });
  const { id } = await params;
  const project = await db.project.findFirst({ where: { id, developerId: me.developerId }, select: { id: true, slug: true } });
  if (!project) return new Response("Not found", { status: 404 });
  const file = await buildProjectUnitsWorkbook(project.id);
  return new Response(file, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${project.slug}-units.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
