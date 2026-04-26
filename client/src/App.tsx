import { Link, Navigate, Route, Routes } from 'react-router-dom'
import { ThemeToggle } from './components/ThemeToggle'
import { DM_DEV_KEY } from './config'
import { PlayRoom } from './pages/PlayRoom'

function Home() {
  const dmDemoHref = `/play/demo?role=dm&key=${encodeURIComponent(DM_DEV_KEY)}`
  return (
    <div className="d20-landing-wrap relative flex min-h-svh flex-col overflow-hidden">
      <a href="#inicio-contenido" className="skip-link">
        Saltar al contenido principal
      </a>
      <div className="d20-parchment-overlay" aria-hidden />
      <div className="d20-grain" aria-hidden />

      {/* Nav sticky con blur */}
      <nav className="d20-top-nav" aria-label="Navegación principal">
        <div className="d20-top-logo">d20</div>
        <div className="d20-top-links" aria-label="Secciones">
          <a href="#">Mesa</a>
          <a href="#">Personajes</a>
          <a href="#">Campañas</a>
          <a href="#">Grimorio</a>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link to="/play/demo" className="d20-top-cta">
            Unirse a partida
          </Link>
        </div>
      </nav>

      <main id="inicio-contenido" tabIndex={-1} className="d20-content relative z-10 flex-1 outline-none">

        {/* Hero */}
        <section className="d20-hero" aria-label="Bienvenida">
          <div>
            <div className="d20-hero-badge" aria-hidden>
              <span className="d20-hero-badge-dot" />
              Mesa virtual en tiempo real
            </div>
            <div className="d20-hero-eyebrow">Juego de rol tabletop</div>
            <h1 className="d20-hero-title">
              Tu aventura<br />
              comienza <span className="d20-accent">aquí</span>
            </h1>
            <p className="d20-hero-desc">
              Una mesa donde los dados ruedan, las historias cobran vida y cada tirada
              puede cambiar el destino de tu partida.
            </p>
            <nav className="d20-hero-actions" aria-label="Accesos rápidos a la sala demo">
              <Link to="/play/demo" className="d20-btn-primary">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                  <path d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8z" fill="currentColor" opacity=".4"/>
                  <path d="M6.5 5.5l4 2.5-4 2.5V5.5z" fill="currentColor"/>
                </svg>
                Entrar como jugador
              </Link>
              <Link to={dmDemoHref} className="d20-btn-secondary">
                Entrar como Narrador
              </Link>
            </nav>
          </div>

          <div className="d20-hero-visual" aria-hidden>
            <div className="d20-dice-ring">
              {/* D20 central */}
              <svg
                className="d20-center-svg"
                viewBox="0 0 160 160"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  <linearGradient id="d20grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#818cf8" />
                    <stop offset="100%" stopColor="#6366f1" />
                  </linearGradient>
                  <filter id="d20glow">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                </defs>
                <polygon
                  points="80,8 148,45 148,115 80,152 12,115 12,45"
                  fill="rgba(15,18,37,0.9)"
                  stroke="url(#d20grad)"
                  strokeWidth="1.5"
                />
                <polygon
                  points="80,8 110,52 50,52"
                  fill="rgba(99,102,241,0.08)"
                  stroke="url(#d20grad)"
                  strokeWidth="0.75"
                />
                <polygon points="50,52 12,45 80,8" fill="rgba(99,102,241,0.05)" stroke="none" />
                <polygon points="110,52 148,45 80,8" fill="rgba(99,102,241,0.09)" stroke="none" />
                <line x1="50" y1="52" x2="12" y2="45" stroke="#6366f1" strokeWidth="0.75" opacity="0.6" />
                <line x1="110" y1="52" x2="148" y2="45" stroke="#6366f1" strokeWidth="0.75" opacity="0.6" />
                <line x1="50" y1="52" x2="80" y2="152" stroke="#6366f1" strokeWidth="0.75" opacity="0.5" />
                <line x1="110" y1="52" x2="80" y2="152" stroke="#6366f1" strokeWidth="0.75" opacity="0.5" />
                <line x1="50" y1="52" x2="110" y2="52" stroke="#6366f1" strokeWidth="0.75" opacity="0.5" />
                <line x1="12" y1="45" x2="12" y2="115" stroke="#6366f1" strokeWidth="0.75" opacity="0.3" />
                <line x1="148" y1="45" x2="148" y2="115" stroke="#6366f1" strokeWidth="0.75" opacity="0.3" />
                <text
                  x="80"
                  y="100"
                  textAnchor="middle"
                  fontSize="38"
                  fill="url(#d20grad)"
                  fontFamily="Outfit, system-ui, sans-serif"
                  fontWeight="800"
                  opacity="0.95"
                >
                  20
                </text>
              </svg>

              {/* Dados orbitando */}
              <div className="d20-dice-orbit">
                <svg className="d20-orbit-die" viewBox="0 0 36 36" fill="none">
                  <rect x="3" y="3" width="30" height="30" rx="5" fill="rgba(15,18,37,0.95)" stroke="#6366f1" strokeWidth="1.2" />
                  <text x="18" y="23" textAnchor="middle" fontSize="14" fill="#818cf8" fontFamily="Outfit, sans-serif" fontWeight="700">6</text>
                </svg>
              </div>
              <div className="d20-dice-orbit">
                <svg className="d20-orbit-die" viewBox="0 0 36 36" fill="none">
                  <polygon points="18,3 33,30 3,30" fill="rgba(15,18,37,0.95)" stroke="#a78bfa" strokeWidth="1.2" />
                  <text x="18" y="26" textAnchor="middle" fontSize="11" fill="#a78bfa" fontFamily="Outfit, sans-serif" fontWeight="700">4</text>
                </svg>
              </div>
              <div className="d20-dice-orbit">
                <svg className="d20-orbit-die" viewBox="0 0 36 36" fill="none">
                  <polygon points="18,2 34,12 34,24 18,34 2,24 2,12" fill="rgba(15,18,37,0.95)" stroke="#f59e0b" strokeWidth="1.2" />
                  <text x="18" y="23" textAnchor="middle" fontSize="12" fill="#f59e0b" fontFamily="Outfit, sans-serif" fontWeight="700">12</text>
                </svg>
              </div>
              <div className="d20-dice-orbit">
                <svg className="d20-orbit-die" viewBox="0 0 36 36" fill="none">
                  <polygon points="18,2 32,10 35,25 24,35 12,35 1,25 4,10" fill="rgba(15,18,37,0.95)" stroke="#34d399" strokeWidth="1.2" />
                  <text x="18" y="23" textAnchor="middle" fontSize="11" fill="#34d399" fontFamily="Outfit, sans-serif" fontWeight="700">8</text>
                </svg>
              </div>
              <div className="d20-dice-orbit">
                <svg className="d20-orbit-die" viewBox="0 0 36 36" fill="none">
                  <polygon points="18,2 34,14 28,32 8,32 2,14" fill="rgba(15,18,37,0.95)" stroke="#f87171" strokeWidth="1.2" />
                  <text x="18" y="23" textAnchor="middle" fontSize="11" fill="#f87171" fontFamily="Outfit, sans-serif" fontWeight="700">10</text>
                </svg>
              </div>
            </div>
          </div>
        </section>

        <div className="d20-divider" aria-hidden>
          <span className="d20-divider-icon">◆</span>
        </div>

        {/* Features */}
        <section className="d20-features" aria-label="Características principales">
          <article className="d20-feature-card">
            <div className="d20-feature-icon" aria-hidden>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <rect x="2" y="2" width="14" height="14" rx="3" stroke="currentColor" strokeWidth="1.5" />
                <path d="M6 9h6M9 6v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <h2 className="d20-feature-title">Mesa virtual</h2>
            <p className="d20-feature-desc">
              Mapas interactivos, fichas de personaje, iniciativa y todo lo que necesitas en una sola pantalla.
            </p>
          </article>
          <article className="d20-feature-card">
            <div className="d20-feature-icon" aria-hidden>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <polygon points="9,1 17,9 9,17 1,9" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinejoin="round" />
                <text x="9" y="13" textAnchor="middle" fontSize="7" fill="currentColor" fontWeight="700">6</text>
              </svg>
            </div>
            <h2 className="d20-feature-title">Dados en vivo</h2>
            <p className="d20-feature-desc">
              Lanza dados con resultados visibles para todo el grupo y ritmo fluido en cada turno.
            </p>
          </article>
          <article className="d20-feature-card">
            <div className="d20-feature-icon" aria-hidden>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <circle cx="6" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.5" />
                <circle cx="12" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.5" />
                <path d="M8.5 9h1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <h2 className="d20-feature-title">Multijugador</h2>
            <p className="d20-feature-desc">
              Sesiones en tiempo real con control total del Narrador para dirigir la partida.
            </p>
          </article>
        </section>

        {/* Partidas abiertas */}
        <section className="d20-table-section" aria-label="Partidas abiertas">
          <div className="d20-table-header">
            <div>
              <span className="d20-section-label">Explorar</span>
              <h2 className="d20-section-title" style={{ marginBottom: 0 }}>Partidas abiertas</h2>
            </div>
            <p className="d20-section-sub">Únete a una aventura en curso</p>
          </div>
          <div className="d20-table-grid">
            <article className="d20-table-card">
              <span className="d20-status">● En curso</span>
              <h3>La Maldición de Strahd</h3>
              <p>D&D 5e · Terror gótico</p>
            </article>
            <article className="d20-table-card">
              <span className="d20-status d20-status-full">● Completa</span>
              <h3>Abismo de Perdición</h3>
              <p>Pathfinder 2e · Alta fantasía</p>
            </article>
            <article className="d20-table-card">
              <span className="d20-status d20-status-waiting">● Esperando</span>
              <h3>Crónicas de Ébano</h3>
              <p>Homebrew · Oscuro y político</p>
            </article>
          </div>
        </section>

        <p className="d20-tip">
          Abre dos ventanas en <span>/play/demo</span> para probar multijugador en local.
        </p>

        <footer className="d20-footer">
          <div className="d20-footer-brand">d20</div>
          <div className="d20-footer-links">
            <a href="#">Acerca de</a>
            <a href="#">Contacto</a>
            <a href="#">Privacidad</a>
          </div>
        </footer>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/play/:roomId" element={<PlayRoom />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
