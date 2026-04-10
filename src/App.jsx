import { BrowserRouter as Router, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ForYou from './pages/ForYou';
import NewsDesk from './pages/NewsDesk';
import Saved from './pages/Saved';
import Profile from './pages/Profile';
import AdminDashboard from './pages/AdminDashboard';
import Onboarding from './components/Onboarding';
import Navbar from './components/Navbar';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { BookmarksProvider } from './context/BookmarksContext';
import './index.css';
import './App.css';

const ProtectedRoute = ({ children }) => {
  const { currentUser, userData } = useAuth();
  const location = useLocation();

  if (!currentUser) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (userData && userData.onboardingCompleted === false && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  return children;
};

const PublicOnlyRoute = ({ children }) => {
  const { currentUser, userData } = useAuth();

  if (!currentUser) {
    return children;
  }

  if (userData && userData.onboardingCompleted === false) {
    return <Navigate to="/onboarding" replace />;
  }

  return <Navigate to="/" replace />;
};

const OnboardingRoute = ({ children }) => {
  const { currentUser, userData } = useAuth();

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (userData && userData.onboardingCompleted === true) {
    return <Navigate to="/" replace />;
  }

  return children;
};

const AdminRoute = ({ children }) => {
  const { currentUser, isAdmin, userData } = useAuth();

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (userData && userData.onboardingCompleted === false) {
    return <Navigate to="/onboarding" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return children;
};

const MainLayout = () => (
  <div className="app-container">
    <Navbar />
    <main className="main-content">
      <Outlet />
    </main>
  </div>
);

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BookmarksProvider>
          <Router>
            <Routes>
              <Route
                path="/login"
                element={
                  <PublicOnlyRoute>
                    <Login />
                  </PublicOnlyRoute>
                }
              />
              <Route
                path="/signup"
                element={
                  <PublicOnlyRoute>
                    <Signup />
                  </PublicOnlyRoute>
                }
              />
              <Route
                path="/onboarding"
                element={
                  <OnboardingRoute>
                    <Onboarding />
                  </OnboardingRoute>
                }
              />

              <Route element={<MainLayout />}>
                <Route
                  path="/saved"
                  element={
                    <ProtectedRoute>
                      <Saved />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/profile"
                  element={
                    <ProtectedRoute>
                      <Profile />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/desk"
                  element={
                    <ProtectedRoute>
                      <NewsDesk />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/for-you"
                  element={
                    <ProtectedRoute>
                      <ForYou />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin"
                  element={
                    <AdminRoute>
                      <AdminDashboard />
                    </AdminRoute>
                  }
                />
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <Home />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/:category"
                  element={
                    <ProtectedRoute>
                      <Home />
                    </ProtectedRoute>
                  }
                />
              </Route>
            </Routes>
          </Router>
        </BookmarksProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
