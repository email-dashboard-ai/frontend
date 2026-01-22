import React from "react";
import { Search, ArrowLeft, Info } from "lucide-react";
import type { SearchResult } from "../../types/gmail";
import { highlightText } from "../../utils/highlightText";

interface SearchResultsProps {
  results: SearchResult[];
  searchQuery: string;
  onSelectResult: (messageId: string) => void;
  onBack: () => void;
}

const SearchResults: React.FC<SearchResultsProps> = ({
  results,
  searchQuery,
  onSelectResult,
  onBack,
}) => {
  const getStrategyBadge = (strategy: string) => {
    const styles: Record<string, string> = {
      GMAIL_API: "bg-blue-100 text-blue-700",
      INTERNAL: "bg-green-100 text-green-700",
      HYBRID: "bg-purple-100 text-purple-700",
      SEMANTIC: "bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700",
    };
    return styles[strategy] || "bg-gray-100 text-gray-700";
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else if (days < 7) {
      return date.toLocaleDateString([], { weekday: "short" });
    } else {
      return date.toLocaleDateString([], { month: "short", day: "numeric" });
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 bg-gray-50">
        <button
          onClick={onBack}
          className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
          title="Back to emails"
        >
          <ArrowLeft size={18} />
        </button>
        <Search size={18} className="text-gray-500" />
        <span className="text-sm font-medium text-gray-700">
          {results.length} result{results.length !== 1 ? "s" : ""} found
        </span>
      </div>

      {/* User Education Banner */}
      <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border-b border-amber-200">
        <Info size={16} className="text-amber-600 flex-shrink-0" />
        <p className="text-xs text-amber-700">
          <span className="font-medium">Note:</span> Search results may differ slightly from Gmail web. This is because Gmail API uses different indexing and algorithms than the Gmail web interface.{" "}
          <a
            href="https://stackoverflow.com/questions/33552890/why-does-search-in-gmail-api-return-different-result-than-search-in-gmail-website"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-amber-900 font-medium"
          >
            Learn more
          </a>
        </p>
      </div>

      {/* Results list */}
      <div className="flex-1 overflow-y-auto">
        {results.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <Search size={48} className="mb-3 opacity-30" />
            <p>No results found</p>
          </div>
        ) : (
          <div>
            {results.map((result) => (
              <div
                key={result.messageId}
                onClick={() => onSelectResult(result.messageId)}
                className="px-4 py-3 border-b border-gray-100 hover:bg-blue-50 cursor-pointer transition-colors"
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <span className="font-medium text-gray-900 text-sm truncate flex-1">
                    {result.from}
                  </span>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${getStrategyBadge(result.strategy)}`}
                    >
                      {result.strategy}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatDate(result.receivedDate)}
                    </span>
                  </div>
                </div>
                <p className="text-sm font-medium text-gray-800 truncate">
                  {highlightText(result.subject || "(No subject)", searchQuery)}
                </p>
                <p className="text-sm text-gray-500 truncate mt-0.5">
                  {highlightText(result.snippet, searchQuery)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchResults;
