import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  MapPin,
  Search,
  SlidersHorizontal,
  Droplets,
  Heart,
  Calendar,
  AlertTriangle,
  Building2,
  Phone,
  Mail,
  User,
  Star,
  CheckCircle,
  X,
  Compass,
  ChevronRight,
  Send,
  Navigation
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { getMapDonors } from '../../services/mapService';
import { createRequest } from '../../services/requestService';
import { getErrorMessage } from '../../services/api';
import Button from '../../components/ui/Button';
import Select from '../../components/ui/Select';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

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
        markers.map(m => L.marker([m.location.latitude, m.location.longitude]))
      );
      map.fitBounds(group.getBounds().pad(0.1));
    }
  }, [markers, map]);
  return null;
};

const DonorMap = () => {
  const { user } = useAuth();
  const { connected, subscribeToRequests } = useSocket();

  const [donors, setDonors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mapCenter, setMapCenter] = useState([17.3850, 78.4867]); // Default Hyderabad
  const [hasLocation, setHasLocation] = useState(false);

  // Filters
  const [bloodGroupFilter, setBloodGroupFilter] = useState('');
  const [availabilityFilter, setAvailabilityFilter] = useState('true');
  const [cityFilter, setCityFilter] = useState('');

  // Selected donor state for action modal
  const [selectedDonor, setSelectedDonor] = useState(null);
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [requestLoading, setRequestLoading] = useState(false);
  const [requestForm, setRequestForm] = useState({
    message: '',
    unitsRequired: 1,
    emergencyLevel: 'medium',
    patientName: '',
    requiredBefore: '',
    reason: 'Surgery',
    allowContact: true,
  });

  const fetchDonorsList = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (user?.location?.latitude && user?.location?.longitude) {
        params.latitude = user.location.latitude;
        params.longitude = user.location.longitude;
        params.bloodGroup = user.bloodGroup;
      }
      
      const { data } = await getMapDonors(params);
      setDonors(data.donors || []);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchDonorsList();
  }, [fetchDonorsList]);

  // Handle auto geolocation
  useEffect(() => {
    if (user?.location?.latitude && user?.location?.longitude) {
      setMapCenter([user.location.latitude, user.location.longitude]);
      setHasLocation(true);
    } else if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setMapCenter([pos.coords.latitude, pos.coords.longitude]);
          setHasLocation(true);
        },
        () => {
          setHasLocation(false);
        }
      );
    }
  }, [user]);

  // Live updates via Sockets
  useEffect(() => {
    const unsubscribe = subscribeToRequests((event) => {
      if (event.type === 'donor_location_updated' || event.type === 'donor_availability_updated') {
        fetchDonorsList();
      }
    });
    return unsubscribe;
  }, [subscribeToRequests, fetchDonorsList]);

  // Filtered Donors list
  const filteredDonors = donors.filter((d) => {
    if (bloodGroupFilter && d.bloodGroup !== bloodGroupFilter) return false;
    if (availabilityFilter !== 'all') {
      const isAvail = availabilityFilter === 'true';
      if (d.availability !== isAvail) return false;
    }
    if (cityFilter.trim() && !d.city?.toLowerCase().includes(cityFilter.trim().toLowerCase())) return false;
    return true;
  });

  const handleSendRequestSubmit = async (e) => {
    e.preventDefault();
    if (!selectedDonor) return;

    setRequestLoading(true);
    try {
      const { data } = await createRequest({
        requestType: 'direct',
        donorId: selectedDonor._id,
        bloodGroup: selectedDonor.bloodGroup,
        message: requestForm.message,
        unitsRequired: requestForm.unitsRequired,
        emergencyLevel: requestForm.emergencyLevel,
        patientName: requestForm.patientName,
        requiredBefore: requestForm.requiredBefore || undefined,
        reason: requestForm.reason,
        allowContact: requestForm.allowContact,
        city: selectedDonor.city,
      });

      toast.success(data.message || 'Blood request sent successfully!');
      setRequestModalOpen(false);
      // Reset form
      setRequestForm({
        message: '',
        unitsRequired: 1,
        emergencyLevel: 'medium',
        patientName: '',
        requiredBefore: '',
        reason: 'Surgery',
        allowContact: true,
      });
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setRequestLoading(false);
    }
  };

  const handleCenterOnDonor = (latitude, longitude) => {
    setMapCenter([latitude, longitude]);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-140px)] relative overflow-hidden">
      {/* FILTER & SIDEBAR LIST SECTION */}
      <div className="w-full lg:w-96 flex flex-col gap-4 h-full bg-white/70 backdrop-blur-xl border border-white/60 p-5 rounded-3xl shadow-soft">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-5 h-5 text-brand-600" />
          <h2 className="font-extrabold text-slate-800 text-lg">Interactive Donor Search</h2>
        </div>

        {/* Filter inputs */}
        <div className="space-y-3">
          <div>
            <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1">Blood Group</label>
            <Select
              value={bloodGroupFilter}
              onChange={(e) => setBloodGroupFilter(e.target.value)}
              icon={Droplets}
            >
              <option value="">All Groups</option>
              {BLOOD_GROUPS.map(bg => (
                <option key={bg} value={bg}>{bg}</option>
              ))}
            </Select>
          </div>

          <div>
            <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1">Availability</label>
            <Select
              value={availabilityFilter}
              onChange={(e) => setAvailabilityFilter(e.target.value)}
              icon={Heart}
            >
              <option value="all">All Donors</option>
              <option value="true">Available Only</option>
              <option value="false">Unavailable Only</option>
            </Select>
          </div>

          <div>
            <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1">City / Region</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search city..."
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-200 bg-white/80 focus:outline-none focus:ring-4 focus:ring-brand-500/15 text-sm"
              />
            </div>
          </div>
        </div>

        <div className="border-t border-slate-100/80 pt-3 flex-1 flex flex-col min-h-0">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Donors Nearby ({filteredDonors.length})
            </span>
            {hasLocation && (
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-100 font-semibold flex items-center gap-0.5 animate-pulse">
                <Navigation className="w-2.5 h-2.5" />
                Sorted by Proximity
              </span>
            )}
          </div>

          {/* List panel */}
          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
            {loading ? (
              <div className="flex flex-col gap-2.5">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-20 rounded-2xl bg-slate-100 animate-pulse border border-slate-200/50" />
                ))}
              </div>
            ) : filteredDonors.length === 0 ? (
              <div className="text-center py-12">
                <MapPin className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-500">No donors found nearby</p>
                <p className="text-xs text-slate-400 mt-1">Try adjusting the filter options.</p>
              </div>
            ) : (
              filteredDonors.map((d) => (
                <div
                  key={d._id}
                  className={`p-3.5 rounded-2xl border transition-all hover:shadow-md cursor-pointer flex flex-col justify-between gap-1.5 ${
                    d.isRecommended
                      ? 'bg-rose-50/30 border-rose-200/80 hover:bg-rose-50/50'
                      : 'bg-white border-slate-100 hover:border-slate-200'
                  }`}
                  onClick={() => handleCenterOnDonor(d.location.latitude, d.location.longitude)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex gap-2">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-rose-600 flex items-center justify-center text-white text-sm font-extrabold shadow-sm">
                        {d.bloodGroup}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm leading-tight">{d.name}</h4>
                        <span className="text-[10px] text-slate-400 font-semibold">{d.city}</span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      {d.isRecommended && (
                        <span className="px-1.5 py-0.5 rounded bg-rose-500 text-white text-[8px] font-black uppercase tracking-wider flex items-center gap-0.5">
                          <Star className="w-2.5 h-2.5 fill-white" />
                          AI Match: {d.matchScore}%
                        </span>
                      )}
                      {d.distance !== null && (
                        <span className="text-[10px] font-bold text-slate-500">
                          {d.distance} km away
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-100/60 pt-2 mt-1">
                    <span className={`text-[10px] font-bold ${d.availability ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {d.availability ? '🟢 Active & Ready' : '⚪ Unavailable'}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedDonor(d);
                        setRequestModalOpen(true);
                      }}
                      className="px-2.5 py-1 text-[10px] font-bold text-white bg-rose-600 hover:bg-rose-500 transition-colors rounded-lg flex items-center gap-1 border-none shadow-sm"
                    >
                      <Send className="w-2.5 h-2.5" />
                      Request
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* MAP LAYER CONTAINER */}
      <div className="flex-1 h-full rounded-3xl overflow-hidden border border-white/60 shadow-soft relative z-10">
        <MapContainer
          center={mapCenter}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          {filteredDonors.map((d) => (
            <Marker
              key={d._id}
              position={[d.location.latitude, d.location.longitude]}
            >
              <Popup className="custom-popup">
                <div className="p-1 space-y-2.5 text-xs text-slate-700 min-w-[200px]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <div className="w-7 h-7 rounded bg-rose-600 flex items-center justify-center text-white text-xs font-black">
                        {d.bloodGroup}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm leading-tight">{d.name}</h4>
                        <p className="text-[10px] text-slate-400">{d.city}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5 border-t border-slate-100 pt-2 text-[11px]">
                    <p className="flex items-center justify-between">
                      <span className="text-slate-400">Availability:</span>
                      <span className={`font-semibold ${d.availability ? 'text-emerald-600' : 'text-slate-500'}`}>
                        {d.availability ? 'Available' : 'Unavailable'}
                      </span>
                    </p>
                    {d.distance !== null && (
                      <p className="flex items-center justify-between">
                        <span className="text-slate-400">Distance:</span>
                        <span className="font-bold text-slate-800">{d.distance} km</span>
                      </p>
                    )}
                    {d.isRecommended && (
                      <p className="flex items-center justify-between bg-rose-50 p-1 rounded border border-rose-100">
                        <span className="text-rose-600 font-bold">AI Match Rating:</span>
                        <span className="font-black text-rose-700">{d.matchScore}%</span>
                      </p>
                    )}
                  </div>

                  <div className="border-t border-slate-100 pt-2 flex gap-1.5">
                    <button
                      onClick={() => {
                        setSelectedDonor(d);
                        setRequestModalOpen(true);
                      }}
                      className="flex-1 py-1.5 px-3 rounded-lg bg-rose-600 text-white font-bold hover:bg-rose-500 transition-colors text-center border-none shadow-sm flex items-center justify-center gap-1 text-[10px]"
                    >
                      <Send className="w-2.5 h-2.5" />
                      Send Blood Request
                    </button>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
          <ChangeMapView center={mapCenter} />
          <FitBoundsView markers={filteredDonors} />
        </MapContainer>
      </div>

      {/* REQUEST MODAL DIALOG */}
      <AnimatePresence>
        {requestModalOpen && selectedDonor && (
          <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
                    <Heart className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-800 text-base">Request Blood</h3>
                    <p className="text-slate-400 text-xs mt-0.5">Send a direct request to {selectedDonor.name}</p>
                  </div>
                </div>
                <button
                  onClick={() => setRequestModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSendRequestSubmit} className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1">Blood Group</label>
                    <div className="py-2 px-3 bg-rose-50 text-rose-700 font-extrabold rounded-xl border border-rose-100 text-sm">
                      {selectedDonor.bloodGroup}
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1">Units Needed</label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={requestForm.unitsRequired}
                      onChange={(e) => setRequestForm(prev => ({ ...prev, unitsRequired: Number(e.target.value) }))}
                      className="w-full py-2 px-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 text-slate-850 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1">Patient Name</label>
                  <input
                    type="text"
                    required
                    value={requestForm.patientName}
                    onChange={(e) => setRequestForm(prev => ({ ...prev, patientName: e.target.value }))}
                    placeholder="e.g. John Doe"
                    className="w-full py-2 px-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 text-slate-850 text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1">Urgency Level</label>
                    <Select
                      value={requestForm.emergencyLevel}
                      onChange={(e) => setRequestForm(prev => ({ ...prev, emergencyLevel: e.target.value }))}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1">Required Before</label>
                    <input
                      type="date"
                      value={requestForm.requiredBefore}
                      onChange={(e) => setRequestForm(prev => ({ ...prev, requiredBefore: e.target.value }))}
                      className="w-full py-2 px-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 text-slate-850 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1">Message</label>
                  <textarea
                    rows={2}
                    value={requestForm.message}
                    onChange={(e) => setRequestForm(prev => ({ ...prev, message: e.target.value }))}
                    placeholder="Provide any details about the requirement..."
                    className="w-full py-2 px-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 text-slate-850 text-sm"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="allowContact"
                    checked={requestForm.allowContact}
                    onChange={(e) => setRequestForm(prev => ({ ...prev, allowContact: e.target.checked }))}
                    className="rounded text-rose-600 focus:ring-rose-500"
                  />
                  <label htmlFor="allowContact" className="text-xs text-slate-500 select-none">
                    Allow donor to view my contact number directly.
                  </label>
                </div>

                <div className="flex gap-2 justify-end pt-3 border-t border-slate-100">
                  <Button type="button" variant="secondary" onClick={() => setRequestModalOpen(false)} className="!py-2 text-xs">
                    Cancel
                  </Button>
                  <Button type="submit" loading={requestLoading} className="!py-2 text-xs text-white bg-rose-600 border-none hover:bg-rose-500 shadow-rose-500/10">
                    Send Request
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DonorMap;
