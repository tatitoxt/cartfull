import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Serves the receipt photo attached to a week. RLS on plan_receipts does the
// authorization: the select only returns a row for a plan the user can view.
export async function GET(_request: NextRequest, { params }: { params: Promise<{ planId: string }> }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const { planId } = await params;
  const { data } = await supabase.from("plan_receipts").select("image, mime").eq("plan_id", planId).maybeSingle();
  if (!data) return new NextResponse("Not found", { status: 404 });

  const hex = (data.image as string).replace(/^\\x/, "");
  return new NextResponse(Buffer.from(hex, "hex"), {
    // no-store: the photo must be re-authorized on every view — a cached copy
    // would stay readable in the same browser after sign-out.
    headers: { "Content-Type": data.mime as string, "Cache-Control": "no-store" },
  });
}
