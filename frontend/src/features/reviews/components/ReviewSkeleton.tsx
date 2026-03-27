export function ReviewSkeleton() {
  return (
    <div className="bg-white rounded-lg p-6 border border-gray-200 animate-pulse">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-4 bg-gray-200 rounded w-32" />
            <div className="h-5 bg-gray-200 rounded w-28" />
          </div>
          <div className="h-3 bg-gray-200 rounded w-24 mb-2" />
        </div>
        <div className="h-4 bg-gray-200 rounded w-20" />
      </div>
      <div className="h-5 bg-gray-200 rounded w-3/4 mb-3" />
      <div className="space-y-2">
        <div className="h-4 bg-gray-200 rounded w-full" />
        <div className="h-4 bg-gray-200 rounded w-5/6" />
        <div className="h-4 bg-gray-200 rounded w-4/6" />
      </div>
    </div>
  );
}
