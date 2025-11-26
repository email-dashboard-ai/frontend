import type { Email } from '../types';

// Mock email data generator
const generateMockEmail = (id: number, labelId: string): Email => {
  const senders = [
    { name: 'John Doe', email: 'john.doe@company.com' },
    { name: 'Jane Smith', email: 'jane.smith@startup.io' },
    { name: 'Bob Johnson', email: 'bob@techcorp.com' },
    { name: 'Alice Williams', email: 'alice.w@design.co' },
    { name: 'Charlie Brown', email: 'charlie@marketing.com' },
  ];

  const subjects = [
    'Q4 Project Update - Action Required',
    'Meeting Notes from Yesterday',
    'New Feature Request',
    'Bug Report: Login Issue',
    'Weekly Newsletter',
    'Invoice #12345',
    'Team Lunch Tomorrow?',
    'Code Review Request',
    'Design Mockups Ready',
    'Client Feedback',
  ];

  const sender = senders[id % senders.length];
  const subject = subjects[id % subjects.length];
  const date = new Date(Date.now() - id * 3600000).toISOString();

  return {
    id: `email_${id}`,
    sender: sender.name,
    senderEmail: sender.email,
    avatar: sender.name.split(' ').map(n => n[0]).join(''),
    time: date,
    subject,
    summary: `This is a summary of ${subject}. Click to read more...`,
    body: `<p>Hi there,</p><p>This is the full content of the email about ${subject}.</p><p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p><p>Best regards,<br/>${sender.name}</p>`,
    isRead: id % 3 !== 0,
    isStarred: id % 5 === 0,
    priority: id % 7 === 0 ? 'high' : id % 3 === 0 ? 'medium' : 'normal',
    column: labelId === 'INBOX' ? 'inbox' : labelId === 'SENT' ? 'done' : 'inbox',
    order: id,
    attachments: id % 4 === 0 ? [
      {
        id: `attach_${id}`,
        fileName: 'document.pdf',
        fileSize: 1024 * 512,
        mimeType: 'application/pdf',
        downloadUrl: `#download/${id}`,
      }
    ] : [],
    createdAt: date,
    updatedAt: date,
  };
};

export const mockEmailData = {
  // Generate 50 mock emails for INBOX
  inbox: Array.from({ length: 50 }, (_, i) => generateMockEmail(i, 'INBOX')),

  // Generate 20 mock emails for SENT
  sent: Array.from({ length: 20 }, (_, i) => generateMockEmail(i + 100, 'SENT')),

  // Generate 10 mock emails for DRAFT
  draft: Array.from({ length: 10 }, (_, i) => generateMockEmail(i + 200, 'DRAFT')),
};

export const getAllMockEmails = (): Email[] => {
  return [...mockEmailData.inbox, ...mockEmailData.sent, ...mockEmailData.draft];
};

export const getMockEmailsByLabel = (labelId: string): Email[] => {
  switch (labelId.toUpperCase()) {
    case 'INBOX':
      return mockEmailData.inbox;
    case 'SENT':
      return mockEmailData.sent;
    case 'DRAFT':
      return mockEmailData.draft;
    default:
      return mockEmailData.inbox;
  }
};

export const getMockEmailById = (id: string): Email | undefined => {
  return getAllMockEmails().find(email => email.id === id);
};
