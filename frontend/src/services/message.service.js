// message.service.js
// Added: HTTP client for direct messaging endpoints.
// Mirrors the pattern used by contact.service.js — axios instance with
// the JWT auto-attached via an interceptor.
import axios from 'axios';
import server from '../environment';

class MessageService {
    constructor() {
        this.client = axios.create({ baseURL: `${server}/api/v1/messages` });

        // Attach JWT on every request
        this.client.interceptors.request.use((config) => {
            const token = localStorage.getItem('jwt_token');
            if (token) config.headers.Authorization = `Bearer ${token}`;
            return config;
        });
    }

    async getMessages(recipientId) {
        try {
            const { data } = await this.client.get(`/${recipientId}`);
            return { success: true, messages: data.messages, conversationStatus: data.conversationStatus };
        } catch (err) {
            return {
                success: false,
                error: err.response?.data?.error || 'Failed to load messages',
            };
        }
    }

    async acceptMessageRequest(convId) {
        try {
            const { data } = await this.client.put(`/conversation/${convId}/accept`);
            return { success: true, conversationStatus: data.conversationStatus };
        } catch (err) {
            return { success: false, error: err.response?.data?.error || 'Failed to accept' };
        }
    }

    async rejectMessageRequest(convId) {
        try {
            await this.client.put(`/conversation/${convId}/reject`);
            return { success: true };
        } catch (err) {
            return { success: false, error: err.response?.data?.error || 'Failed to reject' };
        }
    }

    // Send a new direct message. Returns the saved message document on success.
    async sendMessage(recipientId, body) {
        try {
            const { data } = await this.client.post('/', { recipientId, body });
            return { success: true, message: data.message };
        } catch (err) {
            return {
                success: false,
                error: err.response?.data?.error || 'Failed to send message',
            };
        }
    }

    // List all conversations the current user is part of,
    // each with the latest message preview and unread count.
    async getConversations() {
        try {
            const { data } = await this.client.get('/');
            return { success: true, conversations: data.conversations };
        } catch (err) {
            return {
                success: false,
                error: err.response?.data?.error || 'Failed to load conversations',
            };
        }
    }
}

const messageService = new MessageService();
export default messageService;
