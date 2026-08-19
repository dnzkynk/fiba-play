// E-posta metinleri (TR/EN). Sunucu tarafında dil, alıcının site tercihinden bilinmiyorsa
// iki dil birden gönderilir — uluslararası katılımcılar için en güvenlisi.
import { layout } from "./mail.js";

const FOOTER = {
  tr: "Bu e-posta Fiba Games 2026 turnuva sistemi tarafından gönderildi. Sorunuz varsa yanıtlayabilirsiniz.",
  en: "Sent by the Fiba Games 2026 tournament system. You can reply to this e-mail if you have questions.",
};

export function resetMail(url, lang = "tr") {
  const tr = {
    subject: "Parola sıfırlama — Fiba Games 2026",
    title: "Parolanı sıfırla",
    body: `Hesabın için parola sıfırlama talebi aldık. Aşağıdaki bağlantıya tıklayıp yeni parolanı belirleyebilirsin.
      <br><br>Bağlantı <b>1 saat</b> geçerlidir ve yalnızca bir kez kullanılabilir.
      <br><br>Bu talebi sen yapmadıysan bu e-postayı yok sayabilirsin — parolan değişmez.`,
    cta: "Yeni parola belirle",
  };
  const en = {
    subject: "Password reset — Fiba Games 2026",
    title: "Reset your password",
    body: `We received a password reset request for your account. Click the link below to set a new password.
      <br><br>The link is valid for <b>1 hour</b> and can be used only once.
      <br><br>If you didn't request this, you can ignore this e-mail — your password stays unchanged.`,
    cta: "Set a new password",
  };
  const t = lang === "en" ? en : tr;
  return {
    subject: t.subject,
    html: layout({ title: t.title, body: t.body, cta: t.cta, ctaUrl: url, footer: FOOTER[lang === "en" ? "en" : "tr"] }),
  };
}

export function applyReceivedMail(name, lang = "tr") {
  const tr = {
    subject: "Başvurun alındı — Fiba Games 2026",
    title: `Merhaba ${name}, başvurun alındı 🎉`,
    body: `Fiba Games 2026 satranç turnuvası başvurun bize ulaştı.
      <br><br>Kayıt hakkı kazanan katılımcılar organizasyon tarafından belirlenecek ve sana ayrıca bilgi verilecek.
      Kabul edilirsen, başvuru sırasında belirlediğin <b>parolayla</b> siteye giriş yapabileceksin.`,
    cta: "Turnuva sitesi",
  };
  const en = {
    subject: "Application received — Fiba Games 2026",
    title: `Hello ${name}, we received your application 🎉`,
    body: `Your application for the Fiba Games 2026 chess tournament has reached us.
      <br><br>Accepted players are selected by the organization and you will be informed separately.
      If you are accepted, you can sign in with the <b>password you chose</b> during your application.`,
    cta: "Tournament site",
  };
  const t = lang === "en" ? en : tr;
  return {
    subject: t.subject,
    html: layout({ title: t.title, body: t.body, cta: t.cta, ctaUrl: `${process.env.BASE_URL}/login`, footer: FOOTER[lang === "en" ? "en" : "tr"] }),
  };
}

export function acceptedMail(name, isReserve, lang = "tr") {
  const tr = {
    subject: isReserve ? "Yedek listesindesin — Fiba Games 2026" : "Turnuvaya kabul edildin — Fiba Games 2026",
    title: isReserve ? `${name}, yedek listesindesin` : `Tebrikler ${name}, turnuvadasın! ♟`,
    body: isReserve
      ? `Fiba Games 2026 için <b>yedek listesine</b> alındın. Asil oyunculardan biri çekilirse sıra sana gelecek ve bilgilendirileceksin.
         <br><br>Hesabın açıldı — başvuruda belirlediğin parolayla siteye giriş yapabilirsin.`
      : `Fiba Games 2026 satranç turnuvasına <b>asil oyuncu</b> olarak kabul edildin.
         <br><br>Hesabın hazır: e-postan ve başvuruda belirlediğin parolayla giriş yap.
         Kura çekildiğinde rakibin ve maç saatin siteden görünecek. Parolanı unuttuysan giriş ekranındaki
         "Parolanı mı unuttun?" bağlantısını kullan.`,
    cta: "Giriş yap",
  };
  const en = {
    subject: isReserve ? "You're on the reserve list — Fiba Games 2026" : "You're in the tournament — Fiba Games 2026",
    title: isReserve ? `${name}, you're on the reserve list` : `Congratulations ${name}, you're in! ♟`,
    body: isReserve
      ? `You have been placed on the <b>reserve list</b> for Fiba Games 2026. If a player withdraws, you will be called up and notified.
         <br><br>Your account is ready — sign in with the password you chose during your application.`
      : `You have been accepted as a <b>main player</b> in the Fiba Games 2026 chess tournament.
         <br><br>Your account is ready: sign in with your e-mail and the password you chose when applying.
         Once the draw is made, your opponent and match time will appear on the site. Forgot your password?
         Use the "Forgot your password?" link on the sign-in screen.`,
    cta: "Sign in",
  };
  const t = lang === "en" ? en : tr;
  return {
    subject: t.subject,
    html: layout({ title: t.title, body: t.body, cta: t.cta, ctaUrl: `${process.env.BASE_URL}/login`, footer: FOOTER[lang === "en" ? "en" : "tr"] }),
  };
}
