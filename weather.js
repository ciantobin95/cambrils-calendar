import { getOrdinalSuffix } from './utils.js';

const LAT = 41.0667;
const LON = 1.05;

// One consistent stroke-drawn icon set (24px grid, 2px round strokes) so the
// weather page matches the rest of the app instead of mixing platform emoji.
const ICON_PATHS = {
    sun: '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>',
    sunCloud: '<circle cx="17" cy="6" r="2.6"/><line x1="17" y1="0.8" x2="17" y2="1.9"/><line x1="21.5" y1="2.4" x2="20.7" y2="3.2"/><line x1="22.6" y1="6" x2="21.5" y2="6"/><path d="M14.5 21H7a4.5 4.5 0 1 1 .8-8.93A6 6 0 0 1 19 13.7 3.7 3.7 0 0 1 14.5 21z"/>',
    cloud: '<path d="M18 10h-1.26A8 8 0 1 0 9 20h9a4 4 0 0 0 0-8z"/>',
    fog: '<path d="M4 8h16"/><path d="M3 12h18"/><path d="M5 16h14"/><path d="M7 20h10"/>',
    drizzle: '<line x1="8" y1="19" x2="8" y2="21"/><line x1="8" y1="13" x2="8" y2="15"/><line x1="16" y1="19" x2="16" y2="21"/><line x1="16" y1="13" x2="16" y2="15"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="12" y1="15" x2="12" y2="17"/><path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25"/>',
    rain: '<line x1="16" y1="13" x2="16" y2="21"/><line x1="8" y1="13" x2="8" y2="21"/><line x1="12" y1="15" x2="12" y2="23"/><path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25"/>',
    storm: '<path d="M19 16.9A5 5 0 0 0 18 7h-1.26a8 8 0 1 0-11.62 9"/><polyline points="13 11 9 17 15 17 11 23"/>',
    unknown: '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>'
};

// Sun-family icons carry the gold accent; everything else stays sea-blue.
const GOLD_ICONS = new Set(['sun', 'sunCloud']);

function iconSvg(name) {
    const paths = ICON_PATHS[name] || ICON_PATHS.unknown;
    const tone = GOLD_ICONS.has(name) ? 'wx-icon--gold' : '';
    return `<svg class="wx-icon ${tone}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
}

function getWeatherDesc(code) {
    const codes = {
        0:  { text: "Clear Sky", icon: "sun" },
        1:  { text: "Mainly Clear", icon: "sunCloud" },
        2:  { text: "Partly Cloudy", icon: "sunCloud" },
        3:  { text: "Overcast", icon: "cloud" },
        45: { text: "Foggy", icon: "fog" },
        51: { text: "Light Drizzle", icon: "drizzle" },
        53: { text: "Drizzle", icon: "drizzle" },
        55: { text: "Heavy Drizzle", icon: "rain" },
        61: { text: "Rain", icon: "rain" },
        63: { text: "Moderate Rain", icon: "rain" },
        65: { text: "Heavy Rain", icon: "storm" },
        80: { text: "Rain Showers", icon: "drizzle" },
        95: { text: "Thunderstorm", icon: "storm" },
        96: { text: "Thunderstorm", icon: "storm" }
    };
    return codes[code] || { text: "Unknown", icon: "unknown" };
}

async function fetchWeather() {
    try {
        // Request daily weather + sunrise + sunset
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&current_weather=true&daily=weathercode,temperature_2m_max,temperature_2m_min,sunrise,sunset&timezone=auto`;
        
        const response = await fetch(url);
        const data = await response.json();

        // 1. Update Current Weather
        const current = data.current_weather;
        const currentInfo = getWeatherDesc(current.weathercode);

        document.getElementById('currentTemp').innerText = Math.round(current.temperature) + "°C";
        document.getElementById('conditionIcon').innerHTML = iconSvg(currentInfo.icon);
        document.getElementById('conditionText').innerText = currentInfo.text;
        document.getElementById('windSpeed').innerText = current.windspeed;
        
        // 2. Update Sunrise & Sunset
        // The API returns an array of times, index 0 is today
        const todaySunrise = new Date(data.daily.sunrise[0]);
        const todaySunset = new Date(data.daily.sunset[0]);
        
        // Format to HH:MM (e.g. 07:15)
        const timeOptions = { hour: '2-digit', minute: '2-digit', hour12: false };
        document.getElementById('sunriseTime').innerText = todaySunrise.toLocaleTimeString([], timeOptions);
        document.getElementById('sunsetTime').innerText = todaySunset.toLocaleTimeString([], timeOptions);

        document.getElementById('loadingText').style.display = 'none';
        document.getElementById('weatherContent').style.display = 'block';

        // 3. Update the forecast for the next 6 days. Today is skipped:
        // the "right now" panel above already covers it.
        const daily = data.daily;
        const forecastContainer = document.getElementById('forecastList');
        forecastContainer.innerHTML = '';

        for(let i = 1; i < 7; i++) {
            const dateStr = daily.time[i];
            const maxTemp = Math.round(daily.temperature_2m_max[i]);
            const minTemp = Math.round(daily.temperature_2m_min[i]);
            const code = daily.weathercode[i];
            const info = getWeatherDesc(code);

            // Create Date Object
            const dateObj = new Date(dateStr);
            
            // Get parts: "Mon", "Feb", 23
            const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
            const monthName = dateObj.toLocaleDateString('en-US', { month: 'short' });
            const dayNum = dateObj.getDate();
            const suffix = getOrdinalSuffix(dayNum);

            // Combine: "Mon, 23rd Feb"
            const finalDateString = `${dayName}, ${dayNum}${suffix} ${monthName}`;

            const row = document.createElement('div');
            row.className = 'forecast-row';
            row.innerHTML = `
                <div class="day-name">${finalDateString}</div>
                <div class="day-icon">${iconSvg(info.icon)}</div>
                <div class="day-temp">
                    <span class="max">${maxTemp}°</span>
                    <span class="min">${minTemp}°</span>
                </div>
            `;
            forecastContainer.appendChild(row);
        }

    } catch (error) {
        console.error("Weather load failed", error);
        const status = document.getElementById('loadingText');
        status.classList.add('error');
        status.innerText = "Sorry, we couldn’t load the weather. Please check your internet and reload the page.";
    }
}

document.addEventListener('DOMContentLoaded', fetchWeather);