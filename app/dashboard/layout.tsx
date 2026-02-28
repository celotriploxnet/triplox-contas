'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { onAuthStateChanged, signOut, User } from 'firebase/auth'
import { auth } from '@/lib/firebase'

function NavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname()
  const active = pathname === href || pathname.startsWith(href + '/')

  return (
    <Link
      href={href}
      className="btn-ghost"
      style={{
        textDecoration: 'none',
        background: active ? 'rgba(255,255,255,.22)' : 'rgba(255,255,255,.14)',
        borderColor: active ? 'rgba(255,255,255,.35)' : 'rgba(255,255,255,.25)',
      }}
    >
      {label}
    </Link>
  )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u)
      if (!u) router.push('/login')
    })
    return () => unsub()
  }, [router])

  async function logout() {
    try {
      await signOut(auth)
      router.push('/login')
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <span className="brand-dot" />
            <div className="leading-tight">
              <div className="brand-title">Triplo-X</div>
              <div className="brand-sub">Sistema desenvolvido por Marcelo Sant’Anna</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            {/* ✅ MENU PRINCIPAL (ordem nova) */}
            <NavLink href="/dashboard" label="Início" />
            <NavLink href="/dashboard/expressos" label="Expressos" />
            <NavLink href="/dashboard/treinamentos" label="Treinamentos" />
            <NavLink href="/dashboard/agenda" label="Agenda" />
            <NavLink href="/dashboard/baixa-empresa" label="Baixa" />
            <NavLink href="/dashboard/nova-prestacao" label="Prestação" />
            <NavLink href="/dashboard/historico" label="Histórico" />

            {/* LOGOUT */}
            {user && (
              <button className="btn-ghost" type="button" onClick={logout} style={{ cursor: 'pointer' }}>
                Sair
              </button>
            )}
          </div>
        </div>
      </header>

      <section className="app-container">{children}</section>
    </main>
  )
}