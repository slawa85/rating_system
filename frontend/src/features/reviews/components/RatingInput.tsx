import { useState } from 'react';
import { cn } from '@/shared/utils/cn';

interface RatingInputProps {
  value: number;
  onChange: (rating: number) => void;
  disabled?: boolean;
}

const STARS = [1, 2, 3, 4, 5] as const;

export function RatingInput({ value, onChange, disabled }: RatingInputProps) {
  const [hoverValue, setHoverValue] = useState(0);

  const handleClick = (rating: number) => {
    if (!disabled) {
      onChange(rating);
    }
  };

  const handleMouseEnter = (rating: number) => {
    if (!disabled) {
      setHoverValue(rating);
    }
  };

  const handleMouseLeave = () => {
    setHoverValue(0);
  };

  const renderStar = (index: number) => {
    const filled = (hoverValue || value) >= index;

    return (
      <button
        key={index}
        type="button"
        onClick={() => handleClick(index)}
        onMouseEnter={() => handleMouseEnter(index)}
        onMouseLeave={handleMouseLeave}
        disabled={disabled}
        className={cn(
          'w-8 h-8 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 rounded',
          disabled && 'cursor-not-allowed opacity-50',
        )}
        aria-label={`Rate ${index} stars`}
      >
        <svg
          viewBox="0 0 20 20"
          fill="currentColor"
          className={cn(
            'w-full h-full transition-colors',
            filled ? 'text-yellow-400' : 'text-gray-300',
            !disabled && 'hover:scale-110',
          )}
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      </button>
    );
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Rating {value > 0 && `(${value}/5)`}
      </label>
      <div className="flex gap-1">{STARS.map(renderStar)}</div>
    </div>
  );
}
