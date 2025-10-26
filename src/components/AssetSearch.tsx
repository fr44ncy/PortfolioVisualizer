import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { searchAssets } from '../lib/assetData';
import { AssetSuggestion } from '../types';

interface AssetSearchProps {
  onSelect: (ticker: string, isin?: string) => void;
}

export default function AssetSearch({ onSelect }: AssetSearchProps) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<AssetSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    if (query.length > 0) {
      const results = searchAssets(query);
      setSuggestions(results);
      setShowSuggestions(results.length > 0);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [query]);

  const handleSelect = (suggestion: AssetSuggestion) => {
    onSelect(suggestion.ticker, suggestion.isin);
    setQuery('');
    setShowSuggestions(false);
  };

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by ticker or ISIN..."
          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
        />
      </div>

      {showSuggestions && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg">
          {suggestions.map((suggestion, idx) => (
            <button
              key={idx}
              onClick={() => handleSelect(suggestion)}
              className="w-full px-4 py-3 text-left hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-sm text-gray-900">{suggestion.ticker}</div>
                  <div className="text-xs text-gray-500">{suggestion.name}</div>
                </div>
                {suggestion.isin && (
                  <div className="text-xs text-gray-400 font-mono">{suggestion.isin}</div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
