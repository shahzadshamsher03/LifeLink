import { motion, AnimatePresence } from 'framer-motion';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
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
import {
  X,
  User,
  Heart,
  Calendar,
  MapPin,
  Clock,
  Phone,
  Mail,
  AlertTriangle,
  Building2,
  FileText,
  Activity,
  CheckCircle,
  Hash,
  Droplets,
  Compass
} from 'lucide-react';

const EMERGENCY_LEVELS = {
  low: { label: 'Low', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  medium: { label: 'Medium', color: 'bg-amber-100 text-amber-800 border-amber-200' },
  high: { label: 'High', color: 'bg-orange-100 text-orange-800 border-orange-200' },
  urgent: { label: 'Critical / Urgent', color: 'bg-rose-100 text-rose-800 border-rose-200 animate-pulse' },
};

const BroadcastDetailsModal = ({ request, open, onClose }) => {
  if (!request || !open) return null;

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getPostedTime = (dateString) => {
    if (!dateString) return '';
    const diffMs = new Date() - new Date(dateString);
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm pointer-events-auto"
          onClick={onClose}
        />

        {/* Modal Content */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative pointer-events-auto w-full max-w-2xl rounded-3xl border border-white/60 bg-white/95 backdrop-blur-xl shadow-2xl p-6 md:p-8 overflow-hidden"
        >
          {/* Header Close */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="flex items-center gap-4 pb-6 border-b border-slate-100">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-500 to-red-600 flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-rose-500/20">
              {request.bloodGroup}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-extrabold text-slate-900">
                  {request.patientName ? `${request.patientName}'s Request` : 'Emergency Request'}
                </h2>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                  request.status === 'closed'
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                    : 'bg-rose-100 text-rose-800 border-rose-200'
                }`}>
                  {request.status === 'closed' ? 'Resolved' : 'Active'}
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                  EMERGENCY_LEVELS[request.emergencyLevel]?.color || EMERGENCY_LEVELS.medium.color
                }`}>
                  {EMERGENCY_LEVELS[request.emergencyLevel]?.label || request.emergencyLevel}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> Posted {getPostedTime(request.createdAt)}
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-6 max-h-[60vh] overflow-y-auto pr-1">
            {/* Status Info */}
            {request.status === 'closed' && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-emerald-900 text-sm">This request has been resolved.</p>
                  <p className="text-xs text-emerald-700 mt-1">
                    Marked resolved on {formatDate(request.resolvedAt)}.
                  </p>
                </div>
              </div>
            )}

            {/* Request Details Grid */}
            <div>
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-3">
                <Activity className="w-4 h-4 text-rose-500" /> Request Details
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm">
                <div className="flex justify-between sm:col-span-2 pb-2 border-b border-slate-100">
                  <span className="text-slate-400">Patient Name</span>
                  <span className="text-slate-800 font-semibold">{request.patientName || 'Not specified'}</span>
                </div>
                <div className="flex justify-between pb-2 border-b border-slate-100 sm:border-none">
                  <span className="text-slate-400 flex items-center gap-1"><Droplets className="w-3.5 h-3.5 text-rose-500" /> Blood Group</span>
                  <span className="text-rose-600 font-extrabold">{request.bloodGroup}</span>
                </div>
                <div className="flex justify-between pb-2 border-b border-slate-100 sm:border-none">
                  <span className="text-slate-400 flex items-center gap-1"><Hash className="w-3.5 h-3.5 text-slate-400" /> Units Required</span>
                  <span className="text-slate-800 font-bold">{request.unitsRequired || 1} unit(s)</span>
                </div>
                <div className="flex justify-between pb-2 border-b border-slate-100 sm:pb-0">
                  <span className="text-slate-400 flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-slate-400" /> Needed Before</span>
                  <span className="text-slate-800 font-semibold">{formatDate(request.requiredBefore)}</span>
                </div>
                <div className="flex justify-between pb-2 border-b border-slate-100 sm:border-none sm:pb-0">
                  <span className="text-slate-400 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5 text-slate-400" /> Urgency</span>
                  <span className="text-slate-800 font-semibold capitalize">{request.emergencyLevel || 'Medium'}</span>
                </div>
              </div>
            </div>

            {/* Location */}
            <div>
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-3">
                <MapPin className="w-4 h-4 text-rose-500" /> Location Details
              </h3>
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm space-y-2.5">
                <div className="flex justify-between">
                  <span className="text-slate-400">City</span>
                  <span className="text-slate-800 font-semibold">{request.city}</span>
                </div>
                {request.location && (
                  <div className="flex flex-col gap-1 border-t border-slate-100 pt-2.5">
                    <span className="text-slate-400">Hospital / Detailed Address</span>
                    <span className="text-slate-700 font-medium">{request.location}</span>
                  </div>
                )}
              </div>
              {request.locationCoords?.latitude && request.locationCoords?.longitude && (
                <div className="mt-3 space-y-2">
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mb-2">
                    <Compass className="w-4 h-4 text-rose-500" /> Geographic Map Location
                  </h4>
                  <div className="w-full h-40 rounded-xl overflow-hidden border border-slate-200 shadow-inner z-10 relative">
                    <MapContainer
                      center={[request.locationCoords.latitude, request.locationCoords.longitude]}
                      zoom={13}
                      style={{ height: '100%', width: '100%' }}
                      zoomControl={false}
                    >
                      <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      />
                      <Marker position={[request.locationCoords.latitude, request.locationCoords.longitude]} />
                    </MapContainer>
                  </div>
                </div>
              )}
            </div>

            {/* Requester Profile */}
            <div>
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-3">
                <Building2 className="w-4 h-4 text-violet-500" /> Posted By
              </h3>
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm space-y-3">
                <div className="flex justify-between">
                  <span className="text-slate-400">Name</span>
                  <span className="text-slate-800 font-semibold">
                    {request.hospitalName || request.requester?.hospitalName || request.requester?.name || 'Anonymous'}
                  </span>
                </div>
                <div className="flex justify-between border-t border-slate-100 pt-2.5">
                  <span className="text-slate-400">Account Role</span>
                  <span className="text-slate-700 capitalize font-medium">{request.requester?.role || 'User'}</span>
                </div>
              </div>
            </div>

            {/* Description / Medical Case */}
            <div>
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-3">
                <FileText className="w-4 h-4 text-amber-500" /> Medical Reason & Details
              </h3>
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm space-y-3">
                <div className="flex justify-between">
                  <span className="text-slate-400">Primary Reason</span>
                  <span className="px-2.5 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg font-semibold text-xs">
                    {request.reason || 'Custom Message'}
                  </span>
                </div>
                {request.message && (
                  <div className="border-t border-slate-100 pt-2.5 flex flex-col gap-1">
                    <span className="text-slate-400">Custom Message</span>
                    <p className="text-slate-700 bg-white border border-slate-100 rounded-xl p-3 leading-relaxed">
                      {request.message}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Contact details */}
            {request.allowContact && (
              <div>
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-3">
                  <Phone className="w-4 h-4 text-emerald-500" /> Contact Details
                </h3>
                <div className="bg-emerald-50/20 border border-emerald-100/50 rounded-2xl p-4 text-sm space-y-3">
                  {request.requester?.phoneNumber && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 flex items-center gap-1"><Phone className="w-3.5 h-3.5 text-emerald-600" /> Phone</span>
                      <a href={`tel:${request.requester.phoneNumber}`} className="text-emerald-700 font-bold hover:underline">
                        {request.requester.phoneNumber}
                      </a>
                    </div>
                  )}
                  {request.requester?.email && (
                    <div className="flex items-center justify-between border-t border-slate-100 pt-2.5">
                      <span className="text-slate-500 flex items-center gap-1"><Mail className="w-3.5 h-3.5 text-emerald-600" /> Email</span>
                      <a href={`mailto:${request.requester.email}`} className="text-emerald-700 font-bold hover:underline break-all">
                        {request.requester.email}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default BroadcastDetailsModal;
