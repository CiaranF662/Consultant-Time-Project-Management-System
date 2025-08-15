/**
 * Generates a consistent Tailwind CSS text color class from a string (e.g., a user ID).
 * This ensures a user always gets the same color.
 * @param str The input string to hash.
 * @returns A Tailwind CSS class name like 'text-blue-600'.
 */
export function generateColorFromString(str: string): string {
    // A simple hashing function to get a number from the string
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
  
    const colors = [
      'text-red-600',
      'text-blue-600',
      'text-green-600',
      'text-purple-600',
      'text-yellow-600',
      'text-indigo-600',
      'text-pink-600',
      'text-teal-600',
    ];
  
    // Use the hash to pick a color from the array
    const index = Math.abs(hash % colors.length);
    return colors[index];
  }