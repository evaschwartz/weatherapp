
const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// Tillad JSON
app.use(express.json());

// Assets
app.use(
  "/assets",
  express.static(path.join(__dirname, "../assets"))
);

// API-routes
app.use("/api/users", require("./routes/users"));
app.use("/api/weather", require("./routes/weather"));

// Frontend
app.use(
  express.static(path.join(__dirname, "../frontend"))
);

// Endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Start server
app.listen(PORT, () => {
  console.log(`WeatherApp: http://localhost:${PORT}`);
});
