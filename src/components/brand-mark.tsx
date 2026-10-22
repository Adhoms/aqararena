/** The AqarArena logo: blue "A" tile + wordmark. The wordmark stays left-to-right in Arabic too. */
export function BrandMark() {
  return (
    <span className="flex items-center gap-2.5">
      <span
        aria-hidden="true"
        className="flex size-10 items-center justify-center rounded-[10px] bg-brand text-xl font-bold text-white"
      >
        A
      </span>
      <span dir="ltr" className="text-xl font-bold">
        Aqar<span className="text-brand">Arena</span>
      </span>
    </span>
  );
}
