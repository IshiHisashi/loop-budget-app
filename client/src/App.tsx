import { useEffect, useState } from 'react'
import Layout from './Layout.tsx'
import Login from './Login.tsx'
import Signup from './Signup.tsx'
import { getSession, logout } from './api/auth.ts'
import { ApiError } from './api/http.ts'

type AuthState = 'checking' | 'authenticated' | 'unauthenticated' | 'unreachable'
type UnauthenticatedView = 'login' | 'signup'

function App() {
  const [authState, setAuthState] = useState<AuthState>('checking')
  const [view, setView] = useState<UnauthenticatedView>('login')

  useEffect(() => {
    getSession()
      .then(() => setAuthState('authenticated'))
      .catch((err: unknown) => {
        // A real 401 means the server is up and just says "not logged
        // in yet" — anything else (network failure, unexpected status)
        // means the server itself is unreachable or misconfigured,
        // which needs a different message than "please log in".
        setAuthState(err instanceof ApiError && err.status === 401 ? 'unauthenticated' : 'unreachable')
      })
  }, [])

  function handleLogout() {
    // Best-effort: clear the server-side cookie, but don't block
    // returning to the login screen on it — the user's intent to log
    // out shouldn't hinge on that request succeeding.
    logout().catch(() => {})
    setAuthState('unauthenticated')
    setView('login')
  }

  if (authState === 'checking') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <p className="text-neutral-600 dark:text-neutral-400">Loading…</p>
      </div>
    )
  }

  if (authState === 'unreachable') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <p
          role="alert"
          className="max-w-sm text-center text-neutral-600 dark:text-neutral-400"
        >
          Couldn't verify your session. Make sure the server is running and{' '}
          <code>server/.env</code> is configured (see <code>server/.env.example</code>), then
          reload the page.
        </p>
      </div>
    )
  }

  if (authState === 'unauthenticated') {
    if (view === 'signup') {
      return (
        <Signup
          onSignupSuccess={() => setAuthState('authenticated')}
          onSwitchToLogin={() => setView('login')}
        />
      )
    }
    return (
      <Login
        onLoginSuccess={() => setAuthState('authenticated')}
        onSwitchToSignup={() => setView('signup')}
      />
    )
  }

  return <Layout onLogout={handleLogout} />
}

export default App
