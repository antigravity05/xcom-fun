import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function GET() {
  const cookieStore = await cookies();
  cookieStore.delete("xcom_demo_user_id");
  redirect("/");
}

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.delete("xcom_demo_user_id");
  return Response.json({ ok: true });
}
