const OPEN_WEATHER   = import.meta.env.VITE_OPENWEATHER_KEY;
const BASE           = 'https://api.openweathermap.org/data/2.5/weather';

export async function getWeather(lat: number, lng: number) {
  const url = `${BASE}?lat=${lat}&lon=${lng}&units=imperial&appid=${OPEN_WEATHER}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('weather fetch failed');
  const json = await res.json();
  
  return {
    condition: mapIcon(json.weather?.[0]?.main ?? 'Clear'),
    temperatureF: Math.round(json.main?.temp ?? 70),
    feelsLikeF: Math.round(json.main?.feels_like ?? 70),
    humidity: json.main?.humidity ?? 50,
    windMph: Math.round((json.wind?.speed ?? 0) * 2.237), // Convert m/s to mph
    icon: json.weather?.[0]?.icon ?? '01d',
    created_at: new Date().toISOString()
  };
}

function mapIcon(main: string): 'clear'|'clouds'|'rain'|'snow'|'drizzle'|'thunderstorm'|'mist'|'fog' {
  switch (main.toLowerCase()) {
    case 'thunderstorm': return 'thunderstorm';
    case 'drizzle': return 'drizzle';
    case 'rain': return 'rain';
    case 'snow': return 'snow';
    case 'clouds': return 'clouds';
    case 'mist':
    case 'fog': return 'fog';
    default: return 'clear';
  }
} 