import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'

function ViewerProfile() {
  const navigate = useNavigate()

  const [coursesStarted, setCoursesStarted] = useState(0)
  const [lessonsCompleted, setLessonsCompleted] = useState(0)
  const [savedProjectsCount, setSavedProjectsCount] = useState(0)

  const [profile, setProfile] = useState(() => {
    const storedUser = JSON.parse(localStorage.getItem('craftloop_user') || 'null')
    const storedProfile = JSON.parse(localStorage.getItem('craftloopViewerProfile') || 'null')
    return {
      name: storedProfile?.name || storedUser?.name || 'Viewer',
      username: storedProfile?.username || (storedUser?.email ? storedUser.email.split('@')[0] : 'viewer'),
      avatar: storedProfile?.avatar || storedUser?.avatar || '',
    }
  })

  const viewerName = profile?.name || 'Viewer'
  const viewerUsername = profile?.username || 'viewer'
  const viewerInitials = (viewerName || 'V').slice(0, 2).toUpperCase()

  useEffect(() => {
    if (api.isAuthenticated()) {
      api
        .getProfile()
        .then((res) => {
          if (res && res.success && res.data) {
            const u = res.data
            setProfile((prev) => ({
              ...prev,
              name: u.name || prev.name,
              username: u.username || (u.email ? u.email.split('@')[0] : prev.username),
              avatar: u.avatar || prev.avatar,
            }))
            const stored = JSON.parse(localStorage.getItem('craftloopViewerProfile') || '{}')
            localStorage.setItem(
              'craftloopViewerProfile',
              JSON.stringify({
                ...stored,
                name: u.name || stored.name || 'Viewer',
                username: u.username || (u.email ? u.email.split('@')[0] : (stored.username || 'viewer')),
                avatar: u.avatar || stored.avatar || '',
              })
            )
          }
        })
        .catch(() => {})

      api
        .getMyLearning()
        .then((res) => {
          if (res && res.data && Array.isArray(res.data)) {
            setCoursesStarted(res.data.length)
            const completedCount = res.data.reduce((total, enr) => {
              const lessons = Array.isArray(enr.completedLessonIndexes)
                ? enr.completedLessonIndexes.length
                : 0
              return total + lessons
            }, 0)
            setLessonsCompleted(completedCount)
          }
        })
        .catch(() => {})

      api
        .getSavedProjects()
        .then((res) => {
          if (res && res.data && Array.isArray(res.data)) {
            setSavedProjectsCount(res.data.length)
          }
        })
        .catch(() => {})
    }
  }, [])

  return (
    <div className="space-y-8">

      {/* Header */}
      <section>
        <p className="text-sm font-semibold text-purple-600">
          PROFILE
        </p>

        <h1 className="mt-1 text-3xl font-bold text-gray-900">
          My Profile
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">
          Manage your profile information and view your learning activity.
        </p>
      </section>

      {/* Profile Card */}
      <section className="overflow-hidden rounded-3xl border border-purple-100 bg-white">

        <div className="h-40 bg-purple-600" />

        <div className="px-8 pb-8">

          <div className="-mt-14 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">

            <div className="flex items-end gap-5">

              {profile?.avatar ? (
                <img
                  src={profile.avatar}
                  alt="Viewer profile"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    if (e.currentTarget.nextElementSibling) {
                      e.currentTarget.nextElementSibling.style.display = 'flex';
                    }
                  }}
                  className="h-28 w-28 rounded-2xl border-4 border-white object-cover shadow-md"
                />
              ) : null}
              <div
                style={{ display: profile?.avatar ? 'none' : 'flex' }}
                className="flex h-28 w-28 items-center justify-center rounded-2xl border-4 border-white bg-purple-600 text-3xl font-bold text-white shadow-md"
              >
                {viewerInitials}
              </div>

              <div className="pb-2">

                <h2 className="text-2xl font-bold text-gray-900">
                  {viewerName}
                </h2>

                <p className="mt-1 text-sm text-purple-600">
                  @{viewerUsername}
                </p>

              </div>

            </div>

            <button
              type="button"
              onClick={() => navigate('/viewereditprofile')}
              className="rounded-xl bg-purple-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-purple-700"
            >
              Edit Profile
            </button>

          </div>

          {/* Stats */}
          <div className="mt-8 grid gap-5 sm:grid-cols-3">

            <div className="rounded-2xl bg-[#faf9ff] p-5">

              <p className="text-sm text-gray-500">
                Courses Started
              </p>

              <p className="mt-2 text-2xl font-bold text-purple-700">
                {coursesStarted}
              </p>

            </div>

            <div className="rounded-2xl bg-[#faf9ff] p-5">

              <p className="text-sm text-gray-500">
                Lessons Completed
              </p>

              <p className="mt-2 text-2xl font-bold text-purple-700">
                {lessonsCompleted}
              </p>

            </div>

            <div className="rounded-2xl bg-[#faf9ff] p-5">

              <p className="text-sm text-gray-500">
                Saved Projects
              </p>

              <p className="mt-2 text-2xl font-bold text-purple-700">
                {savedProjectsCount}
              </p>

            </div>

          </div>

        </div>

      </section>

      {/* About */}
      <section className="rounded-2xl border border-purple-100 bg-white p-6">

        <h2 className="text-xl font-bold text-gray-900">
          About Me
        </h2>

        <p className="mt-3 text-sm leading-7 text-gray-500">
          I am a CraftLoop viewer interested in discovering talented creators,
          learning new skills and exploring creative projects.
        </p>

      </section>

      {/* My Learning */}
      <section className="rounded-2xl border border-purple-100 bg-white p-6">

        <div className="flex items-center justify-between">

          <div>

            <p className="text-sm font-semibold text-purple-600">
              LEARNING
            </p>

            <h2 className="mt-1 text-xl font-bold text-gray-900">
              My Learning
            </h2>

          </div>

          <button
            type="button"
            onClick={() => navigate('/mylearning')}
            className="text-sm font-bold text-purple-600 hover:text-purple-700"
          >
            View Learning
          </button>

        </div>

        <p className="mt-3 text-sm leading-6 text-gray-500">
          Continue your courses and track your learning progress from the My
          Learning section.
        </p>

      </section>

    </div>
  )
}

export default ViewerProfile