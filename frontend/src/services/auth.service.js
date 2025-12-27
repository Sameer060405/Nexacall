import axios from 'axios';
import server from '../environment';

const API_URL = `${server}/api/v1/auth`;

class AuthService {
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
        const token = this.getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          this.logout();
          window.location.href = '/auth';
        }
        return Promise.reject(error);
      }
    );
  }

  // ===== Token helpers =====
  setToken(token) {
    localStorage.setItem('jwt_token', token);
  }

  getToken() {
    return localStorage.getItem('jwt_token');
  }

  removeToken() {
    localStorage.removeItem('jwt_token');
  }

  isAuthenticated() {
    return !!this.getToken();
  }

  // ===== Auth APIs =====
  async register(email, username, password) {
    try {
      const response = await this.client.post('/register', {
        email,
        username,
        password,
      });

      if (response.data.token) {
        this.setToken(response.data.token);
      }

      return {
        success: true,
        message: response.data.message,
        user: response.data.user,
        token: response.data.token,
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Registration failed',
      };
    }
  }

  async login(username, password) {
    try {
      const response = await this.client.post('/login', {
        username,
        password,
      });

      if (response.data.token) {
        this.setToken(response.data.token);
      }

      return {
        success: true,
        user: response.data.user,
        token: response.data.token,
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Login failed',
      };
    }
  }

  async getCurrentUser() {
    try {
      const response = await this.client.get('/profile');
      const user = response.data?.user;
      if (!user) throw new Error('No user found');
      return { success: true, user };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to fetch user',
      };
    }
  }

  async logout() {
    this.removeToken();
    return { success: true };
  }

  // ===== History APIs =====
  async addToUserHistory(meetingCode) {
    try {
      const response = await this.client.post('/history', { meetingCode });
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to add to history',
      };
    }
  }

  async getHistoryOfUser() {
    try {
      const response = await this.client.get('/history');
      return { success: true, history: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to fetch history',
      };
    }
  }

  // ===== Validators =====
  validatePassword(password) {
    const errors = [];
    if (password.length < 8) errors.push('Password must be at least 8 characters long');
    if (!/[A-Z]/.test(password)) errors.push('Password must contain at least one uppercase letter');
    if (!/[a-z]/.test(password)) errors.push('Password must contain at least one lowercase letter');
    if (!/[0-9]/.test(password)) errors.push('Password must contain at least one number');
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) errors.push('Password must contain at least one special character');
    return errors;
  }

  validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  validateUsername(username) {
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    return usernameRegex.test(username);
  }
}

export default new AuthService();
