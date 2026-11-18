"use client";

import { startTransition, useActionState, useState } from "react";
import { runImport } from "@/app/admin/import/actions";

const SHEET_NAMES = [
  ["developers", "مطورين"],
  ["projects", "مشروعات"],
  ["typologies", "نماذج"],
  ["plans", "أنظمة سداد"],
  ["units", "وحدات"],
] as const;

/** Upload a filled workbook, check it, then import it. Problems are listed by sheet, row and column. */
export function ImportForm() {
  const [result, dispatch, pending] = useActionState(runImport, null);
  const [fileName, setFileName] = useState("");
  const checkedOk = result?.ok && !result.saved;

  return (
    <section className="admin-panel flex flex-col gap-4">
      <h2 className="font-display text-xl">2. ارفع الملف بعد ما تملاه</h2>
      <form
        action={dispatch}
        className="flex flex-col gap-4"
        // Submit by hand: React resets a form after its action runs, which would empty the file
        // box after "check" and leave nothing for "import".
        onSubmit={(e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          const button = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
          if (button?.name) data.set(button.name, button.value);
          startTransition(() => dispatch(data));
        }}
      >
        <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-line-strong p-8 text-center hover:border-brand">
          <span className="font-medium" dir="auto">
            {fileName || "اختار ملف xlsx"}
          </span>
          <span className="text-xs text-muted">الملف بيتفحص كله الأول، ومافيش حاجة بتتحفظ لو فيه أي غلطة.</span>
          <input
            type="file"
            name="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="sr-only"
            onChange={(e) => setFileName(e.target.files?.[0]?.name ?? "")}
          />
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" name="mode" value="check" disabled={pending || !fileName} className={checkedOk ? "admin-btn-ghost" : "admin-btn"}>
            {pending ? "جارٍ الفحص…" : "افحص الملف"}
          </button>
          {checkedOk && (
            <button type="submit" name="mode" value="save" disabled={pending} className="admin-btn">
              {pending ? "جارٍ الاستيراد…" : "استورد البيانات"}
            </button>
          )}
        </div>
      </form>

      {result && (
        <div role="status" aria-live="polite" className="flex flex-col gap-3">
          <p className={`font-medium ${result.ok ? "text-brand" : "text-red-700 dark:text-red-300"}`}>{result.message}</p>
          {result.warning && <p className="rounded-lg border border-brass bg-brass-soft px-3 py-2 text-brass-dark text-sm">تنبيه: {result.warning}</p>}
          {result.ok && (
            <ul className="grid gap-2 text-sm sm:grid-cols-5">
              {SHEET_NAMES.map(([key, name]) => (
                <li key={key} className="rounded-lg border border-line p-3">
                  <div className="text-muted">{name}</div>
                  <div>
                    {result.counts[key].create} جديد · {result.counts[key].update} تحديث
                  </div>
                </li>
              ))}
            </ul>
          )}
          {result.saved && <p className="text-sm">ارجع لصفحة كل مشروع عشان ترفع الصور والماستر بلان.</p>}
          {result.problems.length > 0 && (
            <div className="overflow-x-auto">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>الشيت</th>
                    <th>الصف</th>
                    <th>العمود</th>
                    <th>المشكلة</th>
                  </tr>
                </thead>
                <tbody>
                  {result.problems.slice(0, 300).map((p, i) => (
                    <tr key={i}>
                      <td>{p.sheet}</td>
                      <td>{p.row || "—"}</td>
                      <td>{p.column || "—"}</td>
                      <td>{p.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {result.problems.length > 300 && <p className="mt-2 text-sm text-muted">وفيه {result.problems.length - 300} مشكلة كمان.</p>}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
