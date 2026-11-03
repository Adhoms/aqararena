import { isAdmin } from "@/lib/admin/auth";
import { buildTemplate } from "@/lib/admin/import/workbook";

// GET /admin/import/template        → empty template with dropdowns
// GET /admin/import/template?data=1 → the same, filled with everything on the site (to edit in bulk)
export async function GET(request: Request) {
  if (!(await isAdmin())) return new Response("Unauthorized", { status: 401 });
  const withData = new URL(request.url).searchParams.get("data") === "1";
  const file = await buildTemplate(withData);
  const name = withData ? `aqararena-data-${new Date().toISOString().slice(0, 10)}.xlsx` : "aqararena-template.xlsx";
  return new Response(file, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "no-store",
    },
  });
}
