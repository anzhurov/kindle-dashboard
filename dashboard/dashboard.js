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
  $('date').textContent = now.toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' });
  $('updated').textContent = hhmm(now);
  $('city').textContent = cfg.city;
}

async function renderWeather() {
  const params = new URLSearchParams({
    latitude: cfg.latitude,
    longitude: cfg.longitude,
    current: 'temperature_2m,apparent_temperature,weather_code,wind_speed_10m,relative_humidity_2m',
    hourly: 'temperature_2m,weather_code,precipitation_probability',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset',
    timezone: 'auto',
    forecast_days: 4,
    wind_speed_unit: 'ms',
  });
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
  if (!res.ok) throw new Error(`open-meteo ${res.status}`);
  const w = await res.json();
  const c = w.current;
  const d = w.daily;

  $('temp').textContent = deg(c.temperature_2m);
  $('cond').textContent = WMO[c.weather_code] ?? '—';
  $('feels').textContent = `Відчувається як ${deg(c.apparent_temperature)}`;
  $('minmax').textContent = `Вдень ${deg(d.temperature_2m_max[0])} · вночі ${deg(d.temperature_2m_min[0])}`;
  $('extra').textContent = `Вітер ${Math.round(c.wind_speed_10m)} м/с · вологість ${c.relative_humidity_2m}%`;
  $('sun').textContent = `☀ ${d.sunrise[0].slice(11)} – ${d.sunset[0].slice(11)}`;

  const start = w.hourly.time.findIndex((t) => t >= c.time.slice(0, 13) + ':00');
  $('hours').innerHTML = [3, 6, 9, 12, 15]
    .map((step) => start + step)
    .filter((i) => i < w.hourly.time.length)
    .map((i) => `
      <div class="hour">
        <div>${w.hourly.time[i].slice(11, 16)}</div>
        <div class="t">${deg(w.hourly.temperature_2m[i])}</div>
        <div class="p">☂ ${w.hourly.precipitation_probability[i] ?? 0}%</div>
      </div>`)
    .join('');

  $('days').innerHTML = d.time.slice(1)
    .map((day, k) => {
      const i = k + 1;
      const name = new Date(`${day}T12:00:00`).toLocaleDateString('uk-UA', { weekday: 'short', day: 'numeric' });
      return `
        <div class="day">
          <span class="name">${name}</span>
          <span>${WMO[d.weather_code[i]] ?? '—'}${d.precipitation_probability_max[i] ? ` · ☂ ${d.precipitation_probability_max[i]}%` : ''}</span>
          <span class="range">${deg(d.temperature_2m_max[i])} / ${deg(d.temperature_2m_min[i])}</span>
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
    $('cond').textContent = 'Погода недоступна';
  } finally {
    window.dashReady = true;
  }
})();
