import { redirect } from "next/navigation";
import { getProfile, requireSession } from "@/lib/app/data";

export default async function AppIndex() {
  const session = await requireSession();
  const profile = await getProfile(session);
  redirect(profile.onboarded_at ? "/app/plan" : "/start");
}
