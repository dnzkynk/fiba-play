import { getT } from "@/lib/i18n";
import { ForgotForm } from "./ui";

export const dynamic = "force-dynamic";

export default async function ForgotPage() {
  const { t } = await getT();
  return (
    <div className="flex min-h-[calc(100vh-14rem)] items-center justify-center py-4">
      <div className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-8 shadow-xl sm:p-10">
        <h1 className="text-2xl font-semibold tracking-tight">{t("forgotTitle")}</h1>
        <p className="mt-1.5 mb-8 text-sm leading-relaxed text-stone-500">{t("forgotSub")}</p>
        <ForgotForm labels={{
          email: t("email"), submit: t("forgotSubmit"), sending: t("applySending"),
          sent: t("forgotSent"), sentSub: t("forgotSentSub"),
        }} />
        <p className="mt-6 text-center text-sm">
          <a className="font-medium text-fiba-700 hover:underline" href="/login">{t("backToLogin")}</a>
        </p>
      </div>
    </div>
  );
}
