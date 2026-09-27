import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'

function SkillProfile() {
  const navigate = useNavigate()

  const [profile, setProfile] = useState(() => {
    const storedUser = JSON.parse(localStorage.getItem('craftloop_user') || 'null')
    return {
      name: storedUser?.name || 'Creator',
      username: storedUser?.email ? storedUser.email.split('@')[0] : 'creator',
      profession: storedUser?.title || 'Creator',
      skills: Array.isArray(storedUser?.skills) ? storedUser.skills.join(', ') : (storedUser?.skills || ''),
      avatar: storedUser?.avatar || '',
    }
  })

  useEffect(() => {
    api.getProfile().then((res) => {
      if (res && res.success && res.data) {
        const u = res.data
        setProfile({
          name: u.name || 'Creator',
          username: u.username || (u.email ? u.email.split('@')[0] : 'creator'),
          profession: u.title || 'Creator',
          skills: Array.isArray(u.skills) ? u.skills.join(', ') : (u.skills || ''),
          avatar: u.avatar || '',
        })
      }
    }).catch(() => {})
  }, [])

  const profileSkills = (profile.skills || '')
    .split(',')
    .map((skill) => skill.trim())
    .filter(Boolean)

  const [tools, setTools] = useState(() => {
    try {
      const saved = localStorage.getItem('craftloopCreatorTools')
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  const [showToolInput, setShowToolInput] = useState(false)
  const [newTool, setNewTool] = useState('')

  const skills = profileSkills.map((skill, index) => ({
    name: skill,
    level: index % 2 === 0 ? 'Advanced' : 'Intermediate',
    percent: index % 2 === 0 ? 90 : 75,
  }))

  const handleAddTool = () => {
    const trimmedTool = newTool.trim()

    if (!trimmedTool) {
      return
    }

    if (tools.includes(trimmedTool)) {
      alert('This tool is already added.')
      return
    }

    setTools((prev) => {
      const updated = [...prev, trimmedTool]
      localStorage.setItem('craftloopCreatorTools', JSON.stringify(updated))
      return updated
    })
    setNewTool('')
    setShowToolInput(false)
  }

  return (
    <div className="skill-profile-page">
      <main className="skill-profile-main">

        {/* Header */}
        <section className="skill-profile-header">

          <div>
            <p className="skill-profile-label">
              CREATOR PROFILE
            </p>

            <h1>
              Skill <span>Profile</span>
            </h1>

            <p>
              Showcase your creative skills, experience and tools.
            </p>
          </div>

          <button
            type="button"
            className="skill-back-btn"
            onClick={() => navigate('/dashboard')}
          >
            ← Back to Home
          </button>

        </section>

        {/* Creator Information */}
        <section className="skill-profile-card">

          <div className="skill-profile-avatar">
            {profile.avatar ? (
              <img
                src={profile.avatar}
                alt="Profile"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-purple-600 text-2xl font-bold text-white rounded-full">
                {(profile.name || 'C').slice(0, 2).toUpperCase()}
              </div>
            )}
          </div>

          <div className="skill-profile-info">

            <h2>{profile.name}</h2>

            <p>@{profile.username}</p>

            <span>{profile.profession}</span>

          </div>

          <button
            type="button"
            className="skill-edit-btn"
            onClick={() => navigate('/edit-profile')}
          >
            Edit Profile
          </button>

        </section>

        {/* Skills and Tools */}
        <section className="skill-content-grid">

          {/* Skills */}
          <div className="skills-card">

            <div className="skill-card-heading">

              <div>
                <p>MY EXPERTISE</p>
                <h2>Skills</h2>
              </div>

              <span>
                {skills.length} Skills
              </span>

            </div>

            {skills.length > 0 ? (
              skills.map((skill) => (
                <div
                  className="skill-item"
                  key={skill.name}
                >

                  <div className="skill-item-top">

                    <div>
                      <h3>{skill.name}</h3>
                      <p>{skill.level}</p>
                    </div>

                    <strong>
                      {skill.percent}%
                    </strong>

                  </div>

                  <div className="skill-progress">
                    <div
                      style={{
                        width: `${skill.percent}%`,
                      }}
                    />
                  </div>

                </div>
              ))
            ) : (
              <div className="empty-profile-state">
                <h3>No skills added yet</h3>

                <p>
                  Add your skills from Edit Profile.
                </p>

                <button
                  type="button"
                  onClick={() => navigate('/edit-profile')}
                >
                  Add Skills →
                </button>
              </div>
            )}

          </div>

          {/* Tools */}
          <div className="tools-card">

            <div className="skill-card-heading">

              <div>
                <p>TOOLS I USE</p>
                <h2>Creative Tools</h2>
              </div>

            </div>

            <div className="tools-list">

              {tools.length > 0 ? (
                tools.map((tool) => (
                  <div
                    className="tool-item"
                    key={tool}
                  >
                    <span>✦</span>
                    {tool}
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500 py-2">
                  No tools added yet. Click + Add Tool below to list the creative tools you use.
                </p>
              )}

            </div>

            {!showToolInput && (
              <button
                type="button"
                className="add-tool-btn"
                onClick={() => setShowToolInput(true)}
              >
                + Add Tool
              </button>
            )}

            {showToolInput && (
              <div className="add-tool-form">

                <input
                  type="text"
                  value={newTool}
                  onChange={(e) => setNewTool(e.target.value)}
                  placeholder="Enter tool name"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleAddTool()
                    }
                  }}
                />

                <div>
                  <button
                    type="button"
                    onClick={handleAddTool}
                  >
                    Add
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowToolInput(false)
                      setNewTool('')
                    }}
                  >
                    Cancel
                  </button>
                </div>

              </div>
            )}

          </div>

        </section>

        {/* Experience */}
        <section className="experience-card">

          <div className="skill-card-heading">

            <div>
              <p>BACKGROUND</p>
              <h2>Experience & Focus</h2>
            </div>

          </div>

          <div className="experience-grid">

            <div>
              <span>🎨</span>

              <h3>Creative Design</h3>

              <p>
                Focused on creating clean, attractive and
                user-friendly visual designs.
              </p>
            </div>

            <div>
              <span>💻</span>

              <h3>Digital Products</h3>

              <p>
                Interested in UI design, digital products and
                creative web experiences.
              </p>
            </div>

            <div>
              <span>📚</span>

              <h3>Continuous Learning</h3>

              <p>
                Always improving design skills and exploring
                new creative tools.
              </p>
            </div>

          </div>

        </section>

      </main>
    </div>
  )
}

export default SkillProfile