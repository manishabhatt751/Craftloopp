import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../services/api'
import ShareProjectModal from '../Components/ShareProjectModal'

const isVideoUrl = (url = '') => {
  if (!url) return false
  const clean = url.split('?')[0].toLowerCase()
  return (
    clean.endsWith('.mp4') ||
    clean.endsWith('.webm') ||
    clean.endsWith('.mov') ||
    clean.endsWith('.ogg') ||
    clean.endsWith('.mkv') ||
    clean.includes('/video/')
  )
}

function ProjectDetails() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [project, setProject] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)

  const currentRole = localStorage.getItem('craftloopRole') || 'creator'
  const currentUser = (() => {
    try {
      return JSON.parse(localStorage.getItem('craftloop_user') || 'null')
    } catch {
      return null
    }
  })()
  const currentUserId = currentUser?._id || currentUser?.id

  useEffect(() => {
    const fetchProject = async () => {
      if (!id) return
      try {
        setLoading(true)
        setError(null)
        const res = await api.getProjectById(id)
        if (res && res.success && res.data) {
          setProject(res.data)
        } else {
          setError('Project not found.')
        }
      } catch (err) {
        console.error('Error fetching project details:', err)
        setError(err.message || 'Could not load project.')
      } finally {
        setLoading(false)
      }
    }

    fetchProject()
  }, [id])

  useEffect(() => {
    if (api.isAuthenticated() && id) {
      api.getSavedProjectIds().then((res) => {
        if (res && res.success && Array.isArray(res.data)) {
          setIsSaved(res.data.includes(id))
        }
      }).catch(() => {})
    }
  }, [id])

  const handleToggleSave = async () => {
    if (!api.isAuthenticated()) {
      navigate('/login')
      return
    }

    try {
      if (isSaved) {
        await api.unsaveProject(id)
        setIsSaved(false)
      } else {
        await api.saveProject(id)
        setIsSaved(true)
      }
    } catch (err) {
      console.error('Failed to toggle save:', err)
    }
  }

  const handleCopyLink = async () => {
    const projectUrl = `${window.location.origin}/project/${id}`
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
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      alert('Project link: ' + projectUrl)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-purple-600 border-t-transparent" />
          <p className="mt-4 text-sm font-semibold text-gray-500">Loading project...</p>
        </div>
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className="mx-auto max-w-2xl p-6 text-center">
        <div className="rounded-3xl border border-red-100 bg-red-50/50 p-8 shadow-sm">
          <span className="text-4xl">⚠️</span>
          <h2 className="mt-3 text-xl font-bold text-gray-900">Project Not Found</h2>
          <p className="mt-2 text-sm text-gray-600">
            {error || "The project you're looking for doesn't exist or was removed."}
          </p>
          <button
            onClick={() => navigate(-1)}
            className="mt-6 rounded-xl bg-purple-600 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-purple-700"
          >
            ← Back to Community
          </button>
        </div>
      </div>
    )
  }

  const creator = project.creator || {}
  const creatorName = creator.name || 'CraftLoop Creator'
  const creatorAvatar = creator.avatar || ''
  const creatorRole = creator.title || creator.role || 'Creator'
  const isOwner = currentUserId && creator._id && currentUserId.toString() === creator._id.toString()

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-12">
      {/* Navigation & Actions Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-xs transition hover:bg-gray-50"
        >
          <span>←</span>
          <span>Back</span>
        </button>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 rounded-xl border border-purple-200 bg-purple-50 px-4 py-2.5 text-sm font-semibold text-purple-700 transition hover:bg-purple-100"
          >
            <span>{copied ? '✓' : '🔗'}</span>
            <span>{copied ? 'Copied' : 'Copy Link'}</span>
          </button>

          {isOwner && (
            <button
              onClick={() => setShowShareModal(true)}
              className="flex items-center gap-1.5 rounded-xl bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-purple-700"
            >
              <span>💬</span>
              <span>Share to Community</span>
            </button>
          )}

          <button
            onClick={handleToggleSave}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
              isSaved
                ? 'bg-purple-600 text-white shadow-sm'
                : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <span>{isSaved ? '♥' : '♡'}</span>
            <span>{isSaved ? 'Saved' : 'Save'}</span>
          </button>

          {isOwner && (
            <button
              onClick={() => navigate('/create', { state: { editProject: project } })}
              className="rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-gray-800"
            >
              Edit Project
            </button>
          )}
        </div>
      </div>

      {/* Main Project Card */}
      <div className="overflow-hidden rounded-3xl border border-purple-100 bg-white shadow-sm">
        {/* Media Preview */}
        {project.image ? (
          <div className="max-h-[480px] w-full overflow-hidden bg-black/90">
            {isVideoUrl(project.image) ? (
              <video
                src={project.image}
                controls
                preload="metadata"
                className="max-h-[480px] w-full object-contain"
              />
            ) : (
              <img
                src={project.image}
                alt={project.title}
                className="h-full max-h-[480px] w-full object-cover"
              />
            )}
          </div>
        ) : (
          <div className="flex h-64 w-full items-center justify-center bg-gradient-to-r from-purple-100 via-pink-50 to-indigo-100 text-6xl">
            🎨
          </div>
        )}

        <div className="p-6 sm:p-8">
          {/* Metadata Badges */}
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="rounded-lg bg-purple-100 px-3 py-1 text-xs font-bold text-purple-700">
              {project.category || 'General'}
            </span>
            <span className="rounded-lg bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
              {project.type || project.projectType || 'Project'}
            </span>
            {project.status && (
              <span className="rounded-lg bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                {project.status}
              </span>
            )}
          </div>

          {/* Title */}
          <h1 className="mt-4 text-2xl font-extrabold text-gray-900 sm:text-3xl">
            {project.title}
          </h1>

          {/* Project Quick Action Buttons */}
          <div className="mt-5 flex flex-wrap items-center gap-3">
            {isOwner && (
              <button
                type="button"
                onClick={() => navigate('/create', { state: { editProject: project } })}
                className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-bold text-gray-800 transition hover:bg-gray-50 shadow-xs"
              >
                Edit Project
              </button>
            )}

            <button
              type="button"
              onClick={handleCopyLink}
              className="flex items-center gap-1.5 rounded-xl border border-purple-200 bg-purple-50 px-4 py-2.5 text-xs font-bold text-purple-700 transition hover:bg-purple-100 shadow-xs"
            >
              <span>{copied ? '✓' : '🔗'}</span>
              <span>{copied ? 'Copied' : 'Copy Link'}</span>
            </button>

            {isOwner && (
              <button
                type="button"
                onClick={() => setShowShareModal(true)}
                className="flex items-center gap-1.5 rounded-xl bg-purple-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-purple-200 transition hover:bg-purple-700"
              >
                <span>💬</span>
                <span>Share to Community</span>
              </button>
            )}
          </div>

          {/* Creator Profile Row */}
          <div className="mt-6 flex items-center justify-between border-y border-gray-100 py-4">
            <div className="flex items-center gap-3">
              {creatorAvatar ? (
                <img
                  src={creatorAvatar}
                  alt={creatorName}
                  className="h-12 w-12 rounded-2xl object-cover ring-2 ring-purple-100"
                />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-100 font-bold text-purple-700">
                  {creatorName.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div>
                <h3 className="font-bold text-gray-900">{creatorName}</h3>
                <p className="text-xs text-gray-500">{creatorRole}</p>
              </div>
            </div>

            {project.demoUrl && (
              <a
                href={project.demoUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="flex items-center gap-1.5 rounded-xl bg-purple-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-purple-700"
              >
                <span>Live Demo</span>
                <span>↗</span>
              </a>
            )}
          </div>

          {/* Description */}
          <div className="mt-6">
            <h2 className="text-base font-bold text-gray-900">About this Project</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-gray-600 sm:text-base">
              {project.description || 'No detailed description provided for this project.'}
            </p>
          </div>

          {/* Tags & Skills */}
          {((Array.isArray(project.tags) && project.tags.length > 0) ||
            (Array.isArray(project.tools) && project.tools.length > 0) ||
            project.skills) && (
            <div className="mt-8 border-t border-gray-100 pt-6">
              <h2 className="text-sm font-bold text-gray-900">Tags & Tools</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {Array.isArray(project.tags) &&
                  project.tags.map((tag, idx) => (
                    <span
                      key={`tag-${idx}`}
                      className="rounded-lg bg-purple-50 px-3 py-1 text-xs font-medium text-purple-700"
                    >
                      #{tag}
                    </span>
                  ))}
                {Array.isArray(project.tools) &&
                  project.tools.map((tool, idx) => (
                    <span
                      key={`tool-${idx}`}
                      className="rounded-lg bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700"
                    >
                      🛠 {tool}
                    </span>
                  ))}
                {project.skills && typeof project.skills === 'string' && (
                  <span className="rounded-lg bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
                    💡 {project.skills}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Share to Community Modal */}
      <ShareProjectModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        project={project}
      />
    </div>
  )
}

export default ProjectDetails
