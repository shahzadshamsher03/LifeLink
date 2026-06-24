import { useEffect, useState, useCallback } from 'react';
import { MapContainer, TileLayer, Circle, Marker, Popup, LayersControl, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Building2,
  AlertTriangle,
  ClipboardList,
  CheckCircle,
  HelpCircle,
  Phone,
  Mail,
  MapPin,
  Flame,
  Plus
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useSocket } from '../../context/SocketContext';
import { getMapHospitals, getMapHeatmap } from '../../services/mapService';
import { getErrorMessage } from '../../services/api';

// Map Fit bounds helper
const FitBoundsView = ({ hotspots, hospitals }) => {
  const map = useMap();
  useEffect(() => {
    const points = [];
    hotspots.forEach(h => points.push([h.latitude, h.longitude]));
    hospitals.forEach(hp => points.push([hp.location.latitude, hp.location.longitude]));

    if (points.length > 0) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds.pad(0.15));
    }
  }, [hotspots, hospitals, map]);
  return null;
};

// Custom Hospital Marker Icon
const hospitalIcon = L.divIcon({
  html: `<div class="w-8 h-8 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white shadow-lg border-2 border-white">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-building-2"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18"/><path d="M6 18H4a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h2"/><path d="M18 18h2a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/></svg>
         </div>`,
  className: 'hospital-marker',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

const AnalyticsMap = () => {
  const { subscribeToRequests } = useSocket();

  const [hotspots, setHotspots] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchMapData = useCallback(async () => {
    setLoading(true);
    try {
      const [heatmapRes, hospitalsRes] = await Promise.all([
        getMapHeatmap(),
        getMapHospitals(),
      ]);
      setHotspots(heatmapRes.data.hotspots || []);
      setHospitals(hospitalsRes.data.hospitals || []);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMapData();
  }, [fetchMapData]);

  // Live updates via sockets
  useEffect(() => {
    const unsubscribe = subscribeToRequests((event) => {
      if (
        event.type === 'new_emergency_request' || 
        event.type === 'broadcast_resolved' || 
        event.type === 'broadcast_deleted' || 
        event.type === 'hospital_location_updated'
      ) {
        fetchMapData();
      }
    });
    return unsubscribe;
  }, [subscribeToRequests, fetchMapData]);

  return (
    <div className="flex flex-col gap-6 h-[calc(100vh-140px)] relative overflow-hidden">
      {/* PAGE HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-4 z-10">
        <div>
          <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <Flame className="w-6 h-6 text-orange-600 animate-pulse" />
            AI Emergency Hotspots & Hospitals Map
          </h2>
          <p className="text-slate-500 text-sm mt-0.5">Heatmap hotspots by city based on platform blood request metrics.</p>
        </div>

        {/* Legend */}
        <div className="flex gap-4 bg-white/70 backdrop-blur-xl border border-white/60 px-4 py-2.5 rounded-2xl shadow-soft text-xs font-semibold text-slate-600">
          <span className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-full bg-rose-500/25 border border-rose-500" />
            Demand Bubble (Aggregated Cases)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-lg bg-emerald-500 flex items-center justify-center text-white text-[10px] font-bold">H</span>
            Verified Hospital Location
          </span>
        </div>
      </div>

      {/* MAP LAYER CONTAINER */}
      <div className="flex-1 h-full rounded-3xl overflow-hidden border border-white/60 shadow-soft relative z-10">
        {loading && hotspots.length === 0 && hospitals.length === 0 ? (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="w-10 h-10 border-4 border-rose-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : null}

        <MapContainer
          center={[17.3850, 78.4867]} // Default Hyderabad
          zoom={8}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />

          <LayersControl position="topright">
            {/* Heatmap / Emergency Demand Bubble Layer */}
            <LayersControl.Overlay checked name="Emergency Hotspots (Heatmap)">
              <div className="hidden">
                {/* dummy wrapper */}
              </div>
              <>
                {hotspots.map((h) => {
                  // Calculate radius based on total requests (e.g. 5000 meters per request, min 15000)
                  const radius = Math.max(15000, h.totalRequests * 5000);
                  
                  return (
                    <Circle
                      key={h.city}
                      center={[h.latitude, h.longitude]}
                      radius={radius}
                      pathOptions={{
                        color: '#f43f5e',
                        fillColor: '#f43f5e',
                        fillOpacity: 0.25,
                        weight: 2
                      }}
                    >
                      <Popup>
                        <div className="p-1 space-y-2 text-xs text-slate-700 min-w-[180px]">
                          <h4 className="font-extrabold text-slate-900 text-sm border-b border-slate-100 pb-1.5">
                            📍 {h.city} Hotspot
                          </h4>
                          <div className="space-y-1.5 text-[11px]">
                            <p className="flex justify-between">
                              <span className="text-slate-400">Total Demands:</span>
                              <span className="font-bold text-slate-800">{h.totalRequests} Requests</span>
                            </p>
                            <p className="flex justify-between text-rose-600">
                              <span className="font-medium">Active Emergencies:</span>
                              <span className="font-black">{h.activeCases} Cases</span>
                            </p>
                            <p className="flex justify-between text-emerald-600">
                              <span className="font-medium">Fulfilled/Closed:</span>
                              <span className="font-bold">{h.fulfilledCases} Cases</span>
                            </p>
                          </div>
                        </div>
                      </Popup>
                    </Circle>
                  );
                })}
              </>
            </LayersControl.Overlay>

            {/* Verified Hospitals Layer */}
            <LayersControl.Overlay checked name="Hospital Locations">
              <div className="hidden">
                {/* dummy wrapper */}
              </div>
              <>
                {hospitals.map((hp) => (
                  <Marker
                    key={hp._id}
                    position={[hp.location.latitude, hp.location.longitude]}
                    icon={hospitalIcon}
                  >
                    <Popup>
                      <div className="p-1 space-y-2 text-xs text-slate-700 min-w-[200px]">
                        <div className="flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                          <div className="w-6 h-6 rounded bg-emerald-500 text-white flex items-center justify-center">
                            <Building2 className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-900 leading-tight">
                              {hp.hospitalName || hp.name}
                            </h4>
                            <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider">
                              Verified Hospital
                            </p>
                          </div>
                        </div>

                        <div className="space-y-1 text-[11px] leading-relaxed">
                          <p className="flex justify-between">
                            <span className="text-slate-400">Contact:</span>
                            <span className="font-bold text-slate-850 flex items-center gap-0.5">
                              <Phone className="w-3 h-3 text-slate-400" />
                              {hp.phoneNumber}
                            </span>
                          </p>
                          <p className="flex justify-between">
                            <span className="text-slate-400">Email:</span>
                            <span className="font-semibold text-slate-800">{hp.email}</span>
                          </p>
                          <p className="flex justify-between">
                            <span className="text-slate-400">City:</span>
                            <span className="font-bold text-slate-750">{hp.city}</span>
                          </p>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </>
            </LayersControl.Overlay>
          </LayersControl>

          <FitBoundsView hotspots={hotspots} hospitals={hospitals} />
        </MapContainer>
      </div>
    </div>
  );
};

export default AnalyticsMap;
