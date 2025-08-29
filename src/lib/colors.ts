/**
 * Generates consistent Tailwind CSS background and text color classes from a string (e.g., a user ID).
 * This ensures a user always gets the same color.
 * @param str The input string to hash.
 * @returns A string of Tailwind CSS class names like 'bg-blue-100 text-blue-800'.
 */
export function generateColorFromString(str: string): string {
  // A simple hashing function to get a number from the string
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }

  const colors = [
    'bg-blue-100 text-blue-800',
    'bg-purple-100 text-purple-800',
    'bg-green-100 text-green-800',
    'bg-yellow-100 text-yellow-800',
    'bg-red-100 text-red-800',
    'bg-indigo-100 text-indigo-800',
    'bg-pink-100 text-pink-800',
    'bg-teal-100 text-teal-800',
    'bg-cyan-100 text-cyan-800',
    'bg-lime-100 text-lime-800',
    'bg-orange-100 text-orange-800',
    'bg-sky-100 text-sky-800',
    'bg-violet-100 text-violet-800',
    'bg-fuchsia-100 text-fuchsia-800',
    'bg-rose-100 text-rose-800',
    'bg-gray-200 text-gray-800',
  ];

  // Use the hash to pick a color from the array
  const index = Math.abs(hash % colors.length);
  return colors[index];
}