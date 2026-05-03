import axios from 'axios';
import server from '../environment';

class ContactService {
    constructor() {
        this.client = axios.create({
            baseURL: `${server}/api/v1/contacts`,
            headers: { 'Content-Type': 'application/json' },
        });

        this.client.interceptors.request.use((config) => {
            const token = localStorage.getItem('jwt_token');
            if (token) config.headers.Authorization = `Bearer ${token}`;
            return config;
        });
    }

    async getContacts() {
        try {
            const { data } = await this.client.get('/');
            return { success: true, contacts: data.contacts };
        } catch (err) {
            return { success: false, error: err.response?.data?.error || 'Failed to fetch contacts' };
        }
    }

    async addContact(name, phone) {
        try {
            const { data } = await this.client.post('/', { name, phone });
            return { success: true, contact: data.contact };
        } catch (err) {
            return { success: false, error: err.response?.data?.error || 'Failed to add contact' };
        }
    }

    async deleteContact(id) {
        try {
            await this.client.delete(`/${id}`);
            return { success: true };
        } catch (err) {
            return { success: false, error: err.response?.data?.error || 'Failed to delete contact' };
        }
    }
}

const contactService = new ContactService();
export default contactService;
