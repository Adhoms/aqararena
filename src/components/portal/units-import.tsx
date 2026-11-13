"use client";

import { startTransition, useActionState, useState } from "react";
import { importPortalUnits } from "@/app/portal/unit-actions";

/** Upload the project's units sheet: check first, then import. Problems are listed by row and column. */
export function UnitsImport({ projectId }: { projectId: string }) {
  const [result, dispatch, pending] = useActionState(importPortalUnits, null);
  const [fileName, setFileName] = useState("");
  const checkedOk = result?.ok && !result.saved;

  return (
    <div className="flex flex-col gap-3">
      <form
        action={dispatch}
        className="flex flex-wrap items-center gap-3"
        // Submit by hand: React resets a form after its action, which would empty the file box after "check".
        onSubmit={(e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
          if (submitter?.name) data.set(submitter.name, submitter.value);
          startTransition(() => dispatch(data));
        }}
      >
        <input type="hidden" name="projectId" value={projectId} />
        <input
          type="file"
          name="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          onChange={(e) => setFileName(e.target.files?.[0]?.name ?? "")}
          className="text-sm"
        />
        <button type="submit" name="mode" value="check" disabled={pending || !fileName} className="admin-btn-ghost">
          {pending ? "جارٍ الفحص…" : "افحص الملف"}
        </button>
        {checkedOk && (
          <button type="submit" name="mode" value="save" disabled={pending} className="admin-btn">
            {pending ? "جارٍ الرفع…" : "ارفع الوحدات"}
          </button>
        )}
      </form>
      {result && (
        <div role="status" aria-live="polite" className="flex flex-col gap-2 text-sm">
          <p className={result.ok ? "text-brand" : "text-red-700 dark:text-red-300"}>{result.message}</p>
          {result.problems.length > 0 && (
            <div className="overflow-x-auto">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>الصف</th>
                    <th>العمود</th>
                    <th>المشكلة</th>
                  </tr>
                </thead>
                <tbody>
                  {result.problems.slice(0, 100).map((p, i) => (
                    <tr key={i}>
                      <td>{p.row}</td>
                      <td>{p.column}</td>
                      <td>{p.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
