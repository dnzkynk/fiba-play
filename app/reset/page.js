import { getT } from "@/lib/i18n";
import { ResetForm } from "./ui";

export const dynamic = "force-dynamic";

export default async function ResetPage({ searchParams }) {
  const { token } = await searchParams;
  const { t } = await getT();
  return (
    <div className="flex min-h-[calc(100vh-14rem)] items-center justify-center py-4">
      <div className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-8 shadow-xl sm:p-10">
        <h1 className="text-2xl font-semibold tracking-tight">{t("resetTitle")}</h1>
        <p className="mt-1.5 mb-8 text-sm leading-relaxed text-stone-500">{t("resetSub")}</p>
        {token ? (
          <ResetForm token={token} labels={{
            newPass: t("resetNew"), repeat: t("resetRepeat"), submit: t("resetSubmit"),
            saving: t("applySending"), done: t("resetDone"), goLogin: t("backToLogin"),
            short: t("applyPassErr"), mismatch: t("resetMismatch"),
            invalid: t("resetInvalid"), generic: t("applyErr"),
          }} />
        ) : (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{t("resetInvalid")}</p>
        )}
      </div>
    </div>
  );
}
