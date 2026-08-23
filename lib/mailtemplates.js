// E-posta metinleri — tümü İngilizce (uluslararası katılım).
// Site arayüzü TR/EN olarak kalır; bildirim e-postaları tek dilde tutulur.
import { layout } from "./mail.js";

const FOOTER = "Sent by the Fiba Games 2026 tournament system. You can reply to this e-mail if you have questions.";

const wrap = ({ title, body, cta, ctaUrl }) =>
  layout({ title, body, cta, ctaUrl, footer: FOOTER });

export function resetMail(url) {
  return {
    subject: "Password reset — Fiba Games 2026",
    html: wrap({
      title: "Reset your password",
      body: `We received a password reset request for your account. Click the button below to set a new password.
        <br><br>The link is valid for <b>1 hour</b> and can be used only once.
        <br><br>If you didn't request this, you can ignore this e-mail — your password stays unchanged.`,
      cta: "Set a new password",
      ctaUrl: url,
    }),
  };
}

export function applyReceivedMail(name) {
  return {
    subject: "Application received — Fiba Games 2026",
    html: wrap({
      title: `Hello ${name}, we received your application 🎉`,
      body: `Your application for the Fiba Games 2026 chess tournament has reached us.
        <br><br>Accepted players are selected by the organization and you will be informed separately.
        If you are accepted, you can sign in with the <b>password you chose</b> during your application.`,
      cta: "Tournament site",
      ctaUrl: `${process.env.BASE_URL}/login`,
    }),
  };
}

export function acceptedMail(name, isReserve) {
  return {
    subject: isReserve
      ? "You're on the reserve list — Fiba Games 2026"
      : "You're in the tournament — Fiba Games 2026",
    html: wrap({
      title: isReserve ? `${name}, you're on the reserve list` : `Congratulations ${name}, you're in! ♟`,
      body: isReserve
        ? `You have been placed on the <b>reserve list</b> for Fiba Games 2026. If a player withdraws,
           you will be called up and notified.
           <br><br>Your account is ready — sign in with the password you chose during your application.`
        : `You have been accepted as a <b>main player</b> in the Fiba Games 2026 chess tournament.
           <br><br>Your account is ready: sign in with your e-mail and the password you chose when applying.
           Once the draw is made, your opponent and match time will appear on the site.
           Forgot your password? Use the "Forgot your password?" link on the sign-in screen.`,
      cta: "Sign in",
      ctaUrl: `${process.env.BASE_URL}/login`,
    }),
  };
}

// Kura/program belli oldu: rakip + maç saati
export function matchScheduledMail({ name, opponent, roundLabel, timeText }) {
  return {
    subject: "Your match is scheduled — Fiba Games 2026",
    html: wrap({
      title: `${name}, your match is scheduled ♟`,
      body: `Your opponent in the <b>${roundLabel}</b>: <b>${opponent}</b>
        <br>Match time: <b>${timeText}</b> — the site always shows it in your own local time.
        <br><br>Just sign in at match time and click <b>"Join match"</b>. The game opens in your browser —
        no install and no Lichess account needed.
        <br><br><b>Important:</b> a player who doesn't join within <b>10 minutes</b> of the match time forfeits.`,
      cta: "My matches",
      ctaUrl: `${process.env.BASE_URL}/me`,
    }),
  };
}

// Maç şimdi başladı: hemen katıl
export function matchLiveMail({ name, opponent, minutes = 10 }) {
  return {
    subject: "Your match is live — join now",
    html: wrap({
      title: `${name}, your match has started ♟`,
      body: `Your match against <b>${opponent}</b> has <b>just started</b>.
        <br><br>Sign in and click <b>"Join match"</b>.
        <br><br><b>If you don't join within ${minutes} minutes, you forfeit.</b>`,
      cta: "Join match",
      ctaUrl: `${process.env.BASE_URL}/me`,
    }),
  };
}
