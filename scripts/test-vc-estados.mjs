#!/usr/bin/env node
// Test valid estados for voluntarios_capacitaciones
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const VOL_ID = '00000000-0000-0000-0000-000000000002';
const CAP_ID = 'c1000000-0000-0000-0000-000000000002';

const states = ['pendiente', 'en_curso', 'asignada', 'inscripta', 'aprobada', 'activa'];

for (const estado of states) {
  // Delete first in case it exists
  await supabase.from('voluntarios_capacitaciones')
    .delete()
    .eq('voluntario_id', VOL_ID)
    .eq('capacitacion_id', CAP_ID);

  const { error } = await supabase.from('voluntarios_capacitaciones').insert({
    voluntario_id: VOL_ID,
    capacitacion_id: CAP_ID,
    estado,
    fecha_inscripcion: new Date().toISOString()
  });
  console.log(estado + ':', error ? '❌ ' + error.message.substring(0, 100) : '✅ OK');
}

// Cleanup
await supabase.from('voluntarios_capacitaciones')
  .delete()
  .eq('voluntario_id', VOL_ID)
  .eq('capacitacion_id', CAP_ID);

// Also check what's currently in the table
const { data } = await supabase.from('voluntarios_capacitaciones').select('*').limit(5);
console.log('\nExisting rows:', JSON.stringify(data, null, 2));
