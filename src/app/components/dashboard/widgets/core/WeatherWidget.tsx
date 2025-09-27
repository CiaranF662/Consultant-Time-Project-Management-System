'use client';

import { useState, useEffect } from 'react';
import { Cloud, Sun, CloudRain, Thermometer } from 'lucide-react';
import { WidgetProps } from '../../types';

// #region Weather Widget Component
interface WeatherData {
  temperature: number;
  condition: string;
  humidity: number;
  location: string;
}

export default function WeatherWidget({ size, config }: WidgetProps) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mock weather data - replace with real API
    const mockWeather: WeatherData = {
      temperature: 22,
      condition: 'sunny',
      humidity: 65,
      location: config?.location || 'London, UK'
    };
    
    setTimeout(() => {
      setWeather(mockWeather);
      setLoading(false);
    }, 1000);
  }, [config?.location]);

  const getWeatherIcon = (condition: string) => {
    switch (condition) {
      case 'sunny': return <Sun className="w-8 h-8 text-yellow-400" />;
      case 'rainy': return <CloudRain className="w-8 h-8 text-blue-400" />;
      default: return <Cloud className="w-8 h-8 text-gray-400" />;
    }
  };

  if (loading) {
    return <div className="animate-pulse bg-gray-200 rounded-lg h-full" />;
  }

  return (
    <div className="bg-gradient-to-br from-cyan-400 to-blue-500 text-white p-4 rounded-lg h-full">
      <div className="flex items-center justify-between mb-2">
        <Thermometer className="w-5 h-5 opacity-80" />
        <span className="text-xs opacity-80">Weather</span>
      </div>
      
      <div className="flex items-center justify-between">
        <div>
          <div className={`font-bold ${size === 'small' ? 'text-xl' : 'text-3xl'}`}>
            {weather?.temperature}°C
          </div>
          <div className="text-sm opacity-80 capitalize">
            {weather?.condition}
          </div>
          {size !== 'small' && (
            <div className="text-xs opacity-70 mt-1">
              Humidity: {weather?.humidity}%
            </div>
          )}
        </div>
        {getWeatherIcon(weather?.condition || 'cloudy')}
      </div>
      
      {size !== 'small' && (
        <div className="text-xs opacity-70 mt-2">
          📍 {weather?.location}
        </div>
      )}
    </div>
  );
}
// #endregion