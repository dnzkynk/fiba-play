import { redirect } from "next/navigation";
import { isAdmin, currentPlayerEmail } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function Home() {
  if (await isAdmin()) redirect("/admin");
  if (await currentPlayerEmail()) redirect("/me");
  redirect("/login");
}
