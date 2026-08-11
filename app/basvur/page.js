// Public başvuru sayfası: giriş gerektirmez.
import { getT } from "@/lib/i18n";
import { ApplyForm } from "./ui";

export const dynamic = "force-dynamic";

export default async function ApplyPage() {
  const { t } = await getT();
  const labels = {
    fullName: t("applyFullName"),
    email: t("email"),
    phone: t("applyPhone"),
    country: t("applyCountry"),
    company: t("applyCompany"),
    submit: t("applySubmit"),
    sending: t("applySending"),
    done: t("applyDone"),
    doneSub: t("applyDoneSub"),
    dupe: t("applyDupe"),
    err: t("applyErr"),
  };

  return (
    <div className="flex min-h-[calc(100vh-14rem)] items-center justify-center py-4">
      <div className="w-full max-w-2xl">
        <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-xl">
          <img src="/ust-banner.png" alt="Fiba Tournament" className="w-full" />
          <div className="p-8 sm:p-10">
            <h1 className="text-2xl font-semibold tracking-tight">{t("applyTitle")}</h1>
            <p className="mt-1.5 mb-8 text-sm text-stone-500">{t("applySub")}</p>
            <ApplyForm labels={labels} />
            <p className="mt-6 text-center text-sm text-stone-500">
              <a className="font-medium text-fiba-700 hover:underline" href="/login">{t("applyLoginLink")}</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
