import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'

function Share() {
  const navigate = useNavigate()
  const [copied, setCopied] = useState(false)
  const [message, setMessage] = useState('')

  const [profile, setProfile] = useState(() => {
    const storedUser = JSON.parse(localStorage.getItem('craftloop_user') || 'null')
    return {
      name: storedUser?.name || 'Creator',
      username: storedUser?.email ? storedUser.email.split('@')[0] : 'creator',
      bio: storedUser?.bio || 'Creator on CraftLoop.',
      profession: storedUser?.title || 'Creator',
      avatar: storedUser?.avatar || '',
    }
  })

  const [stats, setStats] = useState({
    followers: 0,
    projects: 0,
    courses: 0,
  })

  useEffect(() => {
    api.getProfile().then((res) => {
      if (res && res.success && res.data) {
        const u = res.data
        setProfile({
          name: u.name || 'Creator',
          username: u.username || (u.email ? u.email.split('@')[0] : 'creator'),
          bio: u.bio || 'Creator on CraftLoop.',
          profession: u.title || 'Creator',
          avatar: u.avatar || '',
        })
        setStats((prev) => ({
          ...prev,
          followers: u.followersCount || u.followers?.length || 0,
        }))
      }
    }).catch(() => {})

    api.getProjects({ mine: 'true' }).then((res) => {
      if (res && res.data && Array.isArray(res.data)) {
        setStats((prev) => ({ ...prev, projects: res.data.length }))
      }
    }).catch(() => {})

    api.getCourses({ mine: 'true' }).then((res) => {
      if (res && res.data && Array.isArray(res.data)) {
        setStats((prev) => ({ ...prev, courses: res.data.length }))
      }
    }).catch(() => {})
  }, [])

  const profileLink = `https://craftloop.app/creator/${profile.username}`

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(profileLink)
      setCopied(true)
      setMessage('Profile link copied successfully!')

      setTimeout(() => {
        setCopied(false)
        setMessage('')
      }, 2500)
    } catch {
      setMessage('Unable to copy the link.')
    }
  }

  const shareProfile = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${profile.name}'s CraftLoop Profile`,
          text: `Check out ${profile.name}'s creator profile on CraftLoop.`,
          url: profileLink,
        })
      } catch {
        // User cancelled sharing
      }
    } else {
      await copyLink()
    }
  }

  const shareWhatsApp = () => {
    const text = `Check out ${profile.name}'s CraftLoop profile: ${profileLink}`
    window.open(
      `https://wa.me/?text=${encodeURIComponent(text)}`,
      '_blank'
    )
  }

  const shareEmail = () => {
    const subject = `Check out ${profile.name}'s CraftLoop Profile`
    const body = `Check out this creator profile on CraftLoop:\n\n${profileLink}`

    window.location.href =
      `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  }

  const handleMoreShare = () => {
    shareProfile()
  }

  return (
    <div className="share-page">
      <main className="share-main">

        {/* Header */}
        <section className="share-header">
          <div>
            <p className="share-label">SHARE YOUR WORK</p>

            <h1>
              Share <span>Your Profile</span>
            </h1>

            <p>
              Let others discover your skills, projects and creative work.
            </p>
          </div>

          <button
            className="share-back-btn"
            onClick={() => navigate('/profile')}
          >
            ← Back to Profile
          </button>
        </section>

        {/* Main Content */}
        <section className="share-layout">

          {/* Profile Card */}
          <div className="share-profile-card">

            <div className="share-avatar">
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

            <h2>{profile.name}</h2>

            <p className="share-username">
              @{profile.username}
            </p>

            <p className="share-bio">
              {profile.bio}
            </p>

            <p className="text-sm text-purple-600">
              {profile.profession}
            </p>

            <div className="share-stats">
              <div>
                <strong>{stats.followers}</strong>
                <span>Followers</span>
              </div>

              <div>
                <strong>{stats.projects}</strong>
                <span>Projects</span>
              </div>

              <div>
                <strong>{stats.courses}</strong>
                <span>Courses</span>
              </div>
            </div>

            <button
              className="view-profile-btn"
              onClick={() => navigate('/profile')}
            >
              View Profile
            </button>

          </div>

          {/* Share Options */}
          <div className="share-options-card">

            <p className="share-small-label">
              PROFILE LINK
            </p>

            <h2>
              Share your CraftLoop profile
            </h2>

            <p className="share-description">
              Copy your profile link and share it with friends,
              clients or other creators.
            </p>

            {/* Link Box */}
            <div className="share-link-box">
              <span>{profileLink}</span>

              <button onClick={copyLink}>
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>

            {/* Success Message */}
            {message && (
              <p className="mt-3 text-sm font-medium text-purple-600">
                {message}
              </p>
            )}

            {/* Divider */}
            <div className="share-divider">
              <span>OR SHARE VIA</span>
            </div>

            {/* Social Buttons */}
            <div className="share-social-grid">

              <button
                className="share-social-btn"
                onClick={shareWhatsApp}
              >
                <span>💬</span>
                WhatsApp
              </button>

              <button
                className="share-social-btn"
                onClick={shareEmail}
              >
                <span>📧</span>
                Email
              </button>

              <button
                className="share-social-btn"
                onClick={copyLink}
              >
                <span>🔗</span>
                {copied ? 'Copied!' : 'Copy Link'}
              </button>

              <button
                className="share-social-btn"
                onClick={handleMoreShare}
              >
                <span>📱</span>
                More
              </button>

            </div>

            {/* Tip */}
            <div className="share-tip">
              <span>✨</span>

              <div>
                <h3>Grow your presence</h3>

                <p>
                  A complete profile helps people understand your
                  skills and discover your work.
                </p>
              </div>
            </div>

          </div>

        </section>

      </main>
    </div>
  )
}

export default Share