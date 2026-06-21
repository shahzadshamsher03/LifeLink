import { motion } from 'framer-motion';
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
  Clock,
  MapPin,
  Info,
  ChevronRight,
} from 'lucide-react';
import StatusBadge from './StatusBadge';
import Button from '../ui/Button';

const RequestCard = ({
  request,
  view = 'sent',
  index = 0,
  onAccept,
  onReject,
  onComplete,
  onViewDetails, // Callback to open details modal at the page level
  actionLoadingId,
}) => {
  const isReceived = view === 'received';
  const person = isReceived ? request.requester : request.donor;

  const isPending = request.status === 'pending';
  const isAccepted = request.status === 'accepted';
  const isCompleted = request.completed === true;

  const loading = actionLoadingId === request._id;

  // Relative Time Helper
  const getPostedTime = (dateString) => {
    if (!dateString) return '';
    const diffMs = new Date() - new Date(dateString);
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays} days ago`;
  };

  // Determine avatar background / styling
  const isHospital = person?.role === 'hospital' || !!person?.hospitalName;
  const avatarBg = isHospital
    ? 'bg-gradient-to-br from-teal-500 to-emerald-600 shadow-teal-500/20'
    : 'bg-gradient-to-br from-violet-500 to-indigo-600 shadow-violet-500/20';

  // Permitted contact logic
  const isContactAllowed = request.allowContact !== false;

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className={`rounded-2xl border border-white/60 bg-white/80 backdrop-blur-xl p-5 shadow-soft hover:shadow-md transition-all duration-300 relative flex flex-col justify-between h-full border-l-4 ${
        request.emergency ? 'border-l-rose-500' : 'border-l-brand-500'
      }`}
    >
      <div className="space-y-4">
        {/* HEADER SECTION */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* Avatar Placeholder */}
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-extrabold shadow-md ${avatarBg}`}
            >
              {isHospital ? (
                <Building2 className="w-5 h-5" />
              ) : (
                person?.name?.charAt(0)?.toUpperCase() || <User className="w-5 h-5" />
              )}
            </div>

            <div>
              <h3 className="font-bold text-slate-900 leading-tight truncate max-w-[150px] sm:max-w-none">
                {person?.hospitalName || person?.name || 'Anonymous'}
              </h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                  {isReceived ? person?.role || 'User' : 'Donor'}
                </span>
                <span className="text-slate-300 text-xs">•</span>
                <span className="text-xs text-slate-500 font-medium flex items-center gap-0.5">
                  <MapPin className="w-3 h-3 text-slate-400" />
                  {person?.city || request.city || 'N/A'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1.5">
            <StatusBadge status={request.status} />
            {isCompleted && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-800 text-[9px] font-bold uppercase border border-emerald-200">
                <CheckCircle2 className="w-2.5 h-2.5" />
                Completed
              </span>
            )}
          </div>
        </div>

        {/* BLOOD REQUEST METRICS */}
        <div className="grid grid-cols-2 gap-2 bg-slate-50/80 rounded-xl p-3 border border-slate-100 text-xs">
          <div className="flex flex-col gap-0.5">
            <span className="text-slate-400 font-medium uppercase tracking-wider text-[9px]">Blood Group Needed</span>
            <span className="text-rose-700 font-extrabold text-sm flex items-center gap-1">
              <Droplets className="w-4 h-4 fill-rose-500 text-rose-500 animate-pulse" />
              {request.bloodGroup}
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-slate-400 font-medium uppercase tracking-wider text-[9px]">Units Required</span>
            <span className="text-slate-800 font-extrabold text-sm">
              {request.unitsRequired || 1} Unit(s)
            </span>
          </div>

          <div className="flex flex-col gap-0.5 mt-1 col-span-2 border-t border-slate-100 pt-2">
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-0.5">
                <span className="text-slate-400 font-medium uppercase tracking-wider text-[9px]">Request Type</span>
                <span className="text-slate-700 font-semibold text-[11px] truncate max-w-[140px] sm:max-w-none">
                  {request.requestType === 'broadcast' ? 'Emergency Broadcast Response' : 'Direct Request'}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 items-center justify-end">
                {request.emergency && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-rose-100 text-rose-800 text-[9px] font-extrabold uppercase border border-rose-200 animate-pulse">
                    <AlertTriangle className="w-2.5 h-2.5" />
                    Emergency
                  </span>
                )}
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[9px] font-extrabold uppercase transition-all duration-300 ${
                    request.priorityLevel === 'Critical'
                      ? 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100'
                      : request.priorityLevel === 'High'
                      ? 'bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100'
                      : request.priorityLevel === 'Medium'
                      ? 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                  }`}
                >
                  <span>
                    {request.priorityLevel === 'Critical'
                      ? '🔴'
                      : request.priorityLevel === 'High'
                      ? '🟠'
                      : request.priorityLevel === 'Medium'
                      ? '🟡'
                      : '🟢'}
                  </span>
                  <span>
                    {request.priorityLevel || 'Low'}
                  </span>
                </span>
              </div>
            </div>
          </div>
        </div>


        {/* TIME STAMP */}
        <div className="flex items-center gap-3 text-xs text-slate-400 font-medium">
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            {getPostedTime(request.createdAt)}
          </span>
          <span className="text-slate-300">•</span>
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            {new Date(request.createdAt).toLocaleDateString()}
          </span>
        </div>

        {/* CUSTOM REQUEST MESSAGE */}
        {request.message && (
          <div className="text-xs text-slate-600 bg-rose-50/20 border border-rose-100/50 rounded-xl p-3 leading-relaxed relative">
            <span className="absolute -top-2 left-3 px-1 text-[9px] font-bold uppercase tracking-wider text-rose-600/70 bg-white border border-rose-100/80 rounded-md">
              Requester Message
            </span>
            <p className="italic mt-1 line-clamp-2">"{request.message}"</p>
          </div>
        )}

        {/* CONTACT INFORMATION (IF RECEIVED & PERMITTED) */}
        {isReceived && isContactAllowed && (
          <div className="pt-2 border-t border-slate-100 flex flex-col gap-1.5 text-xs text-slate-500">
            {person?.email && (
              <span className="inline-flex items-center gap-1.5 truncate">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                {person.email}
              </span>
            )}
            {person?.phoneNumber && (
              <span className="inline-flex items-center gap-1.5 text-emerald-700 font-semibold truncate">
                <Phone className="w-3.5 h-3.5" />
                {person.phoneNumber}
              </span>
            )}
          </div>
        )}

        {/* SENDER VIEW CONTACT DETAILS */}
        {!isReceived && person && (
          <div className="pt-2 border-t border-slate-100 flex flex-col gap-1.5 text-xs text-slate-500">
            {person.email && (
              <span className="inline-flex items-center gap-1.5 truncate">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                {person.email}
              </span>
            )}
            {person.phoneNumber && isAccepted && (
              <span className="inline-flex items-center gap-1.5 text-emerald-700 font-semibold truncate">
                <Phone className="w-3.5 h-3.5" />
                {person.phoneNumber}
              </span>
            )}
          </div>
        )}
      </div>

      {/* FOOTER ACTIONS */}
      <div className="mt-5 space-y-2">
        <button
          type="button"
          onClick={() => onViewDetails(request)}
          className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 text-xs font-bold rounded-xl transition-all border border-slate-200/50"
        >
          <Info className="w-4 h-4" />
          View Details
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        </button>

        {isReceived && isPending && (
          <div className="flex gap-2">
            <Button
              className="flex-1 !py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 border-none shadow-emerald-600/10 text-xs font-bold"
              loading={loading}
              onClick={() => onAccept(request._id)}
            >
              <Check className="w-4 h-4" />
              Accept
            </Button>

            <Button
              variant="secondary"
              className="flex-1 !py-2.5 !text-red-600 hover:!bg-red-50 border-red-200 hover:border-red-300 text-xs font-bold"
              disabled={loading}
              onClick={() => onReject(request._id)}
            >
              <X className="w-4 h-4" />
              Reject
            </Button>
          </div>
        )}

        {isReceived && isAccepted && !isCompleted && (
          <Button
            className="w-full !py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold text-xs rounded-xl shadow-md border-none"
            loading={loading}
            onClick={() => onComplete(request._id)}
          >
            <CheckCircle2 className="w-4 h-4" />
            Mark as Completed
          </Button>
        )}
      </div>
    </motion.article>
  );
};

export default RequestCard;