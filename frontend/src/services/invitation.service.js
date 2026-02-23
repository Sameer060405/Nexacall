import axios from 'axios';
import server from '../environment';

const API_URL = `${server}/api/v1/invitations`;

class InvitationService {
  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add token
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('jwt_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );
  }

  async sendInvitation(invitationData) {
    try {
      const response = await this.client.post('/', invitationData);
      return {
        success: true,
        invitation: response.data.invitation,
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to send invitation',
      };
    }
  }

  async getInvitations(status) {
    try {
      const params = {};
      if (status) params.status = status;

      const response = await this.client.get('/', { params });
      return {
        success: true,
        invitations: response.data.invitations,
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to fetch invitations',
      };
    }
  }

  async respondToInvitation(id, status) {
    try {
      const response = await this.client.put(`/${id}/respond`, { status });
      return {
        success: true,
        invitation: response.data.invitation,
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to respond to invitation',
      };
    }
  }

  async deleteInvitation(id) {
    try {
      await this.client.delete(`/${id}`);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to delete invitation',
      };
    }
  }
}

const invitationService = new InvitationService();
export default invitationService;

