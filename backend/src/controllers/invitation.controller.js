import Invitation from '../models/invitation.model.js';
import ScheduledMeeting from '../models/scheduledMeeting.model.js';
import User from '../models/user.model.js';

const sendError = (res, statusCode, message) => res.status(statusCode).json({ error: message });

export const sendInvitation = async (req, res) => {
  try {
    const { meetingId, inviteeId, message } = req.body;
    const inviterId = req.user.id;

    if (!meetingId || !inviteeId) {
      return sendError(res, 400, 'Meeting ID and invitee ID are required');
    }

    // Check if meeting exists and user is the host
    const meeting = await ScheduledMeeting.findById(meetingId);
    if (!meeting) {
      return sendError(res, 404, 'Meeting not found');
    }

    if (meeting.hostId.toString() !== inviterId) {
      return sendError(res, 403, 'Only the host can send invitations');
    }

    // Check if invitation already exists
    const existingInvitation = await Invitation.findOne({
      meetingId,
      inviteeId,
    });

    if (existingInvitation) {
      return sendError(res, 400, 'Invitation already sent');
    }

    const invitation = new Invitation({
      meetingId,
      inviterId,
      inviteeId,
      message: message || '',
    });

    await invitation.save();
    await invitation.populate('inviterId', 'username email');
    await invitation.populate('inviteeId', 'username email');
    await invitation.populate('meetingId');

    // Add participant to meeting
    meeting.participants.push({
      userId: inviteeId,
      status: 'pending',
    });
    await meeting.save();

    res.status(201).json({
      success: true,
      invitation,
    });
  } catch (error) {
    console.error('Send invitation error:', error);
    sendError(res, 500, 'Internal server error');
  }
};

export const getInvitations = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status } = req.query;

    let query = { inviteeId: userId };
    if (status) {
      query.status = status;
    }

    const invitations = await Invitation.find(query)
      .populate('inviterId', 'username email')
      .populate('meetingId')
      .sort({ createdAt: -1 });

    // Format invitations for frontend
    const formattedInvitations = invitations.map(inv => ({
      id: inv._id,
      inviterName: inv.inviterId.username,
      meetingTitle: inv.meetingId.title,
      meetingId: inv.meetingId._id,
      status: inv.status,
      message: inv.message,
      createdAt: inv.createdAt,
    }));

    res.json({
      success: true,
      invitations: formattedInvitations,
    });
  } catch (error) {
    console.error('Get invitations error:', error);
    sendError(res, 500, 'Internal server error');
  }
};

export const respondToInvitation = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user.id;

    if (!['accepted', 'declined', 'tentative'].includes(status)) {
      return sendError(res, 400, 'Invalid status. Must be accepted, declined, or tentative');
    }

    const invitation = await Invitation.findById(id);
    if (!invitation) {
      return sendError(res, 404, 'Invitation not found');
    }

    if (invitation.inviteeId.toString() !== userId) {
      return sendError(res, 403, 'You can only respond to your own invitations');
    }

    invitation.status = status;
    await invitation.save();

    // Update participant status in meeting
    const meeting = await ScheduledMeeting.findById(invitation.meetingId);
    if (meeting) {
      const participant = meeting.participants.find(
        p => p.userId.toString() === userId
      );
      if (participant) {
        participant.status = status;
        await meeting.save();
      }
    }

    res.json({
      success: true,
      invitation,
    });
  } catch (error) {
    console.error('Respond to invitation error:', error);
    sendError(res, 500, 'Internal server error');
  }
};

export const deleteInvitation = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const invitation = await Invitation.findById(id);
    if (!invitation) {
      return sendError(res, 404, 'Invitation not found');
    }

    // Only inviter or invitee can delete
    if (
      invitation.inviterId.toString() !== userId &&
      invitation.inviteeId.toString() !== userId
    ) {
      return sendError(res, 403, 'You can only delete your own invitations');
    }

    await Invitation.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Invitation deleted successfully',
    });
  } catch (error) {
    console.error('Delete invitation error:', error);
    sendError(res, 500, 'Internal server error');
  }
};

