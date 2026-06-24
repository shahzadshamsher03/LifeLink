import api from './api';

/**
 * Fetches available donors with coordinate data.
 * Can take params like: { latitude, longitude, bloodGroup }
 */
export const getMapDonors = (params) => api.get('/map/donors', { params });

/**
 * Fetches all active emergency requests with coordinates.
 */
export const getMapEmergencies = () => api.get('/map/emergencies');

/**
 * Fetches all verified hospitals with coordinates.
 */
export const getMapHospitals = () => api.get('/map/hospitals');

/**
 * Fetches emergency hotspots aggregated data for admins.
 */
export const getMapHeatmap = () => api.get('/map/heatmap');
