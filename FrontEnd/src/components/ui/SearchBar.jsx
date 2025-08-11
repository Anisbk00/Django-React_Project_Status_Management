import { useState } from 'react';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';

const SearchBar = ({ onSearch, placeholder = "Search...", className }) => {
  const [query, setQuery] = useState('');

  const handleChange = (e) => {
    setQuery(e.target.value);
    onSearch(e.target.value);
  };

  const clearSearch = () => {
    setQuery('');
    onSearch('');
  };

  return (
    <form onSubmit={(e) => e.preventDefault()} className="relative w-full">
      <div className="flex items-center">
        <input
          type="text"
          value={query}
          onChange={handleChange}
          placeholder={placeholder}
          className={clsx(
            "pl-10 pr-4 py-2 w-full rounded-xl border border-gray-200 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition text-gray-700",
            className
          )}
        />
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
        </div>
        {query && (
          <button
            type="button"
            onClick={clearSearch}
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
          >
            <XMarkIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
          </button>
        )}
      </div>
    </form>
  );
};

export default SearchBar;
