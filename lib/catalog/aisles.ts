import type { Aisle } from "./types";
import type { Lang } from "./localize";

import { MESSAGES } from "../i18n/messages";

export const AISLE_LABELS: Record<Lang, Record<Aisle, string>> = {
  en: MESSAGES.en.aisles,
  es: MESSAGES.es.aisles,
};
