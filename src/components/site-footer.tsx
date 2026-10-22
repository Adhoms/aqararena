import { getDictionary } from "@/app/[lang]/dictionaries";
import { BrandMark } from "./brand-mark";

export async function SiteFooter() {
  const dict = await getDictionary();

  return (
    <footer className="mt-16 bg-ink text-placeholder">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-10 sm:px-6">
        <span className="text-white">
          <BrandMark />
        </span>
        <p className="max-w-2xl text-sm leading-relaxed text-[#b5b5af]">{dict.footer.neutrality}</p>
        <p className="text-xs text-[#b5b5af]">
          © <span dir="ltr">AqarArena</span> · {dict.footer.rights}
        </p>
      </div>
    </footer>
  );
}
