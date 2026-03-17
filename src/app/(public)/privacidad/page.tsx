export default function PrivacidadPage() {
  return (
    <div className="min-h-screen bg-neutro-lienzo">
      {/* Header */}
      <div className="bg-gradient-to-r from-sol-400 to-crecimiento-400 text-white py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-quicksand font-bold mb-2">
            Política de Privacidad
          </h1>
          <p className="text-white/80">Plataforma APA - Acompañar Para Aprender</p>
        </div>
      </div>

      {/* Contenido */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        <section className="space-y-8 text-neutro-piedra">
          {/* Intro */}
          <div className="bg-white/60 backdrop-blur-lg rounded-3xl border border-sol-400/20 shadow-glow-sol p-8">
            <p className="text-lg font-medium text-neutro-carbon mb-4">
              Última actualización: {new Date().toLocaleDateString('es-AR', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
            <p className="text-base leading-relaxed">
              La privacidad de nuestros usuarios, especialmente la de los menores, es nuestra prioridad máxima. 
              Esta Política de Privacidad explica qué información recopilamos, cómo la usamos, protegemos y qué derechos tenés.
            </p>
          </div>

          {/* Sección 1 */}
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-neutro-carbon mb-4 flex items-center gap-3">
              <span className="w-10 h-10 rounded-full bg-sol-400 text-white flex items-center justify-center font-semibold">1</span>
              Recopilación de Datos
            </h2>
            <div className="bg-white/60 backdrop-blur-lg rounded-3xl border border-sol-400/20 p-8 space-y-4">
              <p>La plataforma APA recopila los siguientes datos personales:</p>
              <ul className="space-y-3 ml-4">
                <li className="flex gap-3">
                  <span className="text-sol-400 font-bold">•</span>
                  <div>
                    <strong>Datos de autenticación:</strong> Email, contraseña (protegida)
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="text-sol-400 font-bold">•</span>
                  <div>
                    <strong>Datos de voluntarios:</strong> Nombre, teléfono, zona/barrio asignado
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="text-sol-400 font-bold">•</span>
                  <div>
                    <strong>Datos de menores asignados:</strong> Alias, edad, rango etario, nivel educativo, escolarización
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="text-sol-400 font-bold">•</span>
                  <div>
                    <strong>Datos sensibles (encriptados):</strong> Nombre completo y fecha de nacimiento de menores
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="text-sol-400 font-bold">•</span>
                  <div>
                    <strong>Registros de sesiones:</strong> Observaciones educativas, actividades realizadas, progreso
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="text-sol-400 font-bold">•</span>
                  <div>
                    <strong>Auditoría de accesos:</strong> Logs de quién vio qué datos y cuándo
                  </div>
                </li>
              </ul>
            </div>
          </div>

          {/* Sección 2 */}
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-neutro-carbon mb-4 flex items-center gap-3">
              <span className="w-10 h-10 rounded-full bg-crecimiento-400 text-white flex items-center justify-center font-semibold">2</span>
              Protección de Datos
            </h2>
            <div className="bg-white/60 backdrop-blur-lg rounded-3xl border border-sol-400/20 p-8 space-y-4">
              <p>Implementamos medidas de seguridad de nivel empresarial:</p>
              <ul className="space-y-3 ml-4">
                <li className="flex gap-3">
                  <span className="text-crecimiento-400 font-bold">✓</span>
                  <div>
                    <strong>Encriptación AES-256:</strong> Nombres completos y fechas de nacimiento se almacenan encriptados
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="text-crecimiento-400 font-bold">✓</span>
                  <div>
                    <strong>HTTPS/TLS:</strong> Todos los datos en tránsito están encrypt dos
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="text-crecimiento-400 font-bold">✓</span>
                  <div>
                    <strong>Autenticación segura:</strong> Contraseña con validación de seguridad + OAuth2 (Google)
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="text-crecimiento-400 font-bold">✓</span>
                  <div>
                    <strong>Control de acceso basado en roles (RLS):</strong> Row-Level Security a nivel de base de datos
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="text-crecimiento-400 font-bold">✓</span>
                  <div>
                    <strong>Backups automáticos:</strong> Diarios con punto de recuperación de 30 días
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="text-crecimiento-400 font-bold">✓</span>
                  <div>
                    <strong>Auditoría de accesos:</strong> Log registra acceso a datos sensibles de menores
                  </div>
                </li>
              </ul>
            </div>
          </div>

          {/* Sección 3 */}
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-neutro-carbon mb-4 flex items-center gap-3">
              <span className="w-10 h-10 rounded-full bg-impulso-400 text-white flex items-center justify-center font-semibold">3</span>
              Control de Acceso a los Datos
            </h2>
            <div className="bg-white/60 backdrop-blur-lg rounded-3xl border border-sol-400/20 p-8 space-y-4">
              <p>Los datos son accesibles solo a usuarios autorizados según su rol:</p>
              
              <div className="space-y-4 mt-6">
                <div className="border-l-4 border-sol-400 pl-4">
                  <h3 className="font-bold text-neutro-carbon">Voluntario Alfabetizador</h3>
                  <p className="text-sm mt-1">Ve alias y datos básicos de niños asignados (SIN apellido), historial de sus sesiones</p>
                </div>
                <div className="border-l-4 border-crecimiento-400 pl-4">
                  <h3 className="font-bold text-neutro-carbon">Coordinador</h3>
                  <p className="text-sm mt-1">Ve datos completos (con apellido) de niños en su zona/equipo, puede revisar sesiones de voluntarios</p>
                </div>
                <div className="border-l-4 border-impulso-400 pl-4">
                  <h3 className="font-bold text-neutro-carbon">Psicopedagogo/a</h3>
                  <p className="text-sm mt-1">Acceso completo a todos los datos para análisis y evaluaciones; datos usados para IA</p>
                </div>
                <div className="border-l-4 border-sol-400 pl-4">
                  <h3 className="font-bold text-neutro-carbon">Trabajador/a Social</h3>
                  <p className="text-sm mt-1">Acceso a datos sociofamiliares, información de contacto de familias, registros de entrevistas</p>
                </div>
                <div className="border-l-4 border-crecimiento-400 pl-4">
                  <h3 className="font-bold text-neutro-carbon">Director/a</h3>
                  <p className="text-sm mt-1">Acceso total al sistema; puede ver datos de todos los usuarios; controla backups y seguridad</p>
                </div>
              </div>
            </div>
          </div>

          {/* Sección 4 */}
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-neutro-carbon mb-4 flex items-center gap-3">
              <span className="w-10 h-10 rounded-full bg-sol-400 text-white flex items-center justify-center font-semibold">4</span>
              Retención de Datos
            </h2>
            <div className="bg-white/60 backdrop-blur-lg rounded-3xl border border-sol-400/20 p-8 space-y-4">
              <p>Los datos se conservan según:</p>
              <ul className="space-y-3 ml-4">
                <li className="flex gap-3">
                  <span className="text-sol-400 font-bold">•</span>
                  <div>
                    <strong>Datos de usuarios activos:</strong> Mientras esté vigente su rol en la plataforma
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="text-sol-400 font-bold">•</span>
                  <div>
                    <strong>Datos de menores:</strong> Mínimo 3 años después del último registro (para continuidad de seguimiento)
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="text-sol-400 font-bold">•</span>
                  <div>
                    <strong>Logs de auditoría:</strong> 1 año (para investigar accesos no autorizados)
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="text-sol-400 font-bold">•</span>
                  <div>
                    <strong>Backups:</strong> 30 días (punto de recuperación ante desastres)
                  </div>
                </li>
              </ul>
              <p className="text-sm text-neutro-piedra mt-4 pt-4 border-t border-neutro-piedra/20">
                Tras cumplirse el plazo de retención, los datos se borran permanentemente de todos los servidores.
              </p>
            </div>
          </div>

          {/* Sección 5 */}
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-neutro-carbon mb-4 flex items-center gap-3">
              <span className="w-10 h-10 rounded-full bg-crecimiento-400 text-white flex items-center justify-center font-semibold">5</span>
              Derechos del Usuario
            </h2>
            <div className="bg-white/60 backdrop-blur-lg rounded-3xl border border-sol-400/20 p-8 space-y-4">
              <p>Conforme a la Ley de Protección de Datos Personales (LPDP), tenés derecho a:</p>
              <ul className="space-y-3 ml-4 mt-6">
                <li className="flex gap-3">
                  <span className="text-crecimiento-400 font-bold">✓</span>
                  <div>
                    <strong>Acceso:</strong> Solicitar qué datos tenemos sobre vos
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="text-crecimiento-400 font-bold">✓</span>
                  <div>
                    <strong>Rectificación:</strong> Corregir datos inexactos o desactualizados
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="text-crecimiento-400 font-bold">✓</span>
                  <div>
                    <strong>Eliminación:</strong> Solicitar borrado (sujeto a retención mínima legal)
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="text-crecimiento-400 font-bold">✓</span>
                  <div>
                    <strong>Portabilidad:</strong> Obtener tus datos en formato estándar (CSV/JSON)
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="text-crecimiento-400 font-bold">✓</span>
                  <div>
                    <strong>Oposición:</strong> Rechazar ciertos tratamientos de datos
                  </div>
                </li>
              </ul>
              <div className="bg-crecimiento-50 border border-crecimiento-200 rounded-2xl p-4 mt-6">
                <p className="text-sm font-medium text-crecimiento-700">
                  Para ejercer estos derechos, contactá a: <strong>privacidad@adelante-ong.org</strong>
                </p>
              </div>
            </div>
          </div>

          {/* Sección 6 */}
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-neutro-carbon mb-4 flex items-center gap-3">
              <span className="w-10 h-10 rounded-full bg-impulso-400 text-white flex items-center justify-center font-semibold">6</span>
              Especificidad de Datos de Menores
            </h2>
            <div className="bg-white/60 backdrop-blur-lg rounded-3xl border border-sol-400/20 p-8 space-y-4">
              <p className="text-base leading-relaxed">
                Dada la naturaleza sensible de trabajar con menores en contextos vulnerables:
              </p>
              <ul className="space-y-3 ml-4 mt-6">
                <li className="flex gap-3">
                  <span className="text-impulso-400 font-bold">⚠</span>
                  <div>
                    <strong>Anonimización:</strong> Cada menor tiene un número de legajo; voluntarios ven alias (no apellido)
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="text-impulso-400 font-bold">⚠</span>
                  <div>
                    <strong>Consentimiento de familias:</strong> Las familias firman consentimiento informado antes de recopilar datos
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="text-impulso-400 font-bold">⚠</span>
                  <div>
                    <strong>No diagnósticamos:</strong> El sistema proporciona observaciones educativas, NO diagnósticos clínicos
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="text-impulso-400 font-bold">⚠</span>
                  <div>
                    <strong>IA informativa:</strong> Si se usa IA, solo genera recomendaciones educativas basadas en bibliografía
                  </div>
                </li>
              </ul>
            </div>
          </div>

          {/* Sección 7 */}
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-neutro-carbon mb-4 flex items-center gap-3">
              <span className="w-10 h-10 rounded-full bg-sol-400 text-white flex items-center justify-center font-semibold">7</span>
              Cookies y Tracking
            </h2>
            <div className="bg-white/60 backdrop-blur-lg rounded-3xl border border-sol-400/20 p-8 space-y-4">
              <p>
                Usamos <strong>solo cookies funcionales</strong> (necesarias para login y mantener sesión).
              </p>
              <p className="mt-4">
                <strong>NO usamos:</strong> Analytics, tracking comportamental, o cookies de terceros que identifiquen usuarios.
              </p>
            </div>
          </div>

          {/* Sección 8 */}
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-neutro-carbon mb-4 flex items-center gap-3">
              <span className="w-10 h-10 rounded-full bg-crecimiento-400 text-white flex items-center justify-center font-semibold">8</span>
              Cambios a esta Política
            </h2>
            <div className="bg-white/60 backdrop-blur-lg rounded-3xl border border-sol-400/20 p-8 space-y-4">
              <p>
                Nos reservamos el derecho de actualizar esta Política de Privacidad en cualquier momento.
              </p>
              <p className="mt-4">
                Los cambios significativos serán comunicados por email a todos los usuarios activos con al menos 30 días de anticipación.
              </p>
            </div>
          </div>

          {/* Contacto */}
          <div className="bg-gradient-to-r from-sol-400 to-crecimiento-400 rounded-3xl p-8 text-white">
            <h2 className="text-2xl font-bold mb-6">¿Preguntas sobre tu privacidad?</h2>
            <div className="space-y-3">
              <p>
                <strong>Responsable de Datos:</strong><br/>
                Asociación Civil Adelante (ONG)
              </p>
              <p>
                <strong>Contacto de Privacidad:</strong><br/>
                <a href="mailto:privacidad@adelante-ong.org" className="hover:underline font-medium">
                  privacidad@adelante-ong.org
                </a>
              </p>
              <p>
                <strong>Dirección:</strong><br/>
                [Dirección postal de la ONG]
              </p>
            </div>
          </div>

          {/* Footer links */}
          <div className="text-center py-8 border-t border-neutro-piedra/20">
            <p className="text-neutro-piedra mb-4">¿Tenés otras preguntas?</p>
            <div className="flex justify-center gap-6 flex-wrap">
              <a href="/terminos" className="text-crecimiento-600 hover:text-crecimiento-700 font-medium transition-colors">
                Términos de Servicio
              </a>
              <span className="text-neutro-piedra/30">•</span>
              <a href="/" className="text-crecimiento-600 hover:text-crecimiento-700 font-medium transition-colors">
                Volver al inicio
              </a>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
