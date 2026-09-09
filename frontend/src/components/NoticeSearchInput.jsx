import { useState, useEffect, useRef } from "react";
import { Search } from "lucide-react";

export default function NoticeSearchInput({ onChange, placeholder = "Search notices..." }) {
  const [value, setValue] = useState("");
  const debounceRef = useRef(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => onChange(value), 180);
    return () => clearTimeout(debounceRef.current);
  }, [value, onChange]);

  return (
    <div className="relative w-full max-w-sm">
      <Search
        size={15}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-9 pr-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-green-600/30 focus:border-green-600 placeholder:text-gray-400 transition-colors"
      />
    </div>
  );
}