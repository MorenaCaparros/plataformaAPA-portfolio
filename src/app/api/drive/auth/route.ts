/**
 * Paso 1: Muestra diagnóstico y permite iniciar el flujo OAuth2.
 * 
 * GET /api/drive/auth         → Muestra página de diagnóstico + botón para autorizar
 * GET /api/drive/auth?go=1    → Redirige directo a Google para autorizar
 * 
 * Esto solo se necesita hacer UNA VEZ para obtener el refresh token.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createOAuth2Client } from '@/lib/google/drive-auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const goParam = req.nextUrl.searchParams.get('go');

  // Diagnóstico de variables
  const clientId = process.env.GOOGLE_CLIENT_ID || '';
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/drive/auth/callback';
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN || '';

  const hasClientId = clientId.length > 10 && clientId !== 'tu-client-id.apps.googleusercontent.com';
  const hasClientSecret = clientSecret.length > 5 && clientSecret !== 'tu-client-secret';
  const hasRefreshToken = refreshToken.length > 20 && refreshToken !== 'tu-refresh-token';
  const isWebType = clientId.includes('.apps.googleusercontent.com');

  // Si ?go=1, redirigir directo a Google
  if (goParam === '1') {
    try {
      const oauth2Client = createOAuth2Client();
      const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        prompt: 'consent',
        scope: ['https://www.googleapis.com/auth/drive'],
      });
      return NextResponse.redirect(authUrl);
    } catch (error: any) {
      return new NextResponse(
        `<html><body style="font-family:system-ui;max-width:600px;margin:40px auto;padding:20px;">
          <h1>❌ Error al generar URL de autorización</h1>
          <pre style="background:#fee;padding:16px;border-radius:8px;">${error.message}</pre>
          <a href="/api/drive/auth">← Volver al diagnóstico</a>
        </body></html>`,
        { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      );
    }
  }

  // Mostrar página de diagnóstico
  const check = (ok: boolean) => ok ? '✅' : '❌';
  
  const html = `<!DOCTYPE html>
<html><head><title>🔧 Google Drive OAuth2 - Diagnóstico</title></head>
<body style="font-family:system-ui;max-width:700px;margin:40px auto;padding:20px;line-height:1.6;">
  <h1>🔧 Google Drive OAuth2 - Diagnóstico</h1>
  
  <div style="background:#f8f9fa;border-radius:12px;padding:20px;margin:20px 0;">
    <h2 style="margin-top:0;">📋 Estado de Variables</h2>
    <table style="width:100%;border-collapse:collapse;">
      <tr style="border-bottom:1px solid #ddd;">
        <td style="padding:8px;">${check(hasClientId)} GOOGLE_CLIENT_ID</td>
        <td style="padding:8px;font-family:monospace;font-size:12px;">${hasClientId ? clientId.substring(0, 20) + '...' : '<span style="color:red">No configurado o es placeholder</span>'}</td>
      </tr>
      <tr style="border-bottom:1px solid #ddd;">
        <td style="padding:8px;">${check(hasClientSecret)} GOOGLE_CLIENT_SECRET</td>
        <td style="padding:8px;font-family:monospace;font-size:12px;">${hasClientSecret ? '***' + clientSecret.substring(clientSecret.length - 4) : '<span style="color:red">No configurado o es placeholder</span>'}</td>
      </tr>
      <tr style="border-bottom:1px solid #ddd;">
        <td style="padding:8px;">${check(true)} GOOGLE_REDIRECT_URI</td>
        <td style="padding:8px;font-family:monospace;font-size:12px;">${redirectUri}</td>
      </tr>
      <tr>
        <td style="padding:8px;">${check(hasRefreshToken)} GOOGLE_REFRESH_TOKEN</td>
        <td style="padding:8px;font-family:monospace;font-size:12px;">${hasRefreshToken ? '✅ Ya configurado' : '<span style="color:orange">Pendiente — necesitás autorizar abajo</span>'}</td>
      </tr>
    </table>
  </div>

  ${!hasClientId || !hasClientSecret ? `
  <div style="background:#fee2e2;border:2px solid #f87171;border-radius:12px;padding:20px;margin:20px 0;">
    <h2 style="margin-top:0;color:#dc2626;">⚠️ Faltan credenciales OAuth2</h2>
    <p>Necesitás crear credenciales en Google Cloud Console primero.</p>
  </div>
  ` : ''}

  <div style="background:#eff6ff;border:2px solid #3b82f6;border-radius:12px;padding:20px;margin:20px 0;">
    <h2 style="margin-top:0;">📝 Checklist completo (seguí estos pasos en orden)</h2>
    <ol style="padding-left:20px;">
      <li style="margin-bottom:12px;">
        <strong>Habilitar Google Drive API</strong><br>
        <a href="https://console.cloud.google.com/apis/library/drive.googleapis.com" target="_blank">
          → Abrir Google Drive API</a> y hacer click en <strong>"Habilitar"</strong> (Enable).
        <br><span style="color:#666;font-size:13px;">Sin esto, todo da 403.</span>
      </li>
      <li style="margin-bottom:12px;">
        <strong>Configurar Pantalla de Consentimiento (OAuth Consent Screen)</strong><br>
        <a href="https://console.cloud.google.com/apis/credentials/consent" target="_blank">
          → Abrir OAuth Consent Screen</a>
        <ul style="margin:8px 0;">
          <li>User Type: <strong>"Externo"</strong> (External)</li>
          <li>App name: <strong>Plataforma APA</strong></li>
          <li>User support email: <strong>tu email</strong></li>
          <li>Developer contact: <strong>tu email</strong></li>
          <li>Scopes: agregar <code>https://www.googleapis.com/auth/drive.file</code></li>
          <li>Guardar</li>
        </ul>
      </li>
      <li style="margin-bottom:12px;">
        <strong>Agregar tu email como "Usuario de prueba" (Test user)</strong><br>
        <a href="https://console.cloud.google.com/apis/credentials/consent" target="_blank">
          → OAuth Consent Screen</a> → pestaña <strong>"Test users"</strong> (o "Usuarios de prueba")
        <ul style="margin:8px 0;">
          <li>Click <strong>"+ Add users"</strong></li>
          <li>Escribir <strong>tu email de Google</strong> (el mismo con el que vas a autorizar)</li>
          <li>Guardar</li>
        </ul>
        <div style="background:#fef3c7;padding:10px;border-radius:8px;margin-top:8px;">
          🔑 <strong>Este es el paso que probablemente te falta.</strong> 
          Sin agregarte como test user, Google devuelve <strong>403 access_denied</strong>.
          Mientras la app esté en "Testing" (no publicada), SOLO los test users pueden autorizar.
        </div>
      </li>
      <li style="margin-bottom:12px;">
        <strong>Crear credenciales OAuth2</strong><br>
        <a href="https://console.cloud.google.com/apis/credentials" target="_blank">
          → Abrir Credentials</a> → <strong>"+ Create Credentials"</strong> → <strong>"OAuth client ID"</strong>
        <ul style="margin:8px 0;">
          <li>Application type: <strong>"Web application"</strong></li>
          <li>Name: <strong>Plataforma APA Local</strong></li>
          <li>Authorized redirect URIs: <code>${redirectUri}</code></li>
          <li>Copiar el <strong>Client ID</strong> y <strong>Client Secret</strong> a <code>.env.local</code></li>
        </ul>
      </li>
      <li style="margin-bottom:12px;">
        <strong>Reiniciar Next.js</strong> después de modificar <code>.env.local</code><br>
        <code style="background:#f3f4f6;padding:4px 8px;border-radius:4px;">Ctrl+C</code> y luego 
        <code style="background:#f3f4f6;padding:4px 8px;border-radius:4px;">npm run dev</code>
      </li>
      <li style="margin-bottom:12px;">
        <strong>Autorizar la app</strong> haciendo click en el botón verde de abajo ↓
      </li>
    </ol>
  </div>

  ${hasClientId && hasClientSecret ? `
  <div style="text-align:center;margin:30px 0;">
    ${hasRefreshToken ? `
      <div style="background:#f0fdf4;border:2px solid #86efac;border-radius:12px;padding:20px;margin-bottom:16px;">
        <h3 style="margin:0;color:#16a34a;">✅ Ya tenés refresh token configurado</h3>
        <p style="margin:8px 0 0 0;">No necesitás volver a autorizar. Si querés generar uno nuevo, usá el botón.</p>
      </div>
    ` : ''}
    <a href="/api/drive/auth?go=1" 
       style="display:inline-block;background:#16a34a;color:white;padding:16px 32px;border-radius:12px;text-decoration:none;font-size:18px;font-weight:bold;">
      🔐 Autorizar Google Drive
    </a>
    <p style="color:#666;font-size:13px;margin-top:8px;">
      Se va a abrir Google para que autorices acceso a Drive.<br>
      Asegurate de usar la cuenta que agregaste como test user.
    </p>
  </div>
  ` : `
  <div style="background:#fef2f2;border-radius:12px;padding:20px;text-align:center;">
    <p style="color:#dc2626;font-weight:bold;">⛔ Completá los pasos de arriba antes de autorizar</p>
    <p>Necesitás GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET en .env.local</p>
  </div>
  `}

  <div style="background:#f3f4f6;border-radius:8px;padding:16px;margin-top:20px;">
    <h3 style="margin-top:0;">🔍 ¿Seguís viendo 403?</h3>
    <ul style="margin:0;padding-left:20px;">
      <li>Verificá que la <strong>Google Drive API</strong> esté habilitada (paso 1)</li>
      <li>Verificá que tu email esté en <strong>Test users</strong> (paso 3)</li>
      <li>Probá en una <strong>ventana de incógnito</strong> (para evitar sesiones cacheadas)</li>
      <li>Asegurate de iniciar sesión con el <strong>mismo email</strong> que agregaste como test user</li>
      <li>Esperá <strong>5 minutos</strong> después de agregar el test user (Google tarda en propagarlo)</li>
    </ul>
  </div>
</body></html>`;

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
