import { redirect } from "next/navigation";
import { isAdmin, currentPlayerRows } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function Home() {
  if (await isAdmin()) redirect("/admin");
  if ((await currentPlayerRows()).length) redirect("/me");
  redirect("/login");
}
