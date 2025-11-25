import type { Email, PaginationParams } from '../types';
import { apiConfig, api } from '../config/apiConfig';

class EmailService {
  constructor() {
    // Log API configuration on service initialization
    apiConfig.logConfig();
  }

  async getEmails(_params?: PaginationParams): Promise<Email[]> {
    const config = apiConfig.getConfig();
    const { data } = await api.get(config.endpoints.emails.list);
    return data;
  }

  async getEmailById(emailId: string): Promise<Email> {
    const config = apiConfig.getConfig();
    const { data } = await api.get(config.endpoints.emails.get(emailId));
    return data;
  }

  async searchEmails(query: string): Promise<Email[]> {
    const config = apiConfig.getConfig();
    const { data: emails } = await api.get(config.endpoints.emails.list);
    
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