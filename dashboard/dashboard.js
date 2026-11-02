const cfg = window.DASH_CONFIG;

const WMO = {
  0: 'Ясно', 1: 'Переважно ясно', 2: 'Мінлива хмарність', 3: 'Хмарно',
  45: 'Туман', 48: 'Паморозь, туман',
  51: 'Легка мряка', 53: 'Мряка', 55: 'Сильна мряка',
  56: 'Крижана мряка', 57: 'Крижана мряка',
  61: 'Невеликий дощ', 63: 'Дощ', 65: 'Злива',
  66: 'Крижаний дощ', 67: 'Крижаний дощ',
  71: 'Невеликий сніг', 73: 'Сніг', 75: 'Сильний сніг', 77: 'Снігова крупа',
  80: 'Короткий дощ', 81: 'Зливи', 82: 'Сильні зливи',
  85: 'Снігопад', 86: 'Сильний снігопад',
  95: 'Гроза', 96: 'Гроза з градом', 99: 'Гроза з градом',
};

const $ = (id) => document.getElementById(id);
const deg = (v) => `${Math.round(v)}°`;
const hhmm = (d) => d.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });

function renderDate() {
  const now = new Date();
  $('weekday').textContent = now.toLocaleDateString('uk-UA', { weekday: 'long' });
  $('date').textContent = now.toLocaleDateString('uk-UA', { day: 'numeric', month: 'long' });
  $('updated-icon').innerHTML = icon('refresh', 2.2);
  $('updated').textContent = `${hhmm(now)}, ${now.getDate()}.${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function fact(name, label, value) {
  return `<div class="fact">${icon(name, 2.2)}<span>${label} <b>${value}</b></span></div>`;
}

async function fetchJson(url, attempts = 4) {
  for (let i = 1; ; i++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`${res.status} ${url}`);
      return await res.json();
    } catch (e) {
      if (i >= attempts) throw e;
      console.warn(`retry ${i}: ${e.message}`);
      await new Promise((r) => setTimeout(r, 3000 * i));
    }
  }
}

async function renderWeather() {
  const params = new URLSearchParams({
    latitude: cfg.latitude,
    longitude: cfg.longitude,
    current: 'temperature_2m,apparent_temperature,weather_code,is_day,wind_speed_10m,relative_humidity_2m',
    hourly: 'temperature_2m,weather_code,is_day',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset',
    timezone: 'auto',
    forecast_days: 5,
    wind_speed_unit: 'ms',
  });
  const w = await fetchJson(`https://api.open-meteo.com/v1/forecast?${params}`);
  const c = w.current;
  const d = w.daily;
  const h = w.hourly;

  $('now-icon').innerHTML = icon(weatherIcon(c.weather_code, c.is_day), 1.8);
  $('temp').textContent = deg(c.temperature_2m);
  $('cond').textContent = WMO[c.weather_code] ?? '—';
  $('feels').textContent = `Відчувається як ${deg(c.apparent_temperature)}`;

  $('facts').innerHTML = [
    fact('sunrise', 'Схід', d.sunrise[0].slice(11)),
    fact('sunset', 'Захід', d.sunset[0].slice(11)),
    fact('wind', 'Вітер', `${Math.round(c.wind_speed_10m)} м/с`),
    fact('drop', 'Вологість', `${c.relative_humidity_2m}%`),
  ].join('');

  const start = h.time.findIndex((t) => t >= c.time.slice(0, 13) + ':00');
  $('hours').innerHTML = [0, 2, 4, 6, 8, 10]
    .map((step) => start + step)
    .filter((i) => i >= 0 && i < h.time.length)
    .map((i, k) => `
      <div class="hour">
        <div class="h ${k === 0 ? 'now-label' : ''}">${k === 0 ? 'Зараз' : h.time[i].slice(11, 13)}</div>
        ${icon(weatherIcon(h.weather_code[i], h.is_day[i]), 2)}
        <div class="t">${deg(k === 0 ? c.temperature_2m : h.temperature_2m[i])}</div>
      </div>`)
    .join('');

  const lo = Math.min(...d.temperature_2m_min);
  const hi = Math.max(...d.temperature_2m_max);
  const pos = (t) => `${((t - lo) / Math.max(hi - lo, 1)) * 100}%`;

  $('days').innerHTML = d.time
    .map((day, i) => {
      const name = i === 0
        ? 'Сьогодні'
        : new Date(`${day}T12:00:00`).toLocaleDateString('uk-UA', { weekday: 'short' });
      const pop = d.precipitation_probability_max[i];
      const dot = i === 0 ? `<div class="dot" style="left:${pos(c.temperature_2m)}"></div>` : '';
      return `
        <div class="day">
          <span class="name">${name[0].toUpperCase() + name.slice(1)}</span>
          ${icon(weatherIcon(d.weather_code[i]), 2)}
          <span class="pop">${pop >= 20 ? `${pop}%` : ''}</span>
          <div class="range">
            <span class="lo">${deg(d.temperature_2m_min[i])}</span>
            <div class="bar">
              <div class="fill" style="left:${pos(d.temperature_2m_min[i])};right:calc(100% - ${pos(d.temperature_2m_max[i])})"></div>
              ${dot}
            </div>
            <span class="hi">${deg(d.temperature_2m_max[i])}</span>
          </div>
        </div>`;
    })
    .join('');
}

(async () => {
  renderDate();
  try {
    await renderWeather();
  } catch (e) {
    console.error(e);
    window.dashError = String(e);
    $('cond').textContent = 'Погода недоступна';
  } finally {
    window.dashReady = true;
  }
})();
