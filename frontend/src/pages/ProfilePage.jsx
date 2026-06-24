import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

const RecenterMap = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.setView(center, map.getZoom());
    }
  }, [center, map]);
  return null;
};
import toast from 'react-hot-toast';
import {
  User,
  Lock,
  Settings,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Building2,
  Droplets,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  Shield,
  Activity,
  ArrowRight,
  ShieldAlert,
  Clock,
  Home,
  Check,
  Key,
  Trash2,
  LockKeyhole,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { roleLabels } from '../utils/roleConfig';
import * as profileService from '../services/profileService';
import { updateAvailability } from '../services/donorService';
import { getErrorMessage } from '../services/api';
import ConfirmModal from '../components/common/ConfirmModal';
import Button from '../components/ui/Button';
import Select from '../components/ui/Select';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

// Change Password Modal Component
const ChangePasswordModal = ({ isOpen, onClose, onCompleted }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState({ new: false, confirm: false });

  // Password Strength Checker
  const criteria = [
    { label: 'Minimum 8 characters', met: newPassword.length >= 8 },
    { label: 'At least one uppercase letter (A-Z)', met: /[A-Z]/.test(newPassword) },
    { label: 'At least one lowercase letter (a-z)', met: /[a-z]/.test(newPassword) },
    { label: 'At least one number (0-9)', met: /[0-9]/.test(newPassword) },
    { label: 'At least one special character (!@#...)', met: /[^A-Za-z0-9]/.test(newPassword) },
  ];
  
  const metCount = criteria.filter((c) => c.met).length;
  
  const getStrengthLabel = () => {
    if (newPassword.length === 0) return { label: 'None', color: 'bg-slate-200', text: 'text-slate-400' };
    if (metCount <= 2) return { label: 'Weak', color: 'bg-red-500 w-1/4', text: 'text-red-500' };
    if (metCount <= 4) return { label: 'Medium', color: 'bg-amber-500 w-2/4', text: 'text-amber-500' };
    return { label: 'Strong', color: 'bg-emerald-500 w-full', text: 'text-emerald-500' };
  };

  const strength = getStrengthLabel();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (metCount < 5) {
      toast.error('Password does not meet security requirements.');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await profileService.changePassword(newPassword);
      toast.success('Password updated successfully.');
      onCompleted();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update password.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm pointer-events-auto"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            className="relative pointer-events-auto w-full max-w-md rounded-2xl border border-slate-100 bg-white shadow-2xl p-6 overflow-hidden flex flex-col gap-4"
          >
            <div className="flex items-start justify-between pb-2 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <LockKeyhole className="w-5 h-5 text-rose-500" />
                Change Password
              </h3>
              <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100">
                <XIcon className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">

              {/* New Password */}
              <div className="relative">
                <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1">New Password</label>
                <div className="relative">
                  <input
                    type={showPass.new ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full py-2.5 px-4 pr-10 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-slate-800 text-sm"
                    placeholder="Create secure password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(prev => ({ ...prev, new: !prev.new }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPass.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Strength Meter Bar */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-xs font-semibold">
                  <span className="text-slate-400">Password Strength:</span>
                  <span className={strength.text}>{strength.label}</span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full transition-all duration-300 rounded-full ${strength.color}`} />
                </div>
              </div>

              {/* Strength Criteria List */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 grid grid-cols-1 gap-1 text-[11px]">
                {criteria.map((c, i) => (
                  <div key={i} className="flex items-center gap-1.5 font-medium">
                    {c.met ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                    ) : (
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-300 ml-1 mr-1 flex-shrink-0" />
                    )}
                    <span className={c.met ? 'text-emerald-700' : 'text-slate-500'}>{c.label}</span>
                  </div>
                ))}
              </div>

              {/* Confirm Password */}
              <div className="relative">
                <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1">Confirm New Password</label>
                <div className="relative">
                  <input
                    type={showPass.confirm ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full py-2.5 px-4 pr-10 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-slate-800 text-sm"
                    placeholder="Verify secure password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(prev => ({ ...prev, confirm: !prev.confirm }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPass.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-3">
                <Button type="button" variant="secondary" onClick={onClose} className="!py-2 text-xs">
                  Cancel
                </Button>
                <Button type="submit" loading={loading} className="!py-2 text-xs text-white bg-rose-600 border-none hover:bg-rose-500">
                  Update Password
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

// Reusable X close icon
const XIcon = ({ className }) => <X className={className} />;

// MAIN PROFILE REDESIGN PAGE
const ProfilePage = () => {
  const { user, updateUser, refreshUser, logout } = useAuth();
  const badge = roleLabels[user?.role] || roleLabels.user;

  const [activeTab, setActiveTab] = useState('personal'); // Tab states: 'personal', 'security', 'settings'
  const [editLoading, setEditLoading] = useState(false);
  const [toggleLoading, setToggleLoading] = useState(false);

  const handleAvailabilityToggle = async () => {
    setToggleLoading(true);
    try {
      const nextValue = !user?.availability;
      const { data: res } = await updateAvailability(nextValue);
      updateUser(res.user);
      setAvailability(res.user.availability !== false);
      toast.success(res.message || 'Availability updated successfully');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setToggleLoading(false);
    }
  };

  // Edit details form states
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || '');
  const [city, setCity] = useState(user?.city || '');
  const [address, setAddress] = useState(user?.address || '');
  const [bloodGroup, setBloodGroup] = useState(user?.bloodGroup || BLOOD_GROUPS[0]);
  const [hospitalName, setHospitalName] = useState(user?.hospitalName || '');
  const [availability, setAvailability] = useState(user?.availability !== false);
  const [latitude, setLatitude] = useState(user?.location?.latitude || '');
  const [longitude, setLongitude] = useState(user?.location?.longitude || '');

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude);
        setLongitude(position.coords.longitude);
        toast.success('Location detected successfully.');
      },
      (error) => {
        let msg = 'Failed to detect location.';
        if (error.code === 1) msg = 'Location permission denied.';
        else if (error.code === 2) msg = 'Position unavailable.';
        toast.error(msg);
      }
    );
  };

  // Verification modal states
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deactivateLoading, setDeactivateLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Password Change modal
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);

  const isDonor = user?.role === 'donor';
  const isHospital = user?.role === 'hospital';

  // Personal Form Submission
  const handleProfileUpdate = async (e) => {
    e.preventDefault();

    if (!name.trim()) return toast.error('Name is required');
    if (!email.trim()) return toast.error('Email is required');
    if (!phoneNumber.trim()) return toast.error('Phone number is required');

    setEditLoading(true);
    try {
      const payload = {
        name,
        email,
        phoneNumber,
        city,
        address,
        location: (latitude !== '' && longitude !== '') ? {
          latitude: Number(latitude),
          longitude: Number(longitude)
        } : null
      };

      if (isDonor) {
        payload.bloodGroup = bloodGroup;
      }
      if (isHospital) {
        payload.hospitalName = hospitalName;
      }

      const { data } = await profileService.updateProfile(payload);
      updateUser(data.user);
      toast.success(data.message || 'Profile updated successfully');
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update profile';
      toast.error(msg);
    } finally {
      setEditLoading(false);
    }
  };



  // Account Deactivate flow
  const handleDeactivate = async () => {
    setDeactivateLoading(true);
    try {
      await profileService.deactivateAccount();
      toast.success('Your account has been deactivated successfully.');
      setIsDeactivating(false);
      logout();
    } catch (err) {
      toast.error('Failed to deactivate account');
      setDeactivateLoading(false);
    }
  };

  // Account Deletion flow
  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      await profileService.deleteAccount();
      toast.success('Your account has been permanently removed.');
      setIsDeleting(false);
      logout();
    } catch (err) {
      toast.error('Failed to delete account');
      setDeleteLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl space-y-6 mx-auto px-4"
    >
      {/* PAGE HEADER */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Profile</h1>
        <p className="text-slate-500 mt-1 text-sm">Manage your profile, security details, and settings.</p>
      </div>

      {/* SLAEK METRIC SUMMARY HEADER CONTAINER */}
      <div className="rounded-2xl border border-white/60 bg-white/70 backdrop-blur-xl p-6 shadow-soft flex flex-col md:flex-row gap-6 items-center md:items-start">
        {/* Avatar Placeholder */}
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-500 to-rose-600 flex items-center justify-center text-white text-3xl font-black shadow-md flex-shrink-0">
          {user?.name?.charAt(0)?.toUpperCase() || <User className="w-8 h-8" />}
        </div>

        <div className="flex-1 text-center md:text-left space-y-3 w-full">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-955 flex items-center justify-center md:justify-start gap-2 flex-wrap">
                {user?.name}
                {((isHospital ? user?.isHospitalVerified : user?.isVerified)) && (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 fill-emerald-100 flex-shrink-0" />
                )}
              </h2>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mt-1">
                <span className={`inline-flex px-2.5 py-0.5 rounded-lg text-xs font-semibold border ${badge.color}`}>
                  {badge.label}
                </span>
                {user?.city && (
                  <span className="inline-flex items-center gap-0.5 text-xs text-slate-500 font-medium">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    {user.city}
                  </span>
                )}
                {isDonor && user?.bloodGroup && (
                  <span className="inline-flex items-center gap-1.5 text-xs bg-rose-50 text-rose-700 px-2.5 py-0.5 rounded-lg border border-rose-100 font-bold">
                    <Droplets className="w-3.5 h-3.5 text-rose-600 fill-rose-100" />
                    {user.bloodGroup}
                  </span>
                )}
              </div>
            </div>

            {isDonor && (
              <div className="self-center md:self-start">
                {user?.availability ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-200">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Available
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 text-xs font-bold border border-slate-200">
                    <span className="w-2 h-2 rounded-full bg-slate-400" />
                    Unavailable
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-y-2 gap-x-4 pt-3 border-t border-slate-100 text-xs text-slate-500 font-medium">
            <span className="flex items-center justify-center md:justify-start gap-1.5">
              <Mail className="w-4 h-4 text-slate-400" />
              {user?.email}
            </span>
            <span className="flex items-center justify-center md:justify-start gap-1.5">
              <Phone className="w-4 h-4 text-slate-400" />
              {user?.phoneNumber}
            </span>
            <span className="flex items-center justify-center md:justify-start gap-1.5">
              <Calendar className="w-4 h-4 text-slate-400" />
              Member Since {new Date(user?.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long' })}
            </span>
          </div>
        </div>
      </div>

      {/* NAVIGATION TABS */}
      <div className="flex border-b border-slate-200/80 gap-6 text-sm font-semibold">
        <button
          onClick={() => setActiveTab('personal')}
          className={`flex items-center gap-2 pb-3.5 border-b-2 transition-all relative ${activeTab === 'personal' ? 'text-brand-600 border-brand-500' : 'text-slate-500 border-transparent hover:text-slate-800'}`}
        >
          <User className="w-4 h-4" />
          Personal Info
          {activeTab === 'personal' && (
            <motion.div layoutId="activeTabUnderline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-500" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('security')}
          className={`flex items-center gap-2 pb-3.5 border-b-2 transition-all relative ${activeTab === 'security' ? 'text-brand-600 border-brand-500' : 'text-slate-500 border-transparent hover:text-slate-800'}`}
        >
          <Lock className="w-4 h-4" />
          Security
          {activeTab === 'security' && (
            <motion.div layoutId="activeTabUnderline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-500" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`flex items-center gap-2 pb-3.5 border-b-2 transition-all relative ${activeTab === 'settings' ? 'text-brand-600 border-brand-500' : 'text-slate-500 border-transparent hover:text-slate-800'}`}
        >
          <Settings className="w-4 h-4" />
          Account Settings
          {activeTab === 'settings' && (
            <motion.div layoutId="activeTabUnderline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-500" />
          )}
        </button>
      </div>

      {/* TAB CONTENT DETAILS */}
      <div className="mt-4">
        <AnimatePresence mode="wait">
          {activeTab === 'personal' && (
            <div className="space-y-6">
              {isDonor && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl border border-white/60 bg-white/70 backdrop-blur-xl p-6 shadow-soft"
                >
                  <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
                    <div>
                      <h3 className="font-bold text-slate-900 text-lg">Donation Availability</h3>
                      <p className="text-slate-400 text-xs mt-0.5">Control whether you are listed as an active blood donor.</p>
                    </div>
                    <div>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${user?.availability ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                        {user?.availability ? 'Available' : 'Unavailable'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-5">
                    <div>
                      <span className="text-sm text-slate-700 font-semibold">Available for Donation</span>
                      <span className="text-xs text-slate-400 block mt-0.5">
                        {user?.availability 
                          ? 'Hospitals and users can see you as available for emergency contact.' 
                          : 'You are hidden from availability searches and requests.'}
                      </span>
                    </div>
                    
                    <button
                      type="button"
                      disabled={toggleLoading}
                      onClick={handleAvailabilityToggle}
                      className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:opacity-60 flex-shrink-0
                        ${user?.availability ? 'bg-gradient-to-r from-emerald-500 to-teal-500' : 'bg-slate-300'}`}
                      aria-pressed={user?.availability}
                      aria-label="Toggle availability"
                    >
                      {toggleLoading ? (
                        <span className="absolute inset-0 flex items-center justify-center">
                          <div className={`w-3.5 h-3.5 border-2 rounded-full animate-spin border-t-transparent ${user?.availability ? 'border-white' : 'border-slate-500'}`} />
                        </span>
                      ) : (
                        <motion.span
                          layout
                          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                          className={`absolute flex h-5 w-5 items-center justify-center rounded-full bg-white shadow-sm
                            ${user?.availability ? 'left-[calc(100%-1.375rem)]' : 'left-1'}`}
                        />
                      )}
                    </button>
                  </div>
                </motion.div>
              )}

              <motion.div
                key="personal"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="rounded-2xl border border-white/60 bg-white/70 backdrop-blur-xl p-6 shadow-soft space-y-6"
              >
              <div className="border-b border-slate-100 pb-3">
                <h3 className="font-bold text-slate-900 text-lg">Personal Information</h3>
                <p className="text-slate-400 text-xs mt-0.5">Edit details associated with your public account.</p>
              </div>

              <form onSubmit={handleProfileUpdate} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Name Input */}
                  <div>
                    <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1">Full Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Jane Doe"
                      className="w-full py-2.5 px-4 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-slate-800 text-sm"
                    />
                  </div>

                  {/* Email Input */}
                  <div>
                    <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1">Email Address</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full py-2.5 px-4 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-slate-800 text-sm"
                    />
                  </div>

                  {/* Phone Input */}
                  <div>
                    <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1">Phone Number</label>
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="9876543210"
                      className="w-full py-2.5 px-4 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-slate-800 text-sm"
                    />
                  </div>

                  {/* City Input */}
                  <div>
                    <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1">City / Region</label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Hyderabad"
                      className="w-full py-2.5 px-4 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-slate-800 text-sm"
                    />
                  </div>

                  {/* Hospital Specific Fields */}
                  {isHospital && (
                    <div className="md:col-span-2">
                      <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1">Hospital Name</label>
                      <input
                        type="text"
                        value={hospitalName}
                        onChange={(e) => setHospitalName(e.target.value)}
                        placeholder="Apollo Emergency Services"
                        className="w-full py-2.5 px-4 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-slate-800 text-sm"
                      />
                    </div>
                  )}

                  {/* Address Input */}
                  <div className="md:col-span-2">
                    <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1">Physical Address</label>
                    <textarea
                      rows={2}
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Enter details..."
                      className="w-full py-2.5 px-4 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-slate-800 text-sm"
                    />
                  </div>

                  {/* Donor Specific Fields */}
                  {isDonor && (
                    <div>
                      <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1">Blood Group</label>
                      <Select
                        value={bloodGroup}
                        onChange={(e) => setBloodGroup(e.target.value)}
                      >
                        {BLOOD_GROUPS.map((bg) => (
                          <option key={bg} value={bg}>{bg}</option>
                        ))}
                      </Select>
                    </div>
                  )}

                  {/* Location Coordinates Section */}
                  <div className="md:col-span-2 border-t border-slate-100 pt-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-slate-800 text-sm">Location Coordinates</h4>
                        <p className="text-slate-400 text-xs mt-0.5">Auto-detect or enter your latitude and longitude coordinates for map representation.</p>
                      </div>
                      <button
                        type="button"
                        onClick={handleDetectLocation}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold transition-colors"
                      >
                        <MapPin className="w-3.5 h-3.5" />
                        Detect My Location
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1">Latitude</label>
                        <input
                          type="number"
                          step="any"
                          value={latitude}
                          onChange={(e) => setLatitude(e.target.value)}
                          placeholder="e.g. 17.3850"
                          className="w-full py-2.5 px-4 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-slate-800 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1">Longitude</label>
                        <input
                          type="number"
                          step="any"
                          value={longitude}
                          onChange={(e) => setLongitude(e.target.value)}
                          placeholder="e.g. 78.4867"
                          className="w-full py-2.5 px-4 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-slate-800 text-sm"
                        />
                      </div>
                    </div>

                    {latitude !== '' && longitude !== '' && !isNaN(Number(latitude)) && !isNaN(Number(longitude)) && (
                      <div className="w-full h-48 rounded-xl overflow-hidden border border-slate-200 shadow-inner z-10 relative">
                        <MapContainer
                          center={[Number(latitude), Number(longitude)]}
                          zoom={13}
                          style={{ height: '100%', width: '100%' }}
                          zoomControl={false}
                        >
                          <TileLayer
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                          />
                          <Marker position={[Number(latitude), Number(longitude)]} />
                          <RecenterMap center={[Number(latitude), Number(longitude)]} />
                        </MapContainer>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end pt-3">
                  <Button type="submit" loading={editLoading} className="!py-2.5 !px-6 bg-brand-600 border-none text-white hover:bg-brand-500">
                    Save Changes
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

          {activeTab === 'security' && (
            <motion.div
              key="security"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="rounded-2xl border border-white/60 bg-white/70 backdrop-blur-xl p-6 shadow-soft space-y-6"
            >
              <div className="border-b border-slate-100 pb-3">
                <h3 className="font-bold text-slate-900 text-lg">Account Security</h3>
                <p className="text-slate-400 text-xs mt-0.5">Update passwords and secure credentials verification.</p>
              </div>

              <div className="flex flex-col md:flex-row items-center gap-5 p-5 rounded-2xl bg-rose-50/20 border border-rose-100/50">
                <div className="w-12 h-12 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600 flex-shrink-0">
                  <Key className="w-6 h-6" />
                </div>
                <div className="flex-1 space-y-1 text-center md:text-left">
                  <h4 className="font-bold text-slate-900 text-sm">Change Password</h4>
                  <p className="text-slate-500 text-xs leading-relaxed max-w-xl">
                    Update your account password. Ensure it meets the security requirements.
                  </p>
                </div>
                <Button
                  onClick={() => setChangePasswordOpen(true)}
                  className="w-full md:w-auto !py-2.5 bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 border-none text-white text-xs font-bold shadow-md shadow-rose-600/10 whitespace-nowrap"
                >
                  Change Password
                </Button>
              </div>
            </motion.div>
          )}

          {activeTab === 'settings' && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="rounded-2xl border border-white/60 bg-white/70 backdrop-blur-xl p-6 shadow-soft space-y-6"
            >
              <div className="border-b border-slate-100 pb-3">
                <h3 className="font-bold text-slate-900 text-lg">Account Settings</h3>
                <p className="text-slate-400 text-xs mt-0.5">Overview of credentials and administrative features.</p>
              </div>

              {/* ACCOUNT INFO SUMMARY LIST */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-xl border border-slate-100 bg-slate-50 flex items-center gap-3">
                  <Mail className="w-5 h-5 text-slate-400" />
                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-400 block mb-0.5">Primary Email</span>
                    <span className="font-bold text-slate-800">{user?.email}</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-slate-100 bg-slate-50 flex items-center gap-3">
                  <Phone className="w-5 h-5 text-slate-400" />
                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-400 block mb-0.5">Primary Contact</span>
                    <span className="font-bold text-slate-800">{user?.phoneNumber}</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-slate-100 bg-slate-50 flex items-center gap-3">
                  <Shield className="w-5 h-5 text-slate-400" />
                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-400 block mb-0.5">System Role</span>
                    <span className="font-bold text-slate-800 uppercase tracking-wide">{user?.role}</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-slate-100 bg-slate-50 flex items-center gap-3">
                  <Clock className="w-5 h-5 text-slate-400" />
                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-400 block mb-0.5">Join Date</span>
                    <span className="font-bold text-slate-800">{new Date(user?.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              {/* DANGEROUS SECTION */}
              <div className="border-t border-slate-100 pt-6 space-y-4">
                <div className="space-y-1">
                  <h4 className="font-bold text-slate-900 text-sm">Danger Zone</h4>
                  <p className="text-slate-400 text-xs">Settings related to restriction or removal of the account.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* DEACTIVATE OPTION */}
                  <div className="p-4 rounded-xl border border-slate-200/80 bg-slate-50 flex flex-col justify-between gap-3">
                    <div>
                      <h5 className="font-bold text-slate-800 text-xs">Deactivate Account</h5>
                      <p className="text-slate-400 text-[11px] leading-relaxed mt-1">
                        Temporarily restrict access. Your public records and notifications will be blocked until an administrator re-activates your status.
                      </p>
                    </div>
                    <div>
                      <button
                        type="button"
                        onClick={() => setIsDeactivating(true)}
                        className="text-xs font-bold text-red-600 hover:text-red-500 py-1.5 px-3 rounded-lg border border-red-200 hover:border-red-300 hover:bg-red-50/50 bg-white"
                      >
                        Deactivate Account
                      </button>
                    </div>
                  </div>

                  {/* DELETE OPTION */}
                  <div className="p-4 rounded-xl border border-red-200/80 bg-red-50/10 flex flex-col justify-between gap-3">
                    <div>
                      <h5 className="font-bold text-red-950 text-xs">Delete Account Permanently</h5>
                      <p className="text-slate-400 text-[11px] leading-relaxed mt-1">
                        Permanently remove your account, settings, and donor files. This action is irreversible. All data is deleted instantly.
                      </p>
                    </div>
                    <div>
                      <button
                        type="button"
                        onClick={() => setIsDeleting(true)}
                        className="text-xs font-bold text-white bg-red-600 hover:bg-red-500 py-1.5 px-3 rounded-lg border border-none shadow-md shadow-red-600/10"
                      >
                        Delete Permanently
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* WIZARD MODALS */}
      <ChangePasswordModal
        isOpen={changePasswordOpen}
        onClose={() => setChangePasswordOpen(false)}
        onCompleted={() => setChangePasswordOpen(false)}
      />

      {/* CONFIRMATION DIALOGS */}
      <ConfirmModal
        isOpen={isDeactivating}
        title="Deactivate Account"
        description="Are you absolutely sure you want to deactivate your LifeLink account? You will be logged out and your profile status will be locked until re-activated by an administrator."
        confirmText="Yes, Deactivate"
        isDanger={true}
        loading={deactivateLoading}
        onConfirm={handleDeactivate}
        onCancel={() => setIsDeactivating(false)}
      />

      <ConfirmModal
        isOpen={isDeleting}
        title="Permanently Delete Account"
        description="Are you sure you want to delete your LifeLink account? This will permanently erase your profile, requests, and donor record. This operation cannot be undone."
        confirmText="Yes, Delete Permanently"
        isDanger={true}
        loading={deleteLoading}
        onConfirm={handleDelete}
        onCancel={() => setIsDeleting(false)}
      />
    </motion.div>
  );
};

export default ProfilePage;
