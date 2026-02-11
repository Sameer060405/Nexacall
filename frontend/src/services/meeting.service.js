import axios from 'axios';
import server from '../environment';

const API_URL = `${server}/api/v1/meetings`;

class MeetingService {
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

  async createMeeting(meetingData) {
    try {
      console.log('Sending meeting data to API:', meetingData);
      console.log('API URL:', API_URL);
      console.log('Full request URL will be:', `${API_URL}/`);
      const response = await this.client.post('/', meetingData);
      console.log('API response:', response.data);
      return {
        success: true,
        meeting: response.data.meeting,
      };
    } catch (error) {
      console.error('Meeting creation error:', error);
      console.error('Error response:', error.response);
      console.error('Error status:', error.response?.status);
      console.error('Error data:', error.response?.data);
      console.error('Request URL:', error.config?.url);
      console.error('Request baseURL:', error.config?.baseURL);
      const errorMessage = error.response?.data?.error || error.message || `Failed to create meeting: ${error.response?.status || 'Unknown error'}`;
      console.error('Error message:', errorMessage);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  async getMeetings(startDate, endDate) {
    try {
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const response = await this.client.get('/', { params });
      return {
        success: true,
        meetings: response.data.meetings,
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to fetch meetings',
      };
    }
  }

  async getTodaysMeetings() {
    try {
      const response = await this.client.get('/today');
      return {
        success: true,
        meetings: response.data.meetings,
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to fetch today\'s meetings',
      };
    }
  }

  async updateMeeting(id, updates) {
    try {
      const response = await this.client.put(`/${id}`, updates);
      return {
        success: true,
        meeting: response.data.meeting,
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to update meeting',
      };
    }
  }

  async deleteMeeting(id) {
    try {
      await this.client.delete(`/${id}`);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to delete meeting',
      };
    }
  }

  async getMetrics() {
    try {
      const response = await this.client.get('/metrics');
      return {
        success: true,
        metrics: response.data.metrics,
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to fetch metrics',
      };
    }
  }

  /** Public: get meeting by code (no auth required). Returns { exists, requiresPassword, title }. */
  async getMeetingByCode(code) {
    try {
      const response = await this.client.get(`/by-code/${encodeURIComponent(code)}`);
      return {
        success: true,
        exists: response.data.exists,
        requiresPassword: response.data.requiresPassword,
        title: response.data.title,
        meetingCode: response.data.meetingCode,
      };
    } catch (error) {
      if (error.response?.status === 404) {
        return { success: true, exists: false };
      }
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to fetch meeting',
      };
    }
  }

  /** Public: verify meeting code + password (no auth required). */
  async verifyMeetingJoin(meetingCode, password) {
    try {
      const response = await this.client.post('/verify-join', { meetingCode, password });
      return { success: response.data.success === true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Incorrect password',
      };
    }
  }
}

export default new MeetingService();

