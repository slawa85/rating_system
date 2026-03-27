export function ProductSkeleton() {
  return (
    <div className="bg-white rounded-lg overflow-hidden animate-pulse">
      <div className="w-full aspect-square bg-gray-200" />
      <div className="p-4">
        <div className="h-3 bg-gray-200 rounded w-20 mb-2" />
        <div className="h-5 bg-gray-200 rounded mb-2" />
        <div className="h-5 bg-gray-200 rounded w-3/4 mb-2" />
        <div className="flex items-center gap-2 mb-2">
          <div className="h-4 bg-gray-200 rounded w-24" />
        </div>
        <div className="h-6 bg-gray-200 rounded w-20" />
      </div>
    </div>
  );
}
