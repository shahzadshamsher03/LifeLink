import { useEffect, useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  AlertTriangle,
  MapPin,
  Calendar,
  Building2,
  Phone,
  Mail,
  User,
  Heart,
  Droplets,
  CheckCircle,
  Clock,
  Navigation
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { getMapEmergencies } from '../../services/mapService';
import { volunteerForRequest } from '../../services/requestService';
import { getErrorMessage } from '../../services/api';
import Button from '../../components/ui/Button';

// Map Recenter Helper Component
const ChangeMapView = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.setView(center, 13);
    }
  }, [center, map]);
  return null;
};

// Map fit bounds helper
const FitBoundsView = ({ markers }) => {
  const map = useMap();
  useEffect(() => {
    if (markers && markers.length > 0) {
      const group = new L.featureGroup(
        markers.map(m => L.marker([m.locationCoords.latitude, m.locationCoords.longitude]))
      );
      map.fitBounds(group.getBounds().pad(0.1));
    }
  }, [markers, map]);
  return null;
};

// Urgency-based custom div icons
const getUrgencyIcon = (level, bloodGroup) => {
  const colors = {
    urgent: 'bg-red-600 shadow-red-500/40 text-white border-red-200 animate-pulse',
    critical: 'bg-red-600 shadow-red-500/40 text-white border-red-200 animate-pulse',
    high: 'bg-orange-500 shadow-orange-500/40 text-white border-orange-200',
    medium: 'bg-amber-500 shadow-amber-500/40 text-white border-amber-200',
    low: 'bg-sky-500 shadow-sky-500/40 text-white border-sky-200',
  };
  const c = colors[level?.toLowerCase()] || colors.medium;
  return L.divIcon({
    html: `<div class="relative w-8 h-8 rounded-full border-2 border-white flex items-center justify-center font-black shadow-lg text-[11px] ${c}">
            ${bloodGroup}
            <div class="absolute inset-0 rounded-full animate-ping opacity-15 bg-inherit"></div>
           </div>`,
    className: 'urgency-marker',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
};

const EmergencyMap = () => {
  const { user } = useAuth();
  const { connected, subscribeToRequests } = useSocket();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mapCenter, setMapCenter] = useState([17.3850, 78.4867]); // Default Hyderabad
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const fetchEmergencies = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await getMapEmergencies();
      setRequests(data.requests || []);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmergencies();
  }, [fetchEmergencies]);

  // Handle auto geolocation for center
  useEffect(() => {
    if (user?.location?.latitude && user?.location?.longitude) {
      setMapCenter([user.location.latitude, user.location.longitude]);
    } else if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setMapCenter([pos.coords.latitude, pos.coords.longitude]);
      });
    }
  }, [user]);

  // Live Socket updates
  useEffect(() => {
    const unsubscribe = subscribeToRequests((event) => {
      if (
        event.type === 'new_emergency_request' || 
        event.type === 'broadcast_request' || 
        event.type === 'broadcast_resolved' || 
        event.type === 'broadcast_deleted'
      ) {
        fetchEmergencies();
      }
    });
    return unsubscribe;
  }, [subscribeToRequests, fetchEmergencies]);

  const handleVolunteer = async (requestId) => {
    setActionLoadingId(requestId);
    try {
      const { data } = await volunteerForRequest(requestId);
      toast.success(data.message || 'Thank you for volunteering! Your coordinates and details are sent to requester.');
      // Refresh emergencies
      fetchEmergencies();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setActionLoadingId(null);
    }
  };

  const isDonor = user?.role === 'donor';

  return (
    <div className="flex flex-col gap-6 h-[calc(100vh-140px)] relative overflow-hidden">
      {/* PAGE HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-4 z-10">
        <div>
          <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-rose-600 animate-bounce" />
            Emergency Requests Geo-Map
          </h2>
          <p className="text-slate-500 text-sm mt-0.5">Visualize active blood emergency demands in real-time.</p>
        </div>

        {/* Legend */}
        <div className="flex gap-3 bg-white/70 backdrop-blur-xl border border-white/60 px-4 py-2 rounded-2xl shadow-soft text-xs font-semibold text-slate-500">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-600" /> Critical/Urgent</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-orange-500" /> High</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-amber-50" /> Medium</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-sky-500" /> Low</span>
        </div>
      </div>

      {/* MAP LAYER CONTAINER */}
      <div className="flex-1 h-full rounded-3xl overflow-hidden border border-white/60 shadow-soft relative z-10">
        {loading && requests.length === 0 ? (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="w-10 h-10 border-4 border-rose-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : requests.length === 0 ? (
          <div className="absolute inset-0 bg-slate-50 z-50 flex items-center justify-center">
            <div className="text-center p-6 bg-white rounded-2xl border border-slate-100 shadow-soft max-w-sm">
              <AlertTriangle className="w-8 h-8 text-rose-500 mx-auto mb-2 animate-pulse" />
              <h3 className="font-extrabold text-slate-800 text-sm">No active emergency requests</h3>
              <p className="text-xs text-slate-400 mt-1">There are currently no active coordinates-based emergency requests.</p>
            </div>
          </div>
        ) : null}

        <MapContainer
          center={mapCenter}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          {requests.map((r) => (
            <Marker
              key={r._id}
              position={[r.locationCoords.latitude, r.locationCoords.longitude]}
              icon={getUrgencyIcon(r.emergencyLevel, r.bloodGroup)}
            >
              <Popup>
                <div className="p-1 space-y-2 text-xs text-slate-700 min-w-[220px]">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                    <span className="font-bold text-slate-900 leading-tight">
                      {r.bloodGroup} Needed
                    </span>
                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                      r.emergencyLevel === 'urgent' || r.emergencyLevel === 'critical'
                        ? 'bg-red-100 text-red-800 border border-red-200 animate-pulse'
                        : r.emergencyLevel === 'high'
                        ? 'bg-orange-100 text-orange-850 border border-orange-200'
                        : r.emergencyLevel === 'medium'
                        ? 'bg-amber-100 text-amber-850 border border-amber-200'
                        : 'bg-sky-100 text-sky-850 border border-sky-200'
                    }`}>
                      {r.emergencyLevel}
                    </span>
                  </div>

                  <div className="space-y-1 text-[11px] leading-relaxed">
                    <p className="flex justify-between">
                      <span className="text-slate-400">Hospital:</span>
                      <span className="font-bold text-slate-800 truncate max-w-[130px]">{r.hospitalName || 'Not specified'}</span>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-slate-400">Units Needed:</span>
                      <span className="font-bold text-slate-850">{r.unitsRequired} Unit(s)</span>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-slate-400">City / Address:</span>
                      <span className="font-semibold text-slate-750">{r.city}</span>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-slate-400">Status:</span>
                      <span className="font-bold text-emerald-600 capitalize">{r.status}</span>
                    </p>
                    {r.message && (
                      <p className="bg-rose-50/30 p-1.5 rounded border border-rose-100/50 italic text-slate-600 mt-1">
                        "{r.message}"
                      </p>
                    )}
                  </div>

                  {isDonor && r.status === 'active' && (
                    <div className="border-t border-slate-100 pt-2">
                      <Button
                        onClick={() => handleVolunteer(r._id)}
                        loading={actionLoadingId === r._id}
                        className="w-full !py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 border-none text-white font-bold text-[10px] rounded-lg shadow-sm"
                      >
                        <Heart className="w-3 h-3 fill-white" />
                        Volunteer to Donate
                      </Button>
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}
          <ChangeMapView center={mapCenter} />
          <FitBoundsView markers={requests} />
        </MapContainer>
      </div>
    </div>
  );
};

export default EmergencyMap;
