const ICON_PATHS = {
  sun: '<circle cx="12" cy="12" r="4.2"/><path d="M12 2.2v2.3M12 19.5v2.3M2.2 12h2.3M19.5 12h2.3M5.1 5.1l1.6 1.6M17.3 17.3l1.6 1.6M5.1 18.9l1.6-1.6M17.3 6.7l1.6-1.6"/>',
  moon: '<path d="M20 14.6A8.2 8.2 0 0 1 9.4 4a8.2 8.2 0 1 0 10.6 10.6z"/>',
  cloud: '<path d="M7 18.5h10.2a4.3 4.3 0 0 0 .6-8.6A6 6 0 0 0 6.4 11.3 3.6 3.6 0 0 0 7 18.5z"/>',
  partly: '<path d="M8.6 3.6v1.5M3.6 8.6h1.5M5 5l1 1M12.2 5l-1 1"/><path d="M5.9 11.2a3.2 3.2 0 0 1 5.3-3.5"/><path d="M9 20h8.6a3.7 3.7 0 0 0 .5-7.4 5.2 5.2 0 0 0-9.8 1.2A3.1 3.1 0 0 0 9 20z"/>',
  partlyNight: '<path d="M11.5 8.2A4.6 4.6 0 0 1 5 3.5a4.6 4.6 0 0 0 1.4 8"/><path d="M9 20h8.6a3.7 3.7 0 0 0 .5-7.4 5.2 5.2 0 0 0-9.8 1.2A3.1 3.1 0 0 0 9 20z"/>',
  fog: '<path d="M4 9h16M3 13h18M5 17h14M8 21h8"/><path d="M7 5.5h10"/>',
  drizzle: '<path d="M7 14.5h10.2a4.3 4.3 0 0 0 .6-8.6A6 6 0 0 0 6.4 7.3 3.6 3.6 0 0 0 7 14.5z"/><path d="M8.5 18v1M12 18v1M15.5 18v1M10.2 21.2v.3M13.8 21.2v.3"/>',
  rain: '<path d="M7 14.5h10.2a4.3 4.3 0 0 0 .6-8.6A6 6 0 0 0 6.4 7.3 3.6 3.6 0 0 0 7 14.5z"/><path d="M8.5 17.5l-1 3M12.5 17.5l-1 3M16.5 17.5l-1 3"/>',
  snow: '<path d="M7 14.5h10.2a4.3 4.3 0 0 0 .6-8.6A6 6 0 0 0 6.4 7.3 3.6 3.6 0 0 0 7 14.5z"/><path d="M8.5 18.3v.1M12 18.3v.1M15.5 18.3v.1M10.2 21.3v.1M13.8 21.3v.1"/>',
  storm: '<path d="M7 14.5h10.2a4.3 4.3 0 0 0 .6-8.6A6 6 0 0 0 6.4 7.3 3.6 3.6 0 0 0 7 14.5z"/><path d="M12.8 15.5l-2.3 3.4h3l-2.3 3.4"/>',
  wind: '<path d="M3 9h11a2.8 2.8 0 1 0-2.8-2.8M3 13h15a2.8 2.8 0 1 1-2.8 2.8M3 17h7"/>',
  drop: '<path d="M12 3.2s-6 6.5-6 10.8a6 6 0 0 0 12 0c0-4.3-6-10.8-6-10.8z"/>',
  sunrise: '<path d="M4 18h16M7.5 18a4.5 4.5 0 0 1 9 0M12 4v6M9 7l3-3 3 3M4.5 13.5l1.4.8M19.5 13.5l-1.4.8"/>',
  sunset: '<path d="M4 18h16M7.5 18a4.5 4.5 0 0 1 9 0M12 4v6M9 7l3 3 3-3M4.5 13.5l1.4.8M19.5 13.5l-1.4.8"/>',
  refresh: '<path d="M20 11a8 8 0 0 0-14.6-4.5M4 4v4h4"/><path d="M4 13a8 8 0 0 0 14.6 4.5M20 20v-4h-4"/>',
  thermo: '<path d="M10 4.5a2 2 0 0 1 4 0v9.2a4 4 0 1 1-4 0z"/><path d="M12 10v6"/>',
};

function icon(name, stroke = 2) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round">${ICON_PATHS[name] ?? ICON_PATHS.cloud}</svg>`;
}

function weatherIcon(code, isDay = 1) {
  if (code === 0 || code === 1) return isDay ? 'sun' : 'moon';
  if (code === 2) return isDay ? 'partly' : 'partlyNight';
  if (code === 3) return 'cloud';
  if (code === 45 || code === 48) return 'fog';
  if (code >= 51 && code <= 57) return 'drizzle';
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return 'rain';
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow';
  if (code >= 95) return 'storm';
  return 'cloud';
}
