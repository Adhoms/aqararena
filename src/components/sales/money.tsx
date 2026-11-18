import { currencyAr, formatNumber } from "@/lib/format";
import type { Currency } from "@/lib/property";

/**
 * An amount on the Sales screens in the project's currency, Western digits kept left to right inside the
 * Arabic line: "4,850,000 ج.م" with the sign after the figure, "$250,000" with the dollar sign before it.
 */
export function Money({ value, currency }: { value: number; currency: Currency }) {
  const n = formatNumber(Math.round(value), "ar");
  if (currency === "USD")
    return (
      <bdi dir="ltr" className="whitespace-nowrap">
        {currencyAr(currency)}
        {n}
      </bdi>
    );
  return (
    <>
      <bdi dir="ltr" className="whitespace-nowrap">
        {n}
      </bdi>{" "}
      {currencyAr(currency)}
    </>
  );
}
