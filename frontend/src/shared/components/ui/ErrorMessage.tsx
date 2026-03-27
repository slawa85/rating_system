import { cn } from '@/shared/utils/cn';

interface ErrorMessageProps {
  message: string;
  className?: string;
}

export function ErrorMessage({ message, className }: ErrorMessageProps) {
  return (
    <div
      className={cn(
        'bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg',
        className
      )}
    >
      <p className="text-sm">{message}</p>
    </div>
  );
}
