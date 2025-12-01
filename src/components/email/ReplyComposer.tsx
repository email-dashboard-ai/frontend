import React from 'react';
import { ChevronUp } from 'lucide-react';
import EmailComposer from './EmailComposer';
import { gmailService } from '../../services/gmailService';

interface ReplyComposerProps {
  messageId: string;
  replyTo: string;
  replyAll?: boolean;
  originalCc?: string;
  subject: string;
  onClose: () => void;
  onSuccess?: () => void;
}

const ReplyComposer: React.FC<ReplyComposerProps> = ({
  messageId,
  replyTo,
  replyAll = false,
  originalCc = '',
  subject,
  onClose,
  onSuccess,
}) => {
  const extractEmail = (emailString: string): string => {
    const match = emailString.match(/<(.+)>/);
    return match ? match[1] : emailString;
  };

  const parseEmails = (emailString: string): string[] => {
    if (!emailString) return [];
    return emailString
      .split(/[,;]/)
      .map((e) => e.trim())
      .filter((e) => e.length > 0);
  };

  const toEmails = [extractEmail(replyTo)];
  const ccEmails = replyAll ? parseEmails(originalCc) : [];

  const handleSend = async (data: {
    to: string[];
    cc?: string[];
    bcc?: string[];
    body: string;
    attachments?: File[];
  }) => {
    await gmailService.replyEmail({
      messageId,
      to: data.to,
      cc: data.cc,
      bcc: data.bcc,
      body: data.body,
      attachments: data.attachments,
    });

    if (onSuccess) {
      onSuccess();
    }
  };

  return (
    <div className="border-t border-gray-200 bg-white">
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200">
        <h4 className="text-sm font-medium text-gray-700">
          {replyAll ? 'Reply All' : 'Reply'}
        </h4>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors"
          title="Close"
        >
          <ChevronUp size={18} />
        </button>
      </div>
      
      <div className="h-[500px]">
        <EmailComposer
          mode="reply"
          initialTo={toEmails}
          initialCc={ccEmails}
          initialSubject={subject.startsWith('Re:') ? subject : `Re: ${subject}`}
          onSend={handleSend}
          onClose={onClose}
        />
      </div>
    </div>
  );
};

export default ReplyComposer;
