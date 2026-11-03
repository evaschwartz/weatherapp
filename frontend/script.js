
/* =========================
   HELPERS
========================= */

const $ = selector => document.querySelector(selector);

const API = "/api";

const userId = () =>
  localStorage.getItem("weatherapp_user_id");

let cities = [];

function go(url) {
  window.location.href = url;
}

async function request(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers
    }
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Noget gik galt.");
  }

  return data;
}

/* =========================
   CITIES
========================= */

async function loadCities() {
  cities = await request(`${API}/weather/cities`);
  return cities;
}

function fillCitySelect(select, selected) {
  if (!select) return;

  select.innerHTML = "";

  cities.forEach(city => {
    const option = document.createElement("option");

    option.value = city.name;
    option.textContent = city.name;

    select.append(option);
  });

  if (
    selected &&
    cities.some(city => city.name === selected)
  ) {
    select.value = selected;
  }
}

/* =========================
   USERS
========================= */

async function getUser() {
  return request(`${API}/users/${userId()}`);
}

/* =========================
   WEATHER ICONS
========================= */

function description(symbol = "") {
  if (symbol.includes("thunder")) return "Tordenvejr";
  if (symbol.includes("snow")) return "Snevejr";
  if (symbol.includes("sleet")) return "Slud";
  if (symbol.includes("rain") || symbol.includes("drizzle")) return "Regnvejr";
  if (symbol.includes("fog")) return "Tåget";
  if (symbol.includes("partlycloudy")) return "Delvist skyet";
  if (symbol.includes("cloudy")) return "Skyet";
  return symbol.includes("night") ? "Klart vejr i nat" : "Klart vejr";
}

function iconPath(symbol = "") {
  const s = symbol.toLowerCase();

  if (s.includes("thunder")) return "/assets/icons/weather/thunderstorms.svg";
  if (s.includes("snow")) return "/assets/icons/weather/snow.svg";
  if (s.includes("sleet")) return "/assets/icons/weather/sleet.svg";
  if (s.includes("drizzle")) return "/assets/icons/weather/drizzle.svg";
  if (s.includes("rain")) return "/assets/icons/weather/rain.svg";
  if (s.includes("fog")) return "/assets/icons/weather/fog.svg";
  if (s.includes("partlycloudy") && s.includes("night")) {
    return "/assets/icons/weather/partly-cloudy-night.svg";
  }
  if (s.includes("partlycloudy")) {
    return "/assets/icons/weather/partly-cloudy-day.svg";
  }
  if (s.includes("cloudy")) return "/assets/icons/weather/cloudy.svg";
  if (s.includes("night")) return "/assets/icons/weather/clear-night.svg";

  return "/assets/icons/weather/clear-day.svg";
}

function iconMarkup(symbol = "", className = "weather-svg") {
  return `
    <img
      src="${iconPath(symbol)}"
      alt="${description(symbol)}"
      class="${className}"
    />
  `;
}

/* =========================
   CLOTHING RECOMMENDATIONS
========================= */

function clothing(weather, user) {
  const temperature = weather.temperature;

  // Tilpas anbefalinger efter temperaturfølsomhed
  let adjusted = temperature;

  if (user.sensitivity === "cold") {
    adjusted -= 4;
  }

  if (user.sensitivity === "warm") {
    adjusted += 4;
  }

  const rain =
    weather.symbol.includes("rain") ||
    weather.symbol.includes("drizzle") ||
    weather.symbol.includes("sleet") ||
    (weather.precipitation || 0) > 0.4;

  const suggestions = [];

  // Meget koldt
  if (adjusted < 0) {
    suggestions.push(
      ["🧥", "Vinterjakke"],
      ["🧤", "Handsker"],
      ["🧣", "Halstørklæde"],
      ["👖", "Varme bukser"]
    );
  }

  // Koldt
  else if (adjusted < 10) {
    suggestions.push(
      ["🧥", "Varm jakke"],
      ["🧶", "Varm trøje"],
      ["👖", "Lange bukser"]
    );
  }

  // Køligt
  else if (adjusted < 17) {
    suggestions.push(
      ["🧥", "Let jakke"],
      ["👕", "Langærmet trøje"],
      ["👖", "Lange bukser"]
    );
  }

  // Lunt
  else if (adjusted < 23) {
    suggestions.push(
      ["👕", "T-shirt"],
      ["👖", "Lette bukser"]
    );
  }

  // Varmt
  else {
    suggestions.push(
      ["👕", "Let overdel"],
      ["🩳", "Shorts"],
      ["🧴", "Solbeskyttelse"]
    );
  }

  // Regn
  if (rain) {
    suggestions.unshift(["☔", "Regnjakke"]);
  }

  // Cykling i blæsevejr
  if (
    user.transport === "bike" &&
    weather.wind >= 6
  ) {
    suggestions.push([
      "💨",
      "Vindafvisende lag"
    ]);
  }

  // Gående i regnvejr
  if (
    user.transport === "walk" &&
    rain
  ) {
    suggestions.push([
      "🥾",
      "Vandtætte sko"
    ]);
  }

  // Ekstra lag til børn
  if (
    user.age_group === "child" &&
    adjusted < 5
  ) {
    suggestions.push([
      "🧤",
      "Ekstra varmt lag"
    ]);
  }

  // Fjern dubletter
  const unique = new Map(
    suggestions.map(item => [item[1], item])
  );

  return [...unique.values()].slice(0, 6);
}

/* =========================
   RENDER WEATHER
========================= */

function renderWeather(data, user, cityName) {
  const entries = data.timeseries;

  const now =
    entries.find(
      item =>
        new Date(item.time).getTime() >=
        Date.now() - 3600000
    ) || entries[0];

  if (!now) {
    throw new Error("Ingen vejrdata tilgængelige.");
  }

  const updatedTime = data.updatedAt
    ? new Date(data.updatedAt).toLocaleTimeString("da-DK", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Europe/Copenhagen"
      })
    : null;

  $("#city").textContent = cityName;
  $("#temperature").textContent = Math.round(now.temperature);
  $("#symbol").innerHTML = iconMarkup(now.symbol, "weather-svg weather-svg--hero");
  $("#description").textContent = description(now.symbol);

  $("#weather-meta").textContent =
    updatedTime
      ? `Opdateret kl. ${updatedTime}`
      : `Vind ${Math.round(now.wind)} m/s · Luftfugtighed ${Math.round(now.humidity)} %`;

  $("#wind-value").textContent = `${Math.round(now.wind)} m/s`;
  $("#humidity-value").textContent = `${Math.round(now.humidity)} %`;
  $("#precipitation-value").textContent =
    now.precipitation !== null && now.precipitation !== undefined
      ? `${Number(now.precipitation).toFixed(1)} mm`
      : "0.0 mm";

  renderHourly(entries);
  renderClothing(now, user);
  renderDaily(entries);
}

/* =========================
   HOURLY FORECAST
========================= */

function renderHourly(entries) {
  const hourly = entries
    .filter(
      item =>
        new Date(item.time).getTime() >=
        Date.now() - 3600000
    )
    .slice(0, 8);

  const elements = hourly.map(item => {
    const element = document.createElement("div");

    element.className = "hour";

    const time = new Date(item.time)
      .toLocaleTimeString("da-DK", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Europe/Copenhagen"
      });

    element.innerHTML = `
      <small>${time}</small>
      <div class="hour-icon-wrap">
        ${iconMarkup(item.symbol, "weather-svg weather-svg--small")}
      </div>
      <strong>${Math.round(item.temperature)}°</strong>
    `;

    return element;
  });

  $("#hourly").replaceChildren(...elements);
}

/* =========================
   RENDER CLOTHING
========================= */

function renderClothing(weather, user) {
  $("#clothing-intro").textContent =
    `${Math.round(weather.temperature)}° og ` +
    `${description(weather.symbol).toLowerCase()} - ` +
    `her er vores forslag til dig.`;

  const suggestions = clothing(weather, user);

  const elements = suggestions.map(([emoji, label]) => {
    const element = document.createElement("div");
    element.className = "clothing-item";

    const emojiElement =
      document.createElement("span");

    emojiElement.className = "emoji";
    emojiElement.textContent = emoji;

    const labelElement =
      document.createElement("span");

    labelElement.textContent = label;

    element.append(
      emojiElement,
      labelElement
    );

    return element;
  });

  $("#clothing-grid").replaceChildren(...elements);
}

/* =========================
   DAILY FORECAST
========================= */

function renderDaily(entries) {
  const grouped = new Map();

  for (const item of entries) {
    const date = new Date(item.time)
      .toLocaleDateString("sv-SE", {
        timeZone: "Europe/Copenhagen"
      });

    if (!grouped.has(date)) {
      grouped.set(date, []);
    }

    grouped.get(date).push(item);
  }

  const days = [...grouped].slice(0, 7);

  const elements = days.map(([date, items]) => {
    const midday =
      items.find(item => {
        const hour = new Date(item.time)
          .toLocaleTimeString("en-GB", {
            hour: "2-digit",
            hour12: false,
            timeZone: "Europe/Copenhagen"
          });

        return hour.startsWith("12");
      }) || items[Math.floor(items.length / 2)];

    const temperatures = items.map(item => item.temperature);
    const minimum = Math.round(Math.min(...temperatures));
    const maximum = Math.round(Math.max(...temperatures));

    const day = new Date(`${date}T12:00:00`)
      .toLocaleDateString("da-DK", {
        weekday: "short"
      });

    const element = document.createElement("div");
    element.className = "daily-row";

    element.innerHTML = `
      <span class="day">${day}</span>
      <span class="icon daily-icon">
        ${iconMarkup(midday.symbol, "weather-svg weather-svg--tiny")}
      </span>
      <span class="condition">
        ${description(midday.symbol)}
      </span>
      <strong>${maximum}° / ${minimum}°</strong>
    `;

    return element;
  });

  $("#daily").replaceChildren(...elements);
}

/* =========================
   DASHBOARD
========================= */

async function dashboard() {
  if (!userId()) {
    return go("/login.html");
  }

  try {
    const [user] = await Promise.all([
      getUser(),
      loadCities()
    ]);

    $("#greeting").textContent =
      `Hej, ${user.name} 👋`;

    const dialog = $("#city-dialog");
    const list = $("#city-list");

    async function showWeather(lat, lon, name) {
      $("#status").textContent = "";

      try {
        const data = await request(
          `${API}/weather?lat=${lat}&lon=${lon}`
        );

        renderWeather(data, user, name);

      } catch (error) {
        $("#status").textContent = error.message;
      }
    }

    // Brugerens foretrukne by
    const city =
      cities.find(
        item => item.name === user.preferred_city
      ) || cities[0];

    await showWeather(
      city.lat,
      city.lon,
      city.name
    );

    // Favoritbyer prioriteres i listen
    const favorites = [
      ...new Set([
        user.preferred_city,
        ...user.favorites
      ])
    ];

    const sortedCities = cities.slice().sort(
      (a, b) =>
        Number(favorites.includes(b.name)) -
        Number(favorites.includes(a.name))
    );

    const cityButtons = sortedCities.map(city => {
      const button = document.createElement("button");

      button.type = "button";

      button.textContent =
        `${favorites.includes(city.name) ? "★ " : ""}` +
        city.name;

      button.onclick = () => {
        dialog.close();

        showWeather(
          city.lat,
          city.lon,
          city.name
        );
      };

      return button;
    });

    list.replaceChildren(...cityButtons);

    // Åbn byvælger
    $("#choose-city").onclick = () => {
      dialog.showModal();
    };

    // Automatisk lokation
    $("#locate").onclick = () => {
      if (!navigator.geolocation) {
        $("#status").textContent =
          "Din browser understøtter ikke lokation.";

        return;
      }

      navigator.geolocation.getCurrentPosition(
        position => {
          showWeather(
            position.coords.latitude,
            position.coords.longitude,
            "Din lokation"
          );
        },

        () => {
          $("#status").textContent =
            "Kunne ikke få adgang til din lokation.";
        }
      );
    };

  } catch (error) {
    $("#status").textContent = error.message;

    if (error.message.includes("findes ikke")) {
      localStorage.removeItem("weatherapp_user_id");
      go("/login.html");
    }
  }
}

/* =========================
   LOGIN
========================= */

function login() {
  $("#login-form").onsubmit = async event => {
    event.preventDefault();

    $("#form-error").textContent = "";

    try {
      const result = await request(
        `${API}/users/login`,
        {
          method: "POST",
          body: JSON.stringify({
            name: $("#name").value
          })
        }
      );

      localStorage.setItem(
        "weatherapp_user_id",
        result.user.id
      );

      if (result.isNew) {
        go("/register.html");
      } else {
        go("/index.html");
      }

    } catch (error) {
      $("#form-error").textContent =
        error.message;
    }
  };
}

/* =========================
   ONBOARDING PREFERENCES
========================= */

async function preferences() {
  if (!userId()) {
    return go("/login.html");
  }

  try {
    await loadCities();

    fillCitySelect(
      $("#preferred_city"),
      "København"
    );

    $("#preferences-form").onsubmit =
      async event => {
        event.preventDefault();

        try {
          const values = Object.fromEntries(
            new FormData(event.target)
          );

          await request(
            `${API}/users/${userId()}`,
            {
              method: "PATCH",
              body: JSON.stringify(values)
            }
          );

          go("/index.html");

        } catch (error) {
          $("#form-error").textContent =
            error.message;
        }
      };

  } catch (error) {
    $("#form-error").textContent = error.message;
  }
}

/* =========================
   PROFILE
========================= */

async function profile() {
  if (!userId()) {
    return go("/login.html");
  }

  try {
    await loadCities();

    const user = await getUser();

    $("#profile-name").textContent =
      `Hej, ${user.name}!`;

    // Indlæs byer
    fillCitySelect(
      $("#preferred_city"),
      user.preferred_city
    );

    fillCitySelect($("#favorite-city"));

    // Indlæs præferencer
    for (const key of [
      "age_group",
      "sensitivity",
      "transport"
    ]) {
      $(`#${key}`).value = user[key];
    }

    // Vis favoritbyer
    function showFavorites(list) {
      const elements = list.map(city => {
        const element =
          document.createElement("div");

        element.className = "favorite-chip";

        const name =
          document.createElement("span");

        name.textContent = `📍 ${city}`;

        const remove =
          document.createElement("button");

        remove.textContent = "Fjern";

        remove.onclick = async () => {
          try {
            const updated = await request(
              `${API}/users/${userId()}/favorites/` +
              encodeURIComponent(city),
              {
                method: "DELETE"
              }
            );

            showFavorites(updated.favorites);

          } catch (error) {
            $("#save-status").textContent =
              error.message;
          }
        };

        element.append(name, remove);

        return element;
      });

      $("#favorites-list").replaceChildren(
        ...elements
      );
    }

    showFavorites(user.favorites);

    // Gem præferencer
    $("#profile-form").onsubmit =
      async event => {
        event.preventDefault();

        try {
          const values = Object.fromEntries(
            new FormData(event.target)
          );

          await request(
            `${API}/users/${userId()}`,
            {
              method: "PATCH",
              body: JSON.stringify(values)
            }
          );

          $("#save-status").textContent =
            "Dine ændringer er gemt ✓";

        } catch (error) {
          $("#save-status").textContent =
            error.message;
        }
      };

    // Tilføj favoritby
    $("#add-favorite").onclick = async () => {
      try {
        const updated = await request(
          `${API}/users/${userId()}/favorites`,
          {
            method: "POST",
            body: JSON.stringify({
              city: $("#favorite-city").value
            })
          }
        );

        showFavorites(updated.favorites);

      } catch (error) {
        $("#save-status").textContent =
          error.message;
      }
    };

    // Skift bruger
    $("#logout").onclick = () => {
      localStorage.removeItem(
        "weatherapp_user_id"
      );

      go("/login.html");
    };

  } catch (error) {
    $("#save-status").textContent =
      error.message;
  }
}

/* =========================
   PAGE ROUTING
========================= */

const page = window.location.pathname;

if (page.endsWith("/login.html")) {
  login();
}

else if (page.endsWith("/register.html")) {
  preferences();
}

else if (page.endsWith("/profile.html")) {
  profile();
}

else {
  dashboard();
}
