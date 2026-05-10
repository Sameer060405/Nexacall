import { io } from 'socket.io-client';
import server from '../environment';

class PresenceService {
    constructor() {
        this.socket = null;
        this.onlineUsers = new Set();
        this.listeners = new Set();
        this._userId = null;
        this._dmListeners = new Set();
        this._eventListeners = new Map(); // event → Set<callback>
    }

    connect(userId) {
        if (!userId) return;
        this._userId = String(userId);

        if (this.socket?.connected) {
            this.socket.emit('register-presence', this._userId);
            this.socket.emit('get-online-users');
            return;
        }

        this.socket = io(server, {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionDelay: 2000,
            reconnectionAttempts: 10,
        });

        this.socket.on('connect', () => {
            console.log('[Presence] connected, registering', this._userId);
            this.socket.emit('register-presence', this._userId);
            this.socket.emit('get-online-users');
        });

        this.socket.on('online-users-list', (userIds) => {
            this.onlineUsers = new Set(Array.isArray(userIds) ? userIds.map(String) : []);
            this._notify();
        });

        this.socket.on('presence-update', ({ userId: uid, status }) => {
            if (status === 'online') {
                this.onlineUsers.add(String(uid));
            } else {
                this.onlineUsers.delete(String(uid));
            }
            this._notify();
        });

        this.socket.on('dm-receive', (data) => {
            this._dmListeners.forEach((cb) => cb(data));
        });

        // Forward server-push events to generic listeners registered via on()
        [
            'call-incoming', 'call-accepted', 'call-rejected',
            'call-failed',   'call-cancelled',
            'friend-request-received', 'friend-request-accepted', 'friend-request-rejected',
            'message-request-received', 'message-request-accepted', 'message-request-rejected',
        ].forEach((event) => {
            this.socket.on(event, (data) => {
                const cbs = this._eventListeners.get(event);
                if (cbs) cbs.forEach((cb) => cb(data));
            });
        });

        this.socket.on('disconnect', () => {
            console.log('[Presence] socket disconnected');
        });

        this.socket.on('reconnect', () => {
            if (this._userId) {
                this.socket.emit('register-presence', this._userId);
                this.socket.emit('get-online-users');
            }
        });
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
        this.onlineUsers.clear();
        this.listeners.clear();
        this._dmListeners.clear();
        this._eventListeners.clear();
        this._userId = null;
    }

    onMessage(callback) {
        this._dmListeners.add(callback);
        return () => this._dmListeners.delete(callback);
    }

    /**
     * Subscribe to any server-pushed socket event.
     * @returns {() => void} unsubscribe function
     */
    on(event, callback) {
        if (!this._eventListeners.has(event)) {
            this._eventListeners.set(event, new Set());
        }
        this._eventListeners.get(event).add(callback);
        return () => {
            const cbs = this._eventListeners.get(event);
            if (cbs) cbs.delete(callback);
        };
    }

    /** Emit a socket event to the server (e.g. call-invite, call-accept). */
    emit(event, data) {
        if (this.socket?.connected) {
            this.socket.emit(event, data);
        }
    }

    isOnline(userId) {
        return this.onlineUsers.has(String(userId));
    }

    subscribe(callback) {
        this.listeners.add(callback);
        callback(new Set(this.onlineUsers));
        return () => this.listeners.delete(callback);
    }

    _notify() {
        const snapshot = new Set(this.onlineUsers);
        this.listeners.forEach((cb) => cb(snapshot));
    }
}

const presenceService = new PresenceService();
export default presenceService;
