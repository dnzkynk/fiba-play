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
    emailHint: t("applyEmailHint"),
    country: t("applyCountry"),
    countryPh: t("applyCountryPh"),
    company: t("applyCompany"),
    companyPh: t("applyCompanyPh"),
    password: t("password"),
    passwordRepeat: t("passwordRepeat"),
    passMismatch: t("resetMismatch"),
    passHint: t("applyPassHint"),
    passErr: t("applyPassErr"),
    submit: t("applySubmit"),
    sending: t("applySending"),
    done: t("applyDone"),
    doneSub: t("applyDoneSub"),
    dupe: t("applyDupe"),
    rate: t("applyRate"),
    err: t("applyErr"),
    nameErr: t("applyNameErr"),
    resultsDate: t("applyResultsDate"),
    noticePre: t("applyNoticePre"),
    noticeParticipant: t("applyNoticeParticipant"),
    noticeAnd: t("applyNoticeAnd"),
    noticeCookie: t("applyNoticeCookie"),
    noticeErr: t("applyNoticeErr"),
    noticeOpenErr: t("applyNoticeOpenErr"),
    noticeOpenHint: t("applyNoticeOpenHint"),
    noticeConfirmHint: t("applyNoticeConfirmHint"),
  };

  return (
    <div className="flex min-h-[calc(100vh-14rem)] items-center justify-center py-4">
      <div className="w-full max-w-2xl">
        <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-xl">
          <img src="/ust-banner.png" alt="Fiba Games" className="w-full" />
          <div className="p-8 sm:p-10">
            <h1 className="text-2xl font-semibold tracking-tight">{t("applyTitle")}</h1>
            <p className="mt-1.5 text-sm leading-relaxed text-stone-500">{t("applySub")}</p>
            <p className="mt-3 mb-8 rounded-lg border border-fiba-100 bg-fiba-50 px-3.5 py-2.5 text-sm font-medium text-fiba-700">
              {t("applyResultsDate")}
            </p>
            <ApplyForm labels={labels} lang={lang} />
          </div>
        </div>
      </div>
    </div>
  );
}
