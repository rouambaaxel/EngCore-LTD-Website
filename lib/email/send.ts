import "server-only";
import nodemailer from "nodemailer";

/**
 * Envoi d'emails depuis la boîte de la société (sales@engcoreltd.com).
 *
 * Distinct des emails d'authentification — confirmation d'inscription, mot
 * de passe oublié —, que Supabase envoie lui-même avec son propre réglage
 * SMTP. Ici partent les messages que le site écrit de sa propre initiative,
 * à commencer par les invitations.
 *
 * Configuration, côté serveur uniquement (Vercel → variables d'environnement) :
 *   SMTP_HOST       mail.privateemail.com
 *   SMTP_PORT       465 (SSL direct ; 587 bascule en STARTTLS)
 *   SMTP_USER       sales@engcoreltd.com
 *   SMTP_PASSWORD   mot de passe de la boîte
 *   SMTP_FROM       facultatif, « Engcore Ltd <sales@engcoreltd.com> » par défaut
 *
 * Sans ces variables, rien n'est envoyé et les écrans retombent sur l'envoi
 * à la main : l'absence de configuration n'est pas une panne.
 */

function env(name: string): string {
  return (process.env[name] ?? "").trim();
}

export function isEmailConfigured(): boolean {
  return Boolean(env("SMTP_HOST") && env("SMTP_USER") && env("SMTP_PASSWORD"));
}

export interface OutgoingEmail {
  to: string;
  subject: string;
  /** Texte brut ; les adresses http(s) deviennent des liens dans la version HTML. */
  text: string;
}

export type SendResult = { ok: true } | { ok: false; error: string };

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Version HTML minimale : même texte, liens cliquables, sauts de ligne gardés. */
function toHtml(text: string): string {
  const linked = escapeHtml(text).replace(
    /https?:\/\/[^\s<]+/g,
    (url) => `<a href="${url}">${url}</a>`,
  );
  return `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.5;color:#1e293b">${linked.replace(/\n/g, "<br>")}</div>`;
}

/**
 * Envoie un message. Ne lève jamais : l'appelant décide quoi montrer, et un
 * envoi raté ne doit pas annuler ce qui vient d'être enregistré en base.
 */
export async function sendEmail(message: OutgoingEmail): Promise<SendResult> {
  if (!isEmailConfigured()) return { ok: false, error: "SMTP non configuré" };

  const port = Number(env("SMTP_PORT")) || 465;
  const user = env("SMTP_USER");
  const from = env("SMTP_FROM") || `Engcore Ltd <${user}>`;

  try {
    const transport = nodemailer.createTransport({
      host: env("SMTP_HOST"),
      port,
      // 465 chiffre dès la connexion ; les autres ports négocient STARTTLS.
      secure: port === 465,
      auth: { user, pass: env("SMTP_PASSWORD") },
      // Un serveur muet ne doit pas bloquer l'écran d'administration.
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
    });

    await transport.sendMail({
      from,
      replyTo: user,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: toHtml(message.text),
    });
    return { ok: true };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error("[email] envoi échoué", error);
    return { ok: false, error };
  }
}
