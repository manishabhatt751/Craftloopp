import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api'



// Safe local storage JSON getter
const safeGetJSON = (key, fallback) => {
  try {
    const item = localStorage.getItem(key)
    if (item === null || item === undefined) return fallback
    const parsed = JSON.parse(item)
    return parsed !== null && parsed !== undefined ? parsed : fallback
  } catch (err) {
    console.warn(`[CraftLoop] Error reading ${key} from storage:`, err)
    return fallback
  }
}

const formatTimeAgo = (dateStr) => {
  if (!dateStr) return 'Just now'
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return String(dateStr)
  const seconds = Math.floor((new Date() - date) / 1000)
  if (seconds < 60) return 'Just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return date.toLocaleDateString()
}

const normalizePost = (p, currentUserId) => {
  const authorObj = typeof p.author === 'object' && p.author !== null ? p.author : null
  const authorName = p.authorName || authorObj?.name || 'Creator'
  const authorUsername = authorObj?.email
    ? authorObj.email.split('@')[0]
    : authorName.toLowerCase().replace(/\s+/g, '')
  const authorRole =
    p.authorRole || authorObj?.title || (authorObj?.role === 'creator' ? 'Creator' : 'Member')
  const authorId = authorObj?._id || p.author
  const tags = Array.isArray(p.tags) ? p.tags : []
  const category = tags[0] || 'Design'
  const likesArr = Array.isArray(p.likes) ? p.likes : []
  const isLiked = currentUserId
    ? likesArr.some((id) => (id?._id || id)?.toString() === currentUserId?.toString())
    : false

  const projectObj = typeof p.projectId === 'object' && p.projectId !== null ? p.projectId : null
  const projectIdStr = projectObj?._id || (typeof p.projectId === 'string' ? p.projectId : null)

  return {
    id: p._id || p.id,
    _id: p._id || p.id,
    authorId: authorId ? authorId.toString() : null,
    name: authorName,
    username: authorUsername,
    role: authorRole,
    category,
    time: formatTimeAgo(p.createdAt),
    content: p.content,
    image: p.image || null,
    postType: p.postType || (projectIdStr ? 'project' : 'text'),
    projectId: projectIdStr,
    project: projectObj,
    projectUrl: p.projectUrl || (projectIdStr ? `/project/${projectIdStr}` : null),
    likes: likesArr.length,
    liked: isLiked,
    saved: false,
    comments: (p.comments || []).length,
    commentsList: (p.comments || []).map((c) => ({
      id: c._id || c.id || Math.random().toString(),
      authorId: (c.author?._id || c.author)?.toString(),
      author:
        c.authorName ||
        (typeof c.author === 'object' ? c.author?.name : 'Community Member') ||
        'Community Member',
      username: (c.authorName || 'user').toLowerCase().replace(/\s+/g, ''),
      time: formatTimeAgo(c.createdAt),
      text: c.text,
    })),
  }
}

function Community() {
  const navigate = useNavigate()

  const currentUser = useMemo(() => safeGetJSON('craftloop_user', null), [])
  const currentUserId = currentUser?._id || currentUser?.id

  // Main state
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')
  const [showCreatePost, setShowCreatePost] = useState(false)

  // Current user & role state
  const [userRole, setUserRole] = useState(() => {
    return localStorage.getItem('craftloopRole') || 'creator'
  })

  const [creatorProfile, setCreatorProfile] = useState(() => {
    return (
      safeGetJSON('craftloopCreatorProfile', null) || {
        name: currentUser?.name || 'Creator',
        username: currentUser?.email ? currentUser.email.split('@')[0] : 'creator',
        profession: currentUser?.title || (userRole === 'creator' ? 'Creator' : 'Member'),
      }
    )
  })

  // Form State
  const [postForm, setPostForm] = useState({
    content: '',
    category: 'Design',
    image: '',
  })
  const [imagePreview, setImagePreview] = useState('')

  // Share My Work State
  const [showShareWorkModal, setShowShareWorkModal] = useState(false)
  const [myProjects, setMyProjects] = useState([])
  const [loadingMyProjects, setLoadingMyProjects] = useState(false)
  const [myProjectsError, setMyProjectsError] = useState(null)
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [shareProjectUrl, setShareProjectUrl] = useState('')
  const [shareDescription, setShareDescription] = useState('')
  const [submittingShareWork, setSubmittingShareWork] = useState(false)
  const [projectSearchFilter, setProjectSearchFilter] = useState('')

  // Expanded comments section map: { [postId]: boolean }
  const [expandedComments, setExpandedComments] = useState({})
  const [commentInputs, setCommentInputs] = useState({})

  // On-screen Permission Modal State
  const [permissionModal, setPermissionModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    actionType: null, // 'creator_role' | 'clipboard' | 'media' | 'denied'
  })

  // On-screen Delete Confirmation Dialog
  const [deleteDialog, setDeleteDialog] = useState({
    isOpen: false,
    postId: null,
  })

  // On-screen Toast Notification State
  const [toast, setToast] = useState({
    show: false,
    message: '',
    type: 'info', // 'success' | 'error' | 'info' | 'warning'
  })

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type })
    setTimeout(() => {
      setToast((prev) => ({ ...prev, show: false }))
    }, 3800)
  }

  // Fetch live posts from MongoDB Atlas
  const fetchPosts = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await api.getCommunityPosts()
      if (res && res.success && Array.isArray(res.data)) {
        const normalized = res.data.map((p) => normalizePost(p, currentUserId))
        setPosts(normalized)
      } else {
        setPosts([])
      }
    } catch (err) {
      console.error('Error fetching community posts from MongoDB Atlas:', err)
      setError('Unable to load live community posts from server.')
      showToast('Failed to load posts from server.', 'error')
    } finally {
      setLoading(false)
    }
  }

  // Load initial posts safely
  useEffect(() => {
    fetchPosts()

    // Check profile
    const profile = safeGetJSON('craftloopCreatorProfile', null)
    if (profile) {
      setCreatorProfile(profile)
    }
  }, [])

  const categories = ['All', 'Design', 'UI/UX', 'Content', 'Development', 'Business']

  // Filter posts
  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      const matchesCategory =
        activeCategory === 'All' || post.category === activeCategory

      const searchText = search.toLowerCase().trim()
      if (!searchText) return matchesCategory

      const matchesSearch =
        (post.content && post.content.toLowerCase().includes(searchText)) ||
        (post.name && post.name.toLowerCase().includes(searchText)) ||
        (post.username && post.username.toLowerCase().includes(searchText)) ||
        (post.category && post.category.toLowerCase().includes(searchText))

      return matchesCategory && matchesSearch
    })
  }, [posts, search, activeCategory])

  // Safe initial generator to prevent undefined.toUpperCase() runtime crashes
  const getInitials = (name) => {
    if (!name || typeof name !== 'string') return 'CL'
    const parts = name.trim().split(/\s+/).filter(Boolean)
    if (parts.length === 0) return 'CL'
    return parts.map((w) => w[0]).join('').slice(0, 2).toUpperCase()
  }

  // Handle "+ Create Post" click with Permission Check
  const handleOpenCreatePost = () => {
    // If user is currently in viewer mode, show Permission Required dialog on screen
    if (userRole === 'viewer') {
      setPermissionModal({
        isOpen: true,
        title: 'Creator Permission Required',
        message:
          'Publishing community posts requires Creator permissions. You are currently in Viewer mode.',
        actionType: 'creator_role',
      })
      return
    }

    setShowCreatePost(true)
  }

  // Switch role to Creator directly from on-screen permission modal
  const handleGrantCreatorPermission = () => {
    localStorage.setItem('craftloopRole', 'creator')
    setUserRole('creator')
    setPermissionModal({ isOpen: false, title: '', message: '', actionType: null })
    setShowCreatePost(true)
    showToast('Creator permission granted! You can now publish posts.', 'success')
  }

  // Handle Opening "Share My Work" modal
  const handleOpenShareWork = async () => {
    if (userRole === 'viewer') {
      setPermissionModal({
        isOpen: true,
        title: 'Creator Permission Required',
        message:
          'Only creators can share projects to the community. You are currently in Viewer mode.',
        actionType: 'creator_role',
      })
      return
    }

    if (!api.isAuthenticated()) {
      showToast('Please log in to share your projects.', 'warning')
      return
    }

    setShowCreatePost(false)
    setShowShareWorkModal(true)
    setLoadingMyProjects(true)
    setMyProjectsError(null)

    try {
      const res = await api.getProjects({ mine: 'true' })
      if (res && res.success && Array.isArray(res.data)) {
        setMyProjects(res.data)
        if (res.data.length > 0) {
          const first = res.data[0]
          const firstId = first._id || first.id
          setSelectedProjectId(firstId)
          setShareProjectUrl(`${window.location.origin}/project/${firstId}`)
        } else {
          setSelectedProjectId('')
          setShareProjectUrl('')
        }
      } else {
        setMyProjects([])
      }
    } catch (err) {
      console.error('Error fetching creator projects:', err)
      setMyProjectsError('Could not load your projects from server.')
      setMyProjects([])
    } finally {
      setLoadingMyProjects(false)
    }
  }

  // Handle selecting a project in Share My Work
  const handleSelectProject = (proj) => {
    const projId = proj._id || proj.id
    setSelectedProjectId(projId)
    setShareProjectUrl(`${window.location.origin}/project/${projId}`)
  }

  // Handle submitting Share My Work post
  const handleSubmitShareWork = async (e) => {
    e.preventDefault()

    if (!selectedProjectId && !shareProjectUrl.trim()) {
      showToast('Please select a project to share.', 'warning')
      return
    }

    const selectedProj = myProjects.find(
      (p) => (p._id || p.id)?.toString() === selectedProjectId?.toString()
    )

    const finalContent =
      shareDescription.trim() ||
      (selectedProj
        ? `Check out my project: ${selectedProj.title}`
        : 'Check out my project on CraftLoop!')

    setSubmittingShareWork(true)
    try {
      const payload = {
        content: finalContent,
        projectId: selectedProjectId || undefined,
        projectUrl:
          shareProjectUrl.trim() ||
          (selectedProjectId ? `${window.location.origin}/project/${selectedProjectId}` : undefined),
        postType: 'project',
        category: selectedProj?.category || 'Design',
        tags:
          selectedProj?.tags && selectedProj.tags.length > 0
            ? selectedProj.tags
            : ['Project'],
      }

      const res = await api.createCommunityPost(payload)
      if (res && res.success && res.data) {
        const created = normalizePost(res.data, currentUserId)
        setPosts((prev) => [created, ...prev])
        setShowShareWorkModal(false)
        setShareDescription('')
        setSelectedProjectId('')
        setShareProjectUrl('')
        showToast('Project shared to community successfully!', 'success')
      } else {
        showToast(res?.message || 'Failed to share project.', 'error')
      }
    } catch (err) {
      console.error('Error sharing work to community:', err)
      showToast(err.message || 'Error sharing project to community.', 'error')
    } finally {
      setSubmittingShareWork(false)
    }
  }

  // Media file handler for post creation
  const handleImageFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      showToast('Please select a valid image or video file.', 'error')
      return
    }

    const FIVE_GB = 5000 * 1024 * 1024
    if (file.size > FIVE_GB) {
      showToast('File exceeds the 5 GB limit. Maximum file size: 5 GB.', 'warning')
      return
    }

    // Instant local object URL preview without base64
    const objectUrl = URL.createObjectURL(file)
    setImagePreview(objectUrl)

    try {
      const res = await api.uploadMedia(file, 'craftloop/community')
      if (res && res.success && res.url) {
        setPostForm((prev) => ({ ...prev, image: res.url }))
      }
    } catch (err) {
      console.warn('Community media upload notice:', err.message)
    }
  }

  // Handle Post Creation with MongoDB Atlas
  const handleCreatePost = async (e) => {
    e.preventDefault()

    if (!postForm.content.trim()) {
      showToast('Please write something before publishing.', 'warning')
      return
    }

    // Verify creator permission
    if (userRole !== 'creator') {
      setPermissionModal({
        isOpen: true,
        title: 'Creator Permission Required',
        message: 'You need Creator permissions to publish. Please grant permission to continue.',
        actionType: 'creator_role',
      })
      return
    }

    try {
      const res = await api.createCommunityPost({
        content: postForm.content.trim(),
        category: postForm.category,
        tags: [postForm.category],
        image: postForm.image || '',
      })

      if (res && res.success && res.data) {
        const created = normalizePost(res.data, currentUserId)
        setPosts((prev) => [created, ...prev])
        setPostForm({
          content: '',
          category: 'Design',
          image: '',
        })
        setImagePreview('')
        setShowCreatePost(false)
        showToast('Post published successfully to MongoDB Atlas!', 'success')
      }
    } catch (err) {
      console.error('Failed to create community post:', err)
      showToast(err.message || 'Error publishing post.', 'error')
    }
  }

  // Toggle Like with MongoDB Atlas
  const toggleLike = async (id) => {
    if (!api.isAuthenticated()) {
      showToast('Please log in to like posts.', 'warning')
      return
    }

    try {
      const res = await api.likeCommunityPost(id)
      if (res && res.success) {
        setPosts((prev) =>
          prev.map((post) => {
            if (post.id !== id && post._id !== id) return post
            return {
              ...post,
              liked: res.liked !== undefined ? res.liked : !post.liked,
              likes:
                res.likesCount !== undefined
                  ? res.likesCount
                  : post.liked
                  ? Math.max(0, post.likes - 1)
                  : post.likes + 1,
            }
          })
        )
      }
    } catch (err) {
      console.error('Error toggling like:', err)
      showToast(err.message || 'Error updating like.', 'error')
    }
  }

  // Toggle Save (Local state collection)
  const toggleSave = (id) => {
    setPosts((prev) =>
      prev.map((post) => {
        if (post.id !== id && post._id !== id) return post
        const newSaved = !post.saved
        if (newSaved) {
          showToast('Post saved to your collection!', 'success')
        }
        return {
          ...post,
          saved: newSaved,
        }
      })
    )
  }

  // Share with clipboard permission handling
  const handleShare = async (post) => {
    const shareText = `${post.content}\n\n— ${post.name} on CraftLoop`
    const shareUrl = window.location.href

    if (navigator.share) {
      try {
        await navigator.share({
          title: `${post.name}'s CraftLoop Post`,
          text: shareText,
          url: shareUrl,
        })
        showToast('Post shared successfully!', 'success')
        return
      } catch (err) {
        if (err.name === 'AbortError') return
        console.warn('Navigator share error, falling back to clipboard:', err)
      }
    }

    // Try Clipboard API
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`)
        showToast('Post link and content copied to clipboard!', 'success')
      } catch (err) {
        console.error('Clipboard permission error:', err)
        setPermissionModal({
          isOpen: true,
          title: 'Clipboard Permission Required',
          message:
            'Your browser requires permission to copy to the clipboard. Please enable clipboard access in your browser site settings.',
          actionType: 'clipboard',
        })
      }
    } else {
      try {
        const textarea = document.createElement('textarea')
        textarea.value = `${shareText}\n${shareUrl}`
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
        showToast('Post link copied to clipboard!', 'success')
      } catch {
        setPermissionModal({
          isOpen: true,
          title: 'Clipboard Access Restricted',
          message: 'Unable to access clipboard. Please copy post content manually.',
          actionType: 'denied',
        })
      }
    }
  }

  // Toggle comments drawer
  const toggleComments = (postId) => {
    setExpandedComments((prev) => ({
      ...prev,
      [postId]: !prev[postId],
    }))
  }

  // Submit comment with MongoDB Atlas
  const handleAddComment = async (postId) => {
    const text = (commentInputs[postId] || '').trim()
    if (!text) {
      showToast('Please type a comment first.', 'warning')
      return
    }

    if (!api.isAuthenticated()) {
      showToast('Please log in to comment.', 'warning')
      return
    }

    try {
      const res = await api.commentCommunityPost(postId, text)
      if (res && res.success && res.data) {
        const updatedPost = normalizePost(res.data, currentUserId)
        setPosts((prev) =>
          prev.map((p) => (p.id === postId || p._id === postId ? updatedPost : p))
        )
        setCommentInputs((prev) => ({ ...prev, [postId]: '' }))
        showToast('Comment added!', 'success')
      }
    } catch (err) {
      console.error('Error adding comment:', err)
      showToast(err.message || 'Error adding comment.', 'error')
    }
  }

  // Delete Post Permission Verification
  const requestDeletePost = (post) => {
    const isOwn =
      (currentUserId && post.authorId && currentUserId.toString() === post.authorId.toString()) ||
      post.username === creatorProfile?.username ||
      (currentUser?.role === 'creator' && post.name === currentUser?.name)

    if (!isOwn) {
      setPermissionModal({
        isOpen: true,
        title: 'Delete Permission Denied',
        message:
          'You do not have permission to delete this post. Only the original author has permission to remove their post.',
        actionType: 'denied',
      })
      return
    }

    // Open on-screen confirmation modal
    setDeleteDialog({
      isOpen: true,
      postId: post.id || post._id,
    })
  }

  const confirmDeletePost = async () => {
    const targetId = deleteDialog.postId
    if (!targetId) return

    try {
      const res = await api.deleteCommunityPost(targetId)
      if (res && res.success) {
        setPosts((prev) => prev.filter((p) => p.id !== targetId && p._id !== targetId))
        setDeleteDialog({ isOpen: false, postId: null })
        showToast('Post deleted successfully from MongoDB Atlas.', 'info')
      }
    } catch (err) {
      console.error('Error deleting post:', err)
      setDeleteDialog({ isOpen: false, postId: null })
      if (err.status === 403) {
        showToast('Not authorized to delete this post.', 'error')
      } else {
        showToast(err.message || 'Error deleting post.', 'error')
      }
    }
  }

  return (
    <div className="min-h-screen bg-[#faf9ff] px-6 py-8 text-gray-900">
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

      {/* On-screen Permission Modal */}
      {permissionModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-purple-100 bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="mb-4 flex items-center gap-3 text-purple-600">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-100 text-2xl">
                {permissionModal.actionType === 'creator_role' && '🛡️'}
                {permissionModal.actionType === 'clipboard' && '📋'}
                {permissionModal.actionType === 'media' && '📷'}
                {permissionModal.actionType === 'denied' && '🚫'}
              </div>
              <div>
                <span className="rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-purple-700">
                  Permission Notice
                </span>
                <h3 className="text-xl font-bold text-gray-900">
                  {permissionModal.title}
                </h3>
              </div>
            </div>

            <p className="text-sm leading-6 text-gray-600">
              {permissionModal.message}
            </p>

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() =>
                  setPermissionModal({
                    isOpen: false,
                    title: '',
                    message: '',
                    actionType: null,
                  })
                }
                className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50"
              >
                Close
              </button>

              {permissionModal.actionType === 'creator_role' && (
                <button
                  type="button"
                  onClick={handleGrantCreatorPermission}
                  className="rounded-xl bg-purple-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-purple-200 hover:bg-purple-700"
                >
                  Grant Creator Permission
                </button>
              )}

              {permissionModal.actionType === 'clipboard' && (
                <button
                  type="button"
                  onClick={() => {
                    navigator.permissions?.query?.({ name: 'clipboard-write' })
                    setPermissionModal({
                      isOpen: false,
                      title: '',
                      message: '',
                      actionType: null,
                    })
                    showToast('Please allow clipboard access if prompted by your browser.', 'info')
                  }}
                  className="rounded-xl bg-purple-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-purple-700"
                >
                  Request Permission
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* On-screen Delete Confirmation Dialog */}
      {deleteDialog.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-red-600">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 text-xl">
                🗑️
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  Delete Post
                </h3>
                <p className="text-xs text-gray-500">
                  Action requires author authorization
                </p>
              </div>
            </div>

            <p className="mt-4 text-sm text-gray-600">
              Are you sure you want to permanently delete this post? This action
              cannot be undone.
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteDialog({ isOpen: false, postId: null })}
                className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={confirmDeletePost}
                className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-red-200 hover:bg-red-700"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-purple-600">
              Creator Community
            </p>

            {/* Current Active Permission Role Badge */}
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-0.5 text-xs font-semibold ${
                userRole === 'creator'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-amber-100 text-amber-700'
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  userRole === 'creator' ? 'bg-green-600' : 'bg-amber-600'
                }`}
              />
              {userRole === 'creator' ? 'Creator Mode (Full Access)' : 'Viewer Mode (Read Only)'}
            </span>
          </div>

          <h1 className="mt-1 text-3xl font-bold tracking-tight text-gray-900">
            Connect with Creators
          </h1>

          <p className="mt-2 text-gray-500">
            Share ideas, discover creative projects, leave comments, and collaborate together.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Quick role toggle for testing permissions */}
          <button
            type="button"
            onClick={() => {
              const newRole = userRole === 'creator' ? 'viewer' : 'creator'
              setUserRole(newRole)
              localStorage.setItem('craftloopRole', newRole)
              showToast(
                `Switched to ${newRole === 'creator' ? 'Creator (Posting Allowed)' : 'Viewer (Permission Checked)'} mode.`,
                'info'
              )
            }}
            className="rounded-xl border border-purple-200 bg-white px-4 py-3 text-xs font-semibold text-purple-700 transition hover:bg-purple-50"
            title="Toggle user role to preview permission prompts"
          >
            Switch to {userRole === 'creator' ? 'Viewer Mode' : 'Creator Mode'}
          </button>

          <button
            id="share-work-btn"
            onClick={handleOpenShareWork}
            className="flex items-center gap-2 rounded-xl border border-purple-200 bg-purple-50 px-5 py-3 font-semibold text-purple-700 transition hover:bg-purple-100 active:scale-95 shadow-xs"
            title="Share a project you created in CraftLoop"
          >
            <span>✨</span>
            <span>Share My Work</span>
          </button>

          <button
            id="create-post-btn"
            onClick={handleOpenCreatePost}
            className="rounded-xl bg-purple-600 px-6 py-3 font-semibold text-white shadow-lg shadow-purple-200 transition hover:bg-purple-700 active:scale-95"
          >
            + Create Post
          </button>
        </div>
      </div>

      {/* Search + Categories */}
      <div className="mb-8 rounded-2xl border border-purple-100 bg-white p-5 shadow-sm">
        <div className="relative mb-5">
          <input
            id="community-search-input"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search community posts by keyword, author, or category..."
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-5 py-3.5 text-sm outline-none transition focus:border-purple-400 focus:bg-white focus:ring-2 focus:ring-purple-100"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                activeCategory === category
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_320px]">
        {/* Feed Column */}
        <div className="space-y-5">
          {loading ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-purple-100 bg-white p-12 text-center shadow-sm">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-purple-600 border-t-transparent" />
              <p className="mt-4 text-sm font-semibold text-gray-600">
                Loading community discussions from MongoDB Atlas...
              </p>
            </div>
          ) : error ? (
            <div className="rounded-3xl border border-red-100 bg-white p-8 text-center shadow-sm">
              <p className="text-sm font-semibold text-red-600">{error}</p>
              <button
                onClick={fetchPosts}
                className="mt-4 rounded-xl bg-purple-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-purple-700"
              >
                Retry Loading
              </button>
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="rounded-2xl border border-purple-100 bg-white p-12 text-center shadow-sm">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-purple-100 text-2xl">
                🔎
              </div>

              <h2 className="text-xl font-bold text-gray-900">No posts found</h2>

              <p className="mt-2 text-gray-500">
                Try another search keyword or select another category filter.
              </p>

              <button
                onClick={() => {
                  setSearch('')
                  setActiveCategory('All')
                }}
                className="mt-4 rounded-xl bg-purple-50 px-4 py-2 text-sm font-semibold text-purple-700 hover:bg-purple-100"
              >
                Clear Filters
              </button>
            </div>
          ) : (
            filteredPosts.map((post) => {
              const currentPostId = post.id || post._id
              const isOwnPost =
                (currentUserId && post.authorId && currentUserId.toString() === post.authorId.toString()) ||
                post.username === creatorProfile?.username ||
                (userRole === 'creator' && post.username === 'alexmorgan')

              const isCommentsOpen = Boolean(expandedComments[currentPostId])
              const postComments = post.commentsList || []

              return (
                <article
                  key={currentPostId}
                  className="rounded-3xl border border-purple-100 bg-white p-6 shadow-sm transition hover:shadow-md"
                >
                  {/* Author Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-100 font-bold text-purple-700 shadow-inner">
                        {getInitials(post.name)}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-gray-900">{post.name}</h3>
                          {isOwnPost && (
                            <span className="rounded-md bg-purple-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-purple-700">
                              You
                            </span>
                          )}
                        </div>

                        <p className="text-sm text-gray-500">
                          @{post.username} • {post.role}
                        </p>

                        <p className="mt-0.5 text-xs text-gray-400">
                          {post.time}
                        </p>
                      </div>
                    </div>

                    {isOwnPost ? (
                      <button
                        onClick={() => requestDeletePost(post)}
                        className="rounded-lg px-3 py-1.5 text-xs font-semibold text-red-500 transition hover:bg-red-50"
                        title="Delete your post"
                      >
                        Delete
                      </button>
                    ) : (
                      <button
                        onClick={() => requestDeletePost(post)}
                        className="rounded-lg px-3 py-1.5 text-xs text-gray-300 transition hover:text-gray-500"
                        title="Delete requires author permission"
                      >
                        Delete
                      </button>
                    )}
                  </div>

                  {/* Category Tag */}
                  <div className="mt-4">
                    <span className="inline-block rounded-full bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-700">
                      {post.category}
                    </span>
                  </div>

                  {/* Content */}
                  <p className="mt-4 whitespace-pre-wrap text-base leading-7 text-gray-700">
                    {post.content}
                  </p>

                  {/* Shared Project Preview Card */}
                  {(post.postType === 'project' || post.projectId) && (
                    <div className="mt-4 overflow-hidden rounded-2xl border border-purple-200/90 bg-gradient-to-br from-purple-50/50 via-white to-purple-50/30 p-5 shadow-xs transition hover:shadow-md hover:border-purple-300">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                        {/* Thumbnail */}
                        <div className="relative h-32 w-full overflow-hidden rounded-xl bg-purple-100 sm:w-44 sm:flex-shrink-0">
                          {post.project?.image || post.image ? (
                            <img
                              src={post.project?.image || post.image}
                              alt={post.project?.title || 'Project'}
                              className="h-full w-full object-cover transition duration-300 hover:scale-105"
                              onError={(e) => {
                                e.target.style.display = 'none'
                              }}
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-3xl">
                              🎨
                            </div>
                          )}
                          <span className="absolute bottom-2 left-2 rounded-md bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-xs">
                            CraftLoop Project
                          </span>
                        </div>

                        {/* Info */}
                        <div className="flex flex-1 flex-col justify-between self-stretch">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="rounded-md bg-purple-100 px-2.5 py-0.5 text-xs font-semibold text-purple-700">
                                {post.project?.category || post.category || 'Creative Work'}
                              </span>
                              {post.project?.status && (
                                <span className="text-xs text-gray-400">• {post.project.status}</span>
                              )}
                            </div>

                            <h4 className="mt-2 text-lg font-bold text-gray-900">
                              {post.project?.title || 'Shared Project'}
                            </h4>

                            <p className="mt-1 line-clamp-2 text-sm leading-6 text-gray-600">
                              {post.project?.description || 'Explore this creative project on CraftLoop.'}
                            </p>

                            {post.project?.tags && post.project.tags.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1">
                                {post.project.tags.slice(0, 3).map((tag, idx) => (
                                  <span
                                    key={idx}
                                    className="rounded bg-gray-100 px-2 py-0.5 text-[11px] text-gray-600"
                                  >
                                    #{tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="mt-4 flex items-center justify-between border-t border-purple-100/60 pt-3">
                            <span className="text-xs font-medium text-purple-600">
                              Shared from CraftLoop Portfolio
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                const targetId = post.projectId || post.project?._id
                                if (targetId) {
                                  navigate(`/project/${targetId}`)
                                } else if (post.projectUrl) {
                                  const internalMatch = post.projectUrl.match(/\/project\/([a-zA-Z0-9]+)/)
                                  if (internalMatch) {
                                    navigate(`/project/${internalMatch[1]}`)
                                  } else {
                                    window.location.href = post.projectUrl
                                  }
                                }
                              }}
                              className="flex items-center gap-1.5 rounded-xl bg-purple-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-purple-700 active:scale-95"
                            >
                              <span>View Project</span>
                              <span>→</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Optional Image */}
                  {post.postType !== 'project' && post.image && (
                    <div className="mt-4 overflow-hidden rounded-2xl border border-purple-50 bg-gray-50">
                      <img
                        src={post.image}
                        alt="Post media"
                        className="max-h-96 w-full object-cover transition hover:scale-[1.01]"
                        loading="lazy"
                        onError={(e) => {
                          e.target.style.display = 'none'
                        }}
                      />
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-4">
                    <button
                      onClick={() => toggleLike(currentPostId)}
                      className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition ${
                        post.liked
                          ? 'bg-purple-100 text-purple-700'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <span>{post.liked ? '♥' : '♡'}</span>
                      <span>{post.likes}</span>
                    </button>

                    <button
                      onClick={() => toggleComments(currentPostId)}
                      className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition ${
                        isCommentsOpen
                          ? 'bg-purple-50 text-purple-700'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <span>💬</span>
                      <span>{post.comments || postComments.length} Comments</span>
                    </button>

                    <button
                      onClick={() => handleShare(post)}
                      className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-100"
                    >
                      <span>↗</span>
                      <span>Share</span>
                    </button>

                    <button
                      onClick={() => toggleSave(currentPostId)}
                      className={`ml-auto flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition ${
                        post.saved
                          ? 'bg-purple-100 text-purple-700'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <span>{post.saved ? '★' : '☆'}</span>
                      <span>{post.saved ? 'Saved' : 'Save'}</span>
                    </button>
                  </div>

                  {/* On-screen Comments Section */}
                  {isCommentsOpen && (
                    <div className="mt-5 border-t border-purple-50 pt-5 animate-in fade-in duration-150">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                        Discussion ({postComments.length})
                      </h4>

                      {/* Add comment input */}
                      <div className="mt-3 flex gap-2">
                        <input
                          type="text"
                          value={commentInputs[currentPostId] || ''}
                          onChange={(e) =>
                            setCommentInputs((prev) => ({
                              ...prev,
                              [currentPostId]: e.target.value,
                            }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleAddComment(currentPostId)
                          }}
                          placeholder="Write a constructive comment..."
                          className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-purple-400 focus:bg-white"
                        />

                        <button
                          type="button"
                          onClick={() => handleAddComment(currentPostId)}
                          className="rounded-xl bg-purple-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-purple-700 active:scale-95"
                        >
                          Reply
                        </button>
                      </div>

                      {/* Comments list */}
                      <div className="mt-4 space-y-3">
                        {postComments.length === 0 ? (
                          <p className="text-xs italic text-gray-400">
                            No comments yet. Be the first to share your thoughts!
                          </p>
                        ) : (
                          postComments.map((comment) => (
                            <div
                              key={comment.id}
                              className="rounded-2xl bg-purple-50/60 p-4 transition hover:bg-purple-50"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-purple-900">
                                    {comment.author}
                                  </span>
                                  <span className="text-[11px] text-gray-400">
                                    @{comment.username}
                                  </span>
                                </div>
                                <span className="text-[10px] text-gray-400">
                                  {comment.time}
                                </span>
                              </div>

                              <p className="mt-2 text-sm text-gray-700">
                                {comment.text}
                              </p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </article>
              )
            })
          )}
        </div>

        {/* Right Sidebar Column */}
        <aside className="space-y-5">
          {/* Community Stats */}
          <div className="rounded-3xl border border-purple-100 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900">Community Stats</h2>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-purple-50 p-4">
                <p className="text-2xl font-bold text-purple-700">{posts.length}</p>
                <p className="mt-1 text-xs text-gray-500">Live Posts</p>
              </div>

              <div className="rounded-2xl bg-purple-50 p-4">
                <p className="text-2xl font-bold text-purple-700">120+</p>
                <p className="mt-1 text-xs text-gray-500">Active Creators</p>
              </div>
            </div>

            {/* Permission status card */}
            <div className="mt-4 rounded-2xl border border-purple-100 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-purple-600">
                Your Permissions
              </p>
              <div className="mt-2 space-y-1.5 text-xs text-gray-600">
                <p className="flex items-center gap-2">
                  <span className="text-green-500">✓</span> View community feed
                </p>
                <p className="flex items-center gap-2">
                  <span className="text-green-500">✓</span> Leave comments
                </p>
                <p className="flex items-center gap-2">
                  {userRole === 'creator' ? (
                    <span className="text-green-500">✓</span>
                  ) : (
                    <span className="text-amber-500">⚠</span>
                  )}
                  <span>
                    Publish new posts{' '}
                    {userRole !== 'creator' && '(Requires Creator Permission)'}
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Community Guidelines */}
          <div className="rounded-3xl bg-gradient-to-br from-purple-600 to-purple-800 p-6 text-white shadow-xl shadow-purple-200">
            <h2 className="text-lg font-bold">Community Guidelines</h2>

            <ul className="mt-4 space-y-3 text-sm leading-6 text-purple-100">
              <li className="flex items-start gap-2">
                <span>✓</span>
                <span>Be respectful to other creators.</span>
              </li>
              <li className="flex items-start gap-2">
                <span>✓</span>
                <span>Share meaningful ideas and original work.</span>
              </li>
              <li className="flex items-start gap-2">
                <span>✓</span>
                <span>Give constructive, helpful feedback.</span>
              </li>
              <li className="flex items-start gap-2">
                <span>✓</span>
                <span>Keep the community creative and positive.</span>
              </li>
            </ul>
          </div>

          {/* Quick Links */}
          <div className="rounded-3xl border border-purple-100 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900">Quick Links</h2>

            <div className="mt-4 space-y-2">
              <button
                onClick={() => navigate('/profile')}
                className="w-full rounded-xl px-4 py-3 text-left text-sm font-semibold text-gray-700 transition hover:bg-purple-50 hover:text-purple-700"
              >
                My Profile →
              </button>

              <button
                onClick={() => navigate('/your-project')}
                className="w-full rounded-xl px-4 py-3 text-left text-sm font-semibold text-gray-700 transition hover:bg-purple-50 hover:text-purple-700"
              >
                My Projects →
              </button>

              <button
                onClick={() => navigate('/create')}
                className="w-full rounded-xl px-4 py-3 text-left text-sm font-semibold text-gray-700 transition hover:bg-purple-50 hover:text-purple-700"
              >
                Create Course or Project →
              </button>
            </div>
          </div>
        </aside>
      </div>

      {/* On-Screen Create Post Modal */}
      {showCreatePost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="mb-6 flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-bold text-purple-700">
                  Authorized as {creatorProfile?.name || 'Creator'}
                </span>
                <h2 className="mt-1 text-2xl font-bold text-gray-900">
                  Create a Community Post
                </h2>
                <p className="text-xs text-gray-500">
                  Share your design updates, ask questions, or showcase ideas.
                </p>
              </div>

              <button
                onClick={() => setShowCreatePost(false)}
                className="rounded-xl p-2 text-2xl text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreatePost}>
              {/* Category selector */}
              <div className="mb-4">
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Category
                </label>

                <select
                  value={postForm.category}
                  onChange={(e) =>
                    setPostForm({
                      ...postForm,
                      category: e.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition focus:border-purple-400 focus:bg-white"
                >
                  {categories
                    .filter((category) => category !== 'All')
                    .map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                </select>
              </div>

              {/* Content textarea */}
              <div className="mb-4">
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Your Post Content
                </label>

                <textarea
                  value={postForm.content}
                  onChange={(e) =>
                    setPostForm({
                      ...postForm,
                      content: e.target.value,
                    })
                  }
                  rows={5}
                  maxLength={1000}
                  placeholder="What are you working on? Ask for feedback, share tips, or inspire other creators..."
                  className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition focus:border-purple-400 focus:bg-white focus:ring-2 focus:ring-purple-100"
                />

                <p className="mt-1 text-right text-xs text-gray-400">
                  {postForm.content.length}/1000
                </p>
              </div>

              {/* Image attachment / Media Permission */}
              <div className="mb-6">
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Attach Image (Optional)
                </label>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-purple-300 bg-purple-50/50 px-4 py-3 text-sm font-semibold text-purple-700 transition hover:bg-purple-100/60">
                    <span>📷</span>
                    <span>Upload Image File</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageFileChange}
                      className="hidden"
                    />
                  </label>

                  <span className="text-center text-xs text-gray-400 sm:text-left">
                    or enter image URL:
                  </span>

                  <input
                    type="url"
                    value={postForm.image}
                    onChange={(e) => {
                      setPostForm({ ...postForm, image: e.target.value })
                      setImagePreview(e.target.value)
                    }}
                    placeholder="https://images.unsplash.com/..."
                    className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-xs outline-none focus:border-purple-400 focus:bg-white"
                  />
                </div>

                {/* Preview */}
                {imagePreview && (
                  <div className="relative mt-3 inline-block overflow-hidden rounded-xl border border-purple-200">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="h-28 w-44 object-cover"
                      onError={() => {
                        showToast('Invalid image URL.', 'error')
                        setImagePreview('')
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setImagePreview('')
                        setPostForm((prev) => ({ ...prev, image: '' }))
                      }}
                      className="absolute right-1 top-1 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white hover:bg-black"
                    >
                      ×
                    </button>
                  </div>
                )}
              </div>

              {/* Modal footer actions */}
              <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreatePost(false)
                    setImagePreview('')
                  }}
                  className="rounded-xl border border-gray-200 px-5 py-3 font-semibold text-gray-600 transition hover:bg-gray-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="rounded-xl bg-purple-600 px-6 py-3 font-semibold text-white shadow-lg shadow-purple-200 transition hover:bg-purple-700 active:scale-95"
                >
                  Publish Post
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* On-Screen Share My Work Modal */}
      {showShareWorkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="mb-6 flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-bold text-purple-700">
                  ✨ Showcase Your Portfolio
                </span>
                <h2 className="mt-1 text-2xl font-bold text-gray-900">
                  Share My Work in Community
                </h2>
                <p className="text-xs text-gray-500">
                  Select one of your CraftLoop projects to attach a rich preview card to your post.
                </p>
              </div>

              <button
                onClick={() => {
                  setShowShareWorkModal(false)
                  setShareDescription('')
                }}
                className="rounded-xl p-2 text-2xl text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmitShareWork}>
              {/* Project Selector */}
              <div className="mb-5">
                <label className="mb-2 flex items-center justify-between text-sm font-semibold text-gray-700">
                  <span>Select Your Project</span>
                  <span className="text-xs font-normal text-gray-400">
                    {myProjects.length} project{myProjects.length === 1 ? '' : 's'} available
                  </span>
                </label>

                {loadingMyProjects ? (
                  <div className="rounded-2xl border border-purple-100 bg-purple-50/30 p-8 text-center">
                    <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-purple-600 border-t-transparent" />
                    <p className="mt-2 text-xs font-semibold text-gray-500">
                      Loading your projects from MongoDB...
                    </p>
                  </div>
                ) : myProjectsError ? (
                  <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-center">
                    <p className="text-xs font-semibold text-red-600">{myProjectsError}</p>
                    <button
                      type="button"
                      onClick={handleOpenShareWork}
                      className="mt-2 rounded-lg bg-red-100 px-3 py-1 text-xs font-bold text-red-700 hover:bg-red-200"
                    >
                      Retry
                    </button>
                  </div>
                ) : myProjects.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-purple-200 bg-purple-50/20 p-6 text-center">
                    <span className="text-3xl">🎨</span>
                    <h4 className="mt-2 text-sm font-bold text-gray-800">No Projects Found</h4>
                    <p className="mt-1 text-xs text-gray-500">
                      You haven't created any projects yet. Create your first project on CraftLoop to share it!
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setShowShareWorkModal(false)
                        navigate('/create')
                      }}
                      className="mt-4 rounded-xl bg-purple-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-purple-700 shadow-sm"
                    >
                      + Create a Project
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {myProjects.length > 3 && (
                      <input
                        type="text"
                        value={projectSearchFilter}
                        onChange={(e) => setProjectSearchFilter(e.target.value)}
                        placeholder="Filter your projects by title or category..."
                        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs outline-none focus:border-purple-400 focus:bg-white"
                      />
                    )}

                    <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                      {myProjects
                        .filter(
                          (p) =>
                            !projectSearchFilter ||
                            p.title?.toLowerCase().includes(projectSearchFilter.toLowerCase()) ||
                            p.category?.toLowerCase().includes(projectSearchFilter.toLowerCase())
                        )
                        .map((p) => {
                          const pid = p._id || p.id
                          const isSelected = selectedProjectId?.toString() === pid?.toString()

                          return (
                            <div
                              key={pid}
                              onClick={() => handleSelectProject(p)}
                              className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-3 transition ${
                                isSelected
                                  ? 'border-purple-600 bg-purple-50/60 shadow-xs ring-1 ring-purple-600'
                                  : 'border-gray-200 bg-white hover:border-purple-300 hover:bg-purple-50/20'
                              }`}
                            >
                              {/* Thumbnail */}
                              <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl bg-purple-100">
                                {p.image ? (
                                  <img
                                    src={p.image}
                                    alt={p.title}
                                    className="h-full w-full object-cover"
                                    onError={(e) => {
                                      e.target.style.display = 'none'
                                    }}
                                  />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center text-lg">
                                    🎨
                                  </div>
                                )}
                              </div>

                              {/* Title, Category, Desc */}
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="rounded bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-700">
                                    {p.category || 'General'}
                                  </span>
                                  {p.status && (
                                    <span className="text-[10px] text-gray-400">
                                      • {p.status}
                                    </span>
                                  )}
                                </div>
                                <h4 className="mt-1 truncate text-sm font-bold text-gray-900">
                                  {p.title}
                                </h4>
                                <p className="truncate text-xs text-gray-500">
                                  {p.description || 'CraftLoop portfolio project.'}
                                </p>
                              </div>

                              {/* Radio indicator */}
                              <div className="flex-shrink-0 px-2">
                                <div
                                  className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                                    isSelected
                                      ? 'border-purple-600 bg-purple-600 text-white'
                                      : 'border-gray-300 bg-white'
                                  }`}
                                >
                                  {isSelected && <span className="text-[10px] font-bold">✓</span>}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                    </div>
                  </div>
                )}
              </div>

              {/* Project Link Input */}
              <div className="mb-4">
                <label className="mb-1 block text-sm font-semibold text-gray-700">
                  Project Link (CraftLoop URL)
                </label>
                <div className="flex items-center gap-2">
                  <span className="rounded-xl border border-gray-200 bg-gray-100 px-3 py-2.5 text-xs text-gray-500">
                    🔗
                  </span>
                  <input
                    type="text"
                    value={shareProjectUrl}
                    onChange={(e) => setShareProjectUrl(e.target.value)}
                    placeholder="http://localhost:5174/project/..."
                    className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-xs outline-none transition focus:border-purple-400 focus:bg-white"
                  />
                </div>
                <p className="mt-1 text-[11px] text-gray-400">
                  Auto-attached CraftLoop project URL.
                </p>
              </div>

              {/* Description / Message */}
              <div className="mb-6">
                <label className="mb-1 block text-sm font-semibold text-gray-700">
                  Optional Description
                </label>
                <textarea
                  value={shareDescription}
                  onChange={(e) => setShareDescription(e.target.value)}
                  rows={3}
                  maxLength={1000}
                  placeholder="Here is the project I created on CraftLoop! Check it out and let me know your thoughts..."
                  className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition focus:border-purple-400 focus:bg-white focus:ring-2 focus:ring-purple-100"
                />
                <p className="mt-1 text-right text-xs text-gray-400">
                  {shareDescription.length}/1000
                </p>
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowShareWorkModal(false)
                    setShareDescription('')
                  }}
                  className="rounded-xl border border-gray-200 px-5 py-3 font-semibold text-gray-600 transition hover:bg-gray-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submittingShareWork || (!selectedProjectId && !shareProjectUrl.trim())}
                  className="rounded-xl bg-purple-600 px-6 py-3 font-semibold text-white shadow-lg shadow-purple-200 transition hover:bg-purple-700 disabled:opacity-50 active:scale-95 flex items-center gap-2"
                >
                  {submittingShareWork ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      <span>Sharing...</span>
                    </>
                  ) : (
                    <span>Share to Community</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Community