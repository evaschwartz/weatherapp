
const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

/* =========================
   TILLAD JSON
========================= */
app.use(express.json());


/* =========================
   ASSETS
========================= */
app.use(
  "/assets",
  express.static(path.join(__dirname, "../assets"))
);


/* =========================
   API-ROUTES
========================= */
app.use("/api/users", require("./routes/users"));
app.use("/api/weather", require("./routes/weather"));


/* =========================
   FRONTEND
========================= */
app.use(
  express.static(path.join(__dirname, "../frontend"))
);


/* =========================
   ENDPOINT
========================= */
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

/* =========================
   START SERVER
========================= */
app.listen(PORT, () => {
  console.log(`WeatherApp: http://localhost:${PORT}`);
});
