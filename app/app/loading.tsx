"use client";

import { useMessages } from "@/lib/i18n/locale-provider";

export default function Loading() {
  const m = useMessages();
  return (
    <div role="status" aria-label={m.common.loading} className="animate-pulse space-y-4 py-2">
      <div className="h-4 w-32 rounded-full bg-paper-deep" />
      <div className="h-11 w-3/4 rounded-xl bg-paper-deep" />
      <div className="h-28 rounded-card bg-paper-deep" />
      <div className="h-52 rounded-card bg-paper-deep" />
    </div>
  );
}
