import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { SocketProvider } from '../context/SocketContext';

import ProtectedRoute from './ProtectedRoute';
import GuestRoute from './GuestRoute';
import RoleRoute from './RoleRoute';

import DashboardLayout from '../layouts/DashboardLayout';
import Home from '../pages/Home';
import Login from '../pages/Login';
import Register from '../pages/Register';
import ForgotPassword from '../pages/ForgotPassword';
import ResetPassword from '../pages/ResetPassword';

// Lazy load heavy page components to optimize bundle size and page loading speed
const HospitalDonors = lazy(() => import('../pages/HospitalDonors'));
const ProfilePage = lazy(() => import('../pages/ProfilePage'));

const DonorMap = lazy(() => import('../pages/shared/DonorMap'));
const EmergencyMap = lazy(() => import('../pages/shared/EmergencyMap'));
const AnalyticsMap = lazy(() => import('../pages/admin/AnalyticsMap'));

const SearchDonors = lazy(() => import('../pages/SearchDonors'));
const Requests = lazy(() => import('../pages/Requests'));
const DonationHistory = lazy(() => import('../pages/DonationHistory'));
const EmergencyRequests = lazy(() => import('../pages/EmergencyRequests'));
const AdminDashboard = lazy(() => import('../pages/admin/AdminDashboard'));
const AdminUsers = lazy(() => import('../pages/admin/AdminUsers'));
const AdminDonors = lazy(() => import('../pages/admin/AdminDonors'));
const AdminHospitals = lazy(() => import('../pages/admin/AdminHospitals'));
const AdminBroadcasts = lazy(() => import('../pages/admin/AdminBroadcasts'));
const BloodRequestsFeed = lazy(() => import('../pages/BloodRequestsFeed'));

// Spinner fallback for Suspense page lazy loading
const PageLoader = () => (
  <div className="min-h-screen bg-slate-50 flex items-center justify-center">
    <div className="w-10 h-10 border-4 border-rose-600 border-t-transparent rounded-full animate-spin" />
  </div>
);

const AppRoutes = () => (
  <BrowserRouter>
    <AuthProvider>
      <SocketProvider>
        <Suspense fallback={<PageLoader />}>
          <Routes>
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Home />} />
            <Route path="profile" element={<ProfilePage />} />

            <Route
              path="blood-requests"
              element={
                <RoleRoute roles={['user', 'donor', 'hospital', 'admin']}>
                  <BloodRequestsFeed />
                </RoleRoute>
              }
            />

            <Route
              path="search-donors"
              element={
                <RoleRoute roles={['user', 'hospital']}>
                  <SearchDonors />
                </RoleRoute>
              }
            />
            <Route
              path="my-requests"
              element={
                <RoleRoute roles={['user', 'hospital']}>
                  <Requests />
                </RoleRoute>
              }
            />

            <Route
              path="requests-received"
              element={
                <RoleRoute roles={['donor']}>
                  <Requests />
                </RoleRoute>
              }
            />

            <Route
              path="donation-history"
              element={
                <RoleRoute roles={['donor']}>
                  <DonationHistory />
                </RoleRoute>
              }
            />

            <Route
              path="emergency-requests"
              element={
                <RoleRoute roles={['hospital']}>
                  <EmergencyRequests />
                </RoleRoute>
              }
            />

            {/* ✅ CLEAN FINAL HOSPITAL DONOR MODULE */}
            <Route
              path="hospital-donors"
              element={
                <RoleRoute roles={['hospital']}>
                  <HospitalDonors />
                </RoleRoute>
              }
            />

            {/* MAP ROUTES */}
            <Route
              path="donor-map"
              element={
                <RoleRoute roles={['user', 'hospital', 'admin']}>
                  <DonorMap />
                </RoleRoute>
              }
            />
            <Route
              path="emergency-map"
              element={
                <RoleRoute roles={['user', 'donor', 'hospital', 'admin']}>
                  <EmergencyMap />
                </RoleRoute>
              }
            />
            <Route
              path="analytics-map"
              element={
                <RoleRoute roles={['admin']}>
                  <AnalyticsMap />
                </RoleRoute>
              }
            />

            {/* ADMIN ROUTES */}
            <Route
              path="admin-dashboard"
              element={
                <RoleRoute roles={['admin']}>
                  <AdminDashboard />
                </RoleRoute>
              }
            />

            <Route
              path="users"
              element={
                <RoleRoute roles={['admin']}>
                  <AdminUsers />
                </RoleRoute>
              }
            />

            <Route
              path="donors"
              element={
                <RoleRoute roles={['admin']}>
                  <AdminDonors />
                </RoleRoute>
              }
            />

            <Route
              path="hospitals"
              element={
                <RoleRoute roles={['admin']}>
                  <AdminHospitals />
                </RoleRoute>
              }
            />

            <Route
              path="broadcasts"
              element={
                <RoleRoute roles={['admin']}>
                  <AdminBroadcasts />
                </RoleRoute>
              }
            />
          </Route>

          {/* AUTH ROUTES */}
          <Route
            path="/login"
            element={
              <GuestRoute>
                <Login />
              </GuestRoute>
            }
          />

          <Route
            path="/register"
            element={
              <GuestRoute>
                <Register />
              </GuestRoute>
            }
          />



          <Route
            path="/forgot-password"
            element={
              <GuestRoute>
                <ForgotPassword />
              </GuestRoute>
            }
          />

          <Route
            path="/reset-password/:resetToken"
            element={<ResetPassword />}
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </SocketProvider>
  </AuthProvider>
</BrowserRouter>
);

export default AppRoutes;