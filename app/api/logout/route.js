import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST() {
  const store = await cookies();
  store.delete("fiba_user");
  store.delete("fiba_admin");
  return NextResponse.json({ ok: true });
}
