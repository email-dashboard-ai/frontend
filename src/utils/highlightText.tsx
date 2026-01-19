import React from 'react';

/**
 * Highlights matching keywords in text (case-insensitive)
 * @param text - The text to highlight
 * @param query - The search query to highlight
 * @returns JSX with highlighted portions
 */
export const highlightText = (text: string, query: string): React.ReactNode => {
    if (!text || !query) {
        return text;
    }

    // Escape special regex characters in query
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Create regex for case-insensitive matching
    const regex = new RegExp(`(${escapedQuery})`, 'gi');

    // Split text by matches
    const parts = text.split(regex);

    return (
        <>
            {parts.map((part, index) => {
                // Check if this part matches the query (case-insensitive)
                const isMatch = regex.test(part);
                // Reset regex lastIndex for next test
                regex.lastIndex = 0;

                return isMatch ? (
                    <mark
                        key={index}
                        className="bg-yellow-200 text-gray-900 font-medium px-0.5 rounded"
                    >
                        {part}
                    </mark>
                ) : (
                    <span key={index}>{part}</span>
                );
            })}
        </>
    );
};
