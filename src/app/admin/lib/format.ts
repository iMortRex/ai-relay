/**
 * Format large numbers with K/M suffixes
 * @param n - Number to format
 * @returns Formatted string (e.g., "1.2M", "500K", "123")
 */
export function formatLargeNumber(n: unknown): string {
  if (typeof n !== 'number') return String(n);

  if (n >= 1_000_000) {
    return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (n >= 1_000) {
    return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  return n.toFixed(0);
}

/**
 * Format number with locale-specific thousand separators
 * @param value - Number to format
 * @param locale - Locale string (defaults to 'en-US')
 * @returns Formatted string with thousand separators
 */
export function formatWithThousandSeparator(
  value: string | number,
  locale: string = 'en-US'
): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return String(value);
  return num.toLocaleString(locale);
}
