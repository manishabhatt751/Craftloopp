import { useState, useEffect } from 'react'
import { Navigate, useLocation, Outlet } from 'react-router-dom'
import api from '../services/api'

// In-memory session verification cache to prevent flashing on client-side route transitions
let sessionVerifiedUserId = null

export function clearSessionVerification() {
  sessionVerifiedUserId = null
}

/**
 * ProtectedRoute Guard
 * Enforces JWT authentication, backend verification, and role-based access control.
 *
 * @param {Object} props
 * @param {'creator' | 'viewer'} [props.allowedRole] - Role required to view this route
 * @param {React.ReactNode} [props.children] - Optional child elements (or Outlet)
 */
function ProtectedRoute({ allowedRole, children }) {
  const location = useLocation()
  const token = api.getToken()
  const storedRole =
    localStorage.getItem('craftloopRole') ||
    JSON.parse(localStorage.getItem('craftloop_user') || 'null')?.role

  // State: 'checking' | 'authorized' | 'unauthorized' | 'role_mismatch'
  const [authState, setAuthState] = useState(() => {
    if (!token) return 'unauthorized'
    // If token and storedRole exist and match, authorize immediately for smooth transition
    if (storedRole) {
      if (allowedRole && storedRole !== allowedRole) {
        return 'role_mismatch'
      }
      return 'authorized'
    }
    return 'checking'
  })

  useEffect(() => {
    let isMounted = true

    if (!token) {
      setAuthState('unauthorized')
      return
    }

    // Verify token and role with authoritative backend MongoDB
    api
      .getMe()
      .then((res) => {
        if (!isMounted) return

        if (res && res.success && res.user) {
          const userRole = res.user.role || storedRole
          sessionVerifiedUserId = res.user.id || res.user._id

          // Sync storage with authoritative role
          if (res.user.role) {
            localStorage.setItem('craftloopRole', res.user.role)
          }

          if (allowedRole && userRole !== allowedRole) {
            setAuthState('role_mismatch')
          } else {
            setAuthState('authorized')
          }
        } else {
          api.logout()
          sessionVerifiedUserId = null
          setAuthState('unauthorized')
        }
      })
      .catch((err) => {
        if (!isMounted) return
        console.warn('Authentication guard check failed:', err.message || err)
        api.logout()
        sessionVerifiedUserId = null
        setAuthState('unauthorized')
      })

    return () => {
      isMounted = false
    }
  }, [token, allowedRole, location.pathname])

  // 1. Not logged in or invalid token -> Redirect to login
  if (authState === 'unauthorized') {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  // 2. Role mismatch -> Redirect to appropriate home area
  if (authState === 'role_mismatch') {
    const currentRole =
      localStorage.getItem('craftloopRole') ||
      JSON.parse(localStorage.getItem('craftloop_user') || 'null')?.role

    if (currentRole === 'creator') {
      return <Navigate to="/dashboard" replace />
    }
    return <Navigate to="/viewerhome" replace />
  }

  // 3. Verifying with backend -> Show minimal, elegant loading state
  if (authState === 'checking') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#faf9ff]">
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-600 text-xl font-bold text-white shadow-lg shadow-purple-200">
            ✦
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 animate-bounce rounded-full bg-purple-600" />
            <span className="h-2 w-2 animate-bounce rounded-full bg-purple-600 [animation-delay:150ms]" />
            <span className="h-2 w-2 animate-bounce rounded-full bg-purple-600 [animation-delay:300ms]" />
          </div>
        </div>
      </div>
    )
  }

  // 4. Authorized -> Render layout/page
  return children ? children : <Outlet />
}

export default ProtectedRoute
