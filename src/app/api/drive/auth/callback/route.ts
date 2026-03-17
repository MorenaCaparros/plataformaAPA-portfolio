/**
 * Paso 2: Google redirige aquí después de la autorización.
 * Intercambia el code por tokens y muestra el refresh_token.
 * 
 * El refresh_token se debe copiar a .env.local como GOOGLE_REFRESH_TOKEN=xxx
 * Esto se hace UNA SOLA VEZ.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createOAuth2Client } from '@/lib/google/drive-auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  // Manejar error de Google (ej: access_denied, 403)
  const errorParam = req.nextUrl.searchParams.get('error');
  if (errorParam) {
    const errorDesc = req.nextUrl.searchParams.get('error_description') || '';
    return new NextResponse(
      `<!DOCTYPE html>
      <html><head><title>❌ Error de autorización</title></head>
      <body style="font-family:system-ui;max-width:600px;margin:40px auto;padding:20px;">
        <h1>❌ Google rechazó la autorización</h1>
        <div style="background:#fee2e2;border:2px solid #f87171;border-radius:12px;padding:16px;margin:20px 0;">
          <p style="margin:0;"><strong>Error:</strong> ${errorParam}</p>
          ${errorDesc ? `<p style="margin:8px 0 0 0;"><strong>Detalle:</strong> ${errorDesc}</p>` : ''}
        </div>
        
        ${errorParam === 'access_denied' ? `
        <div style="background:#fef3c7;border:2px solid #f59e0b;border-radius:12px;padding:16px;margin:20px 0;">
          <h3 style="margin-top:0;">🔑 Causa más probable: No estás como "Test User"</h3>
          <p>Mientras tu app OAuth esté en modo <strong>"Testing"</strong> (no publicada), 
          solo los emails agregados como <strong>"Test users"</strong> pueden autorizar.</p>
          <ol>
            <li>Ir a <a href="https://console.cloud.google.com/apis/credentials/consent" target="_blank">OAuth Consent Screen</a></li>
            <li>Ir a la pestaña <strong>"Test users"</strong></li>
            <li>Click <strong>"+ Add users"</strong></li>
            <li>Agregar el <strong>email de la cuenta Google</strong> con la que intentaste autorizar</li>
            <li>Guardar y <strong>esperar 5 minutos</strong></li>
            <li>Intentar de nuevo</li>
          </ol>
        </div>
        <div style="background:#f3f4f6;border-radius:8px;padding:12px;margin:16px 0;">
          <p style="margin:0;font-size:14px;">💡 <strong>Tip:</strong> Usá una <strong>ventana de incógnito</strong> 
          al re-intentar para evitar sesiones cacheadas de Google.</p>
        </div>
        ` : ''}
        
        <a href="/api/drive/auth" style="display:inline-block;background:#3b82f6;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;margin-top:16px;">
          ← Volver al diagnóstico
        </a>
      </body></html>`,
      { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }

  const code = req.nextUrl.searchParams.get('code');

  if (!code) {
    return NextResponse.json({ error: 'No se recibió código de autorización' }, { status: 400 });
  }

  try {
    const oauth2Client = createOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.refresh_token) {
      return new NextResponse(
        `<html>
          <head><title>⚠️ No se obtuvo refresh_token</title></head>
          <body style="font-family: system-ui; max-width: 600px; margin: 40px auto; padding: 20px;">
            <h1>⚠️ No se obtuvo refresh_token</h1>
            <p>Esto puede pasar si ya autorizaste la app antes.</p>
            <p><strong>Solución:</strong></p>
            <ol>
              <li>Ir a <a href="https://myaccount.google.com/permissions" target="_blank">myaccount.google.com/permissions</a></li>
              <li>Buscar tu app y revocar acceso</li>
              <li>Volver a <a href="/api/drive/auth">/api/drive/auth</a> para re-autorizar</li>
            </ol>
            <p><strong>Tokens recibidos:</strong></p>
            <pre style="background: #f5f5f5; padding: 16px; border-radius: 8px; overflow-x: auto;">${JSON.stringify({ 
              access_token: tokens.access_token ? '✅ recibido' : '❌ no recibido',
              refresh_token: tokens.refresh_token ? '✅ recibido' : '❌ no recibido',
              expiry_date: tokens.expiry_date,
            }, null, 2)}</pre>
          </body>
        </html>`,
        { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      );
    }

    // Mostrar el refresh token para que el usuario lo copie
    return new NextResponse(
      `<html>
        <head><title>✅ Autorización exitosa</title></head>
        <body style="font-family: system-ui; max-width: 600px; margin: 40px auto; padding: 20px;">
          <h1>✅ ¡Autorización exitosa!</h1>
          <p>Copiá el siguiente valor y agregalo a tu archivo <code>.env.local</code>:</p>
          
          <div style="background: #f0fdf4; border: 2px solid #86efac; border-radius: 12px; padding: 16px; margin: 20px 0;">
            <p style="font-weight: bold; margin: 0 0 8px 0;">GOOGLE_REFRESH_TOKEN=</p>
            <input 
              type="text" 
              value="${tokens.refresh_token}" 
              readonly 
              onclick="this.select(); document.execCommand('copy');"
              style="width: 100%; padding: 8px; font-family: monospace; font-size: 12px; border: 1px solid #ccc; border-radius: 6px; cursor: pointer;"
            />
            <p style="font-size: 12px; color: #666; margin: 8px 0 0 0;">
              Hacé click en el campo para copiarlo
            </p>
          </div>

          <h3>📋 Pasos finales:</h3>
          <ol>
            <li>Abrir <code>.env.local</code></li>
            <li>Agregar: <code>GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}</code></li>
            <li>Reiniciar el servidor de Next.js</li>
            <li>¡Listo! Ya podés subir archivos a Google Drive</li>
          </ol>

          <div style="background: #fefce8; border: 1px solid #fbbf24; border-radius: 8px; padding: 12px; margin-top: 20px;">
            <p style="margin: 0; font-size: 14px;">
              ⚠️ <strong>SEGURIDAD:</strong> Este token da acceso a tu Google Drive. 
              Nunca lo compartas ni lo subas a Git. Ya está protegido en <code>.env.local</code>.
            </p>
          </div>
        </body>
      </html>`,
      { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  } catch (error: any) {
    return NextResponse.json({
      error: 'Error obteniendo tokens',
      detail: error.message,
    }, { status: 500 });
  }
}
