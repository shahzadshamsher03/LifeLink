import mongoose from 'mongoose';
import User, { BLOOD_GROUPS, ROLES } from '../models/User.js';
import BloodRequest from '../models/BloodRequest.js';
import HospitalDonor from '../models/HospitalDonor.js';
import asyncHandler from '../utils/asyncHandler.js';
import AppError from '../utils/AppError.js';
import { emitAdminUpdate, emitAccountUpdate, emitToUser, emitBroadcastDeleted } from '../sockets/socketManager.js';
import Notification from '../models/Notification.js';

const requesterFields = 'name email role hospitalName';
const donorFields = 'name bloodGroup';

const validateObjectId = (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Invalid user ID', 400);
  }
};

const formatAdminUser = (user) => {
  const json = user.toPublicJSON();
  let status = 'active';
  if (user.isBlocked) status = 'blocked';
  else if (user.isDeactivated) status = 'deactivated';

  return {
    ...json,
    status,
    isBlocked: Boolean(user.isBlocked),
    isDeactivated: Boolean(user.isDeactivated),
    isVerified: Boolean(user.isVerified),
    isHospitalVerified: Boolean(user.isHospitalVerified),
  };
};

const notifyAdminChange = (action, targetUser, extra = {}) => {
  emitAdminUpdate({
    action,
    targetUserId: targetUser?._id?.toString(),
    user: targetUser ? formatAdminUser(targetUser) : undefined,
    createdAt: new Date().toISOString(),
    ...extra,
  });
};

const notifyAccountChange = (action, targetUser, message) => {
  if (!targetUser?._id) return;
  emitAccountUpdate(targetUser._id.toString(), {
    action,
    message,
    createdAt: new Date().toISOString(),
  });
};

export const getStats = asyncHandler(async (req, res) => {
  const [
    totalUsers,
    totalDonors,
    totalHospitals,
    activeUsers,
    recentUsers,
    donorsByBloodGroup,
    usersByRole,
    requestStatusBreakdown,
    recentRequests,
    totalBroadcastRequests,
    activeBroadcastRequests,
    resolvedBroadcastRequests,
    deletedBroadcastRequests,
    volunteersRes,
    broadcastDemandStats,
    criticalRequestsCount,
    highRequestsCount,
    emergencyRequestsByPriority,
    requestsByPriorityLevel,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ role: 'donor' }),
    User.countDocuments({ role: 'hospital' }),
    User.countDocuments({ isBlocked: { $ne: true } }),
    User.find()
      .select('name email role isBlocked createdAt')
      .sort({ createdAt: -1 })
      .limit(8),
    User.aggregate([
      { $match: { role: 'donor', bloodGroup: { $exists: true, $nin: [null, ''] } } },
      { $group: { _id: '$bloodGroup', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
    BloodRequest.aggregate([
      { $match: { isDeleted: { $ne: true } } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    BloodRequest.find({ isDeleted: { $ne: true } })
      .sort({ createdAt: -1 })
      .limit(8)
      .populate('requesterId', requesterFields)
      .populate('donorId', donorFields),
    BloodRequest.countDocuments({ requestType: 'broadcast', isDeleted: { $ne: true } }),
    BloodRequest.countDocuments({ requestType: 'broadcast', status: { $in: ['active', 'pending'] }, isDeleted: { $ne: true } }),
    BloodRequest.countDocuments({ requestType: 'broadcast', status: 'closed', isDeleted: { $ne: true } }),
    BloodRequest.countDocuments({ requestType: 'broadcast', isDeleted: true }),
    BloodRequest.aggregate([
      { $match: { requestType: 'broadcast', isDeleted: { $ne: true } } },
      { $project: { volunteersCount: { $size: { $ifNull: ['$volunteers', []] } } } },
      { $group: { _id: null, total: { $sum: '$volunteersCount' } } }
    ]),
    BloodRequest.aggregate([
      { $match: { requestType: 'broadcast', isDeleted: { $ne: true } } },
      { $group: { _id: '$bloodGroup', count: { $sum: 1 } } }
    ]),
    BloodRequest.countDocuments({ priorityLevel: 'Critical', isDeleted: { $ne: true } }),
    BloodRequest.countDocuments({ priorityLevel: 'High', isDeleted: { $ne: true } }),
    BloodRequest.aggregate([
      { $match: { emergency: true, isDeleted: { $ne: true } } },
      { $group: { _id: '$priorityLevel', count: { $sum: 1 } } }
    ]),
    BloodRequest.aggregate([
      { $match: { isDeleted: { $ne: true } } },
      { $group: { _id: '$priorityLevel', count: { $sum: 1 } } }
    ])
  ]);

  const totalVolunteers = volunteersRes[0]?.total || 0;
  const bloodGroupDemand = {};
  BLOOD_GROUPS.forEach(bg => { bloodGroupDemand[bg] = 0; });
  broadcastDemandStats.forEach(stat => {
    if (stat._id) {
      bloodGroupDemand[stat._id] = stat.count;
    }
  });

  const emergencyPriorityDemand = { Low: 0, Medium: 0, High: 0, Critical: 0 };
  emergencyRequestsByPriority.forEach(stat => {
    if (stat._id) {
      emergencyPriorityDemand[stat._id] = stat.count;
    }
  });

  const priorityLevelChartData = { Low: 0, Medium: 0, High: 0, Critical: 0 };
  requestsByPriorityLevel.forEach(stat => {
    if (stat._id) {
      priorityLevelChartData[stat._id] = stat.count;
    }
  });

  res.status(200).json({
    success: true,
    data: {
      stats: {
        totalUsers,
        totalDonors,
        totalHospitals,
        activeUsers,
        totalRequests: requestStatusBreakdown.reduce((sum, r) => sum + r.count, 0),
        totalBroadcastRequests,
        activeBroadcastRequests,
        resolvedBroadcastRequests,
        deletedBroadcastRequests,
        totalVolunteers,
        bloodGroupDemand,
        criticalRequestsCount,
        highRequestsCount,
        emergencyPriorityDemand,
      },
      recentUsers: recentUsers.map(formatAdminUser),
      charts: {
        donorsByBloodGroup: donorsByBloodGroup.map((d) => ({
          bloodGroup: d._id,
          count: d.count,
        })),
        usersByRole: usersByRole.map((r) => ({ role: r._id, count: r.count })),
        requestStatusBreakdown: requestStatusBreakdown.map((r) => ({
          status: r._id,
          count: r.count,
        })),
        requestsByPriorityLevel: Object.entries(priorityLevelChartData).map(([level, count]) => ({
          priorityLevel: level,
          count,
        })),
      },
      recentRequests: recentRequests.map((r) => ({
        _id: r._id,
        bloodGroup: r.bloodGroup,
        status: r.status,
        emergency: r.emergency,
        createdAt: r.createdAt,
        requesterName: r.requesterId?.hospitalName || r.requesterId?.name,
        donorName: r.donorId?.name,
        priorityScore: r.priorityScore,
        priorityLevel: r.priorityLevel,
      })),
    },
  });
});

export const getUsers = asyncHandler(async (req, res) => {
  const { search, role } = req.query;
  const query = {};

  if (role && ROLES.includes(role)) {
    query.role = role;
  }

  if (search?.trim()) {
    const term = search.trim();
    const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    query.$or = [{ name: regex }, { email: regex }];
  }

  const users = await User.find(query).sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: users.length,
    users: users.map(formatAdminUser),
  });
});

export const deleteUser = asyncHandler(async (req, res) => {
  validateObjectId(req.params.id);

  if (req.params.id === req.user._id.toString()) {
    throw new AppError('You cannot delete your own account', 400);
  }

  const user = await User.findById(req.params.id);

  if (!user) {
    throw new AppError('User not found', 404);
  }

  if (user.role === 'admin') {
    throw new AppError('Admin accounts cannot be deleted from this panel', 400);
  }

  const snapshot = formatAdminUser(user);
  await user.deleteOne();

  emitAdminUpdate({
    action: 'user_deleted',
    targetUserId: req.params.id,
    user: snapshot,
    createdAt: new Date().toISOString(),
  });

  res.status(200).json({
    success: true,
    message: 'User deleted successfully',
  });
});

export const toggleUserBlock = asyncHandler(async (req, res) => {
  validateObjectId(req.params.id);

  if (req.params.id === req.user._id.toString()) {
    throw new AppError('You cannot block your own account', 400);
  }

  const user = await User.findById(req.params.id);

  if (!user) {
    throw new AppError('User not found', 404);
  }

  if (user.role === 'admin') {
    throw new AppError('Admin accounts cannot be blocked', 400);
  }

  if (typeof req.body.blocked === 'boolean') {
    user.isBlocked = req.body.blocked;
  } else {
    user.isBlocked = !user.isBlocked;
  }

  await user.save();

  notifyAdminChange(user.isBlocked ? 'user_blocked' : 'user_unblocked', user);
  notifyAccountChange(
    user.isBlocked ? 'user_blocked' : 'user_unblocked',
    user,
    user.isBlocked
      ? 'Your account has been blocked by an administrator'
      : 'Your account has been unblocked'
  );

  res.status(200).json({
    success: true,
    message: user.isBlocked ? 'User blocked successfully' : 'User unblocked successfully',
    user: formatAdminUser(user),
  });
});

export const getDonors = asyncHandler(async (req, res) => {
  const { bloodGroup, city } = req.query;
  const query = { role: 'donor' };

  if (bloodGroup && BLOOD_GROUPS.includes(bloodGroup)) {
    query.bloodGroup = bloodGroup;
  }

  if (city?.trim()) {
    query.city = { $regex: new RegExp(`^${city.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') };
  }

  const donors = await User.find(query).sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: donors.length,
    donors: donors.map(formatAdminUser),
  });
});

export const deleteDonor = asyncHandler(async (req, res) => {
  validateObjectId(req.params.id);

  const donor = await User.findOne({ _id: req.params.id, role: 'donor' });

  if (!donor) {
    throw new AppError('Donor not found', 404);
  }

  const snapshot = formatAdminUser(donor);
  await donor.deleteOne();

  emitAdminUpdate({
    action: 'donor_deleted',
    targetUserId: req.params.id,
    user: snapshot,
    createdAt: new Date().toISOString(),
  });

  res.status(200).json({
    success: true,
    message: 'Donor deleted successfully',
  });
});

export const getHospitals = asyncHandler(async (req, res) => {
  const hospitals = await User.find({ role: 'hospital' }).sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: hospitals.length,
    hospitals: hospitals.map((h) => ({
      ...formatAdminUser(h),
      hospitalName: h.hospitalName,
      licenseNumber: h.licenseNumber,
      city: h.city,
    })),
  });
});

export const toggleHospitalVerify = asyncHandler(async (req, res) => {
  validateObjectId(req.params.id);

  const hospital = await User.findOne({ _id: req.params.id, role: 'hospital' });

  if (!hospital) {
    throw new AppError('Hospital not found', 404);
  }

  if (typeof req.body.verified === 'boolean') {
    hospital.isHospitalVerified = req.body.verified;
  } else {
    hospital.isHospitalVerified = !hospital.isHospitalVerified;
  }

  await hospital.save();

  notifyAdminChange(hospital.isHospitalVerified ? 'hospital_verified' : 'hospital_unverified', hospital);

  if (hospital.isHospitalVerified) {
    const title = 'Hospital Verified';
    const message = 'Your hospital account has been approved. You now have full access to hospital features.';
    
    const notification = await Notification.create({
      recipientId: hospital._id,
      type: 'request_response',
      title,
      message,
      metadata: {
        hospitalId: hospital._id.toString(),
      },
    });

    const body = {
      _id: notification._id.toString(),
      type: 'request_response',
      read: false,
      title,
      message,
      createdAt: notification.createdAt.toISOString(),
      metadata: {
        hospitalId: hospital._id.toString(),
      },
      status: 'hospital_verified',
      donorName: hospital.hospitalName || hospital.name,
    };

    emitToUser(hospital._id, 'request_response', body);
  }

  res.status(200).json({
    success: true,
    message: hospital.isHospitalVerified
      ? 'Hospital verified successfully'
      : 'Hospital verification removed',
    hospital: formatAdminUser(hospital),
  });
});

export const toggleHospitalBlock = asyncHandler(async (req, res) => {
  validateObjectId(req.params.id);

  const hospital = await User.findOne({ _id: req.params.id, role: 'hospital' });

  if (!hospital) {
    throw new AppError('Hospital not found', 404);
  }

  if (typeof req.body.blocked === 'boolean') {
    hospital.isBlocked = req.body.blocked;
  } else {
    hospital.isBlocked = !hospital.isBlocked;
  }

  await hospital.save();

  notifyAdminChange(hospital.isBlocked ? 'hospital_blocked' : 'hospital_unblocked', hospital);
  notifyAccountChange(
    hospital.isBlocked ? 'hospital_blocked' : 'hospital_unblocked',
    hospital,
    hospital.isBlocked
      ? 'Your hospital account has been blocked'
      : 'Your hospital account has been unblocked'
  );

  res.status(200).json({
    success: true,
    message: hospital.isBlocked
      ? 'Hospital blocked successfully'
      : 'Hospital unblocked successfully',
    hospital: formatAdminUser(hospital),
  });
});

export const getUserDetails = asyncHandler(async (req, res) => {
  const { id } = req.params;
  validateObjectId(id);

  const user = await User.findById(id);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  // Get aggregated request stats using MongoDB aggregation
  const sentStats = await BloodRequest.aggregate([
    { $match: { requesterId: new mongoose.Types.ObjectId(id) } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
        accepted: { $sum: { $cond: [{ $eq: ['$status', 'accepted'] }, 1, 0] } },
        rejected: { $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] } },
        emergency: { $sum: { $cond: [{ $eq: ['$emergency', true] }, 1, 0] } },
        broadcast: { $sum: { $cond: [{ $eq: ['$requestType', 'broadcast'] }, 1, 0] } },
      },
    },
  ]);

  const receivedStats = await BloodRequest.aggregate([
    { $match: { donorId: new mongoose.Types.ObjectId(id) } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
        accepted: { $sum: { $cond: [{ $eq: ['$status', 'accepted'] }, 1, 0] } },
        rejected: { $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] } },
      },
    },
  ]);

  const sent = sentStats[0] || { total: 0, pending: 0, accepted: 0, rejected: 0, emergency: 0, broadcast: 0 };
  const received = receivedStats[0] || { total: 0, pending: 0, accepted: 0, rejected: 0 };

  const activity = {
    totalRequestsSent: sent.total,
    totalRequestsReceived: received.total,
    acceptedRequests: user.role === 'donor' ? received.accepted : sent.accepted,
    rejectedRequests: user.role === 'donor' ? received.rejected : sent.rejected,
    pendingRequests: user.role === 'donor' ? received.pending : sent.pending,
  };

  let roleSpecificData = {};

  if (user.role === 'donor') {
    const lastDonation = await BloodRequest.findOne({ donorId: id, status: 'accepted' }).sort({ updatedAt: -1 });

    const hospitalConnections = await HospitalDonor.aggregate([
      { $match: { donorId: new mongoose.Types.ObjectId(id) } },
      {
        $lookup: {
          from: 'users',
          localField: 'hospitalId',
          foreignField: '_id',
          as: 'hospital',
        },
      },
      { $unwind: { path: '$hospital', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          hospitalId: 1,
          hospitalName: '$hospital.hospitalName',
          name: '$hospital.name',
          email: '$hospital.email',
          phoneNumber: '$hospital.phoneNumber',
          city: '$hospital.city',
          createdAt: 1,
        },
      },
    ]);

    const totalReceived = received.total;
    const acceptedCount = received.accepted;
    const acceptanceRate = totalReceived > 0 ? Math.round((acceptedCount / totalReceived) * 100) : 0;

    roleSpecificData = {
      availabilityStatus: user.availability,
      lastDonationDate: lastDonation ? lastDonation.updatedAt : null,
      totalDonations: acceptedCount,
      canContact: true,
      emergencyEligible: user.availability,
      requestStats: {
        received: totalReceived,
        accepted: acceptedCount,
        rejected: received.rejected,
        acceptanceRate,
      },
      hospitalConnections: {
        count: hospitalConnections.length,
        hospitals: hospitalConnections,
      },
    };
  } else if (user.role === 'hospital') {
    const totalSavedDonors = await HospitalDonor.countDocuments({ hospitalId: id });
    const lastDonorAddedDoc = await HospitalDonor.findOne({ hospitalId: id }).sort({ createdAt: -1 });

    roleSpecificData = {
      requestsCreated: sent.total,
      broadcastRequestsCreated: sent.broadcast,
      donorsSaved: totalSavedDonors,
      emergencyRequests: sent.emergency,
      directoryInformation: {
        totalSavedDonors,
        lastDonorAdded: lastDonorAddedDoc
          ? {
              name: lastDonorAddedDoc.name,
              createdAt: lastDonorAddedDoc.createdAt,
            }
          : null,
      },
    };
  }

  res.status(200).json({
    success: true,
    user: formatAdminUser(user),
    activity,
    roleSpecificData,
  });
});

export const deleteBroadcast = asyncHandler(async (req, res) => {
  const { id } = req.params;
  validateObjectId(id);

  const bloodRequest = await BloodRequest.findById(id);
  if (!bloodRequest) {
    throw new AppError('Broadcast request not found', 404);
  }

  if (bloodRequest.requestType !== 'broadcast') {
    throw new AppError('Only broadcast requests can be deleted', 400);
  }

  bloodRequest.isDeleted = true;
  await bloodRequest.save();

  // Notify clients through sockets
  emitBroadcastDeleted({ requestId: id });

  res.status(200).json({
    success: true,
    message: 'Broadcast request deleted successfully',
  });
});
