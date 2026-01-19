import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Search, Filter, X, Calendar, Paperclip, Mail, Star, AlertCircle, Loader2, User, Hash, Clock, Sparkles } from 'lucide-react';
import { gmailService } from '../../services/gmailService';
import type { SearchRequest, SearchResult } from '../../types/gmail';
import { useSearchSuggestions, SearchSuggestion } from '../../hooks/useSearchSuggestions';

interface SearchPanelProps {
    onSearchResults: (results: SearchResult[]) => void;
    onSearchRequest: (request: SearchRequest) => void;
    onClearSearch: () => void;
    isSearchActive: boolean;
}

const SearchPanel: React.FC<SearchPanelProps> = ({ onSearchResults, onSearchRequest, onClearSearch, isSearchActive }) => {
    const [showFilters, setShowFilters] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [searchRequest, setSearchRequest] = useState<SearchRequest>({});
    const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
    const [isFocused, setIsFocused] = useState(false);
    const filterRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const suggestionsRef = useRef<HTMLDivElement>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    const { suggestions, updateSuggestions, clearSuggestions, saveRecentSearch, showRecentOnFocus } = useSearchSuggestions({
        maxSuggestions: 5,
        debounceMs: 150,
    });

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
                setShowFilters(false);
                setShowSuggestions(false);
                setIsFocused(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Update suggestions when input changes (only if focused)
    useEffect(() => {
        if (!isFocused || showFilters) {
            setShowSuggestions(false);
            return;
        }
        // Let updateSuggestions handle the logic for empty, 1 char, or 2+ chars
        updateSuggestions(searchRequest.body || '');
        setShowSuggestions(true);
        setSelectedSuggestionIndex(-1);
    }, [searchRequest.body, showFilters, updateSuggestions, isFocused]);

    const handleSearch = useCallback(async (overrideRequest?: SearchRequest) => {
        const requestToUse = overrideRequest || searchRequest;
        const hasValue = Object.values(requestToUse).some(v => v !== undefined && v !== '' && v !== false);
        if (!hasValue) return;

        // Cancel any ongoing search
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        // Create new abort controller for this search
        abortControllerRef.current = new AbortController();

        // Close UI elements immediately for better UX
        setIsSearching(true);
        setShowSuggestions(false);
        setShowFilters(false);  // Close filter panel immediately
        clearSuggestions();

        // Save full search request (not just body) to support state restoration
        saveRecentSearch(requestToUse);

        try {
            const results = await gmailService.search(requestToUse, abortControllerRef.current.signal);
            // Check if this search was aborted
            if (abortControllerRef.current?.signal.aborted) {
                return;
            }
            onSearchResults(results);
            onSearchRequest(requestToUse);
        } catch (error) {
            if (abortControllerRef.current?.signal.aborted) {
                console.log('Search cancelled by user');
                return;
            }
            console.error('Search failed:', error);
        } finally {
            if (!abortControllerRef.current?.signal.aborted) {
                setIsSearching(false);
            }
        }
    }, [searchRequest, onSearchResults, clearSuggestions, saveRecentSearch]);

    const handleClear = useCallback(() => {
        // Cancel any ongoing search
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
        setIsSearching(false);

        // Only clear the search input (body), keep filters intact
        const newRequest = {
            ...searchRequest,
            body: undefined,
        };
        setSearchRequest(newRequest);
        clearSuggestions();
        setShowSuggestions(false);

        // Only clear results if no filters are active
        const hasActiveFilters = Object.entries(newRequest)
            .some(([key, value]) => key !== 'body' && value !== undefined && value !== '' && value !== false);

        if (!hasActiveFilters) {
            onClearSearch();
        }
    }, [onClearSearch, clearSuggestions, searchRequest]);

    const handleCancelSearch = useCallback(() => {
        // Only cancel the ongoing search, don't clear input
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
        setIsSearching(false);
    }, []);

    const updateField = (field: keyof SearchRequest, value: string | boolean | undefined) => {
        setSearchRequest(prev => ({
            ...prev,
            [field]: value === '' ? undefined : value
        }));
    };

    // Handle suggestion selection
    const handleSuggestionClick = useCallback((suggestion: SearchSuggestion) => {
        // If recent search with full state, restore everything
        if (suggestion.type === 'recent' && suggestion.searchRequest) {
            const restoredRequest = { ...suggestion.searchRequest };
            setSearchRequest(restoredRequest);

            // Close dropdown and blur input
            setShowSuggestions(false);
            setIsFocused(false);
            clearSuggestions();
            inputRef.current?.blur();

            // Trigger search immediately
            handleSearch(restoredRequest);
            return;
        }

        // For contact or keyword suggestions, merge with existing filters
        const newRequest: SearchRequest = {
            ...searchRequest,  // Keep existing filters
        };

        if (suggestion.type === 'contact') {
            // Search by sender email
            newRequest.from = suggestion.value;
        } else {
            // Search by keyword in body
            newRequest.body = suggestion.value;
        }

        // Close dropdown and blur input to prevent useEffect from re-opening
        setShowSuggestions(false);
        setIsFocused(false);
        clearSuggestions();
        inputRef.current?.blur();

        setSearchRequest(newRequest);

        // Trigger search immediately
        handleSearch(newRequest);
    }, [handleSearch, clearSuggestions, searchRequest]);

    // Handle keyboard navigation in suggestions
    const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (!showSuggestions || suggestions.length === 0) {
            if (e.key === 'Enter' && !isSearching) {
                handleSearch();
            }
            return;
        }

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setSelectedSuggestionIndex(prev =>
                    prev < suggestions.length - 1 ? prev + 1 : 0
                );
                break;
            case 'ArrowUp':
                e.preventDefault();
                setSelectedSuggestionIndex(prev =>
                    prev > 0 ? prev - 1 : suggestions.length - 1
                );
                break;
            case 'Enter':
                e.preventDefault();
                if (selectedSuggestionIndex >= 0 && selectedSuggestionIndex < suggestions.length) {
                    handleSuggestionClick(suggestions[selectedSuggestionIndex]);
                } else if (!isSearching) {
                    handleSearch();
                }
                break;
            case 'Escape':
                setShowSuggestions(false);
                clearSuggestions();
                break;
        }
    };

    const activeFiltersCount = Object.entries(searchRequest)
        .filter(([key, value]) => key !== 'body' && value !== undefined && value !== '' && value !== false)
        .length;

    const getSuggestionIcon = (type: SearchSuggestion['type']) => {
        switch (type) {
            case 'recent':
                return <Clock size={14} className="text-amber-500" />;
            case 'contact':
                return <User size={14} className="text-blue-500" />;
            case 'keyword':
                return <Hash size={14} className="text-green-500" />;
            default:
                return <Search size={14} className="text-gray-400" />;
        }
    };

    return (
        <div className="relative w-full max-w-[720px] group" ref={filterRef}>
            <div className={`
                flex items-center w-full transition-all duration-200 ease-in-out
                ${showFilters || showSuggestions ? 'bg-white shadow-lg rounded-t-[28px] rounded-b-none border-b-0' : 'bg-[#EAF1FB] hover:bg-white hover:shadow-md rounded-full'}
                focus-within:bg-white focus-within:shadow-md
                h-12 px-2
            `}>
                <button
                    onClick={() => handleSearch()}
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
                    ref={inputRef}
                    type="text"
                    placeholder="Search mail"
                    value={searchRequest.body || ''}
                    onChange={(e) => updateField('body', e.target.value)}
                    onKeyDown={handleInputKeyDown}
                    onFocus={() => {
                        setIsFocused(true);
                        if (!showFilters) {
                            // Show recent searches when focusing on empty or show current suggestions
                            if (!searchRequest.body || searchRequest.body.length === 0) {
                                showRecentOnFocus();
                            }
                            setShowSuggestions(true);
                        }
                    }}
                    disabled={isSearching}
                    className="flex-1 bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-gray-800 placeholder-gray-500 text-base px-2 h-full w-full disabled:cursor-not-allowed"
                    autoComplete="off"
                />

                {/* Clear/Cancel Button */}
                {(searchRequest.body || isSearchActive || isSearching) && (
                    <button
                        onClick={isSearching ? handleCancelSearch : handleClear}
                        className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors mr-1"
                        title={isSearching ? "Cancel search" : "Clear search"}
                    >
                        <X size={19} />
                    </button>
                )}

                {/* Fuzzy Search Toggle (Moved to main bar) */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        updateField('useFuzzySearch', !searchRequest.useFuzzySearch);
                    }}
                    className={`p-2 rounded-full transition-all duration-200 relative mr-1 group/fuzzy ${searchRequest.useFuzzySearch
                        ? 'bg-purple-100 text-purple-600 shadow-sm'
                        : 'text-gray-400 hover:bg-gray-200 hover:text-gray-600'
                        }`}
                    title={searchRequest.useFuzzySearch ? "Fuzzy search (Typo tolerance) ON" : "Turn on Fuzzy search (Typo tolerance)"}
                >
                    <Sparkles size={19} className={searchRequest.useFuzzySearch ? 'animate-pulse' : ''} />
                    {searchRequest.useFuzzySearch && (
                        <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
                        </span>
                    )}
                </button>

                {/* Filter Toggle */}
                <button
                    onClick={() => {
                        setShowFilters(!showFilters);
                        setShowSuggestions(false);
                    }}
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

            {/* Suggestions Dropdown */}
            {showSuggestions && suggestions.length > 0 && !showFilters && (
                <div
                    ref={suggestionsRef}
                    className="absolute top-full left-0 right-0 bg-white shadow-xl rounded-b-[28px] border-t border-gray-100 py-2 z-50 animate-in fade-in slide-in-from-top-1 duration-150"
                >
                    {suggestions.map((suggestion, index) => (
                        <button
                            key={suggestion.id}
                            onClick={() => handleSuggestionClick(suggestion)}
                            onMouseEnter={() => setSelectedSuggestionIndex(index)}
                            className={`w-full px-4 py-2.5 flex items-center gap-3 text-left transition-colors ${index === selectedSuggestionIndex
                                ? 'bg-blue-50'
                                : 'hover:bg-gray-50'
                                }`}
                        >
                            <span className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                                {getSuggestionIcon(suggestion.type)}
                            </span>
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-gray-900 truncate">
                                    {suggestion.displayText}
                                </div>
                                {suggestion.secondaryText && (
                                    <div className="text-xs text-gray-500 truncate">
                                        {suggestion.secondaryText}
                                    </div>
                                )}
                            </div>
                            <span className="flex-shrink-0 text-xs text-gray-400 capitalize">
                                {suggestion.type}
                            </span>
                        </button>
                    ))}
                    <div className="px-4 py-2 border-t border-gray-100 mt-1">
                        <span className="text-xs text-gray-400">
                            Press <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-600 font-mono">↑</kbd>{' '}
                            <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-600 font-mono">↓</kbd> to navigate,{' '}
                            <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-600 font-mono">Enter</kbd> to select
                        </span>
                    </div>
                </div>
            )}

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
                            onClick={() => handleSearch()}
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
