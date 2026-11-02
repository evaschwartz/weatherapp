
const express = require("express");
const path = require("path");

const app = express();
const PORT = 3000;

// JSON-data
app.use(express.json());

// Assets
app.use(
  "/assets",
  express.static(path.join(__dirname, "../assets"))
);

// Frontend
app.use(
  express.static(path.join(__dirname, "../frontend"))
);

// API
app.get("/api/health", (req, res) => {
  res.json({
    status: "success",
    message: "WeatherApp server is running!"
  });
});

// Start serveren
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
