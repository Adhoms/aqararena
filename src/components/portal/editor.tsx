"use client";

import { useEffect, useId, useRef, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { saveSubmission } from "@/app/portal/actions";
import { checkFile, uploadFile } from "@/components/admin/upload";
import { SCHEDULE_INPUT, ScheduleHint, SchedulePreview, previewError } from "@/components/admin/schedule-field";
import { IMAGE_TYPES } from "@/lib/admin/upload-config";
import { moneyAr } from "@/lib/format";
import { LIMITS, type DraftErrors, type Fields, type MediaItem, type ProfileDraft, type ProjectDraft } from "@/lib/portal/draft-types";
import {
  DISTANCE_FIELDS,
  PLAN_FIELDS,
  PORTAL_MEDIA_KINDS,
  PORTAL_PHOTO_GROUPS,
  PROFILE_FIELDS,
  PROJECT_FIELDS,
  TYPOLOGY_FIELDS,
  type FieldDef,
} from "@/lib/portal/fields";
import { isCurrency } from "@/lib/property";

// The portal's editors. Everything lives in the browser until "save draft" or "send for review";
// the server checks the whole draft with the admin's rules and sends back field errors by path.

type Option = { value: string; label: string };
const SPAN = { 1: "", 2: "lg:col-span-2", 4: "sm:col-span-2 lg:col-span-4" } as const;
const isImage = (url: string) => /\.(webp|jpe?g|png|avif|gif|svg)(\?|$)/i.test(url);

// ─── One field ──────────────────────────────────────────────────────────

function Field({
  def,
  value,
  onChange,
  error,
  areas,
  folder,
}: {
  def: FieldDef;
  value: string | string[] | undefined;
  onChange: (v: string | string[]) => void;
  error?: string;
  areas?: Option[];
  folder: string;
}) {
  const text = typeof value === "string" ? value : "";
  const invalid = error ? true : undefined;
  const id = useId();
  const label = (
    <span className="font-medium text-ink">
      {def.label}
      {def.required && " *"}
    </span>
  );
  let control: ReactNode;

  if (def.type === "choices") {
    const chosen = Array.isArray(value) ? value : [];
    return (
      <fieldset className={`flex flex-col gap-2 text-sm ${SPAN[def.span ?? 1]}`}>
        <legend className="mb-1.5">{label}</legend>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {def.choices!.map((c) => (
            <label key={c.value} className="flex items-center gap-1.5">
              <input
                type="checkbox"
                className="size-4 accent-brand"
                checked={chosen.includes(c.value)}
                onChange={(e) => onChange(e.target.checked ? [...chosen, c.value] : chosen.filter((x) => x !== c.value))}
              />
              <span>{c.label}</span>
            </label>
          ))}
        </div>
        {error && <span className="text-xs text-red-700 dark:text-red-300">{error}</span>}
      </fieldset>
    );
  }

  if (def.type === "image") return <ImageField def={def} value={text} onChange={onChange} error={error} folder={folder} />;

  if (def.type === "schedule") {
    // Only the title is the label; the check, the hint and the error are tied to the field by
    // aria-describedby. The server's message is left out only when the live check says the same.
    const showError = error && error !== previewError(text);
    return (
      <div className={`flex flex-col gap-1.5 text-sm ${SPAN[def.span ?? 1]}`}>
        <label htmlFor={`${id}-input`}>{label}</label>
        <textarea
          {...SCHEDULE_INPUT}
          id={`${id}-input`}
          value={text}
          aria-invalid={invalid}
          aria-describedby={`${id}-preview ${id}-hint${def.hint ? ` ${id}-note` : ""}${showError ? ` ${id}-error` : ""}`}
          onChange={(e) => onChange(e.target.value)}
        />
        <SchedulePreview id={`${id}-preview`} text={text} />
        <ScheduleHint id={`${id}-hint`} />
        {def.hint && (
          <span id={`${id}-note`} className="text-xs text-muted">
            {def.hint}
          </span>
        )}
        {showError && (
          <span id={`${id}-error`} className="text-xs text-red-700 dark:text-red-300">
            {error}
          </span>
        )}
      </div>
    );
  } else if (def.type === "textarea") {
    control = <textarea className="admin-input" rows={4} dir={def.dir} value={text} aria-invalid={invalid} onChange={(e) => onChange(e.target.value)} />;
  } else if (def.type === "choice" || def.type === "area") {
    const list = def.type === "area" ? (areas ?? []) : def.choices!;
    control = (
      <select className="admin-input" value={text} aria-invalid={invalid} onChange={(e) => onChange(e.target.value)}>
        <option value="">— اختر —</option>
        {list.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    );
  } else {
    control = (
      <input
        className="admin-input"
        type={def.type === "date" ? "date" : def.type === "url" ? "url" : "text"}
        inputMode={def.type === "number" ? "decimal" : undefined}
        dir={def.dir ?? (def.type === "number" || def.type === "date" || def.type === "url" ? "ltr" : undefined)}
        value={text}
        aria-invalid={invalid}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }
  return (
    <label className={`flex flex-col gap-1.5 text-sm ${SPAN[def.span ?? 1]}`}>
      {label}
      {control}
      {def.hint && <span className="text-xs text-muted">{def.hint}</span>}
      {error && <span className="text-xs text-red-700 dark:text-red-300">{error}</span>}
    </label>
  );
}

function ImageField({ def, value, onChange, error, folder }: { def: FieldDef; value: string; onChange: (v: string) => void; error?: string; folder: string }) {
  const [progress, setProgress] = useState<number | null>(null);
  const [problem, setProblem] = useState("");
  const input = useRef<HTMLInputElement>(null);
  async function pick(file?: File) {
    if (!file) return;
    setProblem("");
    setProgress(0);
    try {
      const up = await uploadFile(file, folder, { plan: def.key === "masterPlanUrl", onProgress: setProgress, handleUploadUrl: "/portal/upload" });
      onChange(up.url);
    } catch (e) {
      setProblem(e instanceof Error ? e.message : "تعذّر الرفع");
    } finally {
      setProgress(null);
      if (input.current) input.current.value = "";
    }
  }
  return (
    <div className={`flex flex-col gap-1.5 text-sm ${SPAN[def.span ?? 1]}`}>
      <span className="font-medium text-ink">{def.label}</span>
      <div className="flex flex-wrap items-center gap-3">
        {value && isImage(value) && (
          // eslint-disable-next-line @next/next/no-img-element -- preview of an uploaded file
          <img src={value} alt="" className="h-20 w-28 rounded-lg border border-line object-cover" />
        )}
        <button type="button" className="admin-btn-ghost" disabled={progress !== null} onClick={() => input.current?.click()}>
          {progress !== null ? `${Math.round(progress)}%` : value ? "تغيير الصورة" : "رفع صورة"}
        </button>
        {value && (
          <button type="button" className="text-xs text-red-700 dark:text-red-300" onClick={() => onChange("")}>
            إزالة
          </button>
        )}
        <input ref={input} type="file" accept={IMAGE_TYPES.join(",")} hidden onChange={(e) => pick(e.target.files?.[0])} />
      </div>
      {(problem || error) && <span className="text-xs text-red-700 dark:text-red-300">{problem || error}</span>}
    </div>
  );
}

function Grid({ children }: { children: ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{children}</div>;
}

function Section({ title, children, note, error }: { title: string; children: ReactNode; note?: ReactNode; error?: string }) {
  return (
    <section className="admin-panel flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="font-display text-xl">{title}</h2>
        {note && <p className="text-sm text-muted">{note}</p>}
        {error && <p className="text-sm text-red-700 dark:text-red-300">{error}</p>}
      </div>
      {children}
    </section>
  );
}

// ─── Repeating rows (unit types, plans, distances) ──────────────────────

/** A collapsible row that stays as the developer left it while they type; it opens itself on errors. */
function RowItem({ title, startOpen, hasError, children }: { title: string; startOpen: boolean; hasError: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(startOpen || hasError);
  const [shownError, setShownError] = useState(hasError);
  if (hasError !== shownError) {
    setShownError(hasError);
    if (hasError) setOpen(true);
  }
  return (
    <details className={`admin-item ${hasError ? "border-red-600/60" : ""}`} open={open} onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary>
        <span className="font-medium">{title}</span>
        <span className="text-xs text-link">{open ? "إخفاء ▴" : "تعديل ▾"}</span>
      </summary>
      {children}
    </details>
  );
}

function Rows({
  name,
  items,
  defs,
  errors,
  onChange,
  addLabel,
  max,
  summary,
  folder,
}: {
  name: string;
  items: Fields[];
  defs: FieldDef[];
  errors: DraftErrors;
  onChange: (items: Fields[]) => void;
  addLabel: string;
  max: number;
  summary: (item: Fields) => string;
  folder: string;
}) {
  return (
    <div className="flex flex-col gap-3">
      {items.map((item, i) => (
        <RowItem key={i} hasError={Object.keys(errors).some((k) => k.startsWith(`${name}.${i}.`))} startOpen={!summary(item)} title={summary(item) || `${addLabel.replace("+ ", "")} ${i + 1}`}>
          <Grid>
            {defs.map((d) => (
              <Field
                key={d.key}
                def={d}
                value={item[d.key]}
                error={errors[`${name}.${i}.${d.key}`]}
                folder={folder}
                onChange={(v) => onChange(items.map((x, j) => (j === i ? { ...x, [d.key]: v } : x)))}
              />
            ))}
          </Grid>
          <div className="mt-3 flex justify-end gap-2">
            <button type="button" className="admin-btn-ghost" onClick={() => onChange([...items.slice(0, i + 1), { ...item, code: "", liveId: "" }, ...items.slice(i + 1)])}>
              نسخ
            </button>
            <button type="button" className="admin-btn-danger" onClick={() => onChange(items.filter((_, j) => j !== i))}>
              حذف
            </button>
          </div>
        </RowItem>
      ))}
      {items.length < max && (
        <button type="button" className="admin-item border-dashed text-start font-medium text-link" onClick={() => onChange([...items, {}])}>
          {addLabel}
        </button>
      )}
    </div>
  );
}

// ─── Photos and files ───────────────────────────────────────────────────

function MediaSection({ items, onChange, errors, folder }: { items: MediaItem[]; onChange: (m: MediaItem[]) => void; errors: DraftErrors; folder: string }) {
  const [kind, setKind] = useState("IMAGE");
  const [group, setGroup] = useState("EXTERIOR");
  const [rows, setRows] = useState<{ name: string; pct: number; error?: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const latest = useRef(items);
  latest.current = items;

  async function pick(list: FileList | null) {
    const files = Array.from(list ?? []).slice(0, LIMITS.media - items.length);
    if (!files.length) return;
    setBusy(true);
    setRows(files.map((f) => ({ name: f.name, pct: 0, error: checkFile(f) ?? undefined })));
    const added: MediaItem[] = [];
    let next = 0;
    const worker = async () => {
      while (next < files.length) {
        const i = next++;
        if (checkFile(files[i])) continue;
        try {
          const up = await uploadFile(files[i], folder, {
            plan: kind === "MASTER_PLAN",
            handleUploadUrl: "/portal/upload",
            onProgress: (pct) => setRows((r) => r.map((x, j) => (j === i ? { ...x, pct } : x))),
          });
          added.push({ kind, group: kind === "IMAGE" ? group : "", url: up.url, captionAr: "", captionEn: "", width: up.width, height: up.height });
          setRows((r) => r.map((x, j) => (j === i ? { ...x, pct: 100 } : x)));
        } catch (e) {
          setRows((r) => r.map((x, j) => (j === i ? { ...x, error: e instanceof Error ? e.message : "تعذّر الرفع" } : x)));
        }
      }
    };
    await Promise.all([worker(), worker(), worker()]);
    onChange([...latest.current, ...added]);
    setBusy(false);
    if (input.current) input.current.value = "";
  }

  const accept = kind === "IMAGE" ? IMAGE_TYPES.join(",") : kind === "BROCHURE" ? "application/pdf" : kind === "VIDEO" ? "video/mp4,video/webm" : `${IMAGE_TYPES.join(",")},application/pdf`;
  const update = (i: number, patch: Partial<MediaItem>) => onChange(items.map((m, j) => (j === i ? { ...m, ...patch } : m)));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-dashed border-brand/50 bg-brand/5 p-4 text-sm">
        <label className="flex flex-col gap-1.5">
          <span className="font-medium">النوع</span>
          <select className="admin-input" value={kind} onChange={(e) => setKind(e.target.value)} disabled={busy}>
            {PORTAL_MEDIA_KINDS.map((k) => (
              <option key={k.value} value={k.value}>
                {k.label}
              </option>
            ))}
          </select>
        </label>
        {kind === "IMAGE" && (
          <label className="flex flex-col gap-1.5">
            <span className="font-medium">التبويب</span>
            <select className="admin-input" value={group} onChange={(e) => setGroup(e.target.value)} disabled={busy}>
              {PORTAL_PHOTO_GROUPS.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.label}
                </option>
              ))}
            </select>
          </label>
        )}
        <button type="button" className="admin-btn" disabled={busy || items.length >= LIMITS.media} onClick={() => input.current?.click()}>
          {busy ? "جارٍ الرفع…" : "اختر الملفات"}
        </button>
        <input ref={input} type="file" multiple accept={accept} hidden onChange={(e) => pick(e.target.files)} />
        <span className="basis-full text-xs text-muted">تقدر تختار صور كتير مرة واحدة. الصور بتتصغّر تلقائيًا قبل الرفع.</span>
        {rows.length > 0 && (
          <ul className="basis-full text-xs">
            {rows.map((r, i) => (
              <li key={i} className="flex gap-2">
                <span className="min-w-0 flex-1 truncate" dir="ltr">
                  {r.name}
                </span>
                <span className={r.error ? "text-red-700 dark:text-red-300" : "text-muted"}>{r.error ?? (r.pct >= 100 ? "✓" : `${Math.round(r.pct)}%`)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {items.length > 0 && (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((m, i) => (
            <li key={m.url + i} className={`admin-item flex flex-col gap-2 text-sm ${Object.keys(errors).some((k) => k.startsWith(`media.${i}.`)) ? "border-red-600/60" : ""}`}>
              {isImage(m.url) ? (
                // eslint-disable-next-line @next/next/no-img-element -- preview of an uploaded file
                <img src={m.url} alt="" className="aspect-[4/3] w-full rounded-lg object-cover" loading="lazy" />
              ) : (
                <a href={m.url} target="_blank" rel="noreferrer" className="flex aspect-[4/3] items-center justify-center rounded-lg bg-divider text-muted">
                  {m.kind === "BROCHURE" ? "PDF ↗" : "ملف ↗"}
                </a>
              )}
              <div className="flex gap-2">
                <select className="admin-input" value={m.kind} onChange={(e) => update(i, { kind: e.target.value, group: e.target.value === "IMAGE" ? m.group || "EXTERIOR" : "" })}>
                  {PORTAL_MEDIA_KINDS.map((k) => (
                    <option key={k.value} value={k.value}>
                      {k.label}
                    </option>
                  ))}
                </select>
                {m.kind === "IMAGE" && (
                  <select className="admin-input" value={m.group} onChange={(e) => update(i, { group: e.target.value })}>
                    {PORTAL_PHOTO_GROUPS.map((g) => (
                      <option key={g.value} value={g.value}>
                        {g.label}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <input className="admin-input" placeholder="تعليق (اختياري)" value={m.captionAr} onChange={(e) => update(i, { captionAr: e.target.value })} />
              <div className="flex justify-between gap-2">
                <span className="flex gap-1">
                  <button type="button" className="admin-btn-ghost px-2" disabled={i === 0} aria-label="قبل" onClick={() => onChange(move(items, i, i - 1))}>
                    →
                  </button>
                  <button type="button" className="admin-btn-ghost px-2" disabled={i === items.length - 1} aria-label="بعد" onClick={() => onChange(move(items, i, i + 1))}>
                    ←
                  </button>
                </span>
                <button type="button" className="admin-btn-danger" onClick={() => onChange(items.filter((_, j) => j !== i))}>
                  حذف
                </button>
              </div>
              {Object.entries(errors)
                .filter(([k]) => k.startsWith(`media.${i}.`))
                .map(([k, msg]) => (
                  <span key={k} className="text-xs text-red-700 dark:text-red-300">
                    {msg}
                  </span>
                ))}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function move<T>(list: T[], from: number, to: number) {
  const copy = [...list];
  const [x] = copy.splice(from, 1);
  copy.splice(to, 0, x);
  return copy;
}

// ─── Save bar ───────────────────────────────────────────────────────────

function useSaver(id: string) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [errors, setErrors] = useState<DraftErrors>({});
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function save(data: unknown, send: boolean) {
    start(async () => {
      const res = await saveSubmission(id, data, send);
      setErrors(res.errors ?? {});
      setMessage({ ok: res.ok, text: res.message });
      if (res.ok) setDirty(false);
      if (res.status === "PENDING") router.refresh();
      if (res.errors && Object.keys(res.errors).length) {
        requestAnimationFrame(() => document.querySelector('[aria-invalid="true"], .border-red-600\\/60')?.scrollIntoView({ behavior: "smooth", block: "center" }));
      }
    });
  }
  return { pending, errors, message, save, markDirty: () => setDirty(true) };
}

function SaveBar({ pending, message, onSave, errorCount }: { pending: boolean; message: { ok: boolean; text: string } | null; onSave: (send: boolean) => void; errorCount: number }) {
  return (
    <div className="sticky bottom-3 z-10 flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-surface/95 p-3 shadow-lg backdrop-blur">
      <button type="button" className="admin-btn-ghost" disabled={pending} onClick={() => onSave(false)}>
        حفظ مسودة
      </button>
      <button type="button" className="admin-btn" disabled={pending} onClick={() => onSave(true)}>
        {pending ? "جارٍ الحفظ…" : "إرسال للمراجعة"}
      </button>
      {message && (
        <p role="status" className={`text-sm ${message.ok ? "text-brand" : "text-red-700 dark:text-red-300"}`}>
          {message.text}
          {!message.ok && errorCount > 0 && " الحقول اللي محتاجة تتصلّح متعلّم عليها بالأحمر."}
        </p>
      )}
    </div>
  );
}

// ─── Editors ────────────────────────────────────────────────────────────

const label = (defs: FieldDef[], key: string, value: string | string[] | undefined) =>
  defs.find((d) => d.key === key)?.choices?.find((c) => c.value === value)?.label ?? "";
/** A typed price in the draft's currency, as the admin shows it. */
const price = (v: string | string[] | undefined, currency: string | string[] | undefined) =>
  typeof v === "string" && v ? moneyAr(Number(v.replace(/[,\s]/g, "")), isCurrency(currency) ? currency : "EGP") : "";

export function ProjectEditor({ id, initial, areas, folder }: { id: string; initial: ProjectDraft; areas: Option[]; folder: string }) {
  const [draft, setDraft] = useState(initial);
  const saver = useSaver(id);
  const set = (patch: Partial<ProjectDraft>) => {
    setDraft((d) => ({ ...d, ...patch }));
    saver.markDirty();
  };
  const e = saver.errors;

  return (
    <div className="flex flex-col gap-6">
      {PROJECT_FIELDS.map((section) => (
        <Section key={section.title} title={section.title}>
          <Grid>
            {section.fields.map((d) => (
              <Field
                key={d.key}
                def={d}
                value={draft.project[d.key]}
                error={e[`project.${d.key}`]}
                areas={areas}
                folder={folder}
                onChange={(v) => set({ project: { ...draft.project, [d.key]: v } })}
              />
            ))}
          </Grid>
        </Section>
      ))}

      <Section title={`نماذج الوحدات (${draft.typologies.length})`} note="كل نموذج بمساحته وسعره. لازم نموذج واحد على الأقل بسعر." error={e.typologies}>
        <Rows
          name="typologies"
          items={draft.typologies}
          defs={TYPOLOGY_FIELDS}
          errors={e}
          max={LIMITS.typologies}
          addLabel="+ إضافة نموذج"
          folder={folder}
          onChange={(typologies) => set({ typologies })}
          summary={(t) => [t.code, label(TYPOLOGY_FIELDS, "subType", t.subType), t.buaM2 && `${t.buaM2} م²`, price(t.priceFrom, draft.project.currency)].filter(Boolean).join(" · ")}
        />
      </Section>

      <Section title={`أنظمة السداد (${draft.plans.length})`} note="اكتب كود النموذج لو النظام لنموذج معين، أو سيبه فاضي لكل النماذج.">
        <Rows
          name="plans"
          items={draft.plans}
          defs={PLAN_FIELDS}
          errors={e}
          max={LIMITS.plans}
          addLabel="+ إضافة نظام سداد"
          folder={folder}
          onChange={(plans) => set({ plans })}
          summary={(p) =>
            [p.downPaymentPct && `${p.downPaymentPct}% مقدم`, p.years && (p.years === "0" ? "كاش" : `${p.years} سنين`), label(PLAN_FIELDS, "frequency", p.frequency), p.steps && "جدول مخصص", p.typologyCode && `(${p.typologyCode})`]
              .filter(Boolean)
              .join(" · ")
          }
        />
      </Section>

      <Section title={`الصور والملفات (${draft.media.length})`} note="صور المشروع (خارجي، داخلي، الإنشاءات)، المساقط، الماستر بلان، والبروشور.">
        <MediaSection items={draft.media} errors={e} folder={folder} onChange={(media) => set({ media })} />
      </Section>

      <Section title={`المسافات (${draft.distances.length})`} note="مثلًا: الطريق الدائري · 10 دقايق.">
        <Rows
          name="distances"
          items={draft.distances}
          defs={DISTANCE_FIELDS}
          errors={e}
          max={LIMITS.distances}
          addLabel="+ إضافة مسافة"
          folder={folder}
          onChange={(distances) => set({ distances })}
          summary={(d) => [d.placeAr, d.minutes && `${d.minutes} دقيقة`].filter(Boolean).join(" · ")}
        />
      </Section>

      <SaveBar pending={saver.pending} message={saver.message} errorCount={Object.keys(e).length} onSave={(send) => saver.save(draft, send)} />
    </div>
  );
}

export function ProfileEditor({ id, initial, folder }: { id: string; initial: ProfileDraft; folder: string }) {
  const [draft, setDraft] = useState(initial);
  const saver = useSaver(id);
  return (
    <div className="flex flex-col gap-6">
      {PROFILE_FIELDS.map((section) => (
        <Section key={section.title} title={section.title}>
          <Grid>
            {section.fields.map((d) => (
              <Field
                key={d.key}
                def={d}
                value={draft.profile[d.key]}
                error={saver.errors[`profile.${d.key}`]}
                folder={folder}
                onChange={(v) => {
                  setDraft((x) => ({ profile: { ...x.profile, [d.key]: v } }));
                  saver.markDirty();
                }}
              />
            ))}
          </Grid>
        </Section>
      ))}
      <SaveBar pending={saver.pending} message={saver.message} errorCount={Object.keys(saver.errors).length} onSave={(send) => saver.save(draft, send)} />
    </div>
  );
}
