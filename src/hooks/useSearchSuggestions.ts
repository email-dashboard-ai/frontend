import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useAppSelector } from '../store';
import type { SearchRequest, SavedSearchRequest } from '../types/gmail';

const RECENT_SEARCHES_KEY = 'email_recent_searches';
const MAX_RECENT_SEARCHES = 10;

export interface SearchSuggestion {
  id: string;
  type: 'recent' | 'contact' | 'keyword';
  value: string;
  displayText: string;
  secondaryText?: string;
  searchRequest?: SearchRequest; // Full search request for recent searches
}

interface UseSearchSuggestionsOptions {
  maxSuggestions?: number;
  debounceMs?: number;
}

// Helper to get saved search requests from localStorage
const getSavedSearches = (): SavedSearchRequest[] => {
  try {
    const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
    if (!stored) return [];

    const parsed = JSON.parse(stored);
    // Migration: If old format (array of strings), convert to new format
    if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'string') {
      return parsed.map((term: string) => ({
        request: { body: term },
        timestamp: Date.now(),
        displayLabel: term
      }));
    }

    return parsed as SavedSearchRequest[];
  } catch {
    return [];
  }
};

// Helper to generate display label from search request
const generateDisplayLabel = (request: SearchRequest): string => {
  const parts: string[] = [];

  if (request.body) parts.push(request.body);
  if (request.useFuzzySearch) parts.push('(fuzzy)');
  if (request.from) parts.push(`from: ${request.from}`);
  if (request.to) parts.push(`to: ${request.to}`);
  if (request.subject) parts.push(`subject: ${request.subject}`);
  if (request.after) parts.push(`after: ${request.after}`);
  if (request.before) parts.push(`before: ${request.before}`);

  return parts.join(' ') || 'Advanced search';
};

// Helper to check if two requests are equal
const isEqualSearchRequest = (a: SearchRequest, b: SearchRequest): boolean => {
  return JSON.stringify(a) === JSON.stringify(b);
};

// Helper to check if request has meaningful content
const hasSearchContent = (request: SearchRequest): boolean => {
  return !!(request.body || request.from || request.to || request.subject ||
    request.after || request.before || request.hasAttachment ||
    request.isUnread || request.isStarred);
};

// Helper to save full search request
const saveSearchRequest = (request: SearchRequest): void => {
  if (!hasSearchContent(request)) return;

  try {
    const saved = getSavedSearches();

    // Generate display label
    const displayLabel = generateDisplayLabel(request);

    // Check if exact same search exists (remove it to move to top)
    const filtered = saved.filter(s =>
      !isEqualSearchRequest(s.request, request)
    );

    // Add to beginning
    const newSearch: SavedSearchRequest = {
      request,
      timestamp: Date.now(),
      displayLabel
    };

    const updated = [newSearch, ...filtered].slice(0, MAX_RECENT_SEARCHES);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
  } catch {
    // Ignore localStorage errors
  }
};

export const useSearchSuggestions = (options: UseSearchSuggestionsOptions = {}) => {
  const { maxSuggestions = 5, debounceMs = 150 } = options;
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { messages, knownUsers } = useAppSelector((state) => state.gmail);

  // Extract unique contacts from messages
  const contacts = useMemo(() => {
    const contactMap = new Map<string, { email: string; name: string }>();

    messages.forEach((msg) => {
      // Extract from "From" field
      const fromMatch = msg.from.match(/^"?([^"<]+)"?\s*<?([^>]+@[^>]+)>?/);
      if (fromMatch) {
        const name = fromMatch[1].trim();
        const email = fromMatch[2].trim();
        if (!contactMap.has(email)) {
          contactMap.set(email, { email, name });
        }
      } else if (msg.from.includes('@')) {
        const email = msg.from.trim();
        if (!contactMap.has(email)) {
          contactMap.set(email, { email, name: email.split('@')[0] });
        }
      }

      // Extract from "To" field
      if (msg.to) {
        const toMatch = msg.to.match(/^"?([^"<]+)"?\s*<?([^>]+@[^>]+)>?/);
        if (toMatch) {
          const name = toMatch[1].trim();
          const email = toMatch[2].trim();
          if (!contactMap.has(email)) {
            contactMap.set(email, { email, name });
          }
        }
      }
    });

    // Merge with known users for better display names
    if (knownUsers) {
      contactMap.forEach((contact, email) => {
        const known = knownUsers[email];
        if (known?.name) {
          contact.name = known.name;
        }
      });
    }

    return Array.from(contactMap.values());
  }, [messages, knownUsers]);

  // Extract unique subject keywords from messages
  const subjectKeywords = useMemo(() => {
    const keywordSet = new Set<string>();

    messages.forEach((msg) => {
      if (msg.subject && msg.subject !== '(No Subject)') {
        // Extract meaningful words (3+ chars, not common stopwords)
        const words = msg.subject
          .replace(/^(Re:|Fwd:|FW:)\s*/gi, '')
          .split(/[\s,.:;!?()[\]{}"']+/)
          .filter((word) => {
            const w = word.toLowerCase();
            return (
              word.length >= 3 &&
              !/^(the|and|for|are|but|not|you|all|can|had|her|was|one|our|out|has|have|been|were|they|this|will|your|from|with|that|it's|don't|won't|isn't|didn't)$/i.test(w)
            );
          });
        words.forEach((word) => keywordSet.add(word));
      }
    });

    return Array.from(keywordSet);
  }, [messages]);

  // Generate suggestions based on query
  const generateSuggestions = useCallback(
    (query: string): SearchSuggestion[] => {
      if (!query || query.length < 2) return [];

      const queryLower = query.toLowerCase();
      const results: SearchSuggestion[] = [];

      // 1. PRIORITY: Recent searches (most relevant - user searched before)
      const savedSearches = getSavedSearches();
      savedSearches.forEach((saved) => {
        if (saved.displayLabel.toLowerCase().includes(queryLower)) {
          results.push({
            id: `recent-${saved.timestamp}`,
            type: 'recent',
            value: saved.request.body || '',
            displayText: saved.displayLabel,
            secondaryText: new Date(saved.timestamp).toLocaleDateString(),
            searchRequest: saved.request,
          });
        }
      });

      // 2. Match contacts (by name or email)
      contacts.forEach((contact) => {
        if (
          contact.name.toLowerCase().includes(queryLower) ||
          contact.email.toLowerCase().includes(queryLower)
        ) {
          results.push({
            id: `contact-${contact.email}`,
            type: 'contact',
            value: contact.email,
            displayText: contact.name,
            secondaryText: contact.email,
          });
        }
      });

      // 3. Match subject keywords (lowest priority)
      subjectKeywords.forEach((keyword) => {
        if (keyword.toLowerCase().includes(queryLower)) {
          results.push({
            id: `keyword-${keyword}`,
            type: 'keyword',
            value: keyword,
            displayText: keyword,
          });
        }
      });

      // Sort by type priority: recent > contact > keyword, then by relevance
      results.sort((a, b) => {
        // Type priority
        const typePriority = { recent: 0, contact: 1, keyword: 2 };
        if (typePriority[a.type] !== typePriority[b.type]) {
          return typePriority[a.type] - typePriority[b.type];
        }

        // Within same type: exact match > starts with > contains
        const aLower = a.displayText.toLowerCase();
        const bLower = b.displayText.toLowerCase();

        if (aLower === queryLower && bLower !== queryLower) return -1;
        if (bLower === queryLower && aLower !== queryLower) return 1;

        const aStarts = aLower.startsWith(queryLower);
        const bStarts = bLower.startsWith(queryLower);
        if (aStarts && !bStarts) return -1;
        if (bStarts && !aStarts) return 1;

        return 0;
      });

      return results.slice(0, maxSuggestions);
    },
    [contacts, subjectKeywords, maxSuggestions]
  );

  // Save a search request to recent searches
  const saveRecentSearch = useCallback((request: SearchRequest) => {
    saveSearchRequest(request);
  }, []);

  // Get recent searches for focus state (when input is empty)
  const getRecentSuggestionsOnFocus = useCallback((): SearchSuggestion[] => {
    const savedSearches = getSavedSearches();
    // Show max 3 recent searches when focused on empty input
    return savedSearches.slice(0, 3).map((saved) => ({
      id: `recent-${saved.timestamp}`,
      type: 'recent' as const,
      value: saved.request.body || '',
      displayText: saved.displayLabel,
      secondaryText: new Date(saved.timestamp).toLocaleDateString(),
      searchRequest: saved.request,
    }));
  }, []);

  // Show recent searches when input is focused but empty
  const showRecentOnFocus = useCallback(() => {
    const recentSuggestions = getRecentSuggestionsOnFocus();
    setSuggestions(recentSuggestions);
  }, [getRecentSuggestionsOnFocus]);

  // Debounced update suggestions
  const updateSuggestions = useCallback(
    (query: string) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      // If empty query, show recent searches immediately (no debounce)
      if (!query || query.length === 0) {
        showRecentOnFocus();
        setIsLoading(false);
        return;
      }

      // If query is 1 char, still show recent only
      if (query.length === 1) {
        const savedSearches = getSavedSearches();
        const queryLower = query.toLowerCase();
        const filtered = savedSearches
          .filter(saved => saved.displayLabel.toLowerCase().startsWith(queryLower))
          .slice(0, 3)
          .map((saved) => ({
            id: `recent-${saved.timestamp}`,
            type: 'recent' as const,
            value: saved.request.body || '',
            displayText: saved.displayLabel,
            secondaryText: new Date(saved.timestamp).toLocaleDateString(),
            searchRequest: saved.request,
          }));
        setSuggestions(filtered);
        setIsLoading(false);
        return;
      }

      // For 2+ chars, debounce and show full suggestions
      setIsLoading(true);

      debounceRef.current = setTimeout(() => {
        const newSuggestions = generateSuggestions(query);
        setSuggestions(newSuggestions);
        setIsLoading(false);
      }, debounceMs);
    },
    [generateSuggestions, debounceMs, showRecentOnFocus]
  );

  // Clear suggestions
  const clearSuggestions = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    setSuggestions([]);
    setIsLoading(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return {
    suggestions,
    isLoading,
    updateSuggestions,
    clearSuggestions,
    saveRecentSearch,
    showRecentOnFocus,
  };
};
