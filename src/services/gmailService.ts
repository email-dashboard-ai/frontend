import { api, apiConfig } from '../config/apiConfig';
import type { GmailLabel, GmailMessage, ParsedEmail } from '../types/gmail';

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
    const { data } = await api.get<GmailLabel[]>(config.endpoints.gmail.labels, { signal });
    return data;
  }

  async getMessages(labelId: string = 'INBOX', page: number = 1, limit: number = 50, signal?: AbortSignal): Promise<ParsedEmail[]> {
    const config = apiConfig.getConfig();
    const { data } = await api.get<GmailMessage[]>(
      config.endpoints.gmail.list(labelId),
      { params: { page, limit }, signal }
    );

    return data.map(msg => this.parseMessage(msg));
  }

  async getMessage(messageId: string, signal?: AbortSignal): Promise<ParsedEmail> {
    const config = apiConfig.getConfig();
    const { data } = await api.get<GmailMessage>(config.endpoints.gmail.get(messageId), { signal });
    return this.parseMessage(data);
  }
}

export const gmailService = new GmailService();
