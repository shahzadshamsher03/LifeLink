import BloodRequest from '../models/BloodRequest.js';
import User from '../models/User.js';
import HospitalDonor from '../models/HospitalDonor.js';
import Notification from '../models/Notification.js';
import { BLOOD_GROUPS } from '../models/User.js';
import asyncHandler from '../utils/asyncHandler.js';
import AppError from '../utils/AppError.js';
import { emitNewRequest, emitRequestResponse, emitAdminUpdate, emitBroadcastRequest, emitBroadcastResolved, emitHospitalDonorAdded, emitHospitalDonorUpdated, emitToUser, emitNewEmergencyRequest } from '../sockets/socketManager.js';
import { calculatePriority } from '../utils/priorityScorer.js';

const requesterFields = 'name email role phoneNumber hospitalName city';
const donorFields = 'name email bloodGroup city availability phoneNumber';

const populateRequest = (query) =>
  query
    .populate('requesterId', requesterFields)
    .populate('donorId', donorFields);

export const formatRequest = (request) => {
  const doc = request.toObject ? request.toObject() : request;
  return {
    _id: doc._id,
    bloodGroup: doc.bloodGroup,
    message: doc.message,
    status: doc.status,
    emergency: doc.emergency ?? false,
    completed: doc.completed ?? false, 
    hospitalName: doc.hospitalName,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    requester: doc.requesterId,
    donor: doc.donorId,
    requestType: doc.requestType || 'direct',
    city: doc.city,
    emergencyLevel: doc.emergencyLevel,
    volunteers: doc.volunteers?.map(v => ({
      donorId: v.donorId?._id || v.donorId,
      name: v.donorId?.name,
      email: v.donorId?.email,
      bloodGroup: v.donorId?.bloodGroup,
      city: v.donorId?.city,
      phoneNumber: v.donorId?.phoneNumber,
      status: v.status,
      volunteeredAt: v.volunteeredAt,
    })) || [],
    patientName: doc.patientName,
    unitsRequired: doc.unitsRequired ?? 1,
    location: doc.location,
    requiredBefore: doc.requiredBefore,
    reason: doc.reason,
    allowContact: doc.allowContact ?? true,
    resolvedAt: doc.resolvedAt,
    resolvedBy: doc.resolvedBy,
    isDeleted: doc.isDeleted ?? false,
    priorityScore: doc.priorityScore ?? 0,
    priorityLevel: doc.priorityLevel ?? 'Low',
    locationCoords: doc.locationCoords ?? null,
  };
};

export const createRequest = asyncHandler(async (req, res) => {
  const { requestType = 'direct', donorId, bloodGroup, message, emergency: emergencyBody, city, emergencyLevel } = req.body;

  if (requestType === 'direct') {
    if (!donorId) {
      throw new AppError('Donor ID is required', 400);
    }

    const donor = await User.findOne({ _id: donorId, role: 'donor' });

    if (!donor) {
      throw new AppError('Donor not found', 404);
    }

    if (!donor.availability) {
      throw new AppError('This donor is currently unavailable', 400);
    }

    if (donor._id.equals(req.user._id)) {
      throw new AppError('You cannot send a request to yourself', 400);
    }

    const resolvedBloodGroup = bloodGroup || donor.bloodGroup;

    if (!resolvedBloodGroup || !BLOOD_GROUPS.includes(resolvedBloodGroup)) {
      throw new AppError('Valid blood group is required', 400);
    }

    const existingActive = await BloodRequest.findOne({
      requesterId: req.user._id,
      donorId: donor._id,
      status: { $in: ['pending', 'accepted'] },
      completed: { $ne: true },
    });

    if (existingActive) {
      throw new AppError(
        `You already have an active ${existingActive.status} request with this donor`,
        400
      );
    }

    const isHospital = req.user.role === 'hospital';
    const {
      patientName,
      unitsRequired,
      location,
      requiredBefore,
      reason,
      allowContact,
      city,
      emergencyLevel,
      latitude,
      longitude,
    } = req.body;
    const emergency = isHospital ? true : (emergencyLevel === 'urgent' || emergencyLevel === 'high' || Boolean(emergencyBody));
    const resolvedEmergencyLevel = emergencyLevel || (emergency ? 'urgent' : 'medium');
    const resolvedUnitsRequired = parseInt(unitsRequired) || 1;

    const priority = calculatePriority({
      emergency,
      bloodGroup: resolvedBloodGroup,
      unitsRequired: resolvedUnitsRequired,
      emergencyLevel: resolvedEmergencyLevel,
      hospitalName: isHospital ? req.user.hospitalName : undefined,
      hospitalInvolved: isHospital,
      requesterRole: req.user.role,
    });

    const bloodRequest = await BloodRequest.create({
      requesterId: req.user._id,
      donorId: donor._id,
      bloodGroup: resolvedBloodGroup,
      message: message?.trim() || undefined,
      emergency,
      hospitalName: isHospital ? req.user.hospitalName : undefined,
      requestType: 'direct',
      patientName: patientName?.trim() || undefined,
      unitsRequired: resolvedUnitsRequired,
      city: city?.trim() || req.user.city || undefined,
      location: location?.trim() || undefined,
      requiredBefore: requiredBefore || undefined,
      reason: reason || undefined,
      allowContact: allowContact !== false,
      emergencyLevel: resolvedEmergencyLevel,
      priorityScore: priority.score,
      priorityLevel: priority.level,
      locationCoords: (latitude !== undefined && longitude !== undefined && latitude !== null && longitude !== null) ? {
        latitude: Number(latitude),
        longitude: Number(longitude),
      } : undefined,
    });

    const populated = await populateRequest(BloodRequest.findById(bloodRequest._id));
    const formatted = formatRequest(populated);

    if (formatted.emergency) {
      emitNewEmergencyRequest(formatted);
    }

    emitNewRequest(donor._id, {
      requestId: formatted._id,
      requesterId: req.user._id,
      requesterName: formatted.requester?.hospitalName || formatted.requester?.name,
      donorId: donor._id,
      bloodGroup: formatted.bloodGroup,
      message: formatted.message,
      emergency: formatted.emergency,
      createdAt: formatted.createdAt,
      request: formatted,
    });

    emitAdminUpdate({
      action: 'request_created',
      request: formatted,
      createdAt: formatted.createdAt,
    });

    res.status(201).json({
      success: true,
      message: emergency ? 'Emergency blood request sent successfully' : 'Blood request sent successfully',
      request: formatted,
    });
  } else if (requestType === 'broadcast') {
    const {
      patientName,
      unitsRequired,
      location,
      requiredBefore,
      reason,
      allowContact,
      latitude,
      longitude,
    } = req.body;

    if (!bloodGroup || !BLOOD_GROUPS.includes(bloodGroup)) {
      throw new AppError('Valid blood group is required', 400);
    }

    if (!city || !city.trim()) {
      throw new AppError('City is required for broadcast requests', 400);
    }

    const isHospital = req.user.role === 'hospital';
    const emergency = isHospital ? true : Boolean(emergencyBody);
    const resolvedEmergencyLevel = emergencyLevel || (emergency ? 'urgent' : 'medium');
    const resolvedUnitsRequired = Number(unitsRequired) || 1;

    const priority = calculatePriority({
      emergency,
      bloodGroup,
      unitsRequired: resolvedUnitsRequired,
      emergencyLevel: resolvedEmergencyLevel,
      hospitalName: isHospital ? req.user.hospitalName : undefined,
      hospitalInvolved: isHospital,
      requesterRole: req.user.role,
    });

    const bloodRequest = await BloodRequest.create({
      requesterId: req.user._id,
      bloodGroup,
      city: city.trim(),
      message: message?.trim() || undefined,
      emergency,
      hospitalName: isHospital ? req.user.hospitalName : undefined,
      requestType: 'broadcast',
      emergencyLevel: resolvedEmergencyLevel,
      status: 'active',
      patientName: patientName?.trim() || undefined,
      unitsRequired: resolvedUnitsRequired,
      location: location?.trim() || undefined,
      requiredBefore: requiredBefore ? new Date(requiredBefore) : undefined,
      reason: reason || 'Custom Message',
      allowContact: allowContact !== false,
      priorityScore: priority.score,
      priorityLevel: priority.level,
      locationCoords: (latitude !== undefined && longitude !== undefined && latitude !== null && longitude !== null) ? {
        latitude: Number(latitude),
        longitude: Number(longitude),
      } : undefined,
    });

    const populated = await BloodRequest.findById(bloodRequest._id)
      .populate('requesterId', requesterFields);

    const formatted = formatRequest(populated);

    if (formatted.emergency) {
      emitNewEmergencyRequest(formatted);
    }

    emitBroadcastRequest({
      requestId: formatted._id,
      requesterId: req.user._id,
      requesterName: formatted.requester?.hospitalName || formatted.requester?.name,
      bloodGroup: formatted.bloodGroup,
      city: bloodRequest.city,
      message: formatted.message,
      emergencyLevel: bloodRequest.emergencyLevel,
      emergency: formatted.emergency,
      createdAt: formatted.createdAt,
      patientName: formatted.patientName,
      unitsRequired: formatted.unitsRequired,
      location: formatted.location,
      requiredBefore: formatted.requiredBefore,
      reason: formatted.reason,
      allowContact: formatted.allowContact,
    });

    emitAdminUpdate({
      action: 'request_created',
      request: formatted,
      createdAt: formatted.createdAt,
    });

    res.status(201).json({
      success: true,
      message: 'Emergency broadcast request sent successfully',
      request: formatted,
    });
  } else {
    throw new AppError('Invalid request type', 400);
  }
});

export const getBroadcastRequests = asyncHandler(async (req, res) => {
  const { bloodGroup, city, emergencyLevel, status } = req.query;
  const filter = { requestType: 'broadcast', isDeleted: { $ne: true } };

  if (bloodGroup && BLOOD_GROUPS.includes(bloodGroup)) {
    filter.bloodGroup = bloodGroup;
  }
  if (city && city.trim()) {
    filter.city = { $regex: new RegExp(city.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') };
  }
  if (emergencyLevel) {
    filter.emergencyLevel = emergencyLevel;
  }
  if (status) {
    filter.status = status;
  }

  const requests = await BloodRequest.find(filter)
    .populate('requesterId', requesterFields)
    .populate('volunteers.donorId', 'name email bloodGroup city availability phoneNumber')
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: requests.length,
    requests: requests.map(formatRequest),
  });
});

export const volunteerForRequest = asyncHandler(async (req, res) => {
  const bloodRequest = await BloodRequest.findById(req.params.id);

  if (!bloodRequest) {
    throw new AppError('Broadcast request not found', 404);
  }

  if (bloodRequest.requestType !== 'broadcast') {
    throw new AppError('You can only volunteer for broadcast requests', 400);
  }

  const donorId = req.user._id;
  const alreadyVolunteered = bloodRequest.volunteers.some((v) => v.donorId.equals(donorId));

  if (alreadyVolunteered) {
    throw new AppError('You have already volunteered for this request', 400);
  }

  bloodRequest.volunteers.push({
    donorId,
    status: 'volunteered',
    volunteeredAt: new Date(),
  });

  await bloodRequest.save();

  const updated = await BloodRequest.findById(bloodRequest._id)
    .populate('requesterId', requesterFields)
    .populate('volunteers.donorId', 'name email bloodGroup city availability phoneNumber');

  const formatted = formatRequest(updated);

  emitAdminUpdate({
    action: 'request_status_changed',
    request: formatted,
    createdAt: new Date().toISOString(),
  });

  res.status(200).json({
    success: true,
    message: 'Thank you for volunteering! The requester has been notified.',
    request: formatted,
  });
});

export const getReceivedRequests = asyncHandler(async (req, res) => {
  const requests = await populateRequest(
    BloodRequest.find({ donorId: req.user._id }).sort({ createdAt: -1 })
  );

  res.status(200).json({
    success: true,
    count: requests.length,
    requests: requests.map(formatRequest),
  });
});

export const getSentRequests = asyncHandler(async (req, res) => {
  const requests = await populateRequest(
    BloodRequest.find({ requesterId: req.user._id }).sort({ createdAt: -1 })
  );

  res.status(200).json({
    success: true,
    count: requests.length,
    requests: requests.map(formatRequest),
  });
});

export const getDonationHistory = asyncHandler(async (req, res) => {
  const requests = await populateRequest(
    BloodRequest.find({ donorId: req.user._id, status: 'accepted' }).sort({ updatedAt: -1 })
  );

  res.status(200).json({
    success: true,
    count: requests.length,
    donations: requests.map(formatRequest),
  });
});

export const getRequestStats = asyncHandler(async (req, res) => {
  const { role } = req.user;

  if (role === 'donor') {
    const donorFilter = { donorId: req.user._id };
    const [totalRequestsReceived, pendingRequests, acceptedRequests, rejectedRequests] =
      await Promise.all([
        BloodRequest.countDocuments(donorFilter),
        BloodRequest.countDocuments({ ...donorFilter, status: 'pending' }),
        BloodRequest.countDocuments({ ...donorFilter, status: 'accepted' }),
        BloodRequest.countDocuments({ ...donorFilter, status: 'rejected' }),
      ]);

    return res.status(200).json({
      success: true,
      stats: {
        totalRequestsReceived,
        pendingRequests,
        acceptedRequests,
        rejectedRequests,
      },
    });
  }

  if (role === 'user' || role === 'hospital') {
    const requesterFilter = { requesterId: req.user._id };
    const [totalSent, pendingRequests, acceptedRequests, rejectedRequests, emergencyRequests] =
      await Promise.all([
        BloodRequest.countDocuments(requesterFilter),
        BloodRequest.countDocuments({ ...requesterFilter, status: 'pending' }),
        BloodRequest.countDocuments({ ...requesterFilter, status: 'accepted' }),
        BloodRequest.countDocuments({ ...requesterFilter, status: 'rejected' }),
        BloodRequest.countDocuments({ ...requesterFilter, emergency: true }),
      ]);

    return res.status(200).json({
      success: true,
      stats: {
        totalSent,
        pendingRequests,
        acceptedRequests,
        rejectedRequests,
        emergencyRequests,
        activeRequests: pendingRequests + acceptedRequests,
      },
    });
  }

  throw new AppError('Stats not available for this role', 403);
});

export const getEmergencyRequests = asyncHandler(async (req, res) => {
  const requests = await populateRequest(
    BloodRequest.find({ requesterId: req.user._id, emergency: true }).sort({ createdAt: -1 })
  );

  res.status(200).json({
    success: true,
    count: requests.length,
    requests: requests.map(formatRequest),
  });
});

export const updateRequestStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;

  if (!['accepted', 'rejected'].includes(status)) {
    throw new AppError('Status must be accepted or rejected', 400);
  }

  const bloodRequest = await BloodRequest.findById(req.params.id);

  if (!bloodRequest) {
    throw new AppError('Request not found', 404);
  }

  if (!bloodRequest.donorId.equals(req.user._id)) {
    throw new AppError('Only the donor can update this request', 403);
  }

  if (bloodRequest.status !== 'pending') {
    throw new AppError(`Request has already been ${bloodRequest.status}`, 400);
  }

  bloodRequest.status = status;
  await bloodRequest.save();

  const populated = await populateRequest(BloodRequest.findById(bloodRequest._id));
  const formatted = formatRequest(populated);

  emitRequestResponse(bloodRequest.requesterId.toString(), {
    requestId: formatted._id,
    donorId: formatted.donor?._id || bloodRequest.donorId,
    donorName: formatted.donor?.name,
    requesterId: bloodRequest.requesterId,
    status: formatted.status,
    bloodGroup: formatted.bloodGroup,
    createdAt: formatted.updatedAt || formatted.createdAt,
    request: formatted,
  });

  emitAdminUpdate({
    action: 'request_status_changed',
    request: formatted,
    createdAt: formatted.updatedAt || formatted.createdAt,
  });

  res.status(200).json({
    success: true,
    message: `Request ${status}`,
    request: formatted,
  });
});
export const completeRequest = asyncHandler(async (req, res) => {
  const bloodRequest = await BloodRequest.findById(req.params.id)
    .populate('requesterId')
    .populate('donorId');

  if (!bloodRequest) {
    throw new AppError('Request not found', 404);
  }

  if (!bloodRequest.donorId._id.equals(req.user._id)) {
    throw new AppError('Only the donor can complete this request', 403);
  }

  if (bloodRequest.status !== 'accepted') {
    throw new AppError('Only accepted requests can be completed', 400);
  }

  if (bloodRequest.completed) {
    throw new AppError('Request already completed', 400);
  }

  // ✅ mark completed
  bloodRequest.completed = true;
  bloodRequest.completedAt = new Date();

  await bloodRequest.save();

  // 🏥 HOSPITAL DONOR DATABASE UPDATE (FIXED VERSION)
  const hospitalId =
    bloodRequest.requesterId.role === 'hospital'
      ? bloodRequest.requesterId._id
      : null;

  if (hospitalId) {
    const donor = bloodRequest.donorId;

    const existing = await HospitalDonor.findOne({
      hospitalId,
      donorId: donor._id,
    });

    if (existing) {
      existing.totalDonations += 1;
      existing.lastDonationDate = new Date();

      // ✅ update snapshot info (IMPORTANT FIX)
      existing.name = donor.name;
      existing.phoneNumber = donor.phoneNumber;
      existing.email = donor.email;
      existing.city = donor.city;

      await existing.save();

      // Trigger Donor Updated alert for hospital
      await emitHospitalDonorUpdated(hospitalId, donor.name);
    } else {
      await HospitalDonor.create({
        hospitalId,
        donorId: donor._id,

        // ✅ snapshot data for emergency contact
        name: donor.name,
        phoneNumber: donor.phoneNumber,
        email: donor.email,

        bloodGroup: bloodRequest.bloodGroup,
        city: donor.city,

        totalDonations: 1,
        lastDonationDate: new Date(),
      });

      // Trigger Donor Added alert for hospital
      await emitHospitalDonorAdded(hospitalId, donor.name, bloodRequest.bloodGroup);
    }
  }

  // return updated request
  const updated = await BloodRequest.findById(req.params.id)
    .populate('requesterId', requesterFields)
    .populate('donorId', donorFields);

  const formatted = formatRequest(updated);

  res.status(200).json({
    success: true,
    message: 'Donation marked as completed',
    request: formatted,
  });
});

// Hospital responds to a broadcast request
export const respondToBroadcastRequest = asyncHandler(async (req, res) => {
  const bloodRequest = await BloodRequest.findById(req.params.id);

  if (!bloodRequest) {
    throw new AppError('Blood request not found', 404);
  }

  if (req.user.role !== 'hospital') {
    throw new AppError('Only hospitals can respond to blood requests', 403);
  }

  const hospitalName = req.user.hospitalName || req.user.name;
  const title = 'Hospital Response';
  const message = `${hospitalName} responded to your blood request`;
  const metadata = {
    hospitalName,
    requestId: bloodRequest._id.toString(),
  };

  const notification = await Notification.create({
    recipientId: bloodRequest.requesterId,
    type: 'request_response',
    title,
    message,
    metadata,
  });

  const body = {
    _id: notification._id.toString(),
    type: 'request_response',
    read: false,
    title,
    message,
    createdAt: notification.createdAt.toISOString(),
    metadata,
    status: 'hospital_responded',
    hospitalName,
    requestId: bloodRequest._id.toString(),
  };

  emitToUser(bloodRequest.requesterId, 'request_response', body);

  res.status(200).json({
    success: true,
    message: 'Response sent to the requester',
  });
});

export const closeBroadcastRequest = asyncHandler(async (req, res) => {
  const bloodRequest = await populateRequest(BloodRequest.findById(req.params.id));
  if (!bloodRequest) {
    throw new AppError('Broadcast request not found', 404);
  }

  if (bloodRequest.requestType !== 'broadcast') {
    throw new AppError('Only broadcast requests can be closed', 400);
  }

  // Ensure only the creator can close it
  if (!bloodRequest.requesterId._id.equals(req.user._id)) {
    throw new AppError('Only the creator can resolve this request', 403);
  }

  if (bloodRequest.status === 'closed') {
    throw new AppError('Request is already closed', 400);
  }

  bloodRequest.status = 'closed';
  bloodRequest.resolvedAt = new Date();
  bloodRequest.resolvedBy = req.user._id;

  await bloodRequest.save();

  const formatted = formatRequest(bloodRequest);

  // Emit resolution event to sockets and create notifications
  const creatorName = req.user.hospitalName || req.user.name;
  await emitBroadcastResolved({
    requestId: formatted._id,
    resolverName: creatorName,
    bloodGroup: formatted.bloodGroup,
    city: formatted.city,
  });

  res.status(200).json({
    success: true,
    message: 'Emergency request resolved successfully',
    request: formatted,
  });
});