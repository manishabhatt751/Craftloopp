import { useState, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import api from '../services/api'

function ViewerTopbar() {
  const navigate = useNavigate()

  const [profileOpen, setProfileOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (api.isAuthenticated()) {
      api
        .getNotifications()
        .then((res) => {
          if (res && res.success && Array.isArray(res.data)) {
            setNotifications(res.data.slice(0, 5))
            setUnreadCount(typeof res.unreadCount === 'number' ? res.unreadCount : 0)
          }
        })
        .catch(() => {})
    }
  }, [notificationsOpen])

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsAsRead()
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
      setUnreadCount(0)
    } catch (_) {}
  }

  const handleSearchSubmit = (e) => {
    if (e && e.preventDefault) e.preventDefault()
    const trimmed = (searchQuery || '').trim()
    if (!trimmed) return
    navigate(`/viewerexplore?search=${encodeURIComponent(trimmed)}`)
  }

  const storedUser = JSON.parse(localStorage.getItem('craftloop_user') || 'null')
  const storedProfile = JSON.parse(localStorage.getItem('craftloopViewerProfile') || 'null')
  const viewerName = storedProfile?.name || storedUser?.name || 'Viewer'
  const viewerUsername = storedProfile?.username || (storedUser?.email ? storedUser.email.split('@')[0] : 'viewer')
  const viewerAvatar =
    storedProfile?.avatar ||
    storedUser?.avatar ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(viewerName)}&background=7c3aed&color=fff`

  return (
    <header className="fixed left-64 right-0 top-0 z-30 flex h-20 items-center justify-between border-b border-purple-100 bg-white/95 px-8 backdrop-blur">

      {/* Search */}
      <form onSubmit={handleSearchSubmit} className="relative w-full max-w-xl">
        <button
          type="submit"
          aria-label="Search"
          className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 transition hover:text-purple-600 focus:outline-none"
        >
          ⌕
        </button>

        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              handleSearchSubmit(e)
            }
          }}
          placeholder="Find a skill, creator or project..."
          className="w-full rounded-xl border border-purple-100 bg-[#faf9ff] py-3 pl-11 pr-4 text-sm text-gray-700 outline-none transition focus:border-purple-300 focus:ring-2 focus:ring-purple-100"
        />
      </form>


      {/* Right Side */}
      <div className="ml-6 flex items-center gap-4">

        {/* Notification */}
        <div className="relative">

          <button
            type="button"
            onClick={() => {
              setNotificationsOpen(!notificationsOpen)
              setProfileOpen(false)
            }}
            className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-purple-100 bg-white text-lg transition hover:bg-purple-50"
            aria-label="Notifications"
          >
            🔔

            {unreadCount > 0 && (
              <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-purple-600 ring-2 ring-white" />
            )}
          </button>


          {notificationsOpen && (
            <div className="absolute right-0 top-14 w-80 rounded-2xl border border-purple-100 bg-white p-4 shadow-xl">

              <div className="flex items-center justify-between">

                <h3 className="font-bold text-gray-900">
                  Notifications
                </h3>

                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllRead}
                    className="text-xs font-semibold text-purple-600 hover:text-purple-800"
                  >
                    Mark all read
                  </button>
                )}

              </div>

              <div className="mt-4 space-y-3">

                {notifications.length === 0 ? (
                  <p className="py-4 text-center text-xs text-gray-400">No new notifications</p>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n._id || n.id}
                      className={`rounded-xl p-3 text-left transition ${
                        n.isRead ? 'bg-gray-50' : 'bg-purple-50'
                      }`}
                    >
                      <p className="text-sm font-semibold text-gray-800">
                        {n.title}
                      </p>
                      <p className="mt-1 text-xs text-gray-500 line-clamp-2">
                        {n.message}
                      </p>
                    </div>
                  ))
                )}

              </div>

              <div className="mt-3 border-t border-purple-50 pt-2 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setNotificationsOpen(false)
                    navigate('/viewernotification')
                  }}
                  className="text-xs font-semibold text-purple-600 hover:text-purple-800"
                >
                  View all notifications →
                </button>
              </div>

            </div>
          )}

        </div>


        {/* Profile */}
        <div className="relative">

          <button
            type="button"
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-3 rounded-xl px-2 py-1.5 transition hover:bg-purple-50"
          >

            <img
              src={viewerAvatar}
              alt="Viewer profile"
              className="h-10 w-10 rounded-full object-cover ring-2 ring-purple-100"
            />

            <div className="hidden text-left sm:block">

              <p className="text-sm font-bold text-gray-800">
                {viewerName}
              </p>

              <p className="text-xs text-gray-400">
                @{viewerUsername}
              </p>

            </div>

            <span className="text-xs text-gray-400">
              ▾
            </span>

          </button>


          {profileOpen && (
            <div className="absolute right-0 top-14 w-56 overflow-hidden rounded-2xl border border-purple-100 bg-white py-2 shadow-xl">

              <NavLink
                to="/viewerprofile"
                onClick={() => setProfileOpen(false)}
                className="block px-4 py-3 text-sm font-medium text-gray-700 hover:bg-purple-50 hover:text-purple-700"
              >
                Profile
              </NavLink>

              <button
                type="button"
                onClick={() => {
                  api.logout()
                  navigate('/login')
                }}
                className="block w-full px-4 py-3 text-left text-sm font-medium text-red-500 hover:bg-red-50"
              >
                Logout
              </button>

            </div>
          )}

        </div>

      </div>

    </header>
  )
}

export default ViewerTopbar