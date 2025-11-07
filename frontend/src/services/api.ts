/**
 * API Service - HTTP Requests to Backend
 */

import axios, { AxiosInstance, AxiosError } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: `${API_URL}/api`,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add auth token to requests
    this.api.interceptors.request.use((config) => {
      const token = localStorage.getItem('gatsby_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Handle errors globally
    this.api.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Unauthorized - clear token and redirect
          localStorage.removeItem('gatsby_token');
          window.location.href = '/';
        }
        return Promise.reject(error);
      }
    );
  }

  // Auth
  async joinSession(sessionUuid: string) {
    const { data } = await this.api.post(`/auth/join/${sessionUuid}`);
    return data;
  }

  async sendSMSCode(phoneNumber: string, sessionUuid: string) {
    const { data } = await this.api.post('/auth/sms/send-code', {
      phoneNumber,
      sessionUuid,
    });
    return data;
  }

  async verifySMSCode(verificationId: string, code: string) {
    const { data } = await this.api.post('/auth/sms/verify-code', {
      verificationId,
      code,
    });
    return data;
  }

  async completeProfile(profileData: any) {
    const { data } = await this.api.post('/auth/complete-profile', profileData);
    return data;
  }

  async verifyAuth() {
    const { data } = await this.api.get('/auth/verify');
    return data;
  }

  // Users
  async getCurrentUser() {
    const { data } = await this.api.get('/users/me');
    return data;
  }

  async updateProfile(profileData: any) {
    const { data } = await this.api.put('/users/me', profileData);
    return data;
  }

  async getSwipeStack(sessionId: number) {
    const { data } = await this.api.get(`/users/session/${sessionId}/swipe-stack`);
    return data;
  }

  async getUserById(userId: number) {
    const { data } = await this.api.get(`/users/${userId}`);
    return data;
  }

  // Swipes
  async recordSwipe(targetUserId: number, direction: 'like' | 'pass') {
    const { data } = await this.api.post('/swipes', {
      targetUserId,
      direction,
    });
    return data;
  }

  async undoSwipe() {
    const { data } = await this.api.post('/swipes/undo');
    return data;
  }

  // Matches
  async getMatches() {
    const { data } = await this.api.get('/matches');
    return data;
  }

  async getMatchById(matchId: number) {
    const { data } = await this.api.get(`/matches/${matchId}`);
    return data;
  }

  // Messages
  async getMessages(matchId: number, limit = 50, offset = 0) {
    const { data } = await this.api.get(`/messages/match/${matchId}`, {
      params: { limit, offset },
    });
    return data;
  }

  async sendMessage(matchId: number, receiverId: number, content: string) {
    const { data } = await this.api.post('/messages', {
      matchId,
      receiverId,
      content,
    });
    return data;
  }

  // Contacts
  async shareContact(matchId: number, phone?: string, instagram?: string) {
    const { data } = await this.api.post('/contacts', {
      matchId,
      phone,
      instagram,
    });
    return data;
  }

  async getContact(matchId: number) {
    const { data } = await this.api.get(`/contacts/match/${matchId}`);
    return data;
  }

  async getAllContacts() {
    const { data } = await this.api.get('/contacts');
    return data;
  }

  // Session
  async getSessionInfo(sessionId: number) {
    const { data } = await this.api.get(`/sessions/${sessionId}/info`);
    return data;
  }

  async getSessionStats(sessionId: number) {
    const { data } = await this.api.get(`/sessions/${sessionId}/stats`);
    return data;
  }
}

export const apiService = new ApiService();
export default apiService;
