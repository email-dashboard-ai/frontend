import { api, apiConfig } from '../config/apiConfig';
import type { GmailLabel, GmailMessage, ParsedEmail } from '../types/gmail';

class GmailService {
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
    const extractBody = (part: any): void => {
      if (part.mimeType === 'text/html' && part.body?.data) {
        body = atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/'));
      } else if (part.mimeType === 'text/plain' && !body && part.body?.data) {
        const plainText = atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/'));
        body = `<p>${plainText.replace(/\n/g, '<br>')}</p>`;
      } else if (part.parts) {
        part.parts.forEach(extractBody);
      }
    };

    if (message.payload) {
      extractBody(message.payload);
    }

    // Extract attachments
    const attachments: any[] = [];
    const extractAttachments = (part: any): void => {
      if (part.filename && part.body?.attachmentId) {
        attachments.push({
          filename: part.filename,
          mimeType: part.mimeType || 'application/octet-stream',
          size: part.body.size || 0,
          attachmentId: part.body.attachmentId,
        });
      }
      if (part.parts) {
        part.parts.forEach(extractAttachments);
      }
    };

    if (message.payload) {
      extractAttachments(message.payload);
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

  async getLabels(): Promise<GmailLabel[]> {
    const config = apiConfig.getConfig();
    const { data } = await api.get<GmailLabel[]>(config.endpoints.gmail.labels);
    return data;
  }

  async getMessages(labelId: string = 'INBOX', page: number = 1, limit: number = 50): Promise<ParsedEmail[]> {
    const config = apiConfig.getConfig();
    const { data } = await api.get<GmailMessage[]>(
      config.endpoints.gmail.list(labelId),
      { params: { page, limit } }
    );

    return data.map(msg => this.parseMessage(msg));
  }

  async getMessage(messageId: string): Promise<ParsedEmail> {
    const config = apiConfig.getConfig();
    const { data } = await api.get<GmailMessage>(config.endpoints.gmail.get(messageId));
    return this.parseMessage(data);
  }
}

export const gmailService = new GmailService();
