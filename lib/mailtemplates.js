// E-posta metinleri — tümü İngilizce (uluslararası katılım).
// Bilinçli olarak sade: emoji, kalın vurgu ve altbilgi az — kişisel mail görünümüne
// yakın tutulup "toplu/pazarlama şablonu" izlenimi (ve spam filtresi cezası) azaltılıyor.
import { layout } from "./mail.js";

const FOOTER = "Fiba Games 2026 tournament system. Reply to this e-mail if you have questions.";

const wrap = ({ title, body, cta, ctaUrl }) =>
  layout({ title, body, cta, ctaUrl, footer: FOOTER });

export function resetMail(url) {
  return {
    subject: "Password reset — Fiba Games 2026",
    html: wrap({
      title: "Reset your password",
      body: `We received a password reset request for your account. Use the link below to set a new password.
        <br><br>The link is valid for 1 hour and can be used only once.
        <br><br>If you didn't request this, you can ignore this e-mail.`,
      cta: "Set a new password",
      ctaUrl: url,
    }),
  };
}

export function applyReceivedMail(name) {
  return {
    subject: "Application received — Fiba Games 2026",
    html: wrap({
      title: `Hello ${name}, we received your application`,
      body: `Your application for the Fiba Games 2026 chess tournament has reached us.
        <br><br>Accepted players are selected by the organization and will be informed separately.
        If accepted, you sign in with the password you chose during your application.`,
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
      title: isReserve ? `${name}, you're on the reserve list` : `${name}, you're in the tournament`,
      body: isReserve
        ? `You have been placed on the reserve list for Fiba Games 2026. If a player withdraws,
           you will be called up and notified.
           <br><br>Your account is ready — sign in with the password you chose during your application.`
        : `You have been accepted as a main player in the Fiba Games 2026 chess tournament.
           <br><br>Sign in with your e-mail and the password you chose when applying.
           Once the draw is made, your opponent and match time will appear on the site.
           Forgot your password? Use the link on the sign-in screen.`,
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
      title: `${name}, your match is scheduled`,
      body: `Your opponent in the ${roundLabel}: ${opponent}.
        <br>Match time: ${timeText} (shown in your own local time on the site).
        <br><br>Sign in at match time and click "Join match" — the game opens in your browser,
        no install or Lichess account needed.
        <br><br>Note: a player who doesn't join within 10 minutes of the match time forfeits.`,
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
      title: `${name}, your match has started`,
      body: `Your match against ${opponent} has just started.
        <br><br>Sign in and click "Join match".
        <br><br>If you don't join within ${minutes} minutes, you forfeit.`,
      cta: "Join match",
      ctaUrl: `${process.env.BASE_URL}/me`,
    }),
  };
}
