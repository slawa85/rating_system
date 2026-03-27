import { Card } from '@/shared/components/ui/Card';

export function ProductSkeleton() {
  return (
    <Card className="h-full flex flex-col animate-pulse">
      <div className="w-full h-48 bg-gray-200 rounded-md mb-4" />
      <div className="h-6 bg-gray-200 rounded mb-2" />
      <div className="h-4 bg-gray-200 rounded mb-3 w-3/4" />
      <div className="mt-auto flex items-center gap-2">
        <div className="h-4 bg-gray-200 rounded w-20" />
        <div className="h-4 bg-gray-200 rounded w-16" />
      </div>
    </Card>
  );
}
