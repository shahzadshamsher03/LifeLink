import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Notification from '../models/Notification.js';

let io = null;

/** @type {Map<string, { socketId: string, role: string, name: string }>} */
export const onlineUsers = new Map();

const broadcastOnlineUsers = () => {
  if (!io) return;

  const list = Array.from(onlineUsers.entries()).map(([userId, data]) => ({
    userId,
    role: data.role,
    name: data.name,
  }));

  io.emit('user_online_status', list);
};

const logEmit = (event, target, payload) => {
  console.log('SOCKET EVENT EMITTED:', event, { target, payload });
};

const emitToRoom = (room, event, payload) => {
  if (!io) {
    console.warn('Socket.io not initialized — skipped emit:', event);
    return;
  }
  logEmit(event, room, payload);
  io.to(room).emit(event, payload);
};

export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL,
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;

      if (!token) {
        return next(new Error('Authentication required'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);

      if (!user) {
        return next(new Error('User not found'));
      }

      socket.userId = user._id.toString();
      socket.userRole = user.role;
      socket.userName = user.name;

      next();
    } catch {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    onlineUsers.set(socket.userId, {
      socketId: socket.id,
      role: socket.userRole,
      name: socket.userName,
    });

    socket.join(`user:${socket.userId}`);
    socket.join(`role:${socket.userRole}`);

    broadcastOnlineUsers();

    socket.on('disconnect', () => {
      const current = onlineUsers.get(socket.userId);

      if (current?.socketId === socket.id) {
        onlineUsers.delete(socket.userId);
      }

      broadcastOnlineUsers();
    });
  });

  console.log('Socket.io initialized');
  return io;
};

export const getIO = () => io;

export const emitToUser = (userId, event, payload) => {
  if (!userId) return;
  emitToRoom(`user:${userId.toString()}`, event, payload);
};

export const emitToAdmins = (event, payload) => {
  emitToRoom('role:admin', event, payload);
};

export const emitBroadcastRequest = async (payload) => {
  try {
    const isEmergency = Boolean(payload.emergency);
    const bloodGroup = payload.bloodGroup || '';
    const city = payload.city || '';
    const requesterName = payload.requesterName || 'Someone';

    const title = 'Community Blood Request';
    const message = isEmergency
      ? `Emergency ${bloodGroup} blood request posted in ${city}`
      : `An ${bloodGroup} blood request has been posted in ${city}`;

    const metadata = {
      requesterName,
      city,
      bloodGroup,
      emergency: isEmergency,
      requestId: payload.requestId?.toString(),
    };

    // Save to DB for all donors, hospitals, and admins
    const recipients = await User.find({ role: { $in: ['donor', 'hospital', 'admin'] } });

    const notificationPromises = recipients.map((recipient) =>
      Notification.create({
        recipientId: recipient._id,
        type: 'broadcast_request',
        title,
        message,
        metadata,
      })
    );

    const notifications = await Promise.all(notificationPromises);
    const sampleNotification = notifications[0];

    const body = {
      _id: sampleNotification?._id?.toString() || new Date().getTime().toString(),
      type: 'broadcast_request',
      read: false,
      title,
      message,
      createdAt: sampleNotification?.createdAt?.toISOString() || new Date().toISOString(),
      metadata,
      requestId: payload.requestId?.toString(),
      requesterId: payload.requesterId?.toString(),
      requesterName,
      bloodGroup,
      city,
      emergency: isEmergency,
    };

    emitToRoom('role:donor', 'broadcast_request', body);
    emitToRoom('role:hospital', 'broadcast_request', body);
    emitToRoom('role:admin', 'broadcast_request', body);
  } catch (err) {
    console.error('Error in emitBroadcastRequest:', err);
  }
};

/** Blood request created — notify donor only */
export const emitNewRequest = async (donorId, payload) => {
  try {
    const requesterName = payload.requesterName || 'Someone';
    const bloodGroup = payload.bloodGroup || '';
    const city = payload.request?.requester?.city || payload.city || '';
    const emergency = Boolean(payload.emergency);

    let message = emergency
      ? `Emergency: ${requesterName} urgently needs ${bloodGroup} blood in ${city}`
      : `${requesterName} needs ${bloodGroup} blood in ${city}`;

    if (payload.message) {
      message += ` Message: ${payload.message}`;
    }

    const title = 'New Blood Request';
    const metadata = {
      requesterName,
      bloodGroup,
      city,
      emergency,
      requestId: payload.requestId?.toString(),
      requesterId: payload.requesterId?.toString(),
      donorId: payload.donorId?.toString(),
      message: payload.message ?? null,
      request: payload.request,
    };

    const notification = await Notification.create({
      recipientId: donorId,
      type: 'new_request',
      title,
      message,
      metadata,
    });

    const body = {
      _id: notification._id.toString(),
      type: 'new_request',
      read: false,
      title,
      message,
      createdAt: notification.createdAt.toISOString(),
      metadata,
      requestId: payload.requestId?.toString(),
      requesterId: payload.requesterId?.toString(),
      requesterName,
      donorId: payload.donorId?.toString(),
      bloodGroup,
      emergency,
      request: payload.request,
    };

    emitToUser(donorId, 'new_request', body);
  } catch (err) {
    console.error('Error in emitNewRequest:', err);
  }
};

/** Donor accepted/rejected — notify requester (user/hospital) only */
export const emitRequestResponse = async (requesterId, payload) => {
  try {
    const isAccepted = payload.status === 'accepted';
    const donorName = payload.donorName || 'Someone';
    const bloodGroup = payload.bloodGroup || '';
    const donorPhone = payload.request?.donor?.phoneNumber || null;
    const city = payload.request?.donor?.city || '';

    let title = '';
    let message = '';
    let metadata = {};

    if (isAccepted) {
      title = 'Request Accepted';
      message = `${donorName} accepted your ${bloodGroup} blood request`;
      metadata = {
        donorName,
        donorPhone,
        bloodGroup,
        city,
        requestId: payload.requestId?.toString(),
      };
    } else {
      title = 'Request Rejected';
      message = `${donorName} is currently unavailable to donate ${bloodGroup} blood`;
      metadata = {
        donorName,
        bloodGroup,
        requestId: payload.requestId?.toString(),
      };
    }

    const notification = await Notification.create({
      recipientId: requesterId,
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
      requestId: payload.requestId?.toString(),
      donorId: payload.donorId?.toString(),
      donorName,
      requesterId: requesterId.toString(),
      status: payload.status,
      bloodGroup,
      request: payload.request,
    };

    emitToUser(requesterId, 'request_response', body);

    // UI list refresh only (no duplicate notification on frontend)
    emitToUser(requesterId, 'request_updated', { ...body, request: payload.request });
  } catch (err) {
    console.error('Error in emitRequestResponse:', err);
  }
};

/** @deprecated alias */
export const emitRequestUpdated = emitRequestResponse;

export const emitHospitalDonorAdded = async (hospitalId, donorName, bloodGroup) => {
  try {
    const title = 'Donor Added';
    const message = `${donorName} (${bloodGroup}) was added to your emergency donor directory`;
    const metadata = {
      donorName,
      bloodGroup,
    };

    const notification = await Notification.create({
      recipientId: hospitalId,
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
      status: 'donor_added',
      donorName,
      bloodGroup,
    };

    emitToUser(hospitalId, 'request_response', body);
  } catch (err) {
    console.error('Error in emitHospitalDonorAdded:', err);
  }
};

export const emitHospitalDonorUpdated = async (hospitalId, donorName) => {
  try {
    const title = 'Donor Updated';
    const message = `${donorName}'s emergency contact information was updated`;
    const metadata = {
      donorName,
    };

    const notification = await Notification.create({
      recipientId: hospitalId,
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
      status: 'donor_updated',
      donorName,
    };

    emitToUser(hospitalId, 'request_response', body);
  } catch (err) {
    console.error('Error in emitHospitalDonorUpdated:', err);
  }
};

const ADMIN_MESSAGES = {
  user_blocked: 'A user account was blocked',
  user_unblocked: 'A user account was unblocked',
  user_deleted: 'A user account was removed',
  donor_deleted: 'A donor account was removed',
  hospital_verified: 'A hospital was verified',
  hospital_unverified: 'Hospital verification was removed',
  hospital_blocked: 'A hospital was blocked',
  hospital_unblocked: 'A hospital was unblocked',
  request_created: 'A new blood request was created',
  request_status_changed: 'A blood request status was updated',
};

/** Platform admin actions — admins only */
export const emitAdminUpdate = async (payload) => {
  try {
    const action = payload.action;
    const user = payload.user || {};
    const request = payload.request || {};
    const requester = request.requester || {};
    const donor = request.donor || {};

    let title = 'Platform Update';
    let message = 'A platform action occurred';

    switch (action) {
      case 'user_registered':
        title = 'New User Registered';
        message = `${user.name || 'A user'} joined LifeLink from ${user.city || 'Hyderabad'}`;
        break;
      case 'donor_registered':
        title = 'New Donor Registered';
        message = `${user.name || 'A donor'} (${user.bloodGroup || 'A+'}) registered as a donor from ${user.city || 'Vijayawada'}`;
        break;
      case 'hospital_registered':
        title = 'Hospital Registration Pending';
        message = `${user.hospitalName || user.name || 'A hospital'} submitted verification documents`;
        break;
      case 'hospital_verified':
        title = 'Hospital Verified';
        message = `${user.hospitalName || user.name || 'A hospital'} has been successfully verified`;
        break;
      case 'hospital_blocked':
        title = 'Hospital Blocked';
        message = `${user.hospitalName || user.name || 'A hospital'} access was restricted by admin`;
        break;
      case 'hospital_unblocked':
        title = 'Hospital Restored';
        message = `${user.hospitalName || user.name || 'A hospital'} access was restored`;
        break;
      case 'user_blocked':
        title = 'User Blocked';
        message = `${user.name || 'User'}'s account was blocked`;
        break;
      case 'user_unblocked':
        title = 'User Restored';
        message = `${user.name || 'User'}'s account was restored`;
        break;
      case 'user_deactivated':
        title = 'User Account Deactivated';
        message = `${user.name || 'User'} deactivated their account`;
        break;
      case 'user_reactivated':
        title = 'User Account Reactivated';
        message = `${user.name || 'User'} reactivated their account`;
        break;
      case 'request_created':
        if (request.requestType === 'broadcast') {
          title = 'Emergency Broadcast Request';
          message = `${requester.hospitalName || requester.name || 'Someone'} created an urgent ${request.bloodGroup || 'O-'} blood request in ${request.city || 'Visakhapatnam'}`;
        } else {
          title = 'New Blood Request';
          message = `${requester.hospitalName || requester.name || 'Someone'} requested ${request.bloodGroup || 'A+'} blood from ${donor.name || 'Donor'}`;
        }
        break;
      case 'request_status_changed':
        if (request.status === 'accepted') {
          title = 'Donation Request Accepted';
          message = `${donor.name || 'Donor'} accepted ${requester.hospitalName || requester.name || 'Requester'}'s blood request`;
        } else if (request.status === 'rejected') {
          title = 'Donation Request Rejected';
          message = `${donor.name || 'Donor'} rejected ${requester.hospitalName || requester.name || 'Requester'}'s blood request`;
        } else {
          const volunteerCount = request.volunteers?.length || 0;
          title = 'Donation Request Updated';
          message = `${donor.name || 'Donor'} updated blood request to ${request.status || 'pending'} (Volunteers: ${volunteerCount})`;
        }
        break;
      case 'user_deleted':
        title = 'User Deleted';
        message = `${user.name || 'User'}'s account was removed`;
        break;
      case 'donor_deleted':
        title = 'Donor Deleted';
        message = `${user.name || 'Donor'}'s donor account was removed`;
        break;
      case 'hospital_unverified':
        title = 'Hospital Unverified';
        message = `${user.hospitalName || user.name || 'A hospital'}'s verification was removed`;
        break;
      default:
        title = payload.title || 'Platform Update';
        message = payload.message || ADMIN_MESSAGES[action] || 'A platform update occurred';
        break;
    }

    const admins = await User.find({ role: 'admin' });

    const notificationPromises = admins.map((admin) =>
      Notification.create({
        recipientId: admin._id,
        type: 'admin_update',
        title,
        message,
        metadata: {
          action,
          targetUserId: payload.targetUserId?.toString() || null,
          user: payload.user,
          request: payload.request,
        },
      })
    );

    const notifications = await Promise.all(notificationPromises);
    const sampleNotification = notifications[0];

    const body = {
      _id: sampleNotification?._id?.toString() || new Date().getTime().toString(),
      type: 'admin_update',
      read: false,
      title,
      message,
      createdAt: sampleNotification?.createdAt?.toISOString() || new Date().toISOString(),
      metadata: {
        action,
        targetUserId: payload.targetUserId?.toString() || null,
        user: payload.user,
        request: payload.request,
      },
      action,
      targetUserId: payload.targetUserId?.toString() || null,
      user: payload.user,
      request: payload.request,
    };

    emitToAdmins('admin_update', body);
  } catch (err) {
    console.error('Error in emitAdminUpdate:', err);
  }
};

/** Account status change for affected user (not shown in admin feed) */
export const emitAccountUpdate = (userId, payload) => {
  emitToUser(userId, 'account_update', {
    action: payload.action,
    message: payload.message || 'Your account was updated by an administrator',
    createdAt: payload.createdAt || new Date().toISOString(),
  });
};

export const emitBroadcastResolved = async (payload) => {
  try {
    const resolverName = payload.resolverName || 'Someone';
    const bloodGroup = payload.bloodGroup || '';
    const city = payload.city || '';
    const title = 'Emergency Request Resolved';
    const message = `${resolverName} marked the ${bloodGroup} emergency request in ${city} as resolved.`;

    const metadata = {
      resolverName,
      city,
      bloodGroup,
      requestId: payload.requestId?.toString(),
    };

    // Save to DB for all donors, hospitals, and admins
    const recipients = await User.find({ role: { $in: ['donor', 'hospital', 'admin'] } });

    const notificationPromises = recipients.map((recipient) =>
      Notification.create({
        recipientId: recipient._id,
        type: 'broadcast_request',
        title,
        message,
        metadata,
      })
    );

    const notifications = await Promise.all(notificationPromises);
    const sampleNotification = notifications[0];

    const body = {
      _id: sampleNotification?._id?.toString() || new Date().getTime().toString(),
      type: 'broadcast_request',
      read: false,
      title,
      message,
      createdAt: sampleNotification?.createdAt?.toISOString() || new Date().toISOString(),
      metadata,
      requestId: payload.requestId?.toString(),
      status: 'closed',
    };

    emitToRoom('role:donor', 'broadcast_resolved', body);
    emitToRoom('role:hospital', 'broadcast_resolved', body);
    emitToRoom('role:admin', 'broadcast_resolved', body);
  } catch (err) {
    console.error('Error in emitBroadcastResolved:', err);
  }
};

export const emitBroadcastDeleted = (payload) => {
  const body = {
    requestId: payload.requestId?.toString(),
  };
  emitToRoom('role:donor', 'broadcast_deleted', body);
  emitToRoom('role:hospital', 'broadcast_deleted', body);
  emitToRoom('role:admin', 'broadcast_deleted', body);
};

export const emitDonorLocationUpdated = (userId, location) => {
  if (!io) return;
  io.emit('donor_location_updated', { userId, location });
};

export const emitDonorAvailabilityUpdated = (userId, availability) => {
  if (!io) return;
  io.emit('donor_availability_updated', { userId, availability });
};

export const emitHospitalLocationUpdated = (userId, location) => {
  if (!io) return;
  io.emit('hospital_location_updated', { userId, location });
};

export const emitNewEmergencyRequest = (request) => {
  if (!io) return;
  io.emit('new_emergency_request', request);
};

