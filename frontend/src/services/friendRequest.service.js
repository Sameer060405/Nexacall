import axios from 'axios';
import server from '../environment';

class FriendRequestService {
    constructor() {
        this.client = axios.create({ baseURL: `${server}/api/v1/friend-requests` });
        this.client.interceptors.request.use((config) => {
            const token = localStorage.getItem('jwt_token');
            if (token) config.headers.Authorization = `Bearer ${token}`;
            return config;
        });
    }

    async sendRequest(recipientId) {
        try {
            const { data } = await this.client.post('/', { recipientId });
            return { success: true, request: data.request };
        } catch (err) {
            return { success: false, error: err.response?.data?.error || 'Failed to send request' };
        }
    }

    async getIncoming() {
        try {
            const { data } = await this.client.get('/incoming');
            return { success: true, requests: data.requests };
        } catch (err) {
            return { success: false, error: err.response?.data?.error || 'Failed to load requests', requests: [] };
        }
    }

    async getSent() {
        try {
            const { data } = await this.client.get('/sent');
            return { success: true, requests: data.requests };
        } catch (err) {
            return { success: false, error: err.response?.data?.error || 'Failed to load sent requests', requests: [] };
        }
    }

    async acceptRequest(id) {
        try {
            const { data } = await this.client.put(`/${id}/accept`);
            return { success: true, request: data.request };
        } catch (err) {
            return { success: false, error: err.response?.data?.error || 'Failed to accept request' };
        }
    }

    async rejectRequest(id) {
        try {
            await this.client.put(`/${id}/reject`);
            return { success: true };
        } catch (err) {
            return { success: false, error: err.response?.data?.error || 'Failed to reject request' };
        }
    }

    async cancelRequest(id) {
        try {
            await this.client.delete(`/${id}`);
            return { success: true };
        } catch (err) {
            return { success: false, error: err.response?.data?.error || 'Failed to cancel request' };
        }
    }
}

const friendRequestService = new FriendRequestService();
export default friendRequestService;
