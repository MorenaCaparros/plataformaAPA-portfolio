/**
 * scripts/create-demo-users.ts
 * ----------------------------
 * Crea los usuarios de autenticación para el proyecto demo en Supabase.
 *
 * IMPORTANTE: Los IDs aquí deben coincidir EXACTAMENTE con los IDs
 * del archivo scripts/demo-seed.sql. Así auth.users y perfiles se vinculan.
 *
 * Requiere en .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Uso (DESPUÉS de haber corrido demo-seed.sql en Supabase):
 *   npx tsx scripts/create-demo-users.ts
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Faltan variables de entorno.');
  console.error('   Crear .env.local con NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// IDs fijos que coinciden con demo-seed.sql
const DEMO_USERS = [
  {
    id: 'b1000000-0000-0000-0000-000000000001',
    email: 'admin.demo.apa@gmail.com',
    password: 'Demo1234!',
    nombre: 'Ana', apellido: 'García', rol: 'admin',
  },
  {
    id: 'b1000000-0000-0000-0000-000000000002',
    email: 'equipo.demo.apa@gmail.com',
    password: 'Demo1234!',
    nombre: 'Laura', apellido: 'Méndez', rol: 'equipo_profesional',
  },
  {
    id: 'b1000000-0000-0000-0000-000000000006',
    email: 'voluntario.demo.apa@gmail.com',
    password: 'Demo1234!',
    nombre: 'Diego', apellido: 'Torres', rol: 'voluntario',
  },
  {
    id: 'b1000000-0000-0000-0000-000000000007',
    email: 'voluntario2.demo.apa@gmail.com',
    password: 'Demo1234!',
    nombre: 'Sofía', apellido: 'Martínez', rol: 'voluntario',
  },
  {
    id: 'b1000000-0000-0000-0000-000000000008',
    email: 'voluntario3.demo.apa@gmail.com',
    password: 'Demo1234!',
    nombre: 'Tomás', apellido: 'Flórez', rol: 'voluntario',
  },
];

async function createDemoUsers() {
  console.log('🚀 Creando usuarios demo en Supabase Auth...\n');

  for (const user of DEMO_USERS) {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      // Especificar el ID garantiza que coincida con los perfiles del seed
      id: user.id,
      email: user.email,
      password: user.password,
      email_confirm: true,
      user_metadata: { nombre: user.nombre, apellido: user.apellido, rol: user.rol },
    });

    if (error) {
      if (error.message.includes('already been registered') || error.message.includes('already exists')) {
        console.log(`  ↩  ${user.email} — ya existe`);
      } else {
        console.error(`  ❌ ${user.email} — ${error.message}`);
      }
    } else {
      console.log(`  ✅ ${user.email} (${user.rol})`);
    }
  }

  console.log('\n─────────────────────────────────────────────────');
  console.log('🔑 Credenciales de acceso (todas las cuentas):');
  console.log('   Password: Demo1234!\n');
  console.log('   admin.demo.apa@gmail.com       → Admin');
  console.log('   equipo.demo.apa@gmail.com      → Equipo Profesional');
  console.log('   voluntario.demo.apa@gmail.com  → Voluntario');
  console.log('\n✅ Listo. Levantar el servidor: npm run dev');
}

createDemoUsers().catch(console.error);

