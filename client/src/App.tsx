import { useEffect, useState } from 'react'
import Layout from './Layout.tsx'
import Login from './Login.tsx'
import { getSession, logout } from './api/auth.ts'

type AuthState = 'checking' | 'authenticated' | 'unauthenticated'

function App() {
  const [authState, setAuthState] = useState<AuthState>('checking')

  useEffect(() => {
    getSession()
      .then(() => setAuthState('authenticated'))
      .catch(() => setAuthState('unauthenticated'))
  }, [])

  function handleLogout() {
    // Best-effort: clear the server-side cookie, but don't block
    // returning to the login screen on it — the user's intent to log
    // out shouldn't hinge on that request succeeding.
    logout().catch(() => {})
    setAuthState('unauthenticated')
  }

  if (authState === 'checking') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <p className="text-neutral-600 dark:text-neutral-400">Loading…</p>
      </div>
    )
  }

  if (authState === 'unauthenticated') {
    return <Login onLoginSuccess={() => setAuthState('authenticated')} />
  }

  return <Layout onLogout={handleLogout} />
}

export default App
