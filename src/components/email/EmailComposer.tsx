import React, { useState, useRef } from 'react';
import { X, Paperclip, Bold, Italic, Underline, Send, Loader2, Link2, Image, AlignLeft, AlignCenter, AlignRight, List, ListOrdered, Indent, Outdent, Type } from 'lucide-react';
import toast from 'react-hot-toast';

export interface EmailComposerProps {
  mode: 'compose' | 'reply';
  initialTo?: string[];
  initialCc?: string[];
  initialBcc?: string[];
  initialSubject?: string;
  onSend: (data: {
    to: string[];
    cc?: string[];
    bcc?: string[];
    subject?: string;
    body: string;
    attachments?: File[];
  }) => Promise<void>;
  onClose: () => void;
}

const EmailComposer: React.FC<EmailComposerProps> = ({
  mode,
  initialTo = [],
  initialCc = [],
  initialBcc = [],
  initialSubject = '',
  onSend,
  onClose,
}) => {
  const [to, setTo] = useState<string>(initialTo.join(', '));
  const [cc, setCc] = useState<string>(initialCc.join(', '));
  const [bcc, setBcc] = useState<string>(initialBcc.join(', '));
  const [subject, setSubject] = useState<string>(initialSubject);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [showCc, setShowCc] = useState<boolean>(initialCc.length > 0);
  const [showBcc, setShowBcc] = useState<boolean>(initialBcc.length > 0);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [showFontSize, setShowFontSize] = useState<boolean>(false);
  const [showTextColor, setShowTextColor] = useState<boolean>(false);
  
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const parseEmails = (emailString: string): string[] => {
    return emailString
      .split(/[,;]/)
      .map((e) => e.trim())
      .filter((e) => e.length > 0);
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleFormatting = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  };

  const handleInsertLink = () => {
    const url = prompt('Enter URL:');
    if (url) {
      document.execCommand('createLink', false, url);
      editorRef.current?.focus();
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = `<img src="${event.target?.result}" style="max-width: 100%; height: auto;" />`;
        document.execCommand('insertHTML', false, img);
      };
      reader.readAsDataURL(file);
    }
    if (imageInputRef.current) {
      imageInputRef.current.value = '';
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newFiles = Array.from(files);
      setAttachments((prev) => [...prev, ...newFiles]);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSend = async () => {
    // Validation
    const toEmails = parseEmails(to);
    if (toEmails.length === 0) {
      toast.error('Please add at least one recipient');
      return;
    }

    for (const email of toEmails) {
      if (!validateEmail(email)) {
        toast.error(`Invalid email address: ${email}`);
        return;
      }
    }

    if (mode === 'compose' && !subject.trim()) {
      toast.error('Please add a subject');
      return;
    }

    const bodyContent = editorRef.current?.innerHTML || '';
    if (!bodyContent.trim() || bodyContent === '<br>') {
      toast.error('Please add a message');
      return;
    }

    const ccEmails = parseEmails(cc);
    const bccEmails = parseEmails(bcc);

    // Validate CC emails
    for (const email of ccEmails) {
      if (!validateEmail(email)) {
        toast.error(`Invalid CC email: ${email}`);
        return;
      }
    }

    // Validate BCC emails
    for (const email of bccEmails) {
      if (!validateEmail(email)) {
        toast.error(`Invalid BCC email: ${email}`);
        return;
      }
    }

    setIsSending(true);
    try {
      await onSend({
        to: toEmails,
        cc: ccEmails.length > 0 ? ccEmails : undefined,
        bcc: bccEmails.length > 0 ? bccEmails : undefined,
        subject: mode === 'compose' ? subject : undefined,
        body: bodyContent,
        attachments: attachments.length > 0 ? attachments : undefined,
      });

      toast.success(mode === 'compose' ? 'Email sent successfully!' : 'Reply sent successfully!');
      onClose();
    } catch (error: any) {
      console.error('Failed to send email:', error);
      toast.error(error?.response?.data?.message || `Failed to send ${mode === 'compose' ? 'email' : 'reply'}`);
    } finally {
      setIsSending(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Recipients */}
      <div className="border-b border-gray-200">
        <div className="flex items-center px-4 py-2 border-b border-gray-100">
          <span className="text-sm text-gray-600 w-12">To</span>
          <input
            type="text"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="flex-1 outline-none text-sm text-gray-900 placeholder-gray-400"
            placeholder="Recipients (comma-separated)"
          />
          <div className="flex items-center gap-2 ml-2">
            {!showCc && (
              <button
                onClick={() => setShowCc(true)}
                className="text-xs text-gray-600 hover:text-gray-900 px-2 py-1"
              >
                Cc
              </button>
            )}
            {!showBcc && (
              <button
                onClick={() => setShowBcc(true)}
                className="text-xs text-gray-600 hover:text-gray-900 px-2 py-1"
              >
                Bcc
              </button>
            )}
          </div>
        </div>

        {showCc && (
          <div className="flex items-center px-4 py-2 border-b border-gray-100">
            <span className="text-sm text-gray-600 w-12">Cc</span>
            <input
              type="text"
              value={cc}
              onChange={(e) => setCc(e.target.value)}
              className="flex-1 outline-none text-sm text-gray-900 placeholder-gray-400"
              placeholder="CC recipients"
            />
            <button
              onClick={() => {
                setShowCc(false);
                setCc('');
              }}
              className="ml-2 text-gray-400 hover:text-gray-600"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {showBcc && (
          <div className="flex items-center px-4 py-2 border-b border-gray-100">
            <span className="text-sm text-gray-600 w-12">Bcc</span>
            <input
              type="text"
              value={bcc}
              onChange={(e) => setBcc(e.target.value)}
              className="flex-1 outline-none text-sm text-gray-900 placeholder-gray-400"
              placeholder="BCC recipients"
            />
            <button
              onClick={() => {
                setShowBcc(false);
                setBcc('');
              }}
              className="ml-2 text-gray-400 hover:text-gray-600"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {mode === 'compose' && (
          <div className="flex items-center px-4 py-2">
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="flex-1 outline-none text-sm text-gray-900 placeholder-gray-400"
              placeholder="Subject"
            />
          </div>
        )}
      </div>

      {/* Editor Toolbar */}
      <div className="flex items-center gap-1 px-4 py-2 border-b border-gray-200 bg-gray-50 flex-wrap">
        {/* Font Size Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowFontSize(!showFontSize)}
            className="p-2 hover:bg-gray-200 rounded text-gray-700 flex items-center gap-1"
            title="Font size"
          >
            <Type size={16} />
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
          {showFontSize && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded shadow-lg z-10 min-w-[120px]">
              {['1', '2', '3', '4', '5', '6', '7'].map((size) => (
                <button
                  key={size}
                  onClick={() => {
                    handleFormatting('fontSize', size);
                    setShowFontSize(false);
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-gray-100 text-sm"
                >
                  Size {size}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="w-px h-6 bg-gray-300"></div>

        {/* Basic Formatting */}
        <button
          onClick={() => handleFormatting('bold')}
          className="p-2 hover:bg-gray-200 rounded text-gray-700"
          title="Bold (Ctrl+B)"
        >
          <Bold size={16} />
        </button>
        <button
          onClick={() => handleFormatting('italic')}
          className="p-2 hover:bg-gray-200 rounded text-gray-700"
          title="Italic (Ctrl+I)"
        >
          <Italic size={16} />
        </button>
        <button
          onClick={() => handleFormatting('underline')}
          className="p-2 hover:bg-gray-200 rounded text-gray-700"
          title="Underline (Ctrl+U)"
        >
          <Underline size={16} />
        </button>

        <div className="w-px h-6 bg-gray-300"></div>

        {/* Text Color */}
        <div className="relative">
          <button
            onClick={() => setShowTextColor(!showTextColor)}
            className="p-2 hover:bg-gray-200 rounded text-gray-700"
            title="Text color"
          >
            <div className="flex flex-col items-center">
              <span className="text-sm font-bold">A</span>
              <div className="w-4 h-1 bg-blue-600 mt-0.5"></div>
            </div>
          </button>
          {showTextColor && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded shadow-lg z-10 p-2">
              <div className="grid grid-cols-5 gap-1">
                {['#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500', '#800080', '#808080'].map((color) => (
                  <button
                    key={color}
                    onClick={() => {
                      handleFormatting('foreColor', color);
                      setShowTextColor(false);
                    }}
                    className="w-6 h-6 rounded border border-gray-300 hover:scale-110 transition-transform"
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="w-px h-6 bg-gray-300"></div>

        {/* Lists */}
        <button
          onClick={() => handleFormatting('insertUnorderedList')}
          className="p-2 hover:bg-gray-200 rounded text-gray-700"
          title="Bulleted list"
        >
          <List size={16} />
        </button>
        <button
          onClick={() => handleFormatting('insertOrderedList')}
          className="p-2 hover:bg-gray-200 rounded text-gray-700"
          title="Numbered list"
        >
          <ListOrdered size={16} />
        </button>

        <div className="w-px h-6 bg-gray-300"></div>

        {/* Alignment */}
        <button
          onClick={() => handleFormatting('justifyLeft')}
          className="p-2 hover:bg-gray-200 rounded text-gray-700"
          title="Align left"
        >
          <AlignLeft size={16} />
        </button>
        <button
          onClick={() => handleFormatting('justifyCenter')}
          className="p-2 hover:bg-gray-200 rounded text-gray-700"
          title="Align center"
        >
          <AlignCenter size={16} />
        </button>
        <button
          onClick={() => handleFormatting('justifyRight')}
          className="p-2 hover:bg-gray-200 rounded text-gray-700"
          title="Align right"
        >
          <AlignRight size={16} />
        </button>

        <div className="w-px h-6 bg-gray-300"></div>

        {/* Indent */}
        <button
          onClick={() => handleFormatting('indent')}
          className="p-2 hover:bg-gray-200 rounded text-gray-700"
          title="Increase indent"
        >
          <Indent size={16} />
        </button>
        <button
          onClick={() => handleFormatting('outdent')}
          className="p-2 hover:bg-gray-200 rounded text-gray-700"
          title="Decrease indent"
        >
          <Outdent size={16} />
        </button>

        <div className="w-px h-6 bg-gray-300"></div>

        {/* Link and Image */}
        <button
          onClick={handleInsertLink}
          className="p-2 hover:bg-gray-200 rounded text-gray-700"
          title="Insert link"
        >
          <Link2 size={16} />
        </button>
        <button
          onClick={() => imageInputRef.current?.click()}
          className="p-2 hover:bg-gray-200 rounded text-gray-700"
          title="Insert image"
        >
          <Image size={16} />
        </button>
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
        />

        <div className="flex-1"></div>

        {/* Attach Files */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="p-2 hover:bg-gray-200 rounded text-gray-700"
          title="Attach files"
        >
          <Paperclip size={16} />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-y-auto">
        <div
          ref={editorRef}
          contentEditable
          className="p-4 min-h-full outline-none text-sm text-gray-900"
          style={{ wordWrap: 'break-word' }}
          data-placeholder="Compose your message..."
        />
      </div>

      {/* Attachments */}
      {attachments.length > 0 && (
        <div className="border-t border-gray-200 px-4 py-3 bg-gray-50">
          <div className="flex items-center gap-2 mb-2 text-xs text-gray-600">
            <Paperclip size={14} />
            <span>{attachments.length} attachment{attachments.length > 1 ? 's' : ''}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {attachments.map((file, index) => (
              <div
                key={index}
                className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm"
              >
                <span className="text-gray-700 truncate max-w-[200px]">{file.name}</span>
                <span className="text-xs text-gray-500">({formatFileSize(file.size)})</span>
                <button
                  onClick={() => handleRemoveAttachment(index)}
                  className="text-gray-400 hover:text-red-600"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer Actions */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-white">
        <button
          onClick={handleSend}
          disabled={isSending}
          className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
        >
          {isSending ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Send size={16} />
              Send
            </>
          )}
        </button>
        <button
          onClick={onClose}
          disabled={isSending}
          className="text-gray-600 hover:text-gray-900 disabled:opacity-50"
        >
          Cancel
        </button>
      </div>

      <style>{`
        [contenteditable][data-placeholder]:empty:before {
          content: attr(data-placeholder);
          color: #9CA3AF;
          cursor: text;
        }
      `}</style>
    </div>
  );
};

export default EmailComposer;
