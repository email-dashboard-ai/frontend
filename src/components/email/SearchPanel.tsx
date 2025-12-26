import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Search, Filter, X, Calendar, Paperclip, Mail, Star, AlertCircle } from 'lucide-react';
import { gmailService } from '../../services/gmailService';
import type { SearchRequest, SearchResult } from '../../types/gmail';

interface SearchPanelProps {
    onSearchResults: (results: SearchResult[]) => void;
    onClearSearch: () => void;
    isSearchActive: boolean;
}

const SearchPanel: React.FC<SearchPanelProps> = ({ onSearchResults, onClearSearch, isSearchActive }) => {
    const [showFilters, setShowFilters] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [searchRequest, setSearchRequest] = useState<SearchRequest>({});
    const filterRef = useRef<HTMLDivElement>(null);

    // Close filter panel when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
                setShowFilters(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSearch = useCallback(async () => {
        const hasValue = Object.values(searchRequest).some(v => v !== undefined && v !== '' && v !== false);
        if (!hasValue) return;

        setIsSearching(true);
        try {
            const results = await gmailService.search(searchRequest);
            onSearchResults(results);
            setShowFilters(false);
        } catch (error) {
            console.error('Search failed:', error);
        } finally {
            setIsSearching(false);
        }
    }, [searchRequest, onSearchResults]);

    const handleClear = useCallback(() => {
        setSearchRequest({});
        onClearSearch();
    }, [onClearSearch]);

    const updateField = (field: keyof SearchRequest, value: string | boolean | undefined) => {
        setSearchRequest(prev => ({
            ...prev,
            [field]: value === '' ? undefined : value
        }));
    };

    const activeFiltersCount = Object.values(searchRequest).filter(v => v !== undefined && v !== '' && v !== false).length;

    return (
        <div className="relative" ref={filterRef}>
            <div className="flex items-center gap-2">
                <div className="relative flex-1 group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500" size={18} />
                    <input
                        type="text"
                        placeholder="Search emails..."
                        value={searchRequest.body || ''}
                        onChange={(e) => updateField('body', e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        className="w-full bg-gray-100 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:bg-white transition-all"
                    />
                </div>

                <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`p-2.5 rounded-lg transition-all relative ${showFilters || activeFiltersCount > 0
                        ? 'bg-blue-100 text-blue-600'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                    title="Advanced filters"
                >
                    <Filter size={18} />
                    {activeFiltersCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-600 text-white text-xs rounded-full flex items-center justify-center">
                            {activeFiltersCount}
                        </span>
                    )}
                </button>

                <button
                    onClick={handleSearch}
                    disabled={isSearching}
                    className="px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                    {isSearching ? 'Searching...' : 'Search'}
                </button>

                {isSearchActive && (
                    <button
                        onClick={handleClear}
                        className="p-2.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                        title="Clear search"
                    >
                        <X size={18} />
                    </button>
                )}
            </div>

            {showFilters && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-200 p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">From</label>
                            <input
                                type="text"
                                placeholder="sender@email.com"
                                value={searchRequest.from || ''}
                                onChange={(e) => updateField('from', e.target.value)}
                                className="w-full px-3 py-2 bg-gray-50 rounded-lg text-sm border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-100"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">To</label>
                            <input
                                type="text"
                                placeholder="recipient@email.com"
                                value={searchRequest.to || ''}
                                onChange={(e) => updateField('to', e.target.value)}
                                className="w-full px-3 py-2 bg-gray-50 rounded-lg text-sm border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-100"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Subject</label>
                            <input
                                type="text"
                                placeholder="Email subject"
                                value={searchRequest.subject || ''}
                                onChange={(e) => updateField('subject', e.target.value)}
                                className="w-full px-3 py-2 bg-gray-50 rounded-lg text-sm border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-100"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">CC</label>
                            <input
                                type="text"
                                placeholder="cc@email.com"
                                value={searchRequest.cc || ''}
                                onChange={(e) => updateField('cc', e.target.value)}
                                className="w-full px-3 py-2 bg-gray-50 rounded-lg text-sm border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-100"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">BCC</label>
                            <input
                                type="text"
                                placeholder="bcc@email.com"
                                value={searchRequest.bcc || ''}
                                onChange={(e) => updateField('bcc', e.target.value)}
                                className="w-full px-3 py-2 bg-gray-50 rounded-lg text-sm border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-100"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Attachment name</label>
                            <input
                                type="text"
                                placeholder="file.pdf"
                                value={searchRequest.filename || ''}
                                onChange={(e) => updateField('filename', e.target.value)}
                                className="w-full px-3 py-2 bg-gray-50 rounded-lg text-sm border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-100"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1 flex items-center gap-1">
                                <Calendar size={12} /> After
                            </label>
                            <input
                                type="date"
                                value={searchRequest.after || ''}
                                onChange={(e) => updateField('after', e.target.value)}
                                className="w-full px-3 py-2 bg-gray-50 rounded-lg text-sm border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-100"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1 flex items-center gap-1">
                                <Calendar size={12} /> Before
                            </label>
                            <input
                                type="date"
                                value={searchRequest.before || ''}
                                onChange={(e) => updateField('before', e.target.value)}
                                className="w-full px-3 py-2 bg-gray-50 rounded-lg text-sm border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-100"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Label</label>
                            <input
                                type="text"
                                placeholder="important"
                                value={searchRequest.label || ''}
                                onChange={(e) => updateField('label', e.target.value)}
                                className="w-full px-3 py-2 bg-gray-50 rounded-lg text-sm border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-100"
                            />
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-gray-100">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={searchRequest.hasAttachment || false}
                                onChange={(e) => updateField('hasAttachment', e.target.checked || undefined)}
                                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <Paperclip size={14} className="text-gray-500" />
                            <span className="text-sm text-gray-600">Has attachment</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={searchRequest.isUnread || false}
                                onChange={(e) => updateField('isUnread', e.target.checked || undefined)}
                                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <Mail size={14} className="text-gray-500" />
                            <span className="text-sm text-gray-600">Unread</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={searchRequest.isStarred || false}
                                onChange={(e) => updateField('isStarred', e.target.checked || undefined)}
                                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <Star size={14} className="text-gray-500" />
                            <span className="text-sm text-gray-600">Starred</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={searchRequest.isImportant || false}
                                onChange={(e) => updateField('isImportant', e.target.checked || undefined)}
                                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <AlertCircle size={14} className="text-gray-500" />
                            <span className="text-sm text-gray-600">Important</span>
                        </label>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SearchPanel;
