import { calculateDistance } from './distanceCalculator.js';

// Compatible blood groups map (key is Recipient, value is list of eligible Donors)
const BLOOD_COMPATIBILITY = {
  'O-': ['O-'],
  'O+': ['O+', 'O-'],
  'A-': ['A-', 'O-'],
  'A+': ['A+', 'A-', 'O+', 'O-'],
  'B-': ['B-', 'O-'],
  'B+': ['B+', 'B-', 'O+', 'O-'],
  'AB-': ['AB-', 'A-', 'B-', 'O-'],
  'AB+': ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
};

/**
 * Calculates a match score (0-100) and recommendation status for a donor.
 *
 * @param {Object} donor Donor user model/object
 * @param {Object} target Target object containing recipient details (e.g. bloodGroup, latitude, longitude)
 * @returns {Object} { score: Number, isRecommended: Boolean }
 */
export const calculateRecommendation = (donor, target) => {
  if (!donor || !target) {
    return { score: 0, isRecommended: false };
  }

  let score = 0;

  // 1. Blood Group Compatibility (Max +50)
  const donorBG = donor.bloodGroup;
  const targetBG = target.bloodGroup;

  if (donorBG && targetBG) {
    if (donorBG === targetBG) {
      score += 50; // Perfect identical match
    } else {
      const compatibleDonors = BLOOD_COMPATIBILITY[targetBG] || [];
      if (compatibleDonors.includes(donorBG)) {
        score += 30; // Compatible but not identical
      } else {
        // Incompatible blood types result in a match score of 0 overall
        return { score: 0, isRecommended: false };
      }
    }
  }

  // 2. Geolocation Proximity (Max +40)
  const donorCoords = donor.location || {};
  const targetLat = target.latitude ?? target.locationCoords?.latitude ?? target.location?.latitude;
  const targetLon = target.longitude ?? target.locationCoords?.longitude ?? target.location?.longitude;

  if (
    donorCoords.latitude !== undefined &&
    donorCoords.longitude !== undefined &&
    targetLat !== undefined &&
    targetLon !== undefined
  ) {
    const dist = calculateDistance(
      donorCoords.latitude,
      donorCoords.longitude,
      targetLat,
      targetLon
    );

    if (dist !== null) {
      if (dist < 5) {
        score += 40;
      } else if (dist < 10) {
        score += 30;
      } else if (dist < 20) {
        score += 20;
      } else if (dist < 50) {
        score += 10;
      }
    }
  }

  // 3. Availability (Max +10)
  if (donor.availability === true || donor.availability === 'true') {
    score += 10;
  }

  // Cap final score at 100
  if (score > 100) {
    score = 100;
  }

  return {
    score,
    isRecommended: score >= 70,
  };
};
