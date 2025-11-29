import { api, apiConfig } from '../config/apiConfig';
import type { GmailLabel, GmailMessage, ParsedEmail, EmailPageResponse } from '../types/gmail';
import type { ApiResponse } from '../types/api';
import { appConfig } from '../config/appConfig';

class GmailService {
  // Helper to decode base64url with UTF-8 support
  private decodeBase64(data: string): string {
    try {
      // Replace non-url safe characters
      const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
      // Decode base64 to binary string
      const binaryString = atob(base64);
      // Convert to byte array
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      // Decode UTF-8
      return new TextDecoder('utf-8').decode(bytes);
    } catch (e) {
      console.error('Error decoding email body:', e);
      return '';
    }
  }

  private extractBody(part: any, currentBody: string = ''): string {
    let body = currentBody;
    if (part.mimeType === 'text/html' && part.body?.data) {
      body = this.decodeBase64(part.body.data);
    } else if (part.mimeType === 'text/plain' && !body && part.body?.data) {
      const plainText = this.decodeBase64(part.body.data);
      body = `<p>${plainText.replace(/\n/g, '<br>')}</p>`;
    } else if (part.parts) {
      part.parts.forEach((p: any) => {
        body = this.extractBody(p, body);
      });
    }
    return body;
  }

  private extractAttachments(part: any, attachments: any[]): void {
    if (part.filename && part.body?.attachmentId) {
      attachments.push({
        filename: part.filename,
        mimeType: part.mimeType || 'application/octet-stream',
        size: part.body.size || 0,
        attachmentId: part.body.attachmentId,
      });
    }
    if (part.parts) {
      part.parts.forEach((p: any) => this.extractAttachments(p, attachments));
    }
  }

  // Parse Gmail message to UI-friendly format
  private parseMessage(message: GmailMessage): ParsedEmail {
    const headers = message.payload?.headers || [];
    const getHeader = (name: string) =>
      headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || '';

    const from = getHeader('From');
    const to = getHeader('To');
    const cc = getHeader('Cc');
    const subject = getHeader('Subject');
    const date = getHeader('Date');

    // Extract body
    let body = '';
    if (message.payload) {
      body = this.extractBody(message.payload);
    }

    // Extract attachments
    const attachments: any[] = [];
    if (message.payload) {
      this.extractAttachments(message.payload, attachments);
    }

    const labelIds = message.labelIds || [];
    const isRead = !labelIds.includes('UNREAD');
    const isStarred = labelIds.includes('STARRED');

    return {
      id: message.id,
      threadId: message.threadId || message.id,
      from,
      to,
      cc,
      subject: subject || '(No Subject)',
      date: date || new Date(parseInt(message.internalDate || '0')).toISOString(),
      snippet: message.snippet || '',
      body: body || `<p>${message.snippet || ''}</p>`,
      isRead,
      isStarred,
      labelIds,
      attachments,
    };
  }

  async getLabels(signal?: AbortSignal): Promise<GmailLabel[]> {
    const config = apiConfig.getConfig();
    const { data } = await api.get<ApiResponse<GmailLabel[]>>(config.endpoints.gmail.labels, { signal });
    return data.data;
  }

  async getMessages(labelId: string = 'INBOX', pageToken?: string, limit: number = appConfig.gmail.defaultPageLimit, signal?: AbortSignal): Promise<EmailPageResponse> {
    const config = apiConfig.getConfig();
    const { data } = await api.get<ApiResponse<EmailPageResponse>>(
      config.endpoints.gmail.list(labelId),
      { params: { pageToken, limit }, signal }
    );

    // The backend now returns { messages: [...], nextPageToken: "..." }
    // We need to parse the messages
    const parsedMessages = data.data.messages.map(msg => this.parseMessage(msg));

    return {
      messages: parsedMessages,
      nextPageToken: data.data.nextPageToken
    };
  }

  async getMessage(messageId: string, signal?: AbortSignal): Promise<ParsedEmail> {
    const config = apiConfig.getConfig();
    const { data } = await api.get<ApiResponse<GmailMessage>>(config.endpoints.gmail.get(messageId), { signal });
    return this.parseMessage(data.data);
  }

  async markAsRead(messageId: string): Promise<void> {
    const config = apiConfig.getConfig();
    await api.post(config.endpoints.gmail.markRead(messageId));
  }

  async markAsUnread(messageId: string): Promise<void> {
    const config = apiConfig.getConfig();
    await api.post(config.endpoints.gmail.markUnread(messageId));
  }

  async toggleStar(messageId: string, starred: boolean): Promise<void> {
    const config = apiConfig.getConfig();
    await api.post(config.endpoints.gmail.toggleStar(messageId), null, {
      params: { starred }
    });
  }

  async deleteEmail(messageId: string): Promise<void> {
    const config = apiConfig.getConfig();
    await api.delete(config.endpoints.gmail.delete(messageId));
  }

  async untrashEmail(messageId: string): Promise<void> {
    const config = apiConfig.getConfig();
    await api.post(config.endpoints.gmail.untrash(messageId));
  }

  async batchDeleteEmails(ids: string[]): Promise<void> {
    const config = apiConfig.getConfig();
    await api.post(config.endpoints.gmail.batchDelete, ids);
  }

  async batchUpdateStatus(ids: string[], isRead: boolean): Promise<void> {
    const config = apiConfig.getConfig();
    await api.post(config.endpoints.gmail.batchStatus, ids, {
      params: { isRead }
    });
  }
}

export const gmailService = new GmailService();
