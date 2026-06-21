/**
 * Calculates priority score and level for a blood request or emergency request.
 * Scoring Rules:
 * - Emergency flag true: +40
 * - Units required > 3: +15
 * - Rare blood groups (AB-, B-, O-, A-): +20
 * - Emergency Level: Low (+5), Medium (+10), High (+20), Critical/Urgent (+30)
 * - Hospital involved: +10
 * - Final score capped at 100.
 *
 * Level Rules:
 * - 0-29: Low
 * - 30-59: Medium
 * - 60-79: High
 * - 80-100: Critical
 *
 * @param {Object} request
 * @returns {Object} { score: Number, level: String }
 */
export const calculatePriority = (request) => {
  if (!request) {
    return { score: 0, level: 'Low' };
  }

  let score = 0;

  // 1. Emergency flag true: +40
  if (request.emergency === true || request.emergency === 'true') {
    score += 40;
  }

  // 2. Units > 3: +15
  const units = Number(request.unitsRequired) || 1;
  if (units > 3) {
    score += 15;
  }

  // 3. Rare blood groups (AB-, B-, O-, A-): +20
  const rareBloodGroups = ['AB-', 'B-', 'O-', 'A-'];
  if (rareBloodGroups.includes(request.bloodGroup)) {
    score += 20;
  }

  // 4. Emergency Level: Low (+5), Medium (+10), High (+20), Critical/Urgent (+30)
  const el = String(request.emergencyLevel || '').toLowerCase();
  if (el === 'low') {
    score += 5;
  } else if (el === 'medium') {
    score += 10;
  } else if (el === 'high') {
    score += 20;
  } else if (el === 'critical' || el === 'urgent') {
    score += 30;
  }

  // 5. Hospital involved: +10
  const isHospitalInvolved = Boolean(
    request.hospitalName ||
    request.hospitalInvolved ||
    request.requesterRole === 'hospital'
  );
  if (isHospitalInvolved) {
    score += 10;
  }

  // Final score capped at 100
  if (score > 100) {
    score = 100;
  }

  // Level Rules:
  // 0-29: Low
  // 30-59: Medium
  // 60-79: High
  // 80-100: Critical
  let level = 'Low';
  if (score >= 80) {
    level = 'Critical';
  } else if (score >= 60) {
    level = 'High';
  } else if (score >= 30) {
    level = 'Medium';
  }

  return {
    score,
    level,
  };
};
