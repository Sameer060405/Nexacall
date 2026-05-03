import axios from 'axios';
import server from '../environment';

const API_URL = `${server}/api/v1/users`;

class UserService {
  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      headers: { 'Content-Type': 'application/json' },
    });

    this.client.interceptors.request.use((config) => {
      const token = localStorage.getItem('jwt_token');
      if (token) config.headers.Authorization = `Bearer ${token}`;
      return config;
    });
  }

  async searchUsers(query) {
    try {
      const response = await this.client.get('/search', { params: { q: query } });
      return { success: true, users: response.data.users };
    } catch (error) {
      return { success: false, error: error.response?.data?.error || 'Search failed' };
    }
  }

  async getContacts() {
    try {
      const response = await this.client.get('/contacts');
      return { success: true, contacts: response.data.contacts };
    } catch (error) {
      return { success: false, error: error.response?.data?.error || 'Failed to fetch contacts' };
    }
  }

  async addContact(userId) {
    try {
      const response = await this.client.post('/contacts', { userId });
      return { success: true, contacts: response.data.contacts };
    } catch (error) {
      return { success: false, error: error.response?.data?.error || 'Failed to add contact' };
    }
  }

  async removeContact(userId) {
    try {
      const response = await this.client.delete(`/contacts/${userId}`);
      return { success: true, contacts: response.data.contacts };
    } catch (error) {
      return { success: false, error: error.response?.data?.error || 'Failed to remove contact' };
    }
  }

  async getSpeedDial() {
    try {
      const response = await this.client.get('/speed-dial');
      return { success: true, speedDial: response.data.speedDial };
    } catch (error) {
      return { success: false, error: error.response?.data?.error || 'Failed to fetch speed dial' };
    }
  }

  async addSpeedDial(userId) {
    try {
      const response = await this.client.post('/speed-dial', { userId });
      return { success: true, speedDial: response.data.speedDial };
    } catch (error) {
      return { success: false, error: error.response?.data?.error || 'Failed to add to speed dial' };
    }
  }

  async removeSpeedDial(userId) {
    try {
      const response = await this.client.delete(`/speed-dial/${userId}`);
      return { success: true, speedDial: response.data.speedDial };
    } catch (error) {
      return { success: false, error: error.response?.data?.error || 'Failed to remove from speed dial' };
    }
  }
}

const userService = new UserService();
export default userService;
