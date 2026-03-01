"use client";

import { useState, useEffect, useRef } from "react";

interface TagAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function TagAutocomplete({
  value,
  onChange,
  placeholder = "태그 입력 (쉼표로 구분)",
  className = "",
}: TagAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const currentWord = value.split(/[,，\s]+/).pop()?.trim().toLowerCase() || "";

  useEffect(() => {
    if (currentWord.length < 1) {
      setSuggestions([]);
      return;
    }
    const t = setTimeout(() => {
      fetch(`/api/tags?q=${encodeURIComponent(currentWord)}`)
        .then((res) => res.json())
        .then((data) => {
          const names = (data.tags || []).map((t: { name: string }) => t.name);
          setSuggestions(names.filter((n: string) => n.toLowerCase().includes(currentWord)));
        })
        .catch(() => setSuggestions([]));
    }, 150);
    return () => clearTimeout(t);
  }, [currentWord]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (tag: string) => {
    const parts = value.split(/[,，\s]+/).filter(Boolean);
    parts.pop();
    const newValue = parts.length ? [...parts, tag].join(", ") : tag;
    onChange(newValue);
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
    setShowSuggestions(currentWord.length >= 1);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <input
        type="text"
        value={value}
        onChange={handleChange}
        onFocus={() => currentWord.length >= 1 && setShowSuggestions(true)}
        placeholder={placeholder}
        className={className}
      />
      {showSuggestions && suggestions.length > 0 && (
        <ul className="absolute z-10 mt-1 max-h-40 w-full overflow-y-auto rounded-lg border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-800">
          {suggestions.map((tag) => (
            <li key={tag}>
              <button
                type="button"
                onClick={() => handleSelect(tag)}
                className="w-full px-3 py-2 text-left text-sm text-zinc-900 hover:bg-zinc-100 dark:text-zinc-100 dark:hover:bg-zinc-700"
              >
                {tag}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
