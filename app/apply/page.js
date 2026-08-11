// Public başvuru sayfası: giriş gerektirmez.
import { getT } from "@/lib/i18n";
import { ApplyForm } from "./ui";

export const dynamic = "force-dynamic";

export default async function ApplyPage() {
  const { t, lang } = await getT();
  const labels = {
    fullName: t("applyFullName"),
    namePh: t("applyNamePh"),
    email: t("email"),
    phone: t("applyPhone"),
    phonePh: t("applyPhonePh"),
    country: t("applyCountry"),
    countryPh: t("applyCountryPh"),
    company: t("applyCompany"),
    companyPh: t("applyCompanyPh"),
    submit: t("applySubmit"),
    sending: t("applySending"),
    done: t("applyDone"),
    doneSub: t("applyDoneSub"),
    dupe: t("applyDupe"),
    dupePhone: t("applyDupePhone"),
    err: t("applyErr"),
    nameErr: t("applyNameErr"),
    phoneErr: t("applyPhoneErr"),
  };

  return (
    <div className="flex min-h-[calc(100vh-14rem)] items-center justify-center py-4">
      <div className="w-full max-w-2xl">
        <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-xl">
          <img src="/ust-banner.png" alt="Fiba Tournament" className="w-full" />
          <div className="p-8 sm:p-10">
            <h1 className="text-2xl font-semibold tracking-tight">{t("applyTitle")}</h1>
            <p className="mt-1.5 mb-8 text-sm leading-relaxed text-stone-500">{t("applySub")}</p>
            <ApplyForm labels={labels} lang={lang} />
          </div>
        </div>
      </div>
    </div>
  );
}
