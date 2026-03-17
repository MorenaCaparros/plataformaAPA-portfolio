/**
 * scripts/create-demo-users.ts
 * ----------------------------
 * Crea los usuarios de autenticación para el proyecto demo.
 *
 * Requiere:
 *   - NEXT_PUBLIC_SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY
 *   ambos en .env.local
 *
 * Uso:
 *   npx tsx scripts/create-demo-users.ts
 *
 * ⚠️  Ejecutar DESPUÉS de haber corrido demo-seed.sql en Supabase.
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Faltan variables de entorno.');
  console.error('   Crear .env.local con NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY');
  console.error('   Ver .env.example para referencia.');
  process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const DEMO_USERS = [
  { email: 'admin@demo.apa',       password: 'Demo1234!', nombre: 'Ana García',      rol: 'admin' },
  { email: 'coord1@demo.apa',      password: 'Demo1234!', nombre: 'Marcos Rodríguez', rol: 'coordinador' },
  { email: 'coord2@demo.apa',      password: 'Demo1234!', nombre: 'Valeria López',   rol: 'coordinador' },
  { email: 'psico@demo.apa',       password: 'Demo1234!', nombre: 'Laura Méndez',    rol: 'psicopedagogia' },
  { email: 'social@demo.apa',      password: 'Demo1234!', nombre: 'Sandra Peralta',  rol: 'trabajo_social' },
  { email: 'voluntario1@demo.apa', password: 'Demo1234!', nombre: 'Diego Torres',    rol: 'voluntario' },
  { email: 'voluntario2@demo.apa', password: 'Demo1234!', nombre: 'Sofía Martínez',  rol: 'voluntario' },
  { email: 'voluntario3@demo.apa', password: 'Demo1234!', nombre: 'Tomás Flórez',    rol: 'voluntario' },
];

async function createDemoUsers() {
  console.log('🚀 Creando usuarios demo en Supabase Auth...\n');

  for (const user of DEMO_USERS) {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: user.email,
      password: user.password,
      email_confirm: true,
      user_metadata: { nombre: user.nombre, rol: user.rol },
    });

    if (error) {
      if (error.message.includes('already been registered')) {
        console.log(`  ↩  ${user.email} — ya existe`);
      } else {
        console.error(`  ❌ ${user.email} — ${error.message}`);
      }
    } else {
      console.log(`  ✅ ${user.email} (${user.rol})`);
    }
  }

  console.log('\n─────────────────────────────────────────');
  console.log('🔑 Credenciales de acceso (todos los usuarios):');
  console.log('   Password: Demo1234!\n');
  DEMO_USERS.forEach((u) => {
    const pad = ' '.repeat(30 - u.email.length);
    console.log(`   ${u.email}${pad}→ ${u.rol}`);
  });
  console.log('\n✅ Ejecutar: npm run dev');
}

createDemoUsers().catch(console.error);
