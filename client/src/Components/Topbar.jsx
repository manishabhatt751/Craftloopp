import { useState, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import api from '../services/api'

function TopBar() {
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
  const storedProfile = JSON.parse(localStorage.getItem('craftloopCreatorProfile') || 'null')
  const creatorName = storedProfile?.name || storedUser?.name || 'Creator'
  const creatorUsername =
    storedProfile?.username ||
    (storedUser?.email ? storedUser.email.split('@')[0] : 'creator')
  const creatorAvatar =
    storedProfile?.avatar ||
    storedUser?.avatar ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(creatorName)}&background=7c3aed&color=fff`

  return (
    <header className="fixed left-64 right-0 top-0 z-30 h-20 border-b border-purple-100 bg-white/95 px-8 backdrop-blur">

      <div className="flex h-full items-center justify-between gap-6">

        {/* Search */}
        <form
          onSubmit={handleSearchSubmit}
          className="flex max-w-2xl flex-1 items-center rounded-2xl border border-purple-100 bg-purple-50 px-4 py-3"
        >
          <button
            type="submit"
            aria-label="Search"
            className="mr-3 flex items-center justify-center text-lg text-purple-400 transition hover:text-purple-600 focus:outline-none"
          >
            🔍
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
            className="w-full bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-400"
          />
        </form>

        {/* Right Actions */}
        <div className="relative flex items-center gap-3">

          {/* Notifications */}
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
              <span className="absolute right-2 top-2 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-purple-600 ring-2 ring-white" />
            )}
          </button>

          {/* Notification Popup */}
          {notificationsOpen && (
            <div className="absolute right-16 top-14 w-80 rounded-2xl border border-purple-100 bg-white p-4 shadow-xl">

              <div className="mb-4 flex items-center justify-between">

                <h3 className="font-semibold text-gray-800">
                  Notifications
                </h3>

                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllRead}
                    className="text-xs text-purple-600 hover:text-purple-800"
                  >
                    Mark all read
                  </button>
                )}

              </div>

              <div className="space-y-3">

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
                      <p className="text-sm font-medium text-gray-800">{n.title}</p>
                      <p className="mt-1 text-xs text-gray-500 line-clamp-2">{n.message}</p>
                    </div>
                  ))
                )}

              </div>

              <div className="mt-3 border-t border-purple-50 pt-2 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setNotificationsOpen(false)
                    navigate('/notification')
                  }}
                  className="text-xs font-semibold text-purple-600 hover:text-purple-800"
                >
                  View all notifications →
                </button>
              </div>

            </div>
          )}

          {/* Profile Button */}
          <button
            type="button"
            onClick={() => {
              setProfileOpen(!profileOpen)
              setNotificationsOpen(false)
            }}
            className="flex items-center gap-3 rounded-xl p-1.5 transition hover:bg-purple-50"
          >

            <img
              src={creatorAvatar}
              alt="Profile"
              className="h-11 w-11 rounded-full border-2 border-purple-100 object-cover"
            />

            <div className="hidden text-left md:block">

              <p className="text-sm font-semibold text-gray-800">
                {creatorName}
              </p>

              <p className="text-xs text-gray-400">
                @{creatorUsername}
              </p>

            </div>

            <span className="text-xs text-gray-400">
              ▾
            </span>

          </button>

          {/* Profile Dropdown */}
          {profileOpen && (
            <div className="absolute right-0 top-16 w-72 overflow-hidden rounded-2xl border border-purple-100 bg-white shadow-2xl">

              {/* Profile Header */}
              <div className="flex items-center gap-3 border-b border-purple-100 bg-purple-50 p-4">

                <img
                  src={creatorAvatar}
                  alt="Profile"
                  className="h-12 w-12 rounded-full object-cover"
                />

                <div>

                  <p className="font-semibold text-gray-800">
                    {creatorName}
                  </p>

                  <p className="text-xs text-gray-400">
                    @{creatorUsername}
                  </p>

                </div>

              </div>

              {/* Main Profile Options */}
              <div className="p-2">

                {/* Skill Profile */}
                <NavLink
                  to="/skill-profile"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-gray-600 hover:bg-purple-50 hover:text-purple-700"
                >
                  👤
                  <span>Skill Profile</span>
                </NavLink>

                {/* Balance */}
                <NavLink
                  to="/balance"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-gray-600 hover:bg-purple-50 hover:text-purple-700"
                >
                  💰
                  <span>Balance</span>
                </NavLink>

                {/* Your Project */}
                <NavLink
                  to="/your-project"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-gray-600 hover:bg-purple-50 hover:text-purple-700"
                >
                  📁
                  <span>Your Project</span>
                </NavLink>

                {/* Share */}
                <NavLink
                  to="/share"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-gray-600 hover:bg-purple-50 hover:text-purple-700"
                >
                  🔗
                  <span>Share</span>
                </NavLink>

              </div>

              {/* Account */}
              <div className="border-t border-purple-100 p-2">

                {/* Edit Profile */}
                <NavLink
                  to="/edit-profile"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-gray-600 hover:bg-purple-50 hover:text-purple-700"
                >
                  ✏️
                  <span>Edit Profile</span>
                </NavLink>

                {/* Account Settings */}
                <NavLink
                  to="/setting"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-gray-600 hover:bg-purple-50 hover:text-purple-700"
                >
                  ⚙️
                  <span>Account Settings</span>
                </NavLink>

                {/* Notification */}
                <NavLink
                  to="/notification"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-gray-600 hover:bg-purple-50 hover:text-purple-700"
                >
                  🔔
                  <span>Notification</span>
                </NavLink>

                {/* Help and Support */}
                <NavLink
                  to="/helpsupport"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-gray-600 hover:bg-purple-50 hover:text-purple-700"
                >
                  ❓
                  <span>Help and Support</span>
                </NavLink>

              </div>

              {/* Logout */}
              <div className="border-t border-purple-100 p-2">

                <button
                  type="button"
                  onClick={() => {
                    api.logout()
                    setProfileOpen(false)
                    navigate('/login')
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-red-500 hover:bg-red-50"
                >
                  🚪
                  <span>Logout</span>
                </button>

              </div>

            </div>
          )}

        </div>

      </div>

    </header>
  )
}

export default TopBar