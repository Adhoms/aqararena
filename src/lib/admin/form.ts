// Reads and checks form fields for the admin server actions. Each reader records a
// message (in Arabic) when the value is missing or invalid, then returns undefined/null.

/** `secret` is a value shown once with a copy button (a temporary password); it is never stored. */
export type FormState = { ok?: boolean; message?: string; errors?: Record<string, string>; secret?: string };

type Opts = { required?: boolean; label?: string };

export class FormReader {
  readonly errors: Record<string, string> = {};
  constructor(private readonly data: FormData) {}

  private raw(name: string): string {
    const v = this.data.get(name);
    return typeof v === "string" ? v.trim() : "";
  }

  private fail(name: string, message: string) {
    this.errors[name] ??= message;
  }

  get ok() {
    return Object.keys(this.errors).length === 0;
  }

  /** Text; empty becomes null. */
  text(name: string, { required = false, max = 5000 }: Opts & { max?: number } = {}): string | null {
    const v = this.raw(name);
    if (!v) {
      if (required) this.fail(name, "هذا الحقل مطلوب");
      return null;
    }
    if (v.length > max) this.fail(name, `الحد الأقصى ${max} حرف`);
    return v;
  }

  /** Same as text() but never null; use after a required check. */
  requiredText(name: string, max?: number): string {
    return this.text(name, { required: true, max }) ?? "";
  }

  url(name: string, opts: Opts = {}): string | null {
    const v = this.text(name, { ...opts, max: 2000 });
    if (v && !/^https?:\/\/\S+$/i.test(v) && !v.startsWith("/")) this.fail(name, "رابط غير صالح (يبدأ بـ https://)");
    return v;
  }

  slug(name: string, fallbackFrom: string | null): string {
    const source = this.raw(name) || fallbackFrom || "";
    const slug = source
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80);
    if (!slug) this.fail(name, "اكتب رابطًا مختصرًا بالإنجليزية (حروف وأرقام وشَرطات)");
    return slug;
  }

  number(name: string, { required = false, min, max, integer = false }: Opts & { min?: number; max?: number; integer?: boolean } = {}): number | null {
    const v = this.raw(name).replace(/[,\s]/g, "").replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
    if (!v) {
      if (required) this.fail(name, "هذا الحقل مطلوب");
      return null;
    }
    const n = Number(v);
    if (!Number.isFinite(n)) return this.fail(name, "رقم غير صالح"), null;
    if (integer && !Number.isInteger(n)) return this.fail(name, "يجب أن يكون رقمًا صحيحًا"), null;
    if (min !== undefined && n < min) return this.fail(name, `أقل قيمة ${min}`), null;
    if (max !== undefined && n > max) return this.fail(name, `أكبر قيمة ${max}`), null;
    return n;
  }

  int(name: string, opts: Opts & { min?: number; max?: number } = {}) {
    return this.number(name, { ...opts, integer: true });
  }

  pct(name: string, opts: Opts = {}) {
    return this.number(name, { ...opts, min: 0, max: 100 });
  }

  bool(name: string): boolean {
    const v = this.raw(name);
    return v === "on" || v === "true" || v === "1";
  }

  /** A yyyy-mm-dd date input, stored as midnight UTC. */
  date(name: string, opts: Opts = {}): Date | null {
    const v = this.raw(name);
    if (!v) {
      if (opts.required) this.fail(name, "هذا الحقل مطلوب");
      return null;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v) || Number.isNaN(Date.parse(v))) return this.fail(name, "تاريخ غير صالح"), null;
    return new Date(`${v}T00:00:00Z`);
  }

  oneOf<T extends string>(name: string, list: readonly T[], opts: Opts = {}): T | null {
    const v = this.raw(name);
    if (!v) {
      if (opts.required) this.fail(name, "اختر قيمة");
      return null;
    }
    if (!(list as readonly string[]).includes(v)) return this.fail(name, "قيمة غير معروفة"), null;
    return v as T;
  }

  /** Checkbox group: every checked value that is in the list. */
  many<T extends string>(name: string, list: readonly T[]): T[] {
    return this.data
      .getAll(name)
      .filter((v): v is T => typeof v === "string" && (list as readonly string[]).includes(v));
  }

  id(name: string): string | null {
    const v = this.raw(name);
    return /^[a-z0-9]{10,40}$/i.test(v) ? v : null;
  }

  result(message = "راجع الحقول المظللة"): FormState {
    return { ok: false, message, errors: this.errors };
  }
}
