import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useAppSelector } from '../store';

const RECENT_SEARCHES_KEY = 'email_recent_searches';
const MAX_RECENT_SEARCHES = 10;

export interface SearchSuggestion {
  id: string;
  type: 'recent' | 'contact' | 'keyword';
  value: string;
  displayText: string;
  secondaryText?: string;
}

interface UseSearchSuggestionsOptions {
  maxSuggestions?: number;
  debounceMs?: number;
}

// Helper to get recent searches from localStorage
const getRecentSearches = (): string[] => {
  try {
    const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

// Helper to save a search term to recent searches
const saveToRecentSearches = (term: string): void => {
  if (!term || term.length < 2) return;

  try {
    const recent = getRecentSearches();
    // Remove if exists (to move to top)
    const filtered = recent.filter(s => s.toLowerCase() !== term.toLowerCase());
    // Add to beginning
    const updated = [term, ...filtered].slice(0, MAX_RECENT_SEARCHES);
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
      const recentSearches = getRecentSearches();
      recentSearches.forEach((term) => {
        if (term.toLowerCase().includes(queryLower)) {
          results.push({
            id: `recent-${term}`,
            type: 'recent',
            value: term,
            displayText: term,
            secondaryText: 'Recent search',
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

  // Save a search term to recent searches
  const saveRecentSearch = useCallback((term: string) => {
    saveToRecentSearches(term);
  }, []);

  // Get recent searches for focus state (when input is empty)
  const getRecentSuggestionsOnFocus = useCallback((): SearchSuggestion[] => {
    const recentSearches = getRecentSearches();
    // Show max 3 recent searches when focused on empty input
    return recentSearches.slice(0, 3).map((term) => ({
      id: `recent-${term}`,
      type: 'recent' as const,
      value: term,
      displayText: term,
      secondaryText: 'Recent search',
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
        const recentSearches = getRecentSearches();
        const queryLower = query.toLowerCase();
        const filtered = recentSearches
          .filter(term => term.toLowerCase().startsWith(queryLower))
          .slice(0, 3)
          .map((term) => ({
            id: `recent-${term}`,
            type: 'recent' as const,
            value: term,
            displayText: term,
            secondaryText: 'Recent search',
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
