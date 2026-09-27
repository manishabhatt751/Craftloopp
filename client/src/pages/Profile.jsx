import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api'

function Profile() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('Projects')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [profile, setProfile] = useState(() => {
    const storedUser = JSON.parse(localStorage.getItem('craftloop_user') || 'null')
    const storedProfile = JSON.parse(localStorage.getItem('craftloopCreatorProfile') || 'null')
    return {
      name: storedProfile?.name || storedUser?.name || 'Creator',
      username: storedProfile?.username || (storedUser?.email ? storedUser.email.split('@')[0] : 'creator'),
      bio: storedProfile?.bio || storedUser?.bio || '',
      location: storedProfile?.location || storedUser?.location || '',
      profession: storedProfile?.profession || storedUser?.title || 'Creator',
      skills: Array.isArray(storedProfile?.skills)
        ? storedProfile.skills.join(', ')
        : (storedProfile?.skills || (Array.isArray(storedUser?.skills) ? storedUser.skills.join(', ') : (storedUser?.skills || ''))),
      avatar: storedProfile?.avatar || storedUser?.avatar || '',
    }
  })
  const [projects, setProjects] = useState([])
  const [courses, setCourses] = useState([])
  const [walletBalance, setWalletBalance] = useState(0)

  const fetchProfile = async () => {
    try {
      setLoading(true)
      setError(null)
      const [profRes, projRes, courseRes, walletRes] = await Promise.all([
        api.getProfile().catch(() => null),
        api.getProjects({ mine: 'true' }).catch(() => null),
        api.getCourses({ mine: 'true' }).catch(() => null),
        api.getWallet().catch(() => null),
      ])

      if (walletRes && walletRes.success && typeof walletRes.availableBalance === 'number') {
        setWalletBalance(walletRes.availableBalance)
      }

      if (profRes && profRes.success && profRes.data) {
        const u = profRes.data
        const mapped = {
          name: u.name || 'Creator',
          username: u.username || (u.email ? u.email.split('@')[0] : 'creator'),
          bio: u.bio !== undefined ? u.bio : '',
          location: u.location || '',
          profession: u.title || 'Creator',
          skills: Array.isArray(u.skills)
            ? u.skills.join(', ')
            : (u.skills || ''),
          avatar: u.avatar || '',
        }
        setProfile(mapped)
        localStorage.setItem('craftloopCreatorProfile', JSON.stringify(mapped))
      } else {
        const storedUser = JSON.parse(localStorage.getItem('craftloop_user') || 'null')
        if (storedUser) {
          setProfile((prev) => ({
            ...prev,
            name: storedUser.name || prev.name,
            avatar: storedUser.avatar || prev.avatar,
          }))
        }
      }

      if (projRes && projRes.success && Array.isArray(projRes.data)) {
        setProjects(projRes.data)
      } else {
        setProjects([])
      }

      if (courseRes && courseRes.success && Array.isArray(courseRes.data)) {
        setCourses(courseRes.data)
      } else {
        setCourses([])
      }
    } catch (err) {
      console.error('Failed to load profile from MongoDB:', err)
      setError('Unable to load profile from server.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProfile()
  }, [])

  const tabs = ['Projects', 'Courses', 'Skills']

  const skills = (profile?.skills || '')
    .split(',')
    .map((skill) => skill.trim())
    .filter(Boolean)

  const initials = (profile?.name || 'CL')
    .trim()
    .split(/\s+/)
    .map((word) => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className="profile-page">
      <div className="profile-main">
        {loading && !profile?.name ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-purple-100 bg-white p-12 text-center shadow-sm">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-purple-600 border-t-transparent" />
            <p className="mt-4 text-sm font-semibold text-gray-600">
              Loading creator profile from MongoDB Atlas...
            </p>
          </div>
        ) : error && !profile?.name ? (
          <div className="rounded-3xl border border-red-100 bg-white p-8 text-center shadow-sm">
            <p className="text-sm font-semibold text-red-600">{error}</p>
            <button
              onClick={fetchProfile}
              className="mt-4 rounded-xl bg-purple-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-purple-700"
            >
              Retry Loading
            </button>
          </div>
        ) : null}

        {/* Profile Header */}
        <section className="profile-hero">

          <div className="profile-cover"></div>

          <div className="profile-info">

            <div className="profile-avatar">
              {profile?.avatar ? (
                <img
                  src={profile.avatar}
                  alt={profile?.name || 'Profile'}
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    if (e.currentTarget.nextElementSibling) {
                      e.currentTarget.nextElementSibling.style.display = 'flex';
                    }
                  }}
                  className="h-full w-full rounded-full object-cover"
                />
              ) : null}
              <span
                style={{ display: profile?.avatar ? 'none' : 'flex' }}
                className="h-full w-full items-center justify-center rounded-full font-bold text-white"
              >
                {initials}
              </span>
            </div>

            <div className="profile-details">

              <div className="profile-name-row">

                <div>
                  <h1>{profile?.name || 'Creator'}</h1>
                  <p>@{profile?.username || 'creator'}</p>
                </div>

                <button
                  type="button"
                  className="edit-profile-btn"
                  onClick={() => navigate('/edit-profile')}
                >
                  Edit Profile
                </button>

              </div>

              <p className="profile-bio">
                {profile?.bio || 'No bio added yet. Click Edit Profile to add one.'}
              </p>

              <div className="profile-meta">
                {profile?.location ? <span>📍 {profile.location}</span> : null}
                <span>🎨 {profile?.profession || 'Creator'}</span>
                <span>✨ Available for work</span>
              </div>

            </div>

          </div>

          <div className="profile-stats">
            <div>
              <strong>{projects.length}</strong>
              <span>Projects</span>
            </div>

            <div>
              <strong>{courses.length}</strong>
              <span>Courses</span>
            </div>
          </div>

        </section>

        {/* Profile Content */}
        <section className="profile-content">

          <div className="profile-left">

            {/* Tabs */}
            <div className="profile-tabs">

              {tabs.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  className={
                    activeTab === tab
                      ? 'active-profile-tab'
                      : ''
                  }
                  onClick={() => setActiveTab(tab)}
                >
                  {tab}
                </button>
              ))}

            </div>

            {/* Projects */}
            {activeTab === 'Projects' && (
              projects.length > 0 ? (
                <div className="profile-project-grid">
                  {projects.map((project, index) => (
                    <div
                      className="profile-project-card"
                      key={project._id || project.id || index}
                    >
                      <div
                        className={`profile-project-image project-color-${index % 5}`}
                      >
                        <span>🎨</span>
                      </div>

                      <div className="profile-project-content">
                        <span>{project.category || 'General'}</span>

                        <h3>{project.title}</h3>

                        <div className="profile-project-bottom">
                          <small>{project.status || 'Published'}</small>

                          <button
                            type="button"
                            onClick={() =>
                              navigate('/your-project')
                            }
                          >
                            View →
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-profile-state">
                  <div>📁</div>
                  <h3>No Projects Yet</h3>
                  <p>Projects you create will appear here.</p>
                  <button
                    type="button"
                    onClick={() => navigate('/create')}
                  >
                    + Add Project
                  </button>
                </div>
              )
            )}

            {/* Courses */}
            {activeTab === 'Courses' && (
              courses.length > 0 ? (
                <div className="profile-project-grid">
                  {courses.map((courseItem, index) => (
                    <div
                      className="profile-project-card"
                      key={courseItem._id || courseItem.id || index}
                    >
                      <div
                        className={`profile-project-image project-color-${index % 5}`}
                      >
                        <span>🎓</span>
                      </div>

                      <div className="profile-project-content">
                        <span>{courseItem.category || 'General'}</span>

                        <h3>{courseItem.title}</h3>

                        <div className="profile-project-bottom">
                          <small>{Array.isArray(courseItem.lessons) ? `${courseItem.lessons.length} Lessons` : '0 Lessons'}</small>

                          <button
                            type="button"
                            onClick={() =>
                              navigate(`/course-details?courseId=${courseItem._id || courseItem.id}`)
                            }
                          >
                            Manage →
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-profile-state">
                  <div>🎓</div>
                  <h3>No Courses Yet</h3>
                  <p>Courses you create will appear here.</p>
                  <button
                    type="button"
                    onClick={() => navigate('/create')}
                  >
                    Create Course →
                  </button>
                </div>
              )
            )}

            {/* Skills */}
            {activeTab === 'Skills' && (
              <div className="skills-section">

                <h2>Skills & Expertise</h2>

                <p>
                  Show the skills you use in your creative work.
                </p>

                <div className="skills-list">

                  {skills.map((skill) => (
                    <span key={skill}>
                      {skill}
                    </span>
                  ))}

                </div>

              </div>
            )}

          </div>

          {/* Right Side */}
          <aside className="profile-right">

            {/* Skill Profile */}
            <div className="profile-side-card">

              <div className="side-card-heading">

                <h3>Skill Profile</h3>

                <button
                  type="button"
                  onClick={() =>
                    navigate('/skill-profile')
                  }
                >
                  View
                </button>

              </div>

              {skills.length > 0 ? (
                skills.slice(0, 3).map((skill, index) => {
                  const percent = index === 0 ? 85 : index === 1 ? 78 : 70;
                  return (
                    <div className="skill-progress" key={skill}>
                      <div>
                        <span>{skill}</span>
                        <strong>{percent}%</strong>
                      </div>
                      <div className="progress-track">
                        <div
                          className="progress-fill"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-gray-400 py-3">No skills added yet.</p>
              )}

            </div>

            {/* Balance */}
            <div className="profile-side-card balance-card">

              <div className="side-card-heading">

                <h3>Balance</h3>

                <span>💳</span>

              </div>

              <p>Available balance</p>

              <h2>₹{walletBalance.toLocaleString('en-IN')}</h2>

              <button
                type="button"
                onClick={() => navigate('/balance')}
              >
                View Balance →
              </button>

            </div>

            {/* Your Project */}
            <div className="profile-side-card">

              <div className="side-card-heading">

                <h3>Your Project</h3>

                <button
                  type="button"
                  onClick={() =>
                    navigate('/your-project')
                  }
                >
                  View All
                </button>

              </div>

              {projects.length > 0 ? (
                projects.slice(0, 2).map((proj, idx) => (
                  <div className="mini-project" key={proj._id || proj.id || idx}>
                    <div className={`mini-project-icon ${idx === 1 ? 'second' : ''}`}>
                      ✦
                    </div>
                    <div>
                      <h4 className="truncate">{proj.title}</h4>
                      <p>{proj.status || 'Published'}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-gray-400 py-3">No projects created yet.</p>
              )}

            </div>

            {/* Share */}
            <button
              type="button"
              className="share-profile-btn"
              onClick={() => navigate('/share')}
            >
              ↗ Share Profile
            </button>

          </aside>

        </section>

      </div>
    </div>
  )
}

export default Profile