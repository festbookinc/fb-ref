"use client";

import { createContext, useContext, useState, useCallback } from "react";

interface SearchState {
  query: string;
  selectedTags: string[];
}

interface SearchContextValue {
  query: string;
  selectedTags: string[];
  setQuery: (q: string) => void;
  setSelectedTags: (tags: string[]) => void;
  clearFilters: () => void;
  hasFilters: boolean;
}

const SearchContext = createContext<SearchContextValue | null>(null);

export function SearchProvider({ children }: { children: React.ReactNode }) {
  const [query, setQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const clearFilters = useCallback(() => {
    setQuery("");
    setSelectedTags([]);
  }, []);

  const hasFilters = query.trim() !== "" || selectedTags.length > 0;

  return (
    <SearchContext.Provider
      value={{
        query,
        selectedTags,
        setQuery,
        setSelectedTags,
        clearFilters,
        hasFilters,
      }}
    >
      {children}
    </SearchContext.Provider>
  );
}

export function useSearch() {
  const ctx = useContext(SearchContext);
  return ctx;
}
