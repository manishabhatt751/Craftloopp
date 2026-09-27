import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api'

function EditProfile() {
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState({ show: false, message: '', type: 'info' })

  const storedUser = JSON.parse(localStorage.getItem('craftloop_user') || '{}')
  const isViewer = storedUser?.role === 'viewer' || window.location.pathname.includes('viewer')
  const profilePath = isViewer ? '/viewerprofile' : '/profile'

  const [formData, setFormData] = useState({
    name: storedUser.name || '',
    username: storedUser.username || (storedUser.email ? storedUser.email.split('@')[0] : ''),
    bio: storedUser.bio || '',
    location: storedUser.location || '',
    profession: storedUser.title || (isViewer ? 'Viewer' : 'Creator'),
    skills: Array.isArray(storedUser.skills) ? storedUser.skills.join(', ') : (storedUser.skills || ''),
    avatar: storedUser.avatar || '',
  })

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type })
    setTimeout(() => {
      setToast((prev) => ({ ...prev, show: false }))
    }, 3800)
  }

  // Load initial profile from MongoDB Atlas via API
  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoading(true)
        const res = await api.getProfile()
        if (res && res.success && res.data) {
          const u = res.data
          setFormData({
            name: u.name || '',
            username: u.username || (u.email ? u.email.split('@')[0] : ''),
            bio: u.bio !== undefined ? u.bio : '',
            location: u.location || '',
            profession: u.title || (u.role === 'creator' ? 'Creator' : 'Viewer'),
            skills: Array.isArray(u.skills) ? u.skills.join(', ') : (u.skills || ''),
            avatar: u.avatar || '',
          })
        }
      } catch (err) {
        console.error('Failed to load profile from backend:', err)
        showToast('Unable to load latest profile from server. Showing local cache.', 'warning')
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleAvatarFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file (PNG, JPG, WEBP).', 'error')
      return
    }

    const FIVE_GB = 5000 * 1024 * 1024
    if (file.size > FIVE_GB) {
      showToast('File exceeds the 5 GB limit. Maximum file size: 5 GB.', 'warning')
      return
    }

    try {
      showToast('Uploading profile picture...', 'info')
      const res = await api.uploadAvatar(file)
      const uploadedUrl =
        res?.url || res?.secure_url || res?.avatar || res?.user?.avatar || res?.data?.avatar

      if (res && res.success && uploadedUrl) {
        setFormData((prev) => ({ ...prev, avatar: uploadedUrl }))

        // Update local storage so current session immediately shows the new avatar
        const currentUser = JSON.parse(localStorage.getItem('craftloop_user') || '{}')
        localStorage.setItem(
          'craftloop_user',
          JSON.stringify({ ...currentUser, avatar: uploadedUrl })
        )
        if (isViewer) {
          const currentViewerProfile = JSON.parse(localStorage.getItem('craftloopViewerProfile') || '{}')
          localStorage.setItem(
            'craftloopViewerProfile',
            JSON.stringify({ ...currentViewerProfile, avatar: uploadedUrl })
          )
        } else {
          const currentCreatorProfile = JSON.parse(localStorage.getItem('craftloopCreatorProfile') || '{}')
          localStorage.setItem(
            'craftloopCreatorProfile',
            JSON.stringify({ ...currentCreatorProfile, avatar: uploadedUrl })
          )
        }

        // Auto-save avatar URL to User document in MongoDB
        try {
          await api.updateProfile({ avatar: uploadedUrl })
        } catch (_) {}

        showToast('Profile picture uploaded successfully! Preview updated.', 'success')
      } else {
        throw new Error(res?.message || 'Profile picture upload failed.')
      }
    } catch (err) {
      console.error('Avatar upload failed:', err)
      let errorMsg = 'Profile picture upload failed. Please try again.'
      if (err?.status === 413 || (err?.message && err.message.toLowerCase().includes('large'))) {
        errorMsg = 'File exceeds maximum upload size limit (5 GB). Please choose a smaller image.'
      } else if (err?.status === 400) {
        errorMsg = err.message || 'Invalid image file or format.'
      } else if (err?.status === 401) {
        errorMsg = 'Your session has expired. Please log in again.'
      } else if (err?.status === 403) {
        errorMsg = 'You are not authorized to upload an avatar.'
      } else if (err?.status === 404) {
        errorMsg = 'Upload endpoint not found.'
      } else if (err?.status === 500) {
        errorMsg = err.message || 'Server error occurred during upload. Please try again.'
      } else if (err?.status === 502) {
        errorMsg = 'Upload proxy error (502). The server is temporarily unavailable.'
      } else if (err?.message) {
        errorMsg = err.message
      }
      showToast(errorMsg, 'error')
    }
  }

  // Submit profile changes to MongoDB Atlas
  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      showToast('Full name cannot be empty.', 'warning')
      return
    }

    try {
      setSaving(true)
      const payload = {
        name: formData.name.trim(),
        username: formData.username.trim(),
        bio: formData.bio.trim(),
        location: formData.location.trim(),
        profession: formData.profession.trim(),
        title: formData.profession.trim(),
        skills: formData.skills,
        avatar: formData.avatar || '',
      }

      const res = await api.updateProfile(payload)
      if (res && res.success && res.data) {
        const u = res.data
        const updatedProfile = {
          name: u.name || payload.name,
          username: u.username || payload.username,
          bio: u.bio !== undefined ? u.bio : payload.bio,
          location: u.location || payload.location,
          profession: u.title || payload.profession,
          skills: Array.isArray(u.skills) ? u.skills.join(', ') : payload.skills,
          avatar: u.avatar || payload.avatar,
        }

        // Sync with localStorage for Topbar / Navigation consistency
        if (isViewer) {
          localStorage.setItem('craftloopViewerProfile', JSON.stringify(updatedProfile))
        } else {
          localStorage.setItem('craftloopCreatorProfile', JSON.stringify(updatedProfile))
        }

        const currentUser = JSON.parse(localStorage.getItem('craftloop_user') || '{}')
        localStorage.setItem(
          'craftloop_user',
          JSON.stringify({ ...currentUser, ...u })
        )

        showToast('Profile updated successfully in MongoDB Atlas!', 'success')
        setTimeout(() => {
          navigate(profilePath)
        }, 800)
      }
    } catch (err) {
      console.error('Failed to update profile:', err)
      showToast(err.message || 'Error updating profile on server.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const initials = (formData.name || 'AM')
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className="edit-profile-page">
      {/* On-screen Toast Notification */}
      {toast.show && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl bg-gray-900 px-5 py-4 text-sm font-medium text-white shadow-2xl transition-all animate-bounce">
          <span className="text-lg">
            {toast.type === 'success' && '✅'}
            {toast.type === 'error' && '❌'}
            {toast.type === 'warning' && '⚠️'}
            {toast.type === 'info' && 'ℹ️'}
          </span>
          <span>{toast.message}</span>
          <button
            onClick={() => setToast((prev) => ({ ...prev, show: false }))}
            className="ml-2 text-gray-400 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      <div className="edit-profile-main">
        {/* Header */}
        <div className="edit-profile-header">
          <div>
            <p className="edit-profile-label">PROFILE SETTINGS</p>

            <h1>Edit Profile</h1>

            <p>
              Update your profile information and let people know more about you.
            </p>
          </div>

          <button
            type="button"
            className="back-profile-btn"
            onClick={() => navigate(profilePath)}
          >
            ← Back to Profile
          </button>
        </div>

        {/* Form */}
        <div className="edit-profile-layout">
          <div className="edit-profile-card">
            {loading ? (
              <div className="flex flex-col items-center justify-center p-12 text-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-600 border-t-transparent" />
                <p className="mt-3 text-xs font-semibold text-gray-500">
                  Loading profile data from MongoDB Atlas...
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                {/* Profile Photo */}
                <div className="edit-photo-section">
                  <div className="edit-avatar">
                    {formData.avatar ? (
                      <img
                        src={formData.avatar}
                        alt={formData.name || 'Profile'}
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
                      style={{ display: formData.avatar ? 'none' : 'flex' }}
                      className="h-full w-full items-center justify-center rounded-full font-bold"
                    >
                      {initials}
                    </span>
                  </div>

                  <div>
                    <h3>Profile Photo</h3>

                    <p>
                      Add a professional photo to your profile. Maximum file size: 5 GB.
                    </p>

                    <input
                      id="avatar-file-input"
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarFileChange}
                      className="hidden"
                    />

                    <button
                      type="button"
                      className="change-photo-btn"
                      onClick={() => {
                        const input = document.getElementById('avatar-file-input')
                        if (input) input.click()
                      }}
                    >
                      Change Photo
                    </button>
                  </div>
                </div>

                {/* Basic Information */}
                <div className="form-section">
                  <div className="form-section-title">
                    <h2>Basic Information</h2>

                    <p>
                      Keep your profile information up to date.
                    </p>
                  </div>

                  <div className="edit-form-row">
                    <div className="edit-form-group">
                      <label>Full Name</label>

                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="Enter your name"
                        required
                      />
                    </div>

                    <div className="edit-form-group">
                      <label>Username</label>

                      <input
                        type="text"
                        name="username"
                        value={formData.username}
                        onChange={handleChange}
                        placeholder="Enter username"
                      />
                    </div>
                  </div>

                  <div className="edit-form-group">
                    <label>Bio</label>

                    <textarea
                      name="bio"
                      value={formData.bio}
                      onChange={handleChange}
                      placeholder="Tell people about yourself..."
                      rows="5"
                      maxLength="250"
                    />

                    <span className="character-count">
                      {formData.bio.length}/250
                    </span>
                  </div>
                </div>

                {/* Professional Information */}
                <div className="form-section">
                  <div className="form-section-title">
                    <h2>Professional Information</h2>

                    <p>
                      Tell the community what you do.
                    </p>
                  </div>

                  <div className="edit-form-row">
                    <div className="edit-form-group">
                      <label>Location</label>

                      <input
                        type="text"
                        name="location"
                        value={formData.location}
                        onChange={handleChange}
                        placeholder="Your location"
                      />
                    </div>

                    <div className="edit-form-group">
                      <label>Profession</label>

                      <input
                        type="text"
                        name="profession"
                        value={formData.profession}
                        onChange={handleChange}
                        placeholder="Your profession"
                      />
                    </div>
                  </div>

                  <div className="edit-form-group">
                    <label>Skills</label>

                    <input
                      type="text"
                      name="skills"
                      value={formData.skills}
                      onChange={handleChange}
                      placeholder="UI/UX Design, Figma..."
                    />

                    <span className="input-hint">
                      Separate multiple skills with commas.
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="edit-form-actions">
                  <button
                    type="button"
                    className="discard-profile-btn"
                    onClick={() => navigate(profilePath)}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="save-profile-btn"
                    disabled={saving}
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Preview */}
          <aside className="profile-preview-card">
            <div className="preview-heading">
              <h3>Profile Preview</h3>
              <span>Live Preview</span>
            </div>

            <div className="preview-cover"></div>

            <div className="preview-content">
              <div className="preview-avatar">
                {formData.avatar ? (
                  <img
                    src={formData.avatar}
                    alt={formData.name || 'Profile'}
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
                  style={{ display: formData.avatar ? 'none' : 'flex' }}
                  className="h-full w-full items-center justify-center rounded-full font-bold"
                >
                  {initials}
                </span>
              </div>

              <h2>{formData.name}</h2>

              <p className="preview-username">
                @{formData.username}
              </p>

              <p className="preview-bio">
                {formData.bio}
              </p>

              <div className="preview-meta">
                <span>📍 {formData.location}</span>
                <span>🎨 {formData.profession}</span>
              </div>

              <div className="preview-skills">
                {(formData.skills || '')
                  .split(',')
                  .map((skill) => skill.trim())
                  .filter(Boolean)
                  .map((skill) => (
                    <span key={skill}>
                      {skill}
                    </span>
                  ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}

export default EditProfile