import { Link, Navigate, Route, Routes } from 'react-router-dom'
import { ThemeToggle } from './components/ThemeToggle'
import { DM_DEV_KEY } from './config'
import { PlayRoom } from './pages/PlayRoom'

function Home() {
  const dmDemoHref = `/play/demo?role=dm&key=${encodeURIComponent(DM_DEV_KEY)}`
  return (
    <div className="relative flex min-h-svh flex-col">
      <a href="#inicio-contenido" className="skip-link">
        Saltar al contenido principal
      </a>

      <div className="absolute right-4 top-4 z-50 md:right-6 md:top-6">
        <ThemeToggle />
      </div>

      <main
        id="inicio-contenido"
        tabIndex={-1}
        className="font-vtt-body flex flex-1 flex-col items-center justify-center px-5 py-16 outline-none"
      >
        <div className="relative w-full max-w-xl">
          <div
            className="pointer-events-none absolute -inset-3 rounded-2xl border border-[var(--vtt-border)] opacity-80"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -left-6 top-1/2 hidden h-32 w-1 -translate-y-1/2 bg-gradient-to-b from-transparent via-[var(--vtt-gold)] to-transparent opacity-50 md:block"
            aria-hidden
          />

          <header className="vtt-surface vtt-glow-border relative px-8 pb-10 pt-12 text-center md:px-12 md:text-left">
            <p className="font-vtt-display text-[0.7rem] font-semibold uppercase tracking-[0.35em] text-[var(--vtt-gold-dim)]">
              Mesa virtual
            </p>
            <h1 className="font-vtt-display mt-3 text-4xl font-semibold tracking-tight text-[var(--vtt-text)] md:text-5xl">
              d20
            </h1>
            <p className="mx-auto mt-5 max-w-md text-pretty text-[var(--vtt-text-muted)] md:mx-0">
              Ligero y en tiempo real. Como jugador reclamas un personaje en el
              lobby; como DM controlas mapa, cuadrícula y PNJs. La clave del DM
              vive en el servidor (<span className="font-mono text-[var(--vtt-text)]">DM_SECRET</span>
              ). Opcionalmente puedes proteger la mesa con una contraseña de sesión compartida con el
              grupo (panel del DM).
            </p>
          </header>

          <nav
            className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center md:justify-start"
            aria-label="Accesos rápidos a la sala demo"
          >
            <Link to="/play/demo" className="vtt-btn-primary">
              Entrar como jugador
            </Link>
            <Link to={dmDemoHref} className="vtt-btn-secondary">
              Entrar como DM
            </Link>
          </nav>

          <p className="mt-10 text-center text-xs text-[var(--vtt-text-muted)] md:text-left">
            Consejo: abre dos ventanas en <span className="font-mono text-[var(--vtt-gold-dim)]">/play/demo</span> para
            probar varios jugadores.
          </p>
        </div>
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
