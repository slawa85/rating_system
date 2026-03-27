import { Card } from '@/shared/components/ui/Card';

export function ReviewSkeleton() {
  return (
    <Card className="animate-pulse">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="h-5 bg-gray-200 rounded w-24 mb-2" />
          <div className="h-6 bg-gray-200 rounded w-3/4 mb-2" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-4 bg-gray-200 rounded w-full" />
        <div className="h-4 bg-gray-200 rounded w-5/6" />
        <div className="h-4 bg-gray-200 rounded w-4/6" />
      </div>
      <div className="mt-4 h-3 bg-gray-200 rounded w-32" />
    </Card>
  );
}
