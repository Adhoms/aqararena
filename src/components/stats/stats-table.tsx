import type { ProjectStats } from "@/lib/stats";
import { changePct, CONTACT_EVENTS, STAT_EVENTS, STAT_LABELS, type StatEvent } from "@/lib/stats-events";

// Visitor statistics for a list of projects, for the admin and the developer portal (both Arabic).

const num = (n: number) => n.toLocaleString("ar-EG");

/** A number with its change from the period before, e.g. "١٢٠ ↑ ٢٠٪". */
function Figure({ now, before }: { now: number; before: number }) {
  const pct = changePct({ now, before });
  return (
    <span className="inline-flex items-baseline gap-1.5 whitespace-nowrap">
      <span className="font-semibold">{num(now)}</span>
      {pct !== null && pct !== 0 && (
        <span className={`text-xs ${pct > 0 ? "text-brand" : "text-red-700 dark:text-red-300"}`}>
          {pct > 0 ? "↑" : "↓"} {num(Math.abs(pct))}٪
        </span>
      )}
    </span>
  );
}

const sum = (s: ProjectStats, events: StatEvent[]) =>
  events.reduce((acc, e) => ({ now: acc.now + s.totals[e].now, before: acc.before + s.totals[e].before }), { now: 0, before: 0 });

export function StatsTable({ rows, days = 30 }: { rows: { id: string; name: string; href?: string; stats: ProjectStats }[]; days?: number }) {
  if (rows.length === 0) return <p className="text-sm text-muted">مافيش مشروعات منشورة لسه.</p>;
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted">
        آخر {num(days)} يوم، والسهم بيقارن بالـ {num(days)} يوم اللي قبلهم. كل زائر بيتحسب مرة واحدة في الجلسة لكل حاجة عملها. الأرقام تقديرية ومش بتعرّف الزوار.
      </p>
      <div className="overflow-x-auto">
        <table className="admin-table">
          <thead>
            <tr>
              <th>المشروع</th>
              <th>{STAT_LABELS.VIEW}</th>
              <th>ضغطات التواصل</th>
              <th>{STAT_LABELS.FAVORITE}</th>
              <th>{STAT_LABELS.COMPARE}</th>
              <th>{STAT_LABELS.OFFER}</th>
              <th>مشتركين التنبيهات</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ id, name, href, stats }) => (
              <tr key={id}>
                <td>
                  <details>
                    <summary className="cursor-pointer font-medium">{href ? <a href={href}>{name}</a> : name}</summary>
                    <dl className="mt-2 grid grid-cols-[auto_auto] gap-x-4 gap-y-1 text-xs">
                      {STAT_EVENTS.map((e) => (
                        <div key={e} className="contents">
                          <dt className="text-muted">{STAT_LABELS[e]}</dt>
                          <dd>
                            <Figure {...stats.totals[e]} />
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </details>
                </td>
                <td>
                  <Figure {...stats.totals.VIEW} />
                </td>
                <td>
                  <Figure {...sum(stats, CONTACT_EVENTS)} />
                </td>
                <td>
                  <Figure {...stats.totals.FAVORITE} />
                </td>
                <td>
                  <Figure {...stats.totals.COMPARE} />
                </td>
                <td>
                  <Figure {...stats.totals.OFFER} />
                </td>
                <td className="font-semibold">{num(stats.subscribers)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
