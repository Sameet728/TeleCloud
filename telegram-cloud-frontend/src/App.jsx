import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import ProtectedRoute from './components/ProtectedRoute'
import MainLayout from './layouts/MainLayout'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import ConnectTelegram from './pages/ConnectTelegram'
import Dashboard from './pages/Dashboard'
import Files from './pages/Files'
import FolderPage from './pages/FolderPage'
import Shared from './pages/Shared'
import PublicShare from './pages/PublicShare'
import Pricing from './pages/Pricing'
import Profile from './pages/Profile'
import Terms from './pages/Terms'
import Privacy from './pages/Privacy'

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/connect-telegram" element={
              <ProtectedRoute requireTelegram={false}><ConnectTelegram /></ProtectedRoute>
            } />
            <Route path="/s/:token" element={<PublicShare />} />
            <Route element={<ProtectedRoute requireTelegram><MainLayout /></ProtectedRoute>}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/files" element={<Files />} />
              <Route path="/starred" element={<Files filter="starred" />} />
              <Route path="/images" element={<Files filter="images" />} />
              <Route path="/videos" element={<Files filter="videos" />} />
              <Route path="/folder/:id" element={<FolderPage />} />
              <Route path="/shared" element={<Shared />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/profile" element={<Profile />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}
