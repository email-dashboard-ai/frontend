import type { Email, PaginationParams } from '../types';
import { apiConfig, api } from '../config/apiConfig';
import { getAllMockEmails, getMockEmailById } from './mockEmailData';

class EmailService {
  async getEmails(_params?: PaginationParams): Promise<Email[]> {
    try {
      const config = apiConfig.getConfig();
      // Try to get from Gmail API first
      const { data } = await api.get(config.endpoints.emails.list);

      // If no data or empty, return mock data
      if (!data || (Array.isArray(data) && data.length === 0)) {
        console.log('Using mock email data');
        return getAllMockEmails();
      }

      return data;
    } catch (error) {
      console.warn('Failed to fetch emails from backend, using mock data:', error);
      return getAllMockEmails();
    }
  }

  async getEmailById(emailId: string): Promise<Email> {
    try {
      const config = apiConfig.getConfig();
      const { data } = await api.get(config.endpoints.emails.get(emailId));
      return data;
    } catch (error) {
      console.warn('Failed to fetch email from backend, using mock data:', error);
      const mockEmail = getMockEmailById(emailId);
      if (!mockEmail) throw new Error('Email not found');
      return mockEmail;
    }
  }

  async searchEmails(query: string): Promise<Email[]> {
    const emails = await this.getEmails();

    // Simple client-side search
    const lowerQuery = query.toLowerCase();
    return emails.filter((email: Email) =>
      email.subject.toLowerCase().includes(lowerQuery) ||
      email.summary.toLowerCase().includes(lowerQuery) ||
      email.sender.toLowerCase().includes(lowerQuery) ||
      email.body.toLowerCase().includes(lowerQuery)
    );
  }

  async updateEmail(emailId: string, updates: Partial<Email>): Promise<Email> {
    const config = apiConfig.getConfig();
    const { data } = await api.patch(config.endpoints.emails.update(emailId), {
      ...updates,
      updatedAt: new Date().toISOString()
    });
    // API returns {success: true, email: {...}} or just the email object
    return data.email || data;
  }

  async toggleStar(emailId: string): Promise<Email> {
    // Get current email first
    const email = await this.getEmailById(emailId);

    // Update with toggled star status
    return this.updateEmail(emailId, { isStarred: !email.isStarred });
  }

  async deleteEmail(emailId: string): Promise<void> {
    const config = apiConfig.getConfig();
    await api.delete(config.endpoints.emails.delete(emailId));
  }

  async sendEmail(email: { to: string; subject: string; body: string }): Promise<Email> {
    const config = apiConfig.getConfig();
    const { data } = await api.post(config.endpoints.emails.create, email);
    return data.email || data;
  }
}

export const emailService = new EmailService();