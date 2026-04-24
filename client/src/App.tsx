import { Link, Navigate, Route, Routes } from 'react-router-dom'
import logoSrc from './assets/ChatGPT Image 22 abr 2026, 19_11_27.png'
import { ThemeToggle } from './components/ThemeToggle'
import { DM_DEV_KEY } from './config'
import { PlayRoom } from './pages/PlayRoom'

function Home() {
  const dmDemoHref = `/play/demo?role=dm&key=${encodeURIComponent(DM_DEV_KEY)}`
  return (
    <div className="relative flex min-h-svh flex-col overflow-hidden">
      <a href="#inicio-contenido" className="skip-link">
        Saltar al contenido principal
      </a>

      <div
        className="pointer-events-none absolute left-1/2 top-[-9rem] z-0 h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-[color-mix(in_srgb,var(--vtt-gold)_22%,transparent)] blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute bottom-[-8rem] right-[-5rem] z-0 h-[18rem] w-[18rem] rounded-full bg-[color-mix(in_srgb,var(--vtt-forest)_20%,transparent)] blur-3xl"
        aria-hidden
      />

      <div className="absolute right-4 top-4 z-50 md:right-6 md:top-6">
        <ThemeToggle />
      </div>

      <main
        id="inicio-contenido"
        tabIndex={-1}
        className="font-vtt-body relative z-10 flex flex-1 items-center outline-none"
      >
        <div className="vtt-page-shell w-full py-14 md:py-20">
          <div className="mx-auto flex w-full max-w-5xl flex-col gap-10">
            <header className="mx-auto max-w-3xl text-center">
              <p className="inline-flex items-center gap-2 rounded-full border border-[var(--vtt-border)] bg-[color-mix(in_srgb,var(--vtt-surface)_80%,transparent)] px-4 py-1 text-xs font-semibold uppercase tracking-[0.15em] text-[var(--vtt-text-muted)]">
                Juego narrativo en tiempo real
              </p>
              <img
                src={logoSrc}
                alt="d20 — Tu mesa. Tu historia. Tu aventura."
                className="mx-auto mb-5 mt-8 w-44 drop-shadow-[0_0_26px_rgba(201,164,58,0.24)] md:w-56"
                draggable={false}
              />
              <h1 className="font-vtt-display text-balance text-4xl leading-tight md:text-6xl">
                Tu grupo, una mesa viva y aventuras que arrancan en segundos.
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-pretty text-[var(--vtt-text-muted)] md:text-lg">
                Diseñada para jugar sin fricción: los jugadores entran rápido, el Narrador controla
                mapa y personajes, y toda la sesión se sincroniza en vivo con seguridad en servidor.
              </p>
            </header>

            <nav
              className="mx-auto flex w-full max-w-xl flex-col gap-3 sm:flex-row sm:justify-center"
              aria-label="Accesos rápidos a la sala demo"
            >
              <Link to="/play/demo" className="vtt-btn-primary sm:flex-1">
                Entrar como jugador
              </Link>
              <Link to={dmDemoHref} className="vtt-btn-secondary sm:flex-1">
                Entrar como Narrador
              </Link>
            </nav>

            <section
              className="grid gap-4 md:grid-cols-3"
              aria-label="Beneficios principales de la plataforma"
            >
              <article className="rounded-2xl border border-[var(--vtt-border-subtle)] bg-[color-mix(in_srgb,var(--vtt-surface)_74%,transparent)] p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.13em] text-[var(--vtt-gold)]">
                  Jugadores
                </p>
                <h2 className="mt-2 font-vtt-display text-xl">Entra y elige personaje</h2>
                <p className="mt-2 text-sm text-[var(--vtt-text-muted)]">
                  Vestibulo claro, acceso rapido y flujo directo a la partida sin pasos de mas.
                </p>
              </article>
              <article className="rounded-2xl border border-[var(--vtt-border-subtle)] bg-[color-mix(in_srgb,var(--vtt-surface)_74%,transparent)] p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.13em] text-[var(--vtt-gold)]">
                  Narrador
                </p>
                <h2 className="mt-2 font-vtt-display text-xl">Control total de la mesa</h2>
                <p className="mt-2 text-sm text-[var(--vtt-text-muted)]">
                  Prepara mapa, cuadricula y PNJ con un panel enfocado para dirigir la sesion.
                </p>
              </article>
              <article className="rounded-2xl border border-[var(--vtt-border-subtle)] bg-[color-mix(in_srgb,var(--vtt-surface)_74%,transparent)] p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.13em] text-[var(--vtt-gold)]">
                  Seguridad
                </p>
                <h2 className="mt-2 font-vtt-display text-xl">Accesos protegidos</h2>
                <p className="mt-2 text-sm text-[var(--vtt-text-muted)]">
                  Clave privada del Narrador validada en servidor y opcion de contraseña para tu mesa.
                </p>
              </article>
            </section>

            <p className="text-center text-xs text-[var(--vtt-text-muted)]">
              Tip: abre dos ventanas en{' '}
              <span className="font-mono text-[var(--vtt-gold-dim)]">/play/demo</span> para probar
              varios jugadores.
            </p>
          </div>
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
