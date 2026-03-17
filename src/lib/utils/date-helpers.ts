/**
 * Calcula la edad exacta en años a partir de una fecha de nacimiento
 * @param fechaNacimiento - Fecha de nacimiento en formato ISO (YYYY-MM-DD)
 * @returns Edad en años completos
 */
export function calcularEdad(fechaNacimiento: string | null): number | null {
  if (!fechaNacimiento) return null;
  
  const hoy = new Date();
  const nacimiento = new Date(fechaNacimiento);
  
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const mes = hoy.getMonth() - nacimiento.getMonth();
  
  // Si aún no ha cumplido años este año
  if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
    edad--;
  }
  
  return edad;
}

/**
 * Formatea la edad para mostrar. Si no hay fecha de nacimiento, muestra el rango etario.
 * @param fechaNacimiento - Fecha de nacimiento en formato ISO
 * @param rangoEtario - Rango etario como fallback
 * @returns String formateado con la edad
 */
export function formatearEdad(
  fechaNacimiento: string | null,
  rangoEtario: string | null
): string {
  const edad = calcularEdad(fechaNacimiento);
  
  if (edad !== null) {
    return `${edad} años`;
  }
  
  if (rangoEtario) {
    return `${rangoEtario} años`;
  }
  
  return 'Edad no especificada';
}
