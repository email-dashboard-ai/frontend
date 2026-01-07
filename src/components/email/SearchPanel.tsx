import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Search, Filter, X, Calendar, Paperclip, Mail, Star, AlertCircle, Loader2 } from 'lucide-react';
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

    const activeFiltersCount = Object.entries(searchRequest)
        .filter(([key, value]) => key !== 'body' && value !== undefined && value !== '' && value !== false)
        .length;

    return (
        <div className="relative w-full max-w-[720px] group" ref={filterRef}>
            <div className={`
                flex items-center w-full transition-all duration-200 ease-in-out
                ${showFilters ? 'bg-white shadow-lg rounded-t-[28px] rounded-b-none border-b-0' : 'bg-[#EAF1FB] hover:bg-white hover:shadow-md rounded-full'}
                focus-within:bg-white focus-within:shadow-md
                h-12 px-2
            `}>
                <button
                    onClick={handleSearch}
                    disabled={isSearching}
                    className="p-3 text-gray-500 hover:bg-gray-100 rounded-full transition-colors disabled:cursor-not-allowed"
                >
                    {isSearching ? (
                        <Loader2 size={20} className="animate-spin text-blue-600" />
                    ) : (
                        <Search size={20} />
                    )}
                </button>

                <input
                    type="text"
                    placeholder="Search mail"
                    value={searchRequest.body || ''}
                    onChange={(e) => updateField('body', e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !isSearching && handleSearch()}
                    disabled={isSearching}
                    className="flex-1 bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-gray-800 placeholder-gray-500 text-base px-2 h-full w-full disabled:cursor-not-allowed"
                />

                {/* Clear Button */}
                {(searchRequest.body || isSearchActive) && (
                    <button
                        onClick={handleClear}
                        className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors mr-1"
                        title="Clear search"
                    >
                        <X size={19} />
                    </button>
                )}

                {/* Filter Toggle */}
                <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`p-2 rounded-full transition-colors relative mr-1 ${showFilters || activeFiltersCount > 0
                        ? 'bg-blue-100 text-blue-600'
                        : 'text-gray-500 hover:bg-gray-200'
                        }`}
                    title="Show search options"
                >
                    <Filter size={20} />
                    {activeFiltersCount > 0 && !showFilters && (
                        <span className="absolute top-0 right-0 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white ring-2 ring-white transform translate-x-1 -translate-y-1">
                            {activeFiltersCount}
                        </span>
                    )}
                </button>
            </div>

            {/* Expanded Filter Panel */}
            {showFilters && (
                <div className="absolute top-full left-0 right-0 bg-white shadow-xl rounded-b-[28px] border-t-0 p-4 z-50 animate-in fade-in slide-in-from-top-1 duration-200 mx-[1px]">
                    {/* Keep the existing form content but ensure it fits nicely */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">From</label>
                            <input
                                type="text"
                                placeholder="sender@email.com"
                                value={searchRequest.from || ''}
                                onChange={(e) => updateField('from', e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
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
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
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
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
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
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
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
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
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
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
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
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
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

                    <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-100">
                        <button
                            onClick={() => setSearchRequest({})}
                            className="text-sm text-gray-500 hover:text-gray-700 font-medium px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                            Reset filters
                        </button>
                        <button
                            onClick={handleSearch}
                            disabled={isSearching}
                            className={`px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 shadow-sm hover:shadow-md transition-all active:scale-95 flex items-center gap-2 ${isSearching ? 'opacity-70 cursor-not-allowed' : ''}`}
                        >
                            {isSearching && <Loader2 size={16} className="animate-spin" />}
                            {isSearching ? 'Searching...' : 'Search'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SearchPanel;
