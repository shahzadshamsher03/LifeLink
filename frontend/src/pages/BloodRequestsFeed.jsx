import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Radio,
  Filter,
  Droplets,
  MapPin,
  AlertTriangle,
  Users,
  Plus,
  Send,
  Calendar,
  X,
  Phone,
  Mail,
  UserCheck,
  Search,
  CheckCircle,
  FileText,
  Clock,
  Hash,
  Eye,
  User,
  Building2,
  Trash2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import {
  getBroadcastRequests,
  volunteerForRequest,
  createRequest,
  respondToBroadcastRequest,
  closeBroadcastRequest,
} from '../services/requestService';
import { deleteAdminBroadcast } from '../services/adminService';
import { getErrorMessage } from '../services/api';
import { showError, showSuccess } from '../utils/toast';
import Button from '../components/ui/Button';
import Select from '../components/ui/Select';
import EmptyState from '../components/ui/EmptyState';
import { SkeletonCardList } from '../components/ui/Skeleton';
import { BLOOD_GROUPS } from '../utils/bloodGroups';
import BroadcastDetailsModal from '../components/requests/BroadcastDetailsModal';
import ConfirmModal from '../components/common/ConfirmModal';

const EMERGENCY_COLORS = {
  low: 'bg-blue-50 text-blue-700 border-blue-200',
  medium: 'bg-amber-50 text-amber-700 border-amber-200',
  high: 'bg-orange-50 text-orange-700 border-orange-200',
  urgent: 'bg-rose-50 text-rose-700 border-rose-200 border-l-4 border-l-rose-500 animate-pulse',
};

const PRIORITY_COLORS = {
  Critical: 'bg-red-50 text-red-700 border-red-200',
  High: 'bg-orange-50 text-orange-700 border-orange-200',
  Medium: 'bg-amber-50 text-amber-700 border-amber-200',
  Low: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

const PRIORITY_DOTS = {
  Critical: '🔴',
  High: '🟠',
  Medium: '🟡',
  Low: '🟢',
};

const REASONS = [
  'Surgery',
  'Accident',
  'Cancer Treatment',
  'Emergency Operation',
  'Custom Message'
];

const BloodRequestsFeed = () => {
  const { user } = useAuth();
  const { connected, subscribeToRequests } = useSocket();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Reusable confirmation modal states
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [broadcastToClose, setBroadcastToClose] = useState(null);
  const [closeLoading, setCloseLoading] = useState(false);

  // Admin delete states
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [broadcastToDelete, setBroadcastToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Details Modal State
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Filters
  const [filters, setFilters] = useState({
    bloodGroup: '',
    city: '',
    emergencyLevel: '',
  });

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [newRequest, setNewRequest] = useState({
    bloodGroup: '',
    city: '',
    emergencyLevel: 'medium',
    message: '',
    patientName: '',
    unitsRequired: 1,
    location: '',
    requiredBefore: '',
    reason: 'Custom Message',
    allowContact: true,
  });

  const isDonor = user?.role === 'donor';
  const isHospital = user?.role === 'hospital';
  const isAdmin = user?.role === 'admin';
  const canCreate = user?.role === 'user' || user?.role === 'hospital';

  // Fetch requests from backend
  const fetchRequests = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError('');

    try {
      const params = {};
      if (filters.bloodGroup) params.bloodGroup = filters.bloodGroup;
      if (filters.city.trim()) params.city = filters.city.trim();
      if (filters.emergencyLevel) params.emergencyLevel = filters.emergencyLevel;

      const { data } = await getBroadcastRequests(params);
      setRequests(data.requests || []);
    } catch (err) {
      setError(getErrorMessage(err));
      if (!silent) setRequests([]);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // Live updates via sockets
  useEffect(() => {
    const unsubscribe = subscribeToRequests((event) => {
      if (event.type === 'broadcast_request') {
        const matchesBloodGroup = !filters.bloodGroup || event.bloodGroup === filters.bloodGroup;
        const matchesCity = !filters.city || event.city.toLowerCase().includes(filters.city.toLowerCase().trim());
        const matchesEmergency = !filters.emergencyLevel || event.emergencyLevel === filters.emergencyLevel;

        if (matchesBloodGroup && matchesCity && matchesEmergency) {
          setRequests((prev) => {
            if (prev.some((r) => r._id === event.requestId)) return prev;

            const newBroadcastObj = {
              _id: event.requestId,
              bloodGroup: event.bloodGroup,
              city: event.city,
              message: event.message,
              emergencyLevel: event.emergencyLevel,
              createdAt: event.createdAt,
              requestType: 'broadcast',
              status: 'active',
              volunteers: [],
              requester: {
                _id: event.requesterId,
                name: event.requesterName,
                role: 'user',
              },
              patientName: event.patientName,
              unitsRequired: event.unitsRequired,
              location: event.location,
              requiredBefore: event.requiredBefore,
              reason: event.reason,
              allowContact: event.allowContact,
            };

            return [newBroadcastObj, ...prev];
          });
        }
      } else if (event.type === 'broadcast_resolved') {
        setRequests((prev) =>
          prev.map((r) =>
            r._id === event.requestId
              ? {
                  ...r,
                  status: 'closed',
                  resolvedAt: new Date().toISOString(),
                  resolverName: event.resolverName,
                }
              : r
          )
        );
      } else if (event.type === 'broadcast_deleted') {
        setRequests((prev) => prev.filter((r) => r._id !== event.requestId));
      }
    });

    return unsubscribe;
  }, [subscribeToRequests, filters]);

  // Volunteer logic
  const handleVolunteer = async (id) => {
    setActionLoadingId(id);
    try {
      const { data } = await volunteerForRequest(id);
      showSuccess(data.message);
      setRequests((prev) =>
        prev.map((r) => (r._id === id ? data.request : r))
      );
    } catch (err) {
      showError(getErrorMessage(err));
    } finally {
      setActionLoadingId(null);
    }
  };

  // Hospital response logic
  const handleHospitalRespond = async (id) => {
    setActionLoadingId(id);
    try {
      await respondToBroadcastRequest(id);
      showSuccess('Response sent to the requester successfully!');
    } catch (err) {
      showError(getErrorMessage(err));
    } finally {
      setActionLoadingId(null);
    }
  };

  // Close Broadcast Request
  const handleCloseClick = (request) => {
    setBroadcastToClose(request);
    setConfirmOpen(true);
  };

  const handleConfirmClose = async () => {
    if (!broadcastToClose) return;
    setCloseLoading(true);
    try {
      const { data } = await closeBroadcastRequest(broadcastToClose._id);
      showSuccess(data.message);
      setConfirmOpen(false);
      setBroadcastToClose(null);
      setRequests((prev) =>
        prev.map((r) => (r._id === data.request._id ? data.request : r))
      );
    } catch (err) {
      showError(getErrorMessage(err));
    } finally {
      setCloseLoading(false);
    }
  };

  const handleOpenDetails = (request) => {
    setSelectedRequest(request);
    setDetailsOpen(true);
  };

  const handleDeleteClick = (request) => {
    setBroadcastToDelete(request);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!broadcastToDelete) return;
    setDeleteLoading(true);
    try {
      await deleteAdminBroadcast(broadcastToDelete._id);
      showSuccess('Broadcast request deleted successfully');
      setDeleteConfirmOpen(false);
      setBroadcastToDelete(null);
      setRequests((prev) => prev.filter((r) => r._id !== broadcastToDelete._id));
    } catch (err) {
      showError(getErrorMessage(err));
    } finally {
      setDeleteLoading(false);
    }
  };

  // Submit Broadcast Request modal
  const handleCreateBroadcast = async (e) => {
    e.preventDefault();
    if (!newRequest.bloodGroup) {
      showError('Please select a blood group');
      return;
    }
    if (!newRequest.city.trim()) {
      showError('Please specify the city');
      return;
    }

    setModalLoading(true);
    try {
      await createRequest({
        requestType: 'broadcast',
        bloodGroup: newRequest.bloodGroup,
        city: newRequest.city.trim(),
        emergencyLevel: newRequest.emergencyLevel,
        message: newRequest.message,
        patientName: newRequest.patientName.trim(),
        unitsRequired: newRequest.unitsRequired,
        location: newRequest.location.trim(),
        requiredBefore: newRequest.requiredBefore,
        reason: newRequest.reason,
        allowContact: newRequest.allowContact,
        emergency: newRequest.emergencyLevel === 'urgent' || newRequest.emergencyLevel === 'high',
      });

      showSuccess('Broadcast request created successfully');
      setModalOpen(false);
      setNewRequest({
        bloodGroup: '',
        city: '',
        emergencyLevel: 'medium',
        message: '',
        patientName: '',
        unitsRequired: 1,
        location: '',
        requiredBefore: '',
        reason: 'Custom Message',
        allowContact: true,
      });
      fetchRequests();
    } catch (err) {
      showError(getErrorMessage(err));
    } finally {
      setModalLoading(false);
    }
  };

  const handleResetFilters = () => {
    setFilters({
      bloodGroup: '',
      city: '',
      emergencyLevel: '',
    });
  };

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

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 flex items-center gap-2.5">
              <Radio className="w-7 h-7 text-rose-600 animate-pulse" />
              Emergency Broadcast Feed
            </h1>
            {connected && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase ring-2 ring-emerald-50">
                Live
              </span>
            )}
          </div>
          <p className="text-slate-500 mt-1 text-sm">
            Real-time emergency blood requests visible to all matching users and hospitals.
          </p>
        </div>

        {canCreate && (
          <Button
            onClick={() => {
              if (user?.role === 'hospital' && !user?.isHospitalVerified) return;
              setModalOpen(true);
            }}
            disabled={user?.role === 'hospital' && !user?.isHospitalVerified}
            title={user?.role === 'hospital' && !user?.isHospitalVerified ? "Available after admin verification" : ""}
            className="self-start sm:self-center flex items-center gap-2 bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white shadow-lg shadow-rose-500/25 border-none disabled:opacity-50"
          >
            <Plus className="w-5 h-5" />
            Broadcast Request
          </Button>
        )}
      </div>

      {/* FILTER PANEL */}
      <div className="relative z-20 rounded-2xl border border-white/60 bg-white/70 backdrop-blur-xl p-5 shadow-soft space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <Filter className="w-4 h-4 text-brand-600" />
            Filters
          </div>
          {(filters.bloodGroup || filters.city || filters.emergencyLevel) && (
            <button
              onClick={handleResetFilters}
              className="text-xs text-rose-600 hover:text-rose-500 font-semibold"
            >
              Clear filters
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Blood Group</label>
            <Select
              icon={Droplets}
              value={filters.bloodGroup}
              onChange={(e) => setFilters((f) => ({ ...f, bloodGroup: e.target.value }))}
            >
              <option value="">All groups</option>
              {BLOOD_GROUPS.map((bg) => (
                <option key={bg} value={bg}>
                  {bg}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">City</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Any city"
                value={filters.city}
                onChange={(e) => setFilters((f) => ({ ...f, city: e.target.value }))}
                className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-200 bg-white/80 focus:outline-none focus:ring-4 focus:ring-brand-500/15"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Emergency Level</label>
            <Select
              icon={AlertTriangle}
              value={filters.emergencyLevel}
              onChange={(e) => setFilters((f) => ({ ...f, emergencyLevel: e.target.value }))}
            >
              <option value="">All levels</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent / Critical</option>
            </Select>
          </div>
        </div>
      </div>

      {/* FEED GRID */}
      {loading ? (
        <SkeletonCardList count={4} />
      ) : error ? (
        <div className="text-center py-16 rounded-2xl bg-red-50 border border-red-100">
          <p className="text-red-600 font-medium">{error}</p>
          <Button variant="secondary" className="mt-4" onClick={() => fetchRequests()}>
            Try again
          </Button>
        </div>
      ) : requests.length === 0 ? (
        <EmptyState
          icon={Radio}
          title="No active broadcast requests yet"
          description="Try modifying your filters or post a new request to notify the community."
        />
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {requests.map((request, index) => {
            const hasVolunteered = request.volunteers?.some(
              (v) => v.donorId === user?._id || v.donorId?._id === user?._id
            );
            const isRequester =
              request.requester?._id === user?._id || request.requester === user?._id;
            const isClosed = request.status === 'closed';

            return (
              <motion.article
                key={request._id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`rounded-3xl border border-white/60 bg-white/75 backdrop-blur-xl p-6 shadow-soft transition-all duration-300 relative overflow-hidden flex flex-col gap-4 border-l-4 ${
                  isClosed
                    ? 'border-l-emerald-500 bg-slate-50/50'
                    : request.emergencyLevel === 'urgent'
                    ? 'border-l-red-600 bg-rose-50/15'
                    : 'border-l-rose-500'
                }`}
              >
                {/* Top header row */}
                <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-slate-100/60">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-500 to-red-600 flex items-center justify-center text-white text-lg font-bold shadow-md shadow-rose-500/20">
                      {request.bloodGroup}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-extrabold text-slate-900 text-base">
                          {request.patientName ? `${request.patientName} needs blood` : 'Emergency blood required'}
                        </h3>
                        {isClosed ? (
                          <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-emerald-100 text-emerald-800 uppercase border border-emerald-200">
                            Resolved
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-rose-100 text-rose-800 uppercase border border-rose-200">
                            Active
                          </span>
                        )}
                        {isRequester && (
                          <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-slate-100 text-slate-600 uppercase border">
                            Your Request
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        Posted {getPostedTime(request.createdAt)}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                        EMERGENCY_COLORS[request.emergencyLevel] ||
                        EMERGENCY_COLORS.medium
                      }`}
                    >
                      <AlertTriangle className="w-3 h-3" />
                      {request.emergencyLevel}
                    </span>

                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-semibold">
                      <Hash className="w-3 h-3" />
                      {request.unitsRequired || 1} Unit(s)
                    </span>

                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                        PRIORITY_COLORS[request.priorityLevel || 'Low']
                      }`}
                    >
                      <span>{PRIORITY_DOTS[request.priorityLevel || 'Low']}</span>
                      <span>{request.priorityLevel || 'Low'}</span>
                    </span>
                  </div>
                </div>

                {/* Patient/Location stats grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 bg-slate-50/60 rounded-2xl p-4 text-xs border border-slate-100/50">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-slate-400 font-medium uppercase tracking-wider text-[9px]">Hospital Facility</span>
                    <span className="text-slate-700 font-bold">
                      {request.hospitalName || request.requester?.hospitalName || 'Not specified'}
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-slate-400 font-medium uppercase tracking-wider text-[9px]">Location Address</span>
                    <span className="text-slate-700 font-semibold flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-rose-500" />
                      {request.location || request.city}
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-slate-400 font-medium uppercase tracking-wider text-[9px]">Required Before</span>
                    <span className="text-rose-600 font-bold flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {request.requiredBefore ? new Date(request.requiredBefore).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                </div>

                {/* Reason & custom message */}
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-slate-400">Reason:</span>
                    <span className="px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg text-xs font-semibold">
                      {request.reason || 'Custom Message'}
                    </span>
                  </div>
                  {request.message && (
                    <p className="text-slate-600 bg-white/50 border border-slate-100/80 rounded-xl p-3 leading-relaxed">
                      {request.message}
                    </p>
                  )}
                </div>

                {/* Contact and action triggers */}
                <div className="mt-2 pt-4 border-t border-slate-100/60 flex flex-wrap items-center justify-between gap-3">
                  
                  {/* Creator Info */}
                  <div className="text-xs text-slate-500 flex flex-col gap-0.5">
                    <span>Posted by <span className="font-semibold text-slate-700">{request.requester?.name || 'Someone'}</span></span>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wide">{request.requester?.role || 'Hospital'}</span>
                  </div>

                  {/* Actions wrapper */}
                  <div className="flex flex-wrap items-center gap-2">
                    {/* View Details Modal button */}
                    <button
                      type="button"
                      onClick={() => handleOpenDetails(request)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors border border-slate-200/50"
                    >
                      <Eye className="w-4 h-4" />
                      View Details
                    </button>

                    {/* Admin delete button */}
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => handleDeleteClick(request)}
                        disabled={deleteLoading}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold rounded-xl transition-colors border border-red-200/50 disabled:opacity-50"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete Request
                      </button>
                    )}

                    {isClosed ? (
                      /* Resolved status notification display */
                      <div className="flex items-center gap-1.5 px-4 py-2 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl font-bold text-xs">
                        <CheckCircle className="w-4 h-4" />
                        This request has been resolved
                      </div>
                    ) : (
                      <>
                        {/* 1. Direct Donor volunteering */}
                        {isDonor && (
                          <>
                            {hasVolunteered ? (
                              <span className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-50 text-emerald-700 font-bold text-xs rounded-xl border border-emerald-200">
                                <UserCheck className="w-4 h-4" />
                                Volunteered
                              </span>
                            ) : (
                              <Button
                                onClick={() => handleVolunteer(request._id)}
                                loading={actionLoadingId === request._id}
                                className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl py-2 px-4 shadow-md shadow-rose-500/10 flex items-center gap-2 border-none"
                              >
                                <Droplets className="w-4 h-4" />
                                I Can Donate
                              </Button>
                            )}
                          </>
                        )}

                        {/* 2. Hospital response */}
                        {isHospital && (
                          <div className="flex items-center gap-2">
                            <Button
                              variant="secondary"
                              onClick={() => {
                                if (user?.role === 'hospital' && !user?.isHospitalVerified) return;
                                handleHospitalRespond(request._id);
                              }}
                              disabled={user?.role === 'hospital' && !user?.isHospitalVerified}
                              title={user?.role === 'hospital' && !user?.isHospitalVerified ? "Available after admin verification" : ""}
                              loading={actionLoadingId === request._id}
                              className="text-xs font-bold py-2 px-4 rounded-xl bg-brand-50 hover:bg-brand-100 text-brand-700 border border-brand-200 disabled:opacity-50"
                            >
                              Respond to Request
                            </Button>
                            {user?.role === 'hospital' && !user?.isHospitalVerified ? (
                              <span className="inline-flex items-center gap-1 text-slate-400 cursor-not-allowed font-semibold text-xs" title="Available after admin verification">
                                <Search className="w-4 h-4" /> Search Directory
                              </span>
                            ) : (
                              <Link to="/hospital-donors" className="inline-flex items-center gap-1 text-brand-600 hover:text-brand-500 font-bold text-xs transition-colors">
                                <Search className="w-4 h-4" /> Search Directory
                              </Link>
                            )}
                          </div>
                        )}

                        {/* 3. Creator close options */}
                        {isRequester && (
                          <button
                            type="button"
                            onClick={() => handleCloseClick(request)}
                            disabled={closeLoading}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-colors shadow-md shadow-emerald-600/10 border-none"
                          >
                            <CheckCircle className="w-4 h-4" />
                            Close Request
                          </button>
                        )}
                      </>
                    )}
                  </div>

                </div>
              </motion.article>
            );
          })}
        </div>
      )}

      {/* CREATE BROADCAST REQUEST MODAL */}
      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm pointer-events-auto"
              onClick={() => setModalOpen(false)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              className="relative pointer-events-auto w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl overflow-y-auto max-h-[90vh] border border-slate-100"
            >
              <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                  <Radio className="w-5 h-5 text-rose-500 animate-pulse" />
                  Create Emergency Broadcast
                </h2>
                <button
                  onClick={() => setModalOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateBroadcast} className="space-y-4 text-xs font-semibold">
                
                {/* Patient Name */}
                <div>
                  <label className="block text-slate-500 mb-1.5 uppercase tracking-wide text-[9px]">Patient Name</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="e.g. Rahul Kumar"
                      value={newRequest.patientName}
                      onChange={(e) => setNewRequest((n) => ({ ...n, patientName: e.target.value }))}
                      required
                      className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-4 focus:ring-brand-500/15"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Blood Group */}
                  <div>
                    <label className="block text-slate-500 mb-1.5 uppercase tracking-wide text-[9px]">Blood Group Required</label>
                    <Select
                      icon={Droplets}
                      value={newRequest.bloodGroup}
                      onChange={(e) => setNewRequest((n) => ({ ...n, bloodGroup: e.target.value }))}
                      required
                    >
                      <option value="">Select</option>
                      {BLOOD_GROUPS.map((bg) => (
                        <option key={bg} value={bg}>
                          {bg}
                        </option>
                      ))}
                    </Select>
                  </div>

                  {/* Units required */}
                  <div>
                    <label className="block text-slate-500 mb-1.5 uppercase tracking-wide text-[9px]">Units Needed</label>
                    <div className="relative">
                      <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="number"
                        min="1"
                        max="20"
                        value={newRequest.unitsRequired}
                        onChange={(e) => setNewRequest((n) => ({ ...n, unitsRequired: parseInt(e.target.value) || 1 }))}
                        required
                        className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-4 focus:ring-brand-500/15"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* City */}
                  <div>
                    <label className="block text-slate-500 mb-1.5 uppercase tracking-wide text-[9px]">City</label>
                    <div className="relative">
                      <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="e.g. Vijayawada"
                        value={newRequest.city}
                        onChange={(e) => setNewRequest((n) => ({ ...n, city: e.target.value }))}
                        required
                        className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-4 focus:ring-brand-500/15"
                      />
                    </div>
                  </div>

                  {/* Detailed location */}
                  <div>
                    <label className="block text-slate-500 mb-1.5 uppercase tracking-wide text-[9px]">Hospital Location</label>
                    <div className="relative">
                      <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="e.g. Apollo Hospitals"
                        value={newRequest.location}
                        onChange={(e) => setNewRequest((n) => ({ ...n, location: e.target.value }))}
                        required
                        className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-4 focus:ring-brand-500/15"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Required Before */}
                  <div>
                    <label className="block text-slate-500 mb-1.5 uppercase tracking-wide text-[9px]">Required Before Date</label>
                    <div className="relative">
                      <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="datetime-local"
                        value={newRequest.requiredBefore}
                        onChange={(e) => setNewRequest((n) => ({ ...n, requiredBefore: e.target.value }))}
                        required
                        className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-4 focus:ring-brand-500/15"
                      />
                    </div>
                  </div>

                  {/* Emergency Level */}
                  <div>
                    <label className="block text-slate-500 mb-1.5 uppercase tracking-wide text-[9px]">Urgency Level</label>
                    <Select
                      icon={AlertTriangle}
                      value={newRequest.emergencyLevel}
                      onChange={(e) => setNewRequest((n) => ({ ...n, emergencyLevel: e.target.value }))}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent / Critical</option>
                    </Select>
                  </div>
                </div>

                {/* Primary Reason */}
                <div>
                  <label className="block text-slate-500 mb-1.5 uppercase tracking-wide text-[9px]">Medical Case / Reason</label>
                  <Select
                    icon={FileText}
                    value={newRequest.reason}
                    onChange={(e) => setNewRequest((n) => ({ ...n, reason: e.target.value }))}
                  >
                    {REASONS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </Select>
                </div>

                {/* Message */}
                <div>
                  <label className="block text-slate-500 mb-1.5 uppercase tracking-wide text-[9px]">Details / Special Instructions</label>
                  <textarea
                    placeholder="Provide patient state, contact times, room number or additional remarks..."
                    value={newRequest.message}
                    onChange={(e) => setNewRequest((n) => ({ ...n, message: e.target.value }))}
                    rows={2}
                    className="w-full p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-4 focus:ring-brand-500/15"
                  />
                </div>

                {/* Allow contact checkbox */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="allowContact"
                    checked={newRequest.allowContact}
                    onChange={(e) => setNewRequest((n) => ({ ...n, allowContact: e.target.checked }))}
                    className="rounded text-brand-600 focus:ring-brand-500"
                  />
                  <label htmlFor="allowContact" className="text-slate-600 text-xs font-semibold">
                    Display direct phone and email contact info to responders
                  </label>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="secondary" onClick={() => setModalOpen(false)} disabled={modalLoading}>
                    Cancel
                  </Button>
                  <Button type="submit" loading={modalLoading} className="bg-rose-600 text-white flex items-center gap-2">
                    <Send className="w-4 h-4" />
                    Broadcast Now
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DETAILS VIEW MODAL */}
      <BroadcastDetailsModal
        request={selectedRequest}
        open={detailsOpen}
        onClose={() => {
          setDetailsOpen(false);
          setSelectedRequest(null);
        }}
      />

      <ConfirmModal
        isOpen={confirmOpen}
        title="Mark Request Resolved"
        description={`Are you sure you want to mark this request${broadcastToClose?.patientName ? ` for ${broadcastToClose.patientName}` : ''} as resolved and close it?`}
        confirmText="Yes, Resolve"
        cancelText="Cancel"
        onConfirm={handleConfirmClose}
        onCancel={() => {
          setConfirmOpen(false);
          setBroadcastToClose(null);
        }}
        loading={closeLoading}
        isDanger={false}
      />

      <ConfirmModal
        isOpen={deleteConfirmOpen}
        title="Delete Broadcast Request"
        description={`Are you sure you want to delete this broadcast request${broadcastToDelete?.patientName ? ` for ${broadcastToDelete.patientName}` : ''}? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setDeleteConfirmOpen(false);
          setBroadcastToDelete(null);
        }}
        loading={deleteLoading}
        isDanger={true}
      />
    </div>
  );
};

export default BloodRequestsFeed;
