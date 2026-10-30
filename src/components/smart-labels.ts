import type { Dictionary } from "@/app/[lang]/dictionaries";
import type { SmartLabels } from "./smart-search";

/** The dictionary pieces the smart search bar needs in the browser. */
export function smartLabels(dict: Dictionary): SmartLabels {
  return {
    ...dict.smart,
    subTypes: dict.subTypes,
    categories: dict.categories,
    finishGroups: dict.finishGroups,
    areas: dict.areas,
    from: dict.common.startingFrom,
    down: dict.common.lowestDown,
    delivery: dict.common.delivery,
  };
}
