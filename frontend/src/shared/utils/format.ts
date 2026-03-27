import { formatDistance } from 'date-fns';

export function formatRelativeDate(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return formatDistance(dateObj, new Date(), { addSuffix: true });
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat().format(num);
}

export function formatRating(rating: number): string {
  return rating.toFixed(1);
}
