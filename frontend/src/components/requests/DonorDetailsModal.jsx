import { motion, AnimatePresence } from 'framer-motion';
import { X, Droplets, MapPin, Phone, Mail, Calendar, Heart, Award, Zap, ShieldCheck, Compass } from 'lucide-react';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { getDonorStats } from '../../utils/donorStats';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

const DonorDetailsModal = ({ donor, open, onClose }) => {
  if (!donor) return null;

  const stats = getDonorStats(donor._id);
  const isAvailable = donor.availability;

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm pointer-events-auto"
          />

          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative pointer-events-auto w-full max-w-lg rounded-3xl border border-white/60 bg-white/85 backdrop-blur-2xl shadow-2xl p-6 md:p-8 overflow-hidden z-50"
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute right-4 top-4 p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100/80 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Main Header / Profile info */}
            <div className="flex flex-col items-center text-center pb-6 border-b border-slate-100">
              <div className="relative mb-4">
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-rose-500 to-red-600 flex items-center justify-center text-white font-extrabold text-3xl shadow-lg shadow-rose-500/20">
                  {donor.name?.charAt(0)?.toUpperCase()}
                </div>
                {stats.isVerified && (
                  <span className="absolute -bottom-1 -right-1 bg-emerald-500 text-white p-1 rounded-xl shadow-md border border-white">
                    <ShieldCheck className="w-4 h-4" />
                  </span>
                )}
              </div>

              <h3 className="text-xl font-bold text-slate-900">{donor.name}</h3>
              <p className="text-sm text-slate-500 flex items-center gap-1 mt-1 font-medium">
                <MapPin className="w-4 h-4 text-slate-400" />
                {donor.city || 'City not set'}
              </p>

              {/* Status Badges Row */}
              <div className="flex flex-wrap gap-1.5 justify-center mt-4">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${
                    isAvailable
                      ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                      : 'bg-slate-100 border border-slate-200 text-slate-500'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${isAvailable ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                  {isAvailable ? 'Available Now' : 'Unavailable'}
                </span>
                
                {stats.isVerified && (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-50 border border-blue-200 text-blue-700 flex items-center gap-1">
                    <Award className="w-3.5 h-3.5 text-blue-500" />
                    Verified Donor
                  </span>
                )}

                {stats.isEmergencyReady && (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-50 border border-amber-200 text-amber-700 flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                    Emergency Ready
                  </span>
                )}
              </div>
            </div>

            {/* Clinical Metrics Cards */}
            <div className="grid grid-cols-3 gap-3 my-6">
              <div className="bg-rose-50/50 rounded-2xl p-3 border border-rose-100/50 text-center">
                <div className="mx-auto w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center mb-1 text-rose-600">
                  <Droplets className="w-5 h-5 fill-rose-600" />
                </div>
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Blood Type</p>
                <p className="text-rose-600 font-extrabold text-lg mt-0.5">{donor.bloodGroup}</p>
              </div>

              <div className="bg-slate-50/70 rounded-2xl p-3 border border-slate-100 text-center">
                <div className="mx-auto w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center mb-1 text-slate-600">
                  <Heart className="w-5 h-5 fill-slate-600" />
                </div>
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Donations</p>
                <p className="text-slate-800 font-extrabold text-lg mt-0.5">{stats.donations}</p>
              </div>

              <div className="bg-slate-50/70 rounded-2xl p-3 border border-slate-100 text-center">
                <div className="mx-auto w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center mb-1 text-slate-600">
                  <Calendar className="w-5 h-5" />
                </div>
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Last Donated</p>
                <p className="text-slate-800 font-bold text-xs mt-2 overflow-hidden text-ellipsis whitespace-nowrap">
                  {stats.lastDonationDate ? new Date(stats.lastDonationDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'Never'}
                </p>
              </div>
            </div>

            {/* Details List */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Clinical Profile</h4>
              
              <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-4 space-y-3 text-sm">
                <div className="flex justify-between items-center py-0.5">
                  <span className="text-slate-500 font-medium">Member Since</span>
                  <span className="text-slate-800 font-semibold">{stats.memberSince}</span>
                </div>

                <div className="flex justify-between items-center py-0.5">
                  <span className="text-slate-500 font-medium">Donor Status</span>
                  <span className={`px-2 py-0.5 rounded-lg text-xs font-bold ${isAvailable ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
                    {isAvailable ? 'Active & Healthy' : 'Resting'}
                  </span>
                </div>

                <div className="flex justify-between items-center py-0.5">
                  <span className="text-slate-500 font-medium">Emergency Eligibility</span>
                  <span className="text-slate-800 font-semibold">{stats.isEmergencyReady ? 'High Priority Responder' : 'Standard Responder'}</span>
                </div>
              </div>

              {/* Contact Information */}
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 pt-2">Contact Details</h4>
              <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-4 space-y-3.5 text-sm">
                {donor.phoneNumber ? (
                  <a
                    href={`tel:${donor.phoneNumber}`}
                    className="flex items-center gap-3 text-slate-700 hover:text-brand-600 transition-colors py-0.5 group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-brand-50 group-hover:text-brand-600 transition-colors">
                      <Phone className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Phone Number</p>
                      <p className="font-semibold">{donor.phoneNumber}</p>
                    </div>
                  </a>
                ) : (
                  <div className="flex items-center gap-3 text-slate-400 py-0.5">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                      <Phone className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Phone Number</p>
                      <p className="italic font-medium">Unavailable (Donor is offline)</p>
                    </div>
                  </div>
                )}

                {donor.email ? (
                  <a
                    href={`mailto:${donor.email}`}
                    className="flex items-center gap-3 text-slate-700 hover:text-brand-600 transition-colors py-0.5 group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-brand-50 group-hover:text-brand-600 transition-colors">
                      <Mail className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Email Address</p>
                      <p className="font-semibold">{donor.email}</p>
                    </div>
                  </a>
                ) : (
                  <div className="flex items-center gap-3 text-slate-400 py-0.5">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                      <Mail className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Email Address</p>
                      <p className="italic font-medium">Hidden by permissions</p>
                    </div>
                  </div>
                )}
              </div>

              {donor.location?.latitude && donor.location?.longitude && (
                <div className="space-y-2 pt-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Compass className="w-4 h-4 text-rose-500 animate-pulse" /> Geographic Map Location
                  </h4>
                  <div className="w-full h-40 rounded-2xl overflow-hidden border border-slate-100 shadow-inner z-10 relative">
                    <MapContainer
                      center={[donor.location.latitude, donor.location.longitude]}
                      zoom={13}
                      style={{ height: '100%', width: '100%' }}
                      zoomControl={false}
                    >
                      <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      />
                      <Marker position={[donor.location.latitude, donor.location.longitude]} />
                    </MapContainer>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default DonorDetailsModal;
