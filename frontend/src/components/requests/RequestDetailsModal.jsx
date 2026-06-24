import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Building2,
  Droplets,
  Mail,
  Phone,
  User,
  Check,
  X,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  MapPin,
  Activity,
  Info,
  Compass
} from 'lucide-react';
import Button from '../ui/Button';

const RequestDetailsModal = ({
  request,
  isOpen,
  onClose,
  onAccept,
  onReject,
  onComplete,
  loading = false,
}) => {
  // Close modal on Escape key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!request) return null;

  const person = request.requester;
  const isHospital = person?.role === 'hospital' || !!person?.hospitalName;
  const isReceived = true; // Modal is only viewed from Received view by donor
  const isPending = request.status === 'pending';
  const isAccepted = request.status === 'accepted';
  const isCompleted = request.completed === true;
  const isContactAllowed = request.allowContact !== false;

  const avatarBg = isHospital
    ? 'bg-gradient-to-br from-teal-500 to-emerald-600 shadow-teal-500/20'
    : 'bg-gradient-to-br from-violet-500 to-indigo-600 shadow-violet-500/20';

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] overflow-y-auto flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm pointer-events-auto"
            onClick={onClose}
          />

          {/* Modal Body */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            className="relative pointer-events-auto w-full max-w-lg rounded-2xl border border-slate-100 bg-white shadow-2xl p-6 overflow-hidden flex flex-col gap-5 max-h-[90vh] z-50"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Activity className="w-5 h-5 text-rose-500 animate-pulse" />
                Detailed Request Information
              </h3>
              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Scrollable Container */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-sm text-slate-600">
              
              {/* Requester Profile Card */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-3">
                <div className="flex items-center gap-3">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white font-black text-lg shadow-md ${avatarBg}`}>
                    {isHospital ? (
                      <Building2 className="w-6 h-6" />
                    ) : (
                      person?.name?.charAt(0)?.toUpperCase() || <User className="w-6 h-6" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-extrabold text-slate-900 text-base">
                      {person?.hospitalName || person?.name || 'Anonymous Requester'}
                    </h4>
                    <div className="flex items-center gap-2 flex-wrap mt-0.5">
                      <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-slate-200 text-slate-700 uppercase">
                        {person?.role || 'User'}
                      </span>
                      <span className="inline-flex items-center gap-0.5 text-xs text-slate-500 font-medium">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        {person?.city || request.city || 'Not Specified'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Requester contact information (Check permissions) */}
                {isContactAllowed ? (
                  <div className="pt-3 border-t border-slate-200/60 grid grid-cols-1 gap-2 text-xs">
                    {person?.email && (
                      <div className="flex items-center gap-2 text-slate-600">
                        <Mail className="w-4 h-4 text-slate-400" />
                        <div>
                          <span className="text-[9px] uppercase font-bold text-slate-400 block">Email Address</span>
                          <span className="font-semibold">{person.email}</span>
                        </div>
                      </div>
                    )}
                    {person?.phoneNumber && (
                      <div className="flex items-center gap-2 text-emerald-800">
                        <Phone className="w-4 h-4 text-emerald-500" />
                        <div>
                          <span className="text-[9px] uppercase font-bold text-slate-400 block">Phone Contact</span>
                          <span className="font-bold">{person.phoneNumber}</span>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="pt-3 border-t border-slate-200/60 text-xs text-slate-400 flex items-center gap-1.5 italic">
                    <Info className="w-4 h-4 text-slate-400" />
                    Requester contact info is hidden by privacy settings.
                  </div>
                )}
              </div>

              {/* Blood Request Details */}
              <div className="grid grid-cols-2 gap-3">
                <div className="border border-slate-100 bg-white rounded-xl p-3 flex flex-col">
                  <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wide mb-1">Blood Group Needed</span>
                  <span className="text-rose-700 font-black text-lg flex items-center gap-1">
                    <Droplets className="w-5 h-5 fill-rose-500 text-rose-500" />
                    {request.bloodGroup}
                  </span>
                </div>

                <div className="border border-slate-100 bg-white rounded-xl p-3 flex flex-col">
                  <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wide mb-1">Units Needed</span>
                  <span className="text-slate-800 font-extrabold text-lg">
                    {request.unitsRequired || 1} Unit(s)
                  </span>
                </div>

                <div className="border border-slate-100 bg-white rounded-xl p-3 flex flex-col">
                  <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wide mb-1">Emergency Status</span>
                  <div>
                    {request.emergency ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-rose-100 text-rose-800 text-[10px] font-extrabold uppercase border border-rose-200">
                        <AlertTriangle className="w-3 h-3 text-rose-600 animate-pulse" />
                        Urgent / Critical
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-700 text-[10px] font-semibold border border-slate-200">
                        Standard Status
                      </span>
                    )}
                  </div>
                </div>

                <div className="border border-slate-100 bg-white rounded-xl p-3 flex flex-col">
                  <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wide mb-1">Request Type</span>
                  <span className="text-slate-800 font-bold text-xs uppercase tracking-wider">
                    {request.requestType || 'direct'}
                  </span>
                </div>
              </div>

              {/* Additional Hospital Details */}
              {isHospital && (
                <div className="bg-emerald-50/20 border border-emerald-100 rounded-xl p-4 space-y-2">
                  <span className="text-[9px] uppercase font-bold text-emerald-800 tracking-wide block">Hospital Facility Details</span>
                  <div className="space-y-1.5 text-xs text-slate-700">
                    <div className="font-extrabold text-slate-900">{person?.hospitalName || request.hospitalName}</div>
                    {request.location && (
                      <div className="flex items-start gap-1 font-medium text-slate-500">
                        <MapPin className="w-3.5 h-3.5 text-rose-500 mt-0.5 flex-shrink-0" />
                        <span>{request.location}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {/* Patient & Case Details */}
              {(request.patientName || request.reason || request.location || request.requiredBefore) && (
                <div className="bg-rose-50/10 border border-rose-100/60 rounded-xl p-4 space-y-3">
                  <span className="text-[9px] uppercase font-bold text-rose-800 tracking-wide block">Patient & Case Details</span>
                  <div className="grid grid-cols-1 gap-2.5 text-xs">
                    {request.patientName && (
                      <div className="flex items-center justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500 font-medium">Patient Name</span>
                        <span className="font-extrabold text-slate-900">{request.patientName}</span>
                      </div>
                    )}
                    {request.reason && (
                      <div className="flex items-center justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500 font-medium">Case / Reason</span>
                        <span className="px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-100 rounded-md font-bold text-[9px] uppercase tracking-wide">
                          {request.reason}
                        </span>
                      </div>
                    )}
                    {request.requiredBefore && (
                      <div className="flex items-center justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500 font-medium">Required Before</span>
                        <span className="font-bold text-rose-600">
                          {new Date(request.requiredBefore).toLocaleString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    )}
                    {request.location && (
                      <div className="flex flex-col gap-1 pt-1">
                        <span className="text-slate-500 font-medium">Hospital / Location Address</span>
                        <span className="font-semibold text-slate-800 bg-white/50 p-2 rounded-lg border border-slate-100">{request.location}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {request.locationCoords?.latitude && request.locationCoords?.longitude && (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mb-2">
                    <Compass className="w-4 h-4 text-rose-500" /> Geographic Map Location
                  </h3>
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

              {/* Time Details Section */}

              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 text-xs grid grid-cols-2 gap-2 text-slate-500 font-medium">
                <div>
                  <span className="text-[9px] uppercase font-bold text-slate-400 block mb-0.5">Request Placed</span>
                  <span>{new Date(request.createdAt).toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-[9px] uppercase font-bold text-slate-400 block mb-0.5">Last Updated</span>
                  <span>{new Date(request.updatedAt).toLocaleString()}</span>
                </div>
              </div>

              {/* Request Message */}
              {request.message && (
                <div className="space-y-1">
                  <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wide block">Message Details</span>
                  <p className="bg-slate-50 p-4 border border-slate-200 rounded-xl italic leading-relaxed text-slate-700">
                    "{request.message}"
                  </p>
                </div>
              )}
            </div>

            {/* Modal Actions Footer */}
            <div className="pt-3 border-t border-slate-100 flex flex-wrap gap-2 justify-end">
              <Button
                variant="secondary"
                onClick={onClose}
                className="!py-2 text-xs"
              >
                Close Window
              </Button>

              {isReceived && isPending && (
                <>
                  <Button
                    variant="secondary"
                    className="!py-2 !text-red-600 hover:!bg-red-50 border-red-200 hover:border-red-300 text-xs font-bold"
                    disabled={loading}
                    onClick={() => {
                      onReject(request._id);
                      onClose();
                    }}
                  >
                    Reject
                  </Button>
                  <Button
                    className="!py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 border-none shadow-emerald-600/10 text-xs font-bold text-white"
                    loading={loading}
                    onClick={() => {
                      onAccept(request._id);
                      onClose();
                    }}
                  >
                    Accept Request
                  </Button>
                </>
              )}

              {isReceived && isAccepted && !isCompleted && (
                <Button
                  className="!py-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold text-xs rounded-xl shadow-md border-none"
                  loading={loading}
                  onClick={() => {
                    onComplete(request._id);
                    onClose();
                  }}
                >
                  Mark as Completed
                </Button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default RequestDetailsModal;
