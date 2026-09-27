import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

// Creator layout
import AppLayout from './Components/AppLayout'
import ProtectedRoute from './Components/ProtectedRoute'

// Creator pages
import Home from './pages/Home'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Community from './pages/community'
import Create from './pages/create'
import AIChat from './pages/AIchat'
import Messages from './pages/Messages'
import Profile from './pages/Profile'
import EditProfile from './pages/editprofile'
import HelpSupport from './pages/helpsupport'
import Notification from './pages/notification'
import Balance from './pages/balance'
import YourProject from './pages/yourproject'
import Share from './pages/share'
import SkillProfile from './pages/skillprofile'
import CourseDetails from './pages/coursedetails'
import Setting from './pages/setting'

// Viewer layout
import ViewerLayout from './Components/viewerlayout'

// Viewer pages
import ViewerHome from './pages/viewerhome'
import ViewerExplore from './pages/viewerexplore'
import ViewerCourses from './pages/viewercourse'
import ViewerCourseDetails from './pages/viewercoursedetails'
import WatchLesson from './pages/watchlesson'
import MyLearning from './pages/mylearning'
import ViewerCommunity from './pages/viewercommunity'
import ViewerMessages from './pages/viewermessages'
import ViewerMessageChat from './pages/viewermessagechat'
import ViewerProfile from './pages/viewerprofile'
import ViewerAIChat from './pages/vieweraichat'
import ViewerNotification from './pages/viewernotification'
import ViewerSettings from './pages/viewersettings'
import ViewerHelpSupport from './pages/viewerhelpsupport'
import SavedProjects from './pages/savedprojects'
import ProjectViewWrapper from './pages/ProjectViewWrapper'
import PracticePage from './pages/PracticePage'


import ErrorBoundary from './Components/ErrorBoundary'

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>

        {/* =========================
            HOME
        ========================= */}
        <Route
          path="/"
          element={<Home />}
        />

        {/* =========================
            LOGIN
        ========================= */}
        <Route
          path="/login"
          element={<Login />}
        />


        {/* =========================
            CREATOR SIDE
        ========================= */}
        <Route
          element={
            <ProtectedRoute allowedRole="creator">
              <AppLayout />
            </ProtectedRoute>
          }
        >

          <Route
            path="/dashboard"
            element={<Dashboard />}
          />

          <Route
            path="/community"
            element={<Community />}
          />

          <Route
            path="/create"
            element={<Create />}
          />

          <Route
            path="/ai-chat"
            element={<AIChat />}
          />

          <Route
            path="/messages"
            element={<Messages />}
          />

          <Route
            path="/profile"
            element={<Profile />}
          />

          <Route
            path="/edit-profile"
            element={<EditProfile />}
          />

          <Route
            path="/editprofile"
            element={<Navigate to="/edit-profile" replace />}
          />

          <Route
            path="/helpsupport"
            element={<HelpSupport />}
          />

          <Route
            path="/notification"
            element={<Notification />}
          />

          <Route
            path="/balance"
            element={<Balance />}
          />

          <Route
            path="/your-project"
            element={<YourProject />}
          />

          <Route
            path="/share"
            element={<Share />}
          />

          <Route
            path="/skill-profile"
            element={<SkillProfile />}
          />

          <Route
            path="/course-details"
            element={<CourseDetails />}
          />

          <Route
            path="/course-details/:courseId"
            element={<CourseDetails />}
          />

          <Route
            path="/your-courses"
            element={<Navigate to="/course-details" replace />}
          />

          <Route
            path="/setting"
            element={<Setting />}
          />

        </Route>


        {/* =========================
            VIEWER SIDE
        ========================= */}
        <Route
          element={
            <ProtectedRoute allowedRole="viewer">
              <ViewerLayout />
            </ProtectedRoute>
          }
        >

          <Route
            path="/viewerhome"
            element={<ViewerHome />}
          />

          <Route
            path="/viewerexplore"
            element={<ViewerExplore />}
          />

          <Route
            path="/explore"
            element={<ViewerExplore />}
          />

          <Route
            path="/viewercourse"
            element={<ViewerCourses />}
          />

          <Route
            path="/viewercoursedetails/:courseId"
            element={<ViewerCourseDetails />}
          />

          <Route
            path="/watchlesson/:courseId"
            element={<WatchLesson />}
          />

          <Route
            path="/mylearning"
            element={<MyLearning />}
          />

          <Route
            path="/viewercommunity"
            element={<ViewerCommunity />}
          />

          <Route
            path="/viewermessages"
            element={<ViewerMessages />}
          />

          <Route
            path="/viewermessages/:userId"
            element={<ViewerMessageChat />}
          />

          <Route
            path="/viewerprofile"
            element={<ViewerProfile />}
          />

          <Route
            path="/viewereditprofile"
            element={<EditProfile />}
          />

          <Route
            path="/viewer/edit-profile"
            element={<Navigate to="/viewereditprofile" replace />}
          />

          <Route
            path="/viewer/profile"
            element={<Navigate to="/viewerprofile" replace />}
          />

          <Route
            path="/viewerai-chat"
            element={<ViewerAIChat />}
          />

          <Route
            path="/viewernotification"
            element={<ViewerNotification />}
          />

          <Route
            path="/viewersettings"
            element={<ViewerSettings />}
          />

          <Route
            path="/viewerhelpsupport"
            element={<ViewerHelpSupport />}
          />

          <Route
            path="/savedprojects"
            element={<SavedProjects />}
          />

        </Route>


        {/* =========================
            SHARED PROJECT DETAILS
        ========================= */}
        <Route
          path="/project/:id"
          element={
            <ProtectedRoute>
              <ProjectViewWrapper />
            </ProtectedRoute>
          }
        />


        {/* =========================
            PRACTICE ACTIVITY
        ========================= */}
        <Route
          path="/practice/:practiceId"
          element={
            <ProtectedRoute>
              <PracticePage />
            </ProtectedRoute>
          }
        />


        {/* =========================
            INVALID URL
        ========================= */}
        <Route
          path="*"
          element={<Navigate to="/" replace />}
        />

      </Routes>
    </BrowserRouter>
  </ErrorBoundary>
  )
}

export default App