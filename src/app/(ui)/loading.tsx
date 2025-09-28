export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="flex flex-col items-center gap-6">
        {/* Blue Spinner */}
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-gray-300 animate-spin"></div>
          <div className="absolute inset-0 rounded-full border-4 border-blue-600 border-t-transparent animate-spin"></div>
          <div
            className="absolute inset-2 rounded-full border-2 border-blue-400 border-b-transparent animate-spin"
            style={{ animationDirection: "reverse", animationDuration: "0.8s" }}
          ></div>
        </div>

        {/* Pulsing dots */}
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-3 h-3 rounded-full bg-blue-600 animate-pulse"
              style={{ animationDelay: `${i * 0.2}s`, animationDuration: "1s" }}
            ></div>
          ))}
        </div>

        {/* Loading text */}
        <p className="text-gray-700 font-medium animate-pulse">Loading...</p>
      </div>
    </div>
  );
}