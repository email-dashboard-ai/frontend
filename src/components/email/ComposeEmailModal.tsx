import React from 'react';
import { X, Minimize2, Maximize2 } from 'lucide-react';
import EmailComposer from './EmailComposer';
import { gmailService } from '../../services/gmailService';

interface ComposeEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ComposeEmailModal: React.FC<ComposeEmailModalProps> = ({ isOpen, onClose }) => {
  const [isMinimized, setIsMinimized] = React.useState(false);
  const [isMaximized, setIsMaximized] = React.useState(false);

  if (!isOpen) return null;

  const handleSend = async (data: {
    to: string[];
    cc?: string[];
    bcc?: string[];
    subject?: string;
    body: string;
    attachments?: File[];
  }) => {
    await gmailService.sendEmail({
      to: data.to,
      cc: data.cc,
      bcc: data.bcc,
      subject: data.subject || '',
      body: data.body,
      attachments: data.attachments,
    });
  };

  if (isMinimized) {
    return (
      <div className="fixed bottom-0 right-6 z-50">
        <div className="bg-gray-800 text-white px-4 py-3 rounded-t-lg shadow-lg flex items-center justify-between w-64 cursor-pointer hover:bg-gray-700 transition-colors">
          <button onClick={() => setIsMinimized(false)} className="flex-1 text-left font-medium text-sm">
            New Message
          </button>
          <button onClick={onClose} className="ml-2 hover:bg-gray-600 p-1 rounded">
            <X size={16} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`fixed z-50 bg-white rounded-lg shadow-2xl border border-gray-300 flex flex-col ${
        isMaximized
          ? 'inset-4'
          : 'bottom-0 right-6 w-[540px] h-[600px]'
      }`}
    >
      {/* Header */}
      <div className="bg-gray-800 text-white px-4 py-3 rounded-t-lg flex items-center justify-between flex-shrink-0">
        <h3 className="font-medium text-sm">New Message</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMinimized(true)}
            className="hover:bg-gray-700 p-1 rounded transition-colors"
            title="Minimize"
          >
            <Minimize2 size={16} />
          </button>
          <button
            onClick={() => setIsMaximized(!isMaximized)}
            className="hover:bg-gray-700 p-1 rounded transition-colors"
            title={isMaximized ? 'Restore' : 'Maximize'}
          >
            {isMaximized ? (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor">
                <rect x="3" y="3" width="10" height="10" strokeWidth="1.5" />
              </svg>
            ) : (
              <Maximize2 size={16} />
            )}
          </button>
          <button
            onClick={onClose}
            className="hover:bg-gray-700 p-1 rounded transition-colors"
            title="Close"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Composer */}
      <div className="flex-1 overflow-hidden">
        <EmailComposer mode="compose" onSend={handleSend} onClose={onClose} />
      </div>
    </div>
  );
};

export default ComposeEmailModal;
