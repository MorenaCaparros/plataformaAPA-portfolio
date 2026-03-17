/**
 * Google Drive Authentication Helper
 * 
 * Usa OAuth2 con refresh token de una cuenta personal de Google.
 * Esto permite subir archivos bajo la cuota de almacenamiento del usuario,
 * evitando la limitación de las Service Accounts que no tienen cuota propia.
 * 
 * Setup (una sola vez):
 * 1. Crear OAuth2 credentials en Google Cloud Console (tipo "Desktop" o "Web")
 * 2. Configurar GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET en .env.local
 * 3. Visitar /api/drive/auth para obtener el refresh token
 * 4. Guardar GOOGLE_REFRESH_TOKEN en .env.local
 */

import { google } from 'googleapis';

function getCleanPrivateKey(): string {
  let privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || '';
  privateKey = privateKey.trim();
  if (privateKey.endsWith(',')) privateKey = privateKey.slice(0, -1);
  if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
    privateKey = privateKey.slice(1, -1);
  }
  privateKey = privateKey.replace(/\\n/g, '\n');
  return privateKey;
}

/**
 * Crea un cliente de Google Drive autenticado.
 * Intenta OAuth2 primero (para subir archivos con cuota del usuario).
 * Si no hay OAuth2 configurado, cae a Service Account (solo lectura).
 * Soporta GOOGLE_CLIENT_ID o GOOGLE_OAUTH_CLIENT_ID (ambos nombres).
 */
export function createDriveUploadClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  // Si hay OAuth2 configurado, usarlo (permite crear archivos)
  if (clientId && clientSecret && refreshToken) {
    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
    oauth2Client.setCredentials({ refresh_token: refreshToken });
    return google.drive({ version: 'v3', auth: oauth2Client });
  }

  // Fallback: Service Account (solo funciona para lectura o Shared Drives)
  const privateKey = getCleanPrivateKey();
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;

  if (!privateKey || !clientEmail) {
    throw new Error(
      'No hay credenciales de Google configuradas. ' +
      'Configura GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET + GOOGLE_REFRESH_TOKEN para OAuth2, ' +
      'o GOOGLE_SERVICE_ACCOUNT_EMAIL + GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY para Service Account.'
    );
  }

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/drive'],
  });

  return google.drive({ version: 'v3', auth });
}

/**
 * Crea un OAuth2 client (para el flow de autorización)
 */
export function createOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/drive/auth/callback';

  if (!clientId || !clientSecret) {
    throw new Error('Faltan GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET en .env.local');
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}
