/**
 * Plantillas de email transaccional. Funciones puras que devuelven
 * `{ subject, html, text }`. HTML inline con estilos coherentes con
 * el theme cyberpunk (paleta neón sobre fondo oscuro).
 *
 * Sin React Email todavía: con 3 plantillas no compensa el coste. Si
 * llegamos a 8+, migrar a React Email para hot-reload y composición.
 */

const COLORS = {
  bg: '#0d0e10',
  bgElevated: '#15171b',
  border: '#2a2d34',
  fg: '#e6e6e6',
  fgMuted: '#9aa0aa',
  green: '#7cf08d',
  orange: '#ff9c4a',
  cyan: '#5fd7ff',
  purple: '#b48cff',
  red: '#ff5c7c',
  yellow: '#ffe066',
} as const;

const FONT = `'Courier New', Consolas, Monaco, monospace`;

interface Template {
  subject: string;
  html: string;
  text: string;
}

function shell(opts: {
  preheader: string;
  title: string;
  accent: keyof typeof COLORS;
  body: string;
}): string {
  const accent = COLORS[opts.accent];
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(opts.title)}</title>
</head>
<body style="margin:0;padding:0;background:${COLORS.bg};font-family:${FONT};color:${COLORS.fg};">
  <span style="display:none;max-height:0;overflow:hidden;opacity:0;">
    ${escapeHtml(opts.preheader)}
  </span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.bg};">
    <tr><td align="center" style="padding:32px 16px;">
      <table role="presentation" width="100%" style="max-width:560px;background:${COLORS.bgElevated};border:1px solid ${accent};box-shadow:0 0 16px -6px ${accent};" cellpadding="0" cellspacing="0">
        <tr><td style="padding:20px 24px;border-bottom:1px solid ${COLORS.border};">
          <span style="color:${COLORS.green};font-size:18px;letter-spacing:2px;">▶ DEFICIT_SYS</span>
        </td></tr>
        <tr><td style="padding:24px;">
          <h1 style="color:${accent};font-size:22px;letter-spacing:1px;margin:0 0 16px 0;text-transform:uppercase;">
            ${escapeHtml(opts.title)}
          </h1>
          <div style="font-size:15px;line-height:1.55;color:${COLORS.fg};">
            ${opts.body}
          </div>
        </td></tr>
        <tr><td style="padding:16px 24px;border-top:1px solid ${COLORS.border};color:${COLORS.fgMuted};font-size:12px;">
          Este mensaje es automático. Si no esperabas este email, ignóralo.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function button(href: string, label: string, color: string): string {
  return `<p style="margin:24px 0;text-align:center;">
    <a href="${escapeAttr(href)}"
       style="display:inline-block;padding:12px 24px;border:1px solid ${color};color:${color};text-decoration:none;letter-spacing:2px;text-transform:uppercase;font-weight:bold;">
      [ ${escapeHtml(label)} ]
    </a>
  </p>`;
}

export function verifyEmailTemplate(opts: {
  email: string;
  verifyUrl: string;
  expiresHours: number;
}): Template {
  const subject = '▶ Verifica tu email · Déficit';
  const body = `
    <p>Bienvenido al sistema. Antes de empezar, confirma que esta es tu dirección de email pulsando el botón:</p>
    ${button(opts.verifyUrl, 'Verificar email', COLORS.cyan)}
    <p style="color:${COLORS.fgMuted};font-size:13px;">
      El link caduca en ${opts.expiresHours} horas. Si no funciona, copia y pega esta URL en tu navegador:<br/>
      <code style="color:${COLORS.cyan};word-break:break-all;">${escapeHtml(opts.verifyUrl)}</code>
    </p>`;
  return {
    subject,
    html: shell({
      preheader: 'Verifica tu email para activar la cuenta.',
      title: 'Verificar email',
      accent: 'cyan',
      body,
    }),
    text: `Verifica tu email pulsando el siguiente enlace (caduca en ${opts.expiresHours}h):\n\n${opts.verifyUrl}\n\nSi no esperabas este email, ignóralo.`,
  };
}

export function passwordResetTemplate(opts: {
  resetUrl: string;
  expiresHours: number;
}): Template {
  const subject = '▶ Recuperar contraseña · Déficit';
  const body = `
    <p>Has solicitado restablecer tu contraseña. Pulsa el botón para definir una nueva:</p>
    ${button(opts.resetUrl, 'Restablecer contraseña', COLORS.orange)}
    <p style="color:${COLORS.fgMuted};font-size:13px;">
      El link caduca en ${opts.expiresHours} hora${opts.expiresHours === 1 ? '' : 's'}. Si no fuiste tú, ignora este email — tu contraseña no cambiará hasta que uses el link.
    </p>
    <p style="color:${COLORS.fgMuted};font-size:13px;word-break:break-all;">
      <code style="color:${COLORS.orange};">${escapeHtml(opts.resetUrl)}</code>
    </p>`;
  return {
    subject,
    html: shell({
      preheader: 'Recupera el acceso a tu cuenta.',
      title: 'Recuperar contraseña',
      accent: 'orange',
      body,
    }),
    text: `Has solicitado restablecer tu contraseña. Usa este enlace (caduca en ${opts.expiresHours}h):\n\n${opts.resetUrl}\n\nSi no fuiste tú, ignora este email.`,
  };
}

export function accountDeletedTemplate(opts: {
  email: string;
  purgeDateIso: string;
  reactivateUrl: string;
}): Template {
  const subject = '▶ Cuenta marcada para eliminación · Déficit';
  const fecha = new Date(opts.purgeDateIso).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  const body = `
    <p>Hemos recibido tu solicitud de borrado para <strong style="color:${COLORS.red};">${escapeHtml(opts.email)}</strong>.</p>
    <p>Tus datos se mantendrán durante el período de gracia y se eliminarán definitivamente el <strong style="color:${COLORS.yellow};">${escapeHtml(fecha)}</strong>.</p>
    <p>Si cambias de idea antes de esa fecha, puedes reactivar la cuenta accediendo de nuevo:</p>
    ${button(opts.reactivateUrl, 'Reactivar cuenta', COLORS.green)}
    <p style="color:${COLORS.fgMuted};font-size:13px;">
      Pasada esa fecha, todos tus datos (pesos, ejercicios, atributos, niveles, semanas) se borrarán de forma irreversible.
    </p>`;
  return {
    subject,
    html: shell({
      preheader: 'Tu cuenta se eliminará en 30 días salvo que la reactives.',
      title: 'Cuenta marcada para eliminación',
      accent: 'red',
      body,
    }),
    text: `Tu cuenta ${opts.email} se eliminará el ${fecha}.\n\nReactivala accediendo de nuevo en ${opts.reactivateUrl}.\n\nPasada esa fecha la eliminación es irreversible.`,
  };
}

function escapeHtml(s: string): string {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function escapeAttr(s: string): string {
  return escapeHtml(s);
}
