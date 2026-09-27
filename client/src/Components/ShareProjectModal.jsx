import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'

export default function ShareProjectModal({ isOpen, onClose, project, onSuccess }) {
  const navigate = useNavigate()
  const [content, setContent] = useState('Check out my latest project!')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)

  const currentRole = localStorage.getItem('craftloopRole') || 'creator'

  useEffect(() => {
    if (isOpen) {
      setContent('Check out my latest project!')
      setError(null)
      setSuccess(false)
      setCopiedLink(false)
    }
  }, [isOpen, project])

  if (!isOpen || !project) return null

  const projectId = project._id || project.id
  const projectUrl = `${window.location.origin}/project/${projectId}`

  const handleCopyLink = async () => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(projectUrl)
      } else {
        const textArea = document.createElement('textarea')
        textArea.value = projectUrl
        textArea.style.position = 'fixed'
        textArea.style.left = '-9999px'
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
      }
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2000)
    } catch {
      alert('Project link: ' + projectUrl)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!api.isAuthenticated()) {
      setError('Please log in to share to the community.')
      return
    }

    try {
      setLoading(true)
      setError(null)

      const payload = {
        content: content.trim() || `Check out my project: ${project.title}`,
        projectId: projectId,
        projectUrl: `/project/${projectId}`,
        postType: 'project',
        category: project.category || 'Creative Work',
        tags: Array.isArray(project.tags) && project.tags.length > 0
          ? project.tags
          : [project.category || 'Project'],
        image: project.image || project.coverImage || '',
      }

      const res = await api.createCommunityPost(payload)
      if (res && res.success) {
        setSuccess(true)
        if (onSuccess) onSuccess(res.data)
      } else {
        throw new Error(res?.message || 'Failed to share to community.')
      }
    } catch (err) {
      console.error('Error sharing project to community:', err)
      setError(err.message || 'Failed to share to community.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-purple-100 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-purple-50 bg-gradient-to-r from-purple-50/70 via-white to-purple-50/30 p-5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-100 text-lg">
              💬
            </span>
            <div>
              <h3 className="font-bold text-gray-900">Share to Community</h3>
              <p className="text-xs text-gray-500">Showcase your project to creators & learners</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-700">
              ⚠️ {error}
            </div>
          )}

          {success ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-6 text-center space-y-4">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-2xl text-emerald-700">
                🎉
              </div>
              <h4 className="text-lg font-bold text-emerald-950">Successfully Shared!</h4>
              <p className="text-xs text-emerald-800 max-w-xs mx-auto">
                Your project has been shared to the CraftLoop community feed for peer feedback and discovery.
              </p>
              <div className="flex flex-wrap justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    onClose()
                    navigate(currentRole === 'viewer' ? '/viewercommunity' : '/community')
                  }}
                  className="rounded-xl bg-purple-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-purple-700"
                >
                  View in Community Feed →
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Message Input */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Your Message (optional)
                </label>
                <textarea
                  rows={3}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Tell the community about your project, your process, or what feedback you'd like..."
                  className="w-full rounded-2xl border border-gray-200 p-3.5 text-xs text-gray-900 focus:border-purple-600 focus:outline-none"
                />
              </div>

              {/* Project Preview Card */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Attached Project Card
                </label>
                <div className="overflow-hidden rounded-2xl border border-purple-200 bg-gradient-to-br from-purple-50/50 via-white to-purple-50/30 p-4">
                  <div className="flex items-start gap-4">
                    {project.image ? (
                      <img
                        src={project.image}
                        alt={project.title}
                        className="h-20 w-24 rounded-xl object-cover ring-1 ring-purple-100 shrink-0"
                      />
                    ) : (
                      <div className="flex h-20 w-24 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-2xl">
                        🎨
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <span className="rounded bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-700">
                        {project.category || 'Project'}
                      </span>
                      <h4 className="mt-1 font-bold text-gray-900 text-sm truncate">
                        {project.title}
                      </h4>
                      <p className="mt-0.5 text-xs text-gray-500 line-clamp-1">
                        {project.description || 'CraftLoop Creative Project'}
                      </p>
                      <p className="mt-2 text-[11px] font-semibold text-purple-600">
                        [ View Project → ]
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Project Link display with copy helper */}
              <div className="flex items-center justify-between rounded-xl bg-gray-50 p-2.5 text-xs text-gray-600">
                <span className="truncate max-w-[280px] font-mono text-[11px] text-gray-500">
                  🔗 {projectUrl}
                </span>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="shrink-0 rounded-lg border border-purple-200 bg-white px-2.5 py-1 text-[11px] font-bold text-purple-700 hover:bg-purple-50"
                >
                  {copiedLink ? '✓ Copied!' : 'Copy Link'}
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-3 border-t border-purple-50">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border border-gray-200 px-4 py-2.5 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-xl bg-purple-600 px-6 py-2.5 text-xs font-bold text-white shadow-md shadow-purple-200 hover:bg-purple-700 transition disabled:opacity-50"
                >
                  {loading ? 'Sharing to Community...' : '💬 Share to Community'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
