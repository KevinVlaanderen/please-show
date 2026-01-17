import { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../../stores/appStore';

interface Example {
  name: string;
  file: string;
}

export function ExamplesDropdown() {
  const [examples, setExamples] = useState<Example[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const loadFromUrl = useAppStore((state) => state.loadFromUrl);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('./examples/manifest.json')
      .then((res) => res.json())
      .then((data) => setExamples(data))
      .catch(() => setExamples([]));
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = async (example: Example) => {
    setIsLoading(true);
    setIsOpen(false);
    await loadFromUrl(`./examples/${example.file}`);
    setIsLoading(false);
  };

  if (examples.length === 0) {
    return null;
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        className="px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md flex items-center gap-1 disabled:opacity-50"
      >
        {isLoading ? 'Loading...' : 'Examples'}
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1 w-48 bg-white border border-slate-200 rounded-md shadow-lg z-50">
          {examples.map((example) => (
            <button
              key={example.file}
              onClick={() => handleSelect(example)}
              className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 first:rounded-t-md last:rounded-b-md"
            >
              {example.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
