import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
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

function YourProject() {
  const navigate = useNavigate()

  const [projects, setProjects] = useState([])
  const [filter, setFilter] = useState('All')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [copiedId, setCopiedId] = useState(null)
  const [sharingProject, setSharingProject] = useState(null)
  const [isShareModalOpen, setIsShareModalOpen] = useState(false)

  const fetchProjects = async () => {
    try {
      setLoading(true)
      setError(null)

      if (api.isAuthenticated()) {
        const response = await api.getProjects({ mine: 'true' })
        if (response && response.success && Array.isArray(response.data)) {
          setProjects(response.data)
        } else {
          setProjects([])
        }
      } else {
        setProjects([])
      }
    } catch (err) {
      console.error('Failed to fetch projects from backend:', err)
      setProjects([])
      setError('Could not load projects from MongoDB Atlas. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProjects()
  }, [])

  const filteredProjects =
    filter === 'All'
      ? projects
      : projects.filter((project) => project.status === filter)

  const handleCopyLink = async (project, e) => {
    if (e) e.stopPropagation()
    const projId = project._id || project.id
    const projectUrl = `${window.location.origin}/project/${projId}`

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
      setCopiedId(projId)
      setTimeout(() => setCopiedId(null), 2000)
    } catch {
      alert('Project link: ' + projectUrl)
    }
  }

  const handleOpenShareModal = (project, e) => {
    if (e) e.stopPropagation()
    setSharingProject(project)
    setIsShareModalOpen(true)
  }

  const handleDelete = async (id) => {
    const confirmDelete = window.confirm(
      'Are you sure you want to delete this project?'
    )
    if (!confirmDelete) return

    try {
      setDeletingId(id)

      if (api.isAuthenticated()) {
        await api.deleteProject(id)
      }

      setProjects((prev) => prev.filter((project) => (project._id || project.id) !== id))
    } catch (err) {
      console.error('Error deleting project:', err)
      alert(err.message || 'Failed to delete project from server.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="min-h-screen bg-[#faf9ff] p-8">

      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Your Projects
          </h1>

          <p className="mt-1 text-gray-500">
            Manage the projects and services you have created.
          </p>
        </div>

        <button
          onClick={() => navigate('/create')}
          className="rounded-xl bg-purple-600 px-5 py-3 font-semibold text-white transition hover:bg-purple-700"
        >
          + Add Project
        </button>
      </div>

      {/* Filters */}
      <div className="mb-6 flex gap-3">
        {['All', 'Published', 'Draft'].map((item) => (
          <button
            key={item}
            onClick={() => setFilter(item)}
            className={`rounded-xl px-5 py-2 font-medium transition ${
              filter === item
                ? 'bg-purple-600 text-white'
                : 'bg-white text-gray-600 shadow-sm hover:bg-purple-50'
            }`}
          >
            {item}
          </button>
        ))}
      </div>

      {/* Error state */}
      {error && (
        <div className="mb-6 flex items-center justify-between rounded-xl bg-amber-50 p-4 text-sm text-amber-800 border border-amber-200">
          <span>{error}</span>
          <button
            onClick={fetchProjects}
            className="font-semibold text-amber-900 underline hover:text-amber-700"
          >
            Retry
          </button>
        </div>
      )}

      {/* Projects */}
      {loading ? (
        <div className="rounded-2xl bg-white p-12 text-center shadow-sm">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-purple-600 border-t-transparent"></div>
          <p className="mt-3 text-sm font-medium text-gray-500">
            Loading your projects...
          </p>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="rounded-2xl bg-white p-12 text-center shadow-sm">
          <div className="mb-4 text-5xl">📁</div>

          <h2 className="text-xl font-semibold text-gray-900">
            No projects found
          </h2>

          <p className="mt-2 text-gray-500">
            Start creating your first project or service.
          </p>

          <button
            onClick={() => navigate('/create')}
            className="mt-6 rounded-xl bg-purple-600 px-6 py-3 font-semibold text-white hover:bg-purple-700"
          >
            Create Project
          </button>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((project) => {
            const projId = project._id || project.id
            const displaySkills = Array.isArray(project.tags) && project.tags.length > 0
              ? project.tags.join(', ')
              : project.skills

            return (
              <div
                key={projId}
                className="overflow-hidden rounded-2xl bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md"
              >

                {/* Media / Video / Image / Placeholder */}
                <div
                  onClick={() => navigate(`/project/${projId}`)}
                  className="cursor-pointer flex h-48 items-center justify-center overflow-hidden bg-black"
                  title="Click to view project details"
                >
                  {project.image ? (
                    isVideoUrl(project.image) ? (
                      <video
                        src={project.image}
                        controls
                        preload="metadata"
                        playsInline
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <img
                        src={project.image}
                        alt={project.title}
                        className="h-full w-full object-cover transition hover:scale-105 duration-300"
                      />
                    )
                  ) : (
                    <span className="text-5xl">🎨</span>
                  )}
                </div>

                {/* Content */}
                <div className="p-5">

                  <div className="mb-3 flex items-center justify-between">
                    <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-700">
                      {project.category || 'General'}
                    </span>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        project.status === 'Published'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}
                    >
                      {project.status || 'Draft'}
                    </span>
                  </div>

                  <h2
                    onClick={() => navigate(`/project/${projId}`)}
                    className="cursor-pointer text-xl font-bold text-gray-900 transition hover:text-purple-600"
                    title="Click to view project details"
                  >
                    {project.title}
                  </h2>

                  <p className="mt-2 line-clamp-3 text-sm text-gray-500">
                    {project.description}
                  </p>

                  <div className="mt-4">
                    <p className="text-xs font-semibold uppercase text-gray-400">
                      Type
                    </p>

                    <p className="mt-1 text-sm font-medium text-gray-700">
                      {project.type || project.projectType || 'Project'}
                    </p>
                  </div>

                  {displaySkills && (
                    <div className="mt-3">
                      <p className="text-xs font-semibold uppercase text-gray-400">
                        Skills
                      </p>

                      <p className="mt-1 text-sm text-gray-600">
                        {displaySkills}
                      </p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="mt-5 space-y-2">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => navigate('/create', { state: { editProject: project } })}
                        className="flex-1 rounded-xl border border-gray-200 bg-white py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 transition shadow-2xs"
                      >
                        Edit Project
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(projId)}
                        disabled={deletingId === projId}
                        className="rounded-xl border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                      >
                        {deletingId === projId ? '...' : 'Delete'}
                      </button>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={(e) => handleCopyLink(project, e)}
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-purple-200 bg-purple-50/70 py-2.5 text-xs font-bold text-purple-700 hover:bg-purple-100 transition shadow-2xs"
                      >
                        <span>{copiedId === projId ? '✓' : '🔗'}</span>
                        <span>{copiedId === projId ? '✓ Copied' : '🔗 Copy Link'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => handleOpenShareModal(project, e)}
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-purple-600 py-2.5 text-xs font-bold text-white hover:bg-purple-700 transition shadow-xs"
                      >
                        <span>💬</span>
                        <span>Share to Community</span>
                      </button>
                    </div>
                  </div>

                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Share to Community Modal */}
      <ShareProjectModal
        isOpen={isShareModalOpen}
        onClose={() => {
          setIsShareModalOpen(false)
          setSharingProject(null)
        }}
        project={sharingProject}
      />
    </div>
  )
}

export default YourProject