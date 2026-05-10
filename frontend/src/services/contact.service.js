import axios from 'axios';
import server from '../environment';

class ContactService {
    constructor() {
        this.client = axios.create({
            baseURL: `${server}/api/v1/contacts`,
            headers: { 'Content-Type': 'application/json' },
        });

        // Attach JWT on every request
        this.client.interceptors.request.use((config) => {
            const token = localStorage.getItem('jwt_token');
            if (token) config.headers.Authorization = `Bearer ${token}`;
            return config;
        });
    }

    // GET /contacts?q=<query>
    async getContacts(searchQuery = '') {
        try {
            const params = searchQuery.trim() ? { q: searchQuery.trim() } : {};
            const { data } = await this.client.get('/', { params });
            return { success: true, contacts: data.contacts };
        } catch (err) {
            return { success: false, error: err.response?.data?.error || 'Failed to fetch contacts' };
        }
    }

    // POST /contacts  — name, phone, email (optional)
    async addContact(name, phone, email = '') {
        try {
            const { data } = await this.client.post('/', { name, phone, email });
            return { success: true, contact: data.contact };
        } catch (err) {
            return { success: false, error: err.response?.data?.error || 'Failed to add contact' };
        }
    }

    // PUT /contacts/:id  — partial updates { name?, phone?, email? }
    async updateContact(id, updates) {
        try {
            const { data } = await this.client.put(`/${id}`, updates);
            return { success: true, contact: data.contact };
        } catch (err) {
            return { success: false, error: err.response?.data?.error || 'Failed to update contact' };
        }
    }

    // DELETE /contacts/:id
    async deleteContact(id) {
        try {
            await this.client.delete(`/${id}`);
            return { success: true };
        } catch (err) {
            return { success: false, error: err.response?.data?.error || 'Failed to delete contact' };
        }
    }

    // POST /contacts/:id/invite  — generates meeting link + sends SMS
    async sendInvite(contactId) {
        try {
            const { data } = await this.client.post(`/${contactId}/invite`);
            return {
                success: true,
                meetingCode: data.meetingCode,
                meetingLink: data.meetingLink,
                simulated: data.simulated || false,
                message: data.message,
            };
        } catch (err) {
            // 502 includes meetingLink even on SMS failure so the caller can share manually
            const errData = err.response?.data || {};
            return {
                success: false,
                error: errData.error || 'Failed to send invitation',
                meetingCode: errData.meetingCode,
                meetingLink: errData.meetingLink,
            };
        }
    }
}

const contactService = new ContactService();
export default contactService;
