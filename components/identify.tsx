"use client";

import { useEffect } from "react";
import { identify } from "./analytics";

export function Identify({ userId }: { userId: string }) {
  useEffect(() => identify(userId), [userId]);
  return null;
}
