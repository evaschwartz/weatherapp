
const router = require("express").Router();
const db = require("../db");

/* =========================
   VALID VALUES
========================= */

const valid = {
  age_group: ["child", "teen", "adult"],
  sensitivity: ["cold", "neutral", "warm"],
  transport: ["walk", "bike", "car"]
};

/* =========================
   GET USER
========================= */

function getUser(id) {
  const user = db
    .prepare("SELECT * FROM users WHERE id = ?")
    .get(id);

  if (!user) return null;

  const favorites = db
    .prepare(
      "SELECT city FROM favorite_cities WHERE user_id = ? ORDER BY city"
    )
    .all(id)
    .map(item => item.city);

  return { ...user, favorites };
}

/* =========================
   LOGIN / CREATE USER
========================= */

router.post("/login", (req, res) => {
  const name = String(req.body?.name || "").trim();

  if (name.length < 2 || name.length > 40) {
    return res.status(400).json({
      error: "Navnet skal være mellem 2 og 40 tegn."
    });
  }

  let user = db
    .prepare("SELECT * FROM users WHERE name = ?")
    .get(name);

  const isNew = !user;

  if (!user) {
    const result = db
      .prepare("INSERT INTO users (name) VALUES (?)")
      .run(name);

    user = getUser(result.lastInsertRowid);
  }

  res.json({
    user: getUser(user.id),
    isNew
  });
});

/* =========================
   FETCH USER
========================= */

router.get("/:id", (req, res) => {
  const user = getUser(req.params.id);

  if (!user) {
    return res.status(404).json({
      error: "Brugeren findes ikke."
    });
  }

  res.json(user);
});

/* =========================
   UPDATE PREFERENCES
========================= */

router.patch("/:id", (req, res) => {
  const user = getUser(req.params.id);

  if (!user) {
    return res.status(404).json({
      error: "Brugeren findes ikke."
    });
  }

  const updates = {};

  for (const field of Object.keys(valid)) {
    if (req.body[field] !== undefined) {
      if (!valid[field].includes(req.body[field])) {
        return res.status(400).json({
          error: `Ugyldig værdi for ${field}.`
        });
      }

      updates[field] = req.body[field];
    }
  }

  if (req.body.preferred_city !== undefined) {
    const city = String(req.body.preferred_city).trim();

    if (!city || city.length > 80) {
      return res.status(400).json({
        error: "Ugyldig by."
      });
    }

    updates.preferred_city = city;
  }

  for (const [field, value] of Object.entries(updates)) {
    db.prepare(
      `UPDATE users SET ${field} = ? WHERE id = ?`
    ).run(value, user.id);
  }

  res.json(getUser(user.id));
});

/* =========================
   ADD FAVORITE CITY
========================= */

router.post("/:id/favorites", (req, res) => {
  const user = getUser(req.params.id);

  if (!user) {
    return res.status(404).json({
      error: "Brugeren findes ikke."
    });
  }

  const city = String(req.body.city || "").trim();

  if (!city || city.length > 80) {
    return res.status(400).json({
      error: "Ugyldig by."
    });
  }

  db.prepare(`
    INSERT OR IGNORE INTO favorite_cities
    (user_id, city)
    VALUES (?, ?)
  `).run(user.id, city);

  res.json(getUser(user.id));
});

/* =========================
   REMOVE FAVORITE CITY
========================= */

router.delete("/:id/favorites/:city", (req, res) => {
  const user = getUser(req.params.id);

  if (!user) {
    return res.status(404).json({
      error: "Brugeren findes ikke."
    });
  }

  db.prepare(`
    DELETE FROM favorite_cities
    WHERE user_id = ? AND city = ?
  `).run(user.id, req.params.city);

  res.json(getUser(user.id));
});

module.exports = router;
