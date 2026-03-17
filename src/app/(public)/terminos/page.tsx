export default function TerminosPage() {
  return (
    <div className="min-h-screen bg-neutro-lienzo">
      {/* Header */}
      <div className="bg-gradient-to-r from-impulso-400 to-sol-400 text-white py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-quicksand font-bold mb-2">
            Términos de Servicio
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
              Al acceder y usar la plataforma APA, aceptás estos Términos de Servicio en su totalidad. 
              Si no estás de acuerdo con alguna parte, te pedimos que no uses la plataforma.
            </p>
          </div>

          {/* Sección 1 */}
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-neutro-carbon mb-4 flex items-center gap-3">
              <span className="w-10 h-10 rounded-full bg-impulso-400 text-white flex items-center justify-center font-semibold">1</span>
              Aceptación de Términos
            </h2>
            <div className="bg-white/60 backdrop-blur-lg rounded-3xl border border-sol-400/20 p-8 space-y-4">
              <p>
                Al registrarte, iniciar sesión, o usar cualquier funcionalidad de la plataforma APA, 
                aceptás estar legalmente obligado por estos Términos de Servicio y nuestra Política de Privacidad.
              </p>
              <p className="text-sm text-neutro-piedra pt-4 border-t border-neutro-piedra/20">
                Si no aceptás estos términos, no deberías acceder ni usar la plataforma.
              </p>
            </div>
          </div>

          {/* Sección 2 */}
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-neutro-carbon mb-4 flex items-center gap-3">
              <span className="w-10 h-10 rounded-full bg-sol-400 text-white flex items-center justify-center font-semibold">2</span>
              Descripción del Servicio
            </h2>
            <div className="bg-white/60 backdrop-blur-lg rounded-3xl border border-sol-400/20 p-8 space-y-4">
              <p>
                Plataforma APA es una herramienta de gestión educativa y seguimiento diseñada para:
              </p>
              <ul className="space-y-3 ml-4 mt-6">
                <li className="flex gap-3">
                  <span className="text-sol-400 font-bold">•</span>
                  <div>Registro de sesiones educativas y actividades con menores</div>
                </li>
                <li className="flex gap-3">
                  <span className="text-sol-400 font-bold">•</span>
                  <div>Análisis de progreso educativo mediante observaciones sistemáticas</div>
                </li>
                <li className="flex gap-3">
                  <span className="text-sol-400 font-bold">•</span>
                  <div>Generación de reportes psicopedagógicos informativos</div>
                </li>
                <li className="flex gap-3">
                  <span className="text-sol-400 font-bold">•</span>
                  <div>Coordinación de voluntarios y equipos educativos</div>
                </li>
                <li className="flex gap-3">
                  <span className="text-sol-400 font-bold">•</span>
                  <div>Consultas a biblioteca de recursos psicopedagógicos mediante IA</div>
                </li>
              </ul>
              <div className="bg-neutro-piedra/5 border border-neutro-piedra/20 rounded-2xl p-4 mt-6">
                <p className="text-sm font-medium">
                  <strong>⚠ Importante:</strong> La plataforma es una herramienta de apoyo educativo. 
                  NO reemplaza evaluaciones clínicas profesionales ni diagnósticos médicos/psicológicos.
                </p>
              </div>
            </div>
          </div>

          {/* Sección 3 */}
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-neutro-carbon mb-4 flex items-center gap-3">
              <span className="w-10 h-10 rounded-full bg-crecimiento-400 text-white flex items-center justify-center font-semibold">3</span>
              Responsabilidades del Usuario
            </h2>
            <div className="bg-white/60 backdrop-blur-lg rounded-3xl border border-sol-400/20 p-8 space-y-4">
              <p>Al usar la plataforma, aceptás:</p>
              <ul className="space-y-3 ml-4 mt-6">
                <li className="flex gap-3">
                  <span className="text-crecimiento-400 font-bold">✓</span>
                  <div>
                    <strong>Usar solo para fines educativos:</strong> La plataforma es exclusivamente para la ONG Adelante y sus programas educativos autorizados
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="text-crecimiento-400 font-bold">✓</span>
                  <div>
                    <strong>Mantener confidencial tu contraseña:</strong> Sos responsable por toda actividad en tu cuenta
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="text-crecimiento-400 font-bold">✓</span>
                  <div>
                    <strong>No compartir acceso:</strong> No cedes tu cuenta a otros usuarios ni compartes credenciales
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="text-crecimiento-400 font-bold">✓</span>
                  <div>
                    <strong>Respetar privacidad de menores:</strong> Los datos de niños son estrictamente confidenciales y no pueden ser compartidos sin autorización
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="text-crecimiento-400 font-bold">✓</span>
                  <div>
                    <strong>Reportar accesos no autorizados:</strong> Si sospechas que alguien más usó tu cuenta, notificá inmediatamente
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="text-crecimiento-400 font-bold">✓</span>
                  <div>
                    <strong>Cumplir confidencialidad legal:</strong> Los datos de menores están protegidos por ley y no pueden ser divulgados
                  </div>
                </li>
              </ul>
            </div>
          </div>

          {/* Sección 4 */}
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-neutro-carbon mb-4 flex items-center gap-3">
              <span className="w-10 h-10 rounded-full bg-impulso-400 text-white flex items-center justify-center font-semibold">4</span>
              Conducta Prohibida
            </h2>
            <div className="bg-white/60 backdrop-blur-lg rounded-3xl border border-sol-400/20 p-8 space-y-4">
              <p>Está estrictamente prohibido:</p>
              <ul className="space-y-3 ml-4 mt-6">
                <li className="flex gap-3">
                  <span className="text-impulso-400 font-bold">✗</span>
                  <div>Usar la plataforma para fines comerciales o lucrativos</div>
                </li>
                <li className="flex gap-3">
                  <span className="text-impulso-400 font-bold">✗</span>
                  <div>Acceder a datos de menores sin rol autorizado o permiso explícito</div>
                </li>
                <li className="flex gap-3">
                  <span className="text-impulso-400 font-bold">✗</span>
                  <div>Descargar, copiar o distribuir datos personales fuera de la plataforma</div>
                </li>
                <li className="flex gap-3">
                  <span className="text-impulso-400 font-bold">✗</span>
                  <div>Intentar hackear, vulnerar, o probar la seguridad (penalizado legalmente)</div>
                </li>
                <li className="flex gap-3">
                  <span className="text-impulso-400 font-bold">✗</span>
                  <div>Usar la plataforma para acoso, discriminación, o violencia</div>
                </li>
                <li className="flex gap-3">
                  <span className="text-impulso-400 font-bold">✗</span>
                  <div>Falsificar información o crear registros fraudulentos</div>
                </li>
                <li className="flex gap-3">
                  <span className="text-impulso-400 font-bold">✗</span>
                  <div>Revender, licenciar, o reasignar acceso a third parties</div>
                </li>
                <li className="flex gap-3">
                  <span className="text-impulso-400 font-bold">✗</span>
                  <div>Reproducir, modificar, o crear obras derivadas del código fuente</div>
                </li>
              </ul>
            </div>
          </div>

          {/* Sección 5 */}
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-neutro-carbon mb-4 flex items-center gap-3">
              <span className="w-10 h-10 rounded-full bg-sol-400 text-white flex items-center justify-center font-semibold">5</span>
              Limitación de Responsabilidad
            </h2>
            <div className="bg-white/60 backdrop-blur-lg rounded-3xl border border-sol-400/20 p-8 space-y-4">
              <p className="font-medium">
                La plataforma APA se proporciona «TAL CUAL» sin garantías explícitas o implícitas.
              </p>
              <p className="mt-4">
                <strong>NO somos responsables por:</strong>
              </p>
              <ul className="space-y-3 ml-4 mt-4">
                <li className="flex gap-3">
                  <span className="text-neutro-piedra font-bold">•</span>
                  <div>Pérdida temporal de servicio (mantenimiento, actualizaciones de seguridad)</div>
                </li>
                <li className="flex gap-3">
                  <span className="text-neutro-piedra font-bold">•</span>
                  <div>Errores del usuario al registrar datos en sesiones</div>
                </li>
                <li className="flex gap-3">
                  <span className="text-neutro-piedra font-bold">•</span>
                  <div>Interpretación clínica de resultados (el sistema genera observaciones educativas, no diagnósticos médicos)</div>
                </li>
                <li className="flex gap-3">
                  <span className="text-neutro-piedra font-bold">•</span>
                  <div>Daños directos, indirectos, incidentales, o consecuentes derivados del uso de la plataforma</div>
                </li>
              </ul>
              <div className="bg-impulso-50 border border-impulso-200 rounded-2xl p-4 mt-6">
                <p className="text-sm font-medium text-impulso-700">
                  <strong>Disclaimer médico/legal:</strong> Las recomendaciones de la plataforma basadas en IA son informatvas y educativas. 
                  Para evaluaciones clínicas o diagnósticas, consultá con profesionales calificados.
                </p>
              </div>
            </div>
          </div>

          {/* Sección 6 */}
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-neutro-carbon mb-4 flex items-center gap-3">
              <span className="w-10 h-10 rounded-full bg-crecimiento-400 text-white flex items-center justify-center font-semibold">6</span>
              Cambios y Actualizaciones de la Plataforma
            </h2>
            <div className="bg-white/60 backdrop-blur-lg rounded-3xl border border-sol-400/20 p-8 space-y-4">
              <p>
                Nos reservamos el derecho de cambiar, mejorar, o descontinuar funcionalidades de la plataforma en cualquier momento.
              </p>
              <p className="mt-4">
                Cambios significativos (ej: eliminación de campos de datos, cambios de seguridad) serán comunicados por email 
                a todos los usuarios activos con al menos 30 días de anticipación.
              </p>
              <p className="mt-4 text-sm text-neutro-piedra">
                Actualizaciones menores de seguridad pueden desplegarse sin previo aviso.
              </p>
            </div>
          </div>

          {/* Sección 7 */}
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-neutro-carbon mb-4 flex items-center gap-3">
              <span className="w-10 h-10 rounded-full bg-impulso-400 text-white flex items-center justify-center font-semibold">7</span>
              Terminación de Acceso
            </h2>
            <div className="bg-white/60 backdrop-blur-lg rounded-3xl border border-sol-400/20 p-8 space-y-4">
              <p>
                Podemos suspender o terminar l acceso a tu cuenta si:
              </p>
              <ul className="space-y-3 ml-4 mt-6">
                <li className="flex gap-3">
                  <span className="text-impulso-400 font-bold">⚠</span>
                  <div>Violás estos Términos de Servicio o nuestra Política de Privacidad</div>
                </li>
                <li className="flex gap-3">
                  <span className="text-impulso-400 font-bold">⚠</span>
                  <div>Intentás vulnerar la seguridad o acceder a datos no autorizados</div>
                </li>
                <li className="flex gap-3">
                  <span className="text-impulso-400 font-bold">⚠</span>
                  <div>Usás datos de menores para fines distintos a los autorizados</div>
                </li>
                <li className="flex gap-3">
                  <span className="text-impulso-400 font-bold">⚠</span>
                  <div>Compartís datos personales fuera de la plataforma sin consentimiento</div>
                </li>
                <li className="flex gap-3">
                  <span className="text-impulso-400 font-bold">⚠</span>
                  <div>Ya no trabajás para la ONG Adelante (fin de contrato, renuncia)</div>
                </li>
              </ul>
              <p className="text-sm text-neutro-piedra mt-6 pt-6 border-t border-neutro-piedra/20">
                Ante suspensión, haremos esfuerzos razonables para notificarte. 
                Puedes solicitar revisión de la decisión a <strong>legal@adelante-ong.org</strong>
              </p>
            </div>
          </div>

          {/* Sección 8 */}
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-neutro-carbon mb-4 flex items-center gap-3">
              <span className="w-10 h-10 rounded-full bg-sol-400 text-white flex items-center justify-center font-semibold">8</span>
              Propiedad Intelectual
            </h2>
            <div className="bg-white/60 backdrop-blur-lg rounded-3xl border border-sol-400/20 p-8 space-y-4">
              <p>
                <strong>Código y Diseño:</strong> Todo el código fuente, diseño de interfaz, y documentación de la plataforma APA 
                pertenece a GlobalIA y ONG Adelante. Está prohibido reproducir, modificar, o distribuir sin autorización explícita.
              </p>
              <p className="mt-4">
                <strong>Datos del usuario:</strong> Sos propietario de los datos educativos que registrás. 
                Otorgás a la plataforma licencia no exclusiva, no transferible, para procesar y analizar esos datos.
              </p>
              <p className="mt-4">
                <strong>Contenido generado por IA:</strong> Las recomendaciones y análisis generados por IA se proporcionan 
                con fines informativos. Puedes usar estos análisis internamente en la ONG.
              </p>
            </div>
          </div>

          {/* Sección 9 */}
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-neutro-carbon mb-4 flex items-center gap-3">
              <span className="w-10 h-10 rounded-full bg-crecimiento-400 text-white flex items-center justify-center font-semibold">9</span>
              Jurisdicción y Ley Aplicable
            </h2>
            <div className="bg-white/60 backdrop-blur-lg rounded-3xl border border-sol-400/20 p-8 space-y-4">
              <p>
                Estos Términos de Servicio se rigen por las leyes de la República Argentina.
              </p>
              <p className="mt-4">
                Cualquier disputa será resuelta:
              </p>
              <ul className="space-y-3 ml-4 mt-6">
                <li className="flex gap-3">
                  <span className="text-crecimiento-400 font-bold">1.</span>
                  <div>Primero mediante resolución amistosa (mediación)</div>
                </li>
                <li className="flex gap-3">
                  <span className="text-crecimiento-400 font-bold">2.</span>
                  <div>Si no se resuelve, conforme a los juzgados en lo comercial de la Ciudad de Buenos Aires</div>
                </li>
              </ul>
            </div>
          </div>

          {/* Sección 10 */}
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-neutro-carbon mb-4 flex items-center gap-3">
              <span className="w-10 h-10 rounded-full bg-impulso-400 text-white flex items-center justify-center font-semibold">10</span>
              Contacto y Soporte
            </h2>
            <div className="bg-white/60 backdrop-blur-lg rounded-3xl border border-sol-400/20 p-8 space-y-4">
              <p>
                Si tenés preguntas sobre estos términos o necesitás soporte técnico:
              </p>
              <div className="space-y-4 mt-6">
                <div>
                  <p className="font-medium text-neutro-carbon">Asuntos Legales:</p>
                  <a href="mailto:legal@adelante-ong.org" className="text-crecimiento-600 hover:text-crecimiento-700 transition-colors">
                    legal@adelante-ong.org
                  </a>
                </div>
                <div>
                  <p className="font-medium text-neutro-carbon">Reportar Abuso:</p>
                  <a href="mailto:seguridad@adelante-ong.org" className="text-crecimiento-600 hover:text-crecimiento-700 transition-colors">
                    seguridad@adelante-ong.org
                  </a>
                </div>
                <div>
                  <p className="font-medium text-neutro-carbon">Soporte Técnico:</p>
                  <a href="mailto:soporte@adelante-ong.org" className="text-crecimiento-600 hover:text-crecimiento-700 transition-colors">
                    soporte@adelante-ong.org
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Firma */}
          <div className="bg-gradient-to-r from-impulso-400 to-sol-400 rounded-3xl p-8 text-white">
            <h2 className="text-2xl font-bold mb-4">Acuerdo Vinculante</h2>
            <p className="leading-relaxed">
              Al acceder a la plataforma APA luego de que estos Términos de Servicio hayan sido actualizados, 
              confirmás que has leído, comprendido y aceptás estar vinculado por estos términos en su totalidad.
            </p>
            <p className="mt-4 font-medium">
              Gracias por ser parte de Plataforma APA. 🙏
            </p>
          </div>

          {/* Footer links */}
          <div className="text-center py-8 border-t border-neutro-piedra/20">
            <p className="text-neutro-piedra mb-4">Documentos relacionados</p>
            <div className="flex justify-center gap-6 flex-wrap">
              <a href="/privacidad" className="text-crecimiento-600 hover:text-crecimiento-700 font-medium transition-colors">
                Política de Privacidad
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
