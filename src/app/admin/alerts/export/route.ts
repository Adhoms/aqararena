import { isAdmin } from "@/lib/admin/auth";
import { db } from "@/lib/db";

// GET /admin/alerts/export[?project=<id>] → the price-alert subscribers as a CSV that Excel opens
// with Arabic intact (UTF-8 with a byte-order mark).
export async function GET(request: Request) {
  if (!(await isAdmin())) return new Response("Unauthorized", { status: 401 });
  const project = new URL(request.url).searchParams.get("project") || undefined;
  const alerts = await db.priceAlert.findMany({
    where: project ? { projectId: project } : {},
    include: { project: { select: { nameAr: true } } },
    orderBy: { createdAt: "desc" },
  });

  // Quote every cell, and keep spreadsheet formulas from running if a name starts with = + - @.
  const cell = (v: string) => `"${(/^[=+\-@]/.test(v) ? `'${v}` : v).replace(/"/g, '""')}"`;
  const rows = [
    ["الاسم", "البريد", "الموبايل", "المشروع", "الحالة", "تاريخ الاشتراك", "اللغة"],
    ...alerts.map((a) => [
      a.name,
      a.email,
      a.phone ?? "",
      a.project.nameAr,
      a.confirmedAt ? "مؤكد" : "مستني التأكيد",
      a.createdAt.toISOString().slice(0, 10),
      a.locale === "en" ? "English" : "عربي",
    ]),
  ];
  const csv = "﻿" + rows.map((r) => r.map(cell).join(",")).join("\r\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="aqararena-price-alerts-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
