import User from '../models/User.js';
import BloodRequest from '../models/BloodRequest.js';
import asyncHandler from '../utils/asyncHandler.js';
import { calculateDistance } from '../utils/distanceCalculator.js';
import { calculateRecommendation } from '../utils/donorRecommender.js';

/**
 * GET /api/map/donors
 * Returns all available donors with location coordinates.
 * Optional query params: latitude, longitude, bloodGroup
 */
export const getMapDonors = asyncHandler(async (req, res) => {
  const { latitude, longitude, bloodGroup } = req.query;

  const filter = {
    role: 'donor',
    availability: true,
    isBlocked: { $ne: true },
    'location.latitude': { $exists: true, $ne: null },
    'location.longitude': { $exists: true, $ne: null },
  };

  const donors = await User.find(filter).select('name email phoneNumber bloodGroup city availability location');

  const results = donors.map((donor) => {
    const donorObj = donor.toObject();
    let distance = null;
    let matchScore = 0;
    let isRecommended = false;

    if (latitude !== undefined && longitude !== undefined) {
      distance = calculateDistance(
        donorObj.location.latitude,
        donorObj.location.longitude,
        latitude,
        longitude
      );

      if (bloodGroup) {
        const recommendation = calculateRecommendation(donorObj, {
          bloodGroup,
          latitude: Number(latitude),
          longitude: Number(longitude),
        });
        matchScore = recommendation.score;
        isRecommended = recommendation.isRecommended;
      }
    }

    return {
      _id: donorObj._id,
      name: donorObj.name,
      bloodGroup: donorObj.bloodGroup,
      city: donorObj.city,
      availability: donorObj.availability,
      location: donorObj.location,
      distance,
      matchScore,
      isRecommended,
    };
  });

  // Sort by recommendation matchScore descending, then by distance ascending
  results.sort((a, b) => {
    if (b.matchScore !== a.matchScore) {
      return b.matchScore - a.matchScore;
    }
    if (a.distance !== null && b.distance !== null) {
      return a.distance - b.distance;
    }
    return 0;
  });

  res.status(200).json({
    success: true,
    count: results.length,
    donors: results,
  });
});

/**
 * GET /api/map/emergencies
 * Returns all active emergency request markers.
 */
export const getMapEmergencies = asyncHandler(async (req, res) => {
  const filter = {
    status: { $in: ['pending', 'active', 'accepted'] },
    isDeleted: { $ne: true },
    'locationCoords.latitude': { $exists: true, $ne: null },
    'locationCoords.longitude': { $exists: true, $ne: null },
  };

  const requests = await BloodRequest.find(filter)
    .populate('requesterId', 'name hospitalName email phoneNumber')
    .sort({ createdAt: -1 });

  const results = requests.map((reqDoc) => {
    const doc = reqDoc.toObject();
    return {
      _id: doc._id,
      bloodGroup: doc.bloodGroup,
      unitsRequired: doc.unitsRequired,
      emergencyLevel: doc.emergencyLevel,
      city: doc.city,
      hospitalName: doc.hospitalName || doc.requesterId?.hospitalName,
      status: doc.status,
      message: doc.message,
      locationCoords: doc.locationCoords,
      emergency: doc.emergency,
      createdAt: doc.createdAt,
      requester: {
        name: doc.requesterId?.name,
        email: doc.requesterId?.email,
        phoneNumber: doc.requesterId?.phoneNumber,
      },
    };
  });

  res.status(200).json({
    success: true,
    count: results.length,
    requests: results,
  });
});

/**
 * GET /api/map/hospitals
 * Returns all verified hospitals with location coordinates.
 */
export const getMapHospitals = asyncHandler(async (req, res) => {
  const filter = {
    role: 'hospital',
    isBlocked: { $ne: true },
    'location.latitude': { $exists: true, $ne: null },
    'location.longitude': { $exists: true, $ne: null },
  };

  const hospitals = await User.find(filter).select('name hospitalName phoneNumber email city isHospitalVerified location');

  res.status(200).json({
    success: true,
    count: hospitals.length,
    hospitals: hospitals.map((h) => h.toObject()),
  });
});

/**
 * GET /api/map/heatmap
 * Groups emergencies by city and returns hotspot counts and city coordinates.
 */
export const getMapHeatmap = asyncHandler(async (req, res) => {
  // 1. Aggregate request status stats by city
  const stats = await BloodRequest.aggregate([
    { $match: { isDeleted: { $ne: true } } },
    {
      $group: {
        _id: '$city',
        totalRequests: { $sum: 1 },
        activeCases: {
          $sum: {
            $cond: [
              { $in: ['$status', ['pending', 'active', 'accepted']] },
              1,
              0
            ]
          }
        },
        fulfilledCases: {
          $sum: {
            $cond: [
              { $in: ['$status', ['closed', 'completed']] },
              1,
              0
            ]
          }
        }
      }
    }
  ]);

  // 2. Fetch a representative coordinate for each city to position bubble on the map
  const citiesCoordinates = await BloodRequest.aggregate([
    {
      $match: {
        'locationCoords.latitude': { $exists: true, $ne: null },
        'locationCoords.longitude': { $exists: true, $ne: null }
      }
    },
    {
      $group: {
        _id: '$city',
        latitude: { $first: '$locationCoords.latitude' },
        longitude: { $first: '$locationCoords.longitude' }
      }
    }
  ]);

  const coordsMap = {};
  citiesCoordinates.forEach((c) => {
    if (c._id) {
      coordsMap[c._id.toLowerCase()] = {
        latitude: c.latitude,
        longitude: c.longitude
      };
    }
  });

  const results = stats
    .filter((s) => s._id)
    .map((s) => {
      const cityKey = s._id.toLowerCase();
      // If we don't have explicit coordinates in requests, fall back to default cities coordinates
      const defaultCoords = {
        'hyderabad': { latitude: 17.3850, longitude: 78.4867 },
        'vijayawada': { latitude: 16.5062, longitude: 80.6480 },
        'visakhapatnam': { latitude: 17.6868, longitude: 83.2185 },
        'guntur': { latitude: 16.3067, longitude: 80.4365 },
        'nellore': { latitude: 14.4426, longitude: 79.9865 },
        'tirupati': { latitude: 13.6288, longitude: 79.4192 },
      };

      const coords = coordsMap[cityKey] || defaultCoords[cityKey] || { latitude: 17.3850, longitude: 78.4867 };

      return {
        city: s._id,
        totalRequests: s.totalRequests,
        activeCases: s.activeCases,
        fulfilledCases: s.fulfilledCases,
        latitude: coords.latitude,
        longitude: coords.longitude,
      };
    });

  res.status(200).json({
    success: true,
    count: results.length,
    hotspots: results,
  });
});
