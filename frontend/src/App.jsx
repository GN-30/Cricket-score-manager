import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { ThemeProvider } from '@/components/ThemeProvider'
import { AuthProvider } from '@/contexts/AuthContext'
import { AnimatePresence } from 'framer-motion'
import Layout from '@/components/Layout'
import HomePage from '@/pages/HomePage'
import LoginPage from '@/pages/LoginPage'
import MatchesPage from '@/pages/MatchesPage'
import TournamentsPage from '@/pages/TournamentsPage'
import TeamsPage from '@/pages/TeamsPage'
import PlayersPage from '@/pages/PlayersPage'
import AdminPage from '@/pages/AdminPage'
import LiveScorer from '@/pages/LiveScorer'
import AnalyticsPage from '@/pages/AnalyticsPage'
import TournamentDetailsPage from '@/pages/TournamentDetailsPage'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { CustomCursor } from '@/components/CustomCursor'
import PWAInstallPrompt from '@/components/PWAInstallPrompt'

function AnimatedRoutes() {
  const location = useLocation()
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* Public auth page */}
        <Route path="/login" element={<LoginPage />} />

        {/* Main app with persistent Navbar */}
        <Route element={<Layout />}>
          <Route path="/"            element={<HomePage />} />
          <Route path="/matches"     element={<MatchesPage />} />
          <Route path="/tournaments" element={<TournamentsPage />} />
          <Route path="/tournaments/:id" element={<TournamentDetailsPage />} />
          <Route path="/teams"       element={<TeamsPage />} />
          <Route path="/players"     element={<PlayersPage />} />
          
          <Route path="/admin" element={
            <ProtectedRoute>
              <AdminPage />
            </ProtectedRoute>
          } />
          <Route path="/match/:id" element={<LiveScorer />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
        </Route>
      </Routes>
    </AnimatePresence>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
        <AuthProvider>
          <CustomCursor />
          <PWAInstallPrompt />
          <AnimatedRoutes />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}
