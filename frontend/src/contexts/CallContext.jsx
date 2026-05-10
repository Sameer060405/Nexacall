import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import presenceService from '../services/presence.service';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

const CallContext = createContext(null);

export function useCall() {
    return useContext(CallContext);
}

export function CallProvider({ children }) {
    const navigate = useNavigate();
    const { user }  = useAuth();
    const toast     = useToast();

    const [incomingCall, setIncomingCall] = useState(null);
    // outgoingCall: { user, callType, roomCode }
    const [outgoingCall, setOutgoingCall] = useState(null);

    useEffect(() => {
        const unsubs = [
            presenceService.on('call-incoming', (data) => {
                setIncomingCall(data);
            }),
            presenceService.on('call-accepted', ({ roomCode }) => {
                setOutgoingCall(null);
                navigate(`/${roomCode}`);
            }),
            presenceService.on('call-rejected', () => {
                setOutgoingCall((prev) => {
                    if (prev) toast.error(`${prev.user?.username || 'User'} declined your call.`);
                    return null;
                });
            }),
            presenceService.on('call-failed', () => {
                setOutgoingCall((prev) => {
                    if (prev) toast.error(`${prev.user?.username || 'User'} is not available.`);
                    return null;
                });
            }),
            presenceService.on('call-cancelled', () => {
                setIncomingCall(null);
            }),
        ];
        return () => unsubs.forEach((u) => u());
    }, [navigate, toast]);

    /**
     * Start an outgoing call to targetUser.
     * Returns false if the user is currently offline (caller should show SMS invite instead).
     */
    const initiateCall = useCallback((targetUser, callType = 'video') => {
        if (!presenceService.isOnline(String(targetUser._id))) return false;
        const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        setOutgoingCall({ user: targetUser, callType, roomCode });
        presenceService.emit('call-invite', {
            targetUserId: targetUser._id,
            roomCode,
            callType,
            callerName:   user?.username || 'Someone',
            callerUserId: presenceService._userId,
        });
        return true;
    }, [user]);

    const answerCall = useCallback(() => {
        if (!incomingCall) return;
        const { roomCode, callerUserId } = incomingCall;
        presenceService.emit('call-accept', { roomCode, callerUserId });
        setIncomingCall(null);
        navigate(`/${roomCode}`);
    }, [incomingCall, navigate]);

    const rejectCall = useCallback(() => {
        if (!incomingCall) return;
        presenceService.emit('call-reject', { callerUserId: incomingCall.callerUserId });
        setIncomingCall(null);
    }, [incomingCall]);

    const cancelCall = useCallback(() => {
        if (!outgoingCall) return;
        presenceService.emit('call-cancel', { targetUserId: outgoingCall.user._id });
        setOutgoingCall(null);
    }, [outgoingCall]);

    return (
        <CallContext.Provider value={{
            incomingCall, outgoingCall,
            initiateCall, answerCall, rejectCall, cancelCall,
        }}>
            {children}
        </CallContext.Provider>
    );
}
