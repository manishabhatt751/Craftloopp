import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'

function ViewerHome() {
  const [stats, setStats] = useState({
    creators: 0,
    projects: 0,
    courses: 0,
    skills: 0,
  })
  const [activeCourse, setActiveCourse] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    async function loadData() {
      try {
        const promises = [
          api.getCreators().catch(() => ({ data: [] })),
          api.getProjects().catch(() => ({ data: [] })),
          api.getCourses().catch(() => ({ data: [] })),
        ]

        if (api.isAuthenticated()) {
          promises.push(api.getMyLearning().catch(() => ({ data: [] })))
        }

        const [creatorsRes, projectsRes, coursesRes, learningRes] = await Promise.all(promises)

        if (!isMounted) return

        const creators = Array.isArray(creatorsRes?.data) ? creatorsRes.data : []
        const projects = Array.isArray(projectsRes?.data) ? projectsRes.data : []
        const courses = Array.isArray(coursesRes?.data) ? coursesRes.data : []

        // Calculate unique skills across creators and courses
        const skillsSet = new Set()
        creators.forEach((c) => {
          if (Array.isArray(c.skills)) c.skills.forEach((s) => skillsSet.add(s.trim()))
        })
        courses.forEach((c) => {
          if (Array.isArray(c.skills)) c.skills.forEach((s) => skillsSet.add(s.trim()))
          if (Array.isArray(c.tags)) c.tags.forEach((t) => skillsSet.add(t.trim()))
        })

        setStats({
          creators: creators.length,
          projects: projects.length,
          courses: courses.length,
          skills: skillsSet.size > 0 ? skillsSet.size : courses.length * 2,
        })

        if (learningRes && Array.isArray(learningRes.data) && learningRes.data.length > 0) {
          const first = learningRes.data[0]
          if (first && first.course) {
            setActiveCourse({
              id: first.course._id || first._id,
              courseId: first.course._id,
              title: first.course.title || 'Enrolled Course',
              creator: first.course.instructor?.name || first.course.creator?.name || 'CraftLoop Creator',
              thumbnail: first.course.thumbnail || '',
              progress: typeof first.progress === 'number' ? first.progress : 0,
            })
          }
        }
      } catch (err) {
        console.error('Failed to load viewer home data:', err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    loadData()
    return () => {
      isMounted = false
    }
  }, [])
  return (
    <div className="space-y-8">

      {/* Welcome Section */}
      <section className="rounded-3xl bg-purple-600 p-8 text-white shadow-lg">

        <p className="text-sm font-semibold text-purple-200">
          WELCOME TO CRAFTLOOP
        </p>

        <h1 className="mt-2 text-3xl font-bold">
          Discover. Learn. Connect.
        </h1>

        <p className="mt-3 max-w-2xl text-sm leading-6 text-purple-100">
          Explore talented creators, discover useful projects and learn new
          skills through courses and tutorials.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">

          <Link
            to="/viewerexplore"
            className="rounded-xl bg-white px-5 py-3 text-sm font-bold text-purple-700 transition hover:bg-purple-50"
          >
            Explore Creators
          </Link>

          <Link
            to="/viewercourse"
            className="rounded-xl border border-white/40 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/10"
          >
            Browse Courses
          </Link>

        </div>

      </section>


      {/* Platform Stats */}
      <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">

        <div className="rounded-2xl border border-purple-100 bg-white p-6 shadow-sm">
          <p className="text-sm text-gray-500">
            Creators
          </p>

          <p className="mt-2 text-3xl font-bold text-purple-700">
            {stats.creators}
          </p>
        </div>

        <div className="rounded-2xl border border-purple-100 bg-white p-6 shadow-sm">
          <p className="text-sm text-gray-500">
            Projects
          </p>

          <p className="mt-2 text-3xl font-bold text-purple-700">
            {stats.projects}
          </p>
        </div>

        <div className="rounded-2xl border border-purple-100 bg-white p-6 shadow-sm">
          <p className="text-sm text-gray-500">
            Courses
          </p>

          <p className="mt-2 text-3xl font-bold text-purple-700">
            {stats.courses}
          </p>
        </div>

        <div className="rounded-2xl border border-purple-100 bg-white p-6 shadow-sm">
          <p className="text-sm text-gray-500">
            Skills
          </p>

          <p className="mt-2 text-3xl font-bold text-purple-700">
            {stats.skills}
          </p>
        </div>

      </section>


      {/* Recommended */}
      <section>

        <div className="flex items-center justify-between">

          <div>
            <p className="text-sm font-semibold text-purple-600">
              RECOMMENDED
            </p>

            <h2 className="mt-1 text-2xl font-bold text-gray-900">
              Explore Something New
            </h2>
          </div>

          <Link
            to="/viewerexplore"
            className="text-sm font-bold text-purple-600 hover:text-purple-800"
          >
            View All
          </Link>

        </div>


        <div className="mt-5 grid gap-5 md:grid-cols-3">

          {/* Graphic Design */}
          <div className="rounded-2xl border border-purple-100 bg-white p-6 transition hover:-translate-y-1 hover:shadow-lg">

            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100 text-xl">
              🎨
            </div>

            <h3 className="mt-5 text-lg font-bold">
              Graphic Design
            </h3>

            <p className="mt-2 text-sm leading-6 text-gray-500">
              Discover creators working with branding, posters and visual
              design.
            </p>

            <Link
              to="/viewerexplore"
              className="mt-5 inline-block text-sm font-bold text-purple-600 hover:text-purple-800"
            >
              Explore →
            </Link>

          </div>


          {/* Web Development */}
          <div className="rounded-2xl border border-purple-100 bg-white p-6 transition hover:-translate-y-1 hover:shadow-lg">

            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100 text-xl">
              💻
            </div>

            <h3 className="mt-5 text-lg font-bold">
              Web Development
            </h3>

            <p className="mt-2 text-sm leading-6 text-gray-500">
              Learn development skills and discover useful creator projects.
            </p>

            <Link
              to="/viewerexplore"
              className="mt-5 inline-block text-sm font-bold text-purple-600 hover:text-purple-800"
            >
              Explore →
            </Link>

          </div>


          {/* Creative Courses */}
          <div className="rounded-2xl border border-purple-100 bg-white p-6 transition hover:-translate-y-1 hover:shadow-lg">

            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100 text-xl">
              📚
            </div>

            <h3 className="mt-5 text-lg font-bold">
              Creative Courses
            </h3>

            <p className="mt-2 text-sm leading-6 text-gray-500">
              Find courses and tutorials created by talented CraftLoop
              creators.
            </p>

            <Link
              to="/viewercourse"
              className="mt-5 inline-block text-sm font-bold text-purple-600 hover:text-purple-800"
            >
              Browse →
            </Link>

          </div>

        </div>

      </section>


      {/* Continue Learning */}
      <section className="rounded-2xl border border-purple-100 bg-white p-6 shadow-sm">

        <div className="flex flex-wrap items-center justify-between gap-3">

          <div>
            <p className="text-sm font-semibold text-purple-600">
              YOUR LEARNING
            </p>

            <h2 className="mt-1 text-xl font-bold">
              Continue Learning
            </h2>
          </div>

          <Link
            to="/mylearning"
            className="text-sm font-bold text-purple-600 hover:text-purple-800"
          >
            My Learning →
          </Link>

        </div>


        {activeCourse ? (
          <div className="mt-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 rounded-xl bg-[#faf9ff] border border-purple-100 p-5">
            <div className="flex items-center gap-4">
              {activeCourse.thumbnail ? (
                <img
                  src={activeCourse.thumbnail}
                  alt={activeCourse.title}
                  className="h-14 w-14 rounded-xl object-cover border border-purple-100"
                />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-purple-100 text-purple-700 text-xl font-bold">
                  🎓
                </div>
              )}
              <div>
                <h3 className="font-bold text-gray-900">{activeCourse.title}</h3>
                <p className="text-xs text-gray-500">Instructor: {activeCourse.creator}</p>
                <div className="mt-2 flex items-center gap-2">
                  <div className="h-1.5 w-32 rounded-full bg-purple-200 overflow-hidden">
                    <div
                      className="h-full bg-purple-600 rounded-full transition-all"
                      style={{ width: `${activeCourse.progress}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-purple-700">{activeCourse.progress}%</span>
                </div>
              </div>
            </div>

            <Link
              to={`/watch/${activeCourse.courseId}`}
              className="rounded-xl bg-purple-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-purple-700"
            >
              Resume Learning →
            </Link>
          </div>
        ) : (
          <div className="mt-5 rounded-xl bg-[#faf9ff] p-5">
            <p className="text-sm font-semibold text-gray-700">
              You haven't started a course yet.
            </p>
            <p className="mt-1 text-sm text-gray-500">
              Explore courses and start learning something new.
            </p>
            <Link
              to="/viewercourse"
              className="mt-4 inline-block rounded-xl bg-purple-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-purple-700"
            >
              Find Courses
            </Link>
          </div>
        )}

      </section>

    </div>
  )
}

export default ViewerHome