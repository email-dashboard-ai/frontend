import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { userService, UserSettingsResponse } from '../../services/userService';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const SettingsModal = ({ isOpen, onClose }: SettingsModalProps) => {
    const [settings, setSettings] = useState<UserSettingsResponse | null>(null);
    const [customPrompt, setCustomPrompt] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (isOpen) {
            loadSettings();
        }
    }, [isOpen]);

    const loadSettings = async () => {
        setIsLoading(true);
        setMessage(null);
        try {
            const data = await userService.getUserSettings();
            setSettings(data);
            setCustomPrompt(data.customSummaryPrompt || '');
        } catch (error) {
            console.error('Failed to load settings:', error);
            setMessage({ type: 'error', text: 'Failed to load settings' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        setMessage(null);
        try {
            const trimmedPrompt = customPrompt.trim();
            const data = await userService.updateUserSettings({
                customSummaryPrompt: trimmedPrompt || null
            });
            setSettings(data);
            setMessage({ type: 'success', text: 'Settings saved! New summaries will use your custom prompt.' });
        } catch (error) {
            console.error('Failed to save settings:', error);
            setMessage({ type: 'error', text: 'Failed to save settings' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleResetToDefault = () => {
        setCustomPrompt('');
    };

    const handleCopyToClipboard = async () => {
        if (settings?.defaultPrompt) {
            await navigator.clipboard.writeText(settings.defaultPrompt);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-xl max-h-[85vh] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">AI Summary Settings</h2>
                    <button
                        onClick={onClose}
                        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-5 overflow-y-auto max-h-[calc(85vh-130px)]">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-10">
                            <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent"></div>
                        </div>
                    ) : (
                        <div className="space-y-5">
                            {/* Description */}
                            <p className="text-sm text-gray-600">
                                Customize how AI summarizes your emails. Leave empty to use the default prompt.
                            </p>

                            {/* Status */}
                            <div className="text-sm">
                                <span className="text-gray-500">Status: </span>
                                <span className={settings?.usingCustomPrompt ? 'text-blue-600 font-medium' : 'text-gray-700'}>
                                    {settings?.usingCustomPrompt ? 'Using Custom Prompt' : 'Using Default Prompt'}
                                </span>
                            </div>

                            {/* Default Prompt */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-sm font-medium text-gray-700">Default Prompt</label>
                                    <button
                                        onClick={handleCopyToClipboard}
                                        className="text-xs text-blue-600 hover:text-blue-700 hover:underline"
                                    >
                                        {copied ? 'Copied!' : 'Copy to clipboard'}
                                    </button>
                                </div>
                                <div className="bg-gray-50 rounded border border-gray-200 p-3 text-sm text-gray-600 max-h-24 overflow-y-auto">
                                    {settings?.defaultPrompt || 'Loading...'}
                                </div>
                            </div>

                            {/* Custom Prompt */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Your Custom Prompt
                                </label>
                                <textarea
                                    value={customPrompt}
                                    onChange={(e) => setCustomPrompt(e.target.value)}
                                    placeholder="Enter your custom prompt here..."
                                    rows={5}
                                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                                />
                                <p className="mt-1.5 text-xs text-gray-500">
                                    Tip: Specify format, language, or focus areas (e.g., "Summarize in Vietnamese, highlight deadlines")
                                </p>
                            </div>

                            {/* Message */}
                            {message && (
                                <div className={`p-3 rounded text-sm ${message.type === 'success'
                                        ? 'bg-green-50 text-green-700 border border-green-200'
                                        : 'bg-red-50 text-red-700 border border-red-200'
                                    }`}>
                                    {message.text}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-5 py-4 border-t border-gray-200 bg-gray-50">
                    <button
                        onClick={handleResetToDefault}
                        disabled={isLoading || isSaving}
                        className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors disabled:opacity-50"
                    >
                        Reset to Default
                    </button>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isLoading || isSaving}
                            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors disabled:opacity-50"
                        >
                            {isSaving ? 'Saving...' : 'Save'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SettingsModal;
