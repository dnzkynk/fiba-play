// Eski adres: /basvur → /apply (paylaşılmış linkler kırılmasın)
import { redirect } from "next/navigation";

export default function BasvurRedirect() {
  redirect("/apply");
}
