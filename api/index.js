const express = require("express");
const dotenv = require("dotenv");
const { auth } = require("express-oauth2-jwt-bearer");
const cors = require("cors");
const axios = require("axios");
const pool = require("../db/db.js");
const {
  getPCCredentials,
  getSong,
  getSongs,
  getUser,
} = require("../utils/planningcenter.js");
dotenv.config();
const PORT = process.env.PORT;
const app = express();

app.use(express.json());

app.use(
  cors({
    origin: process.env.CLIENT,
  })
);

app.use((req, res, next) => {
  res.setHeader(
    "Access-Control-Allow-Origin",
    "https://lyrics-link.vercel.app"
  );

  // Allow specific HTTP methods
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");

  // Allow specific headers to be sent in the request
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  // Allow credentials (e.g., cookies, authentication) to be included in requests
  res.setHeader("Access-Control-Allow-Credentials", true);

  // Continue to the next middleware or route handler
  next();
});

app.get("/api/getSong", async (req, res) => {
  const { songId, arrangementId } = req.query;
  try {
    const song = await pool.query({
      text: "SELECT * FROM song_arrangement WHERE id = $1 AND song_id = $2;",
      values: [arrangementId, songId],
    });
    console.log(song);
    res.send(song.rows[0]);
  } catch (error) {
    console.warn(error);
  }
});

app.get("/api/event", async (req, res) => {
  const { id } = req.query;
  const event = await pool.query({
    text: "SELECT * FROM events_new WHERE id = $1",
    values: [id],
  });
  res.send(event);
});

// Configures API to accept RS256 signed tokens
const jwtCheck = auth({
  audience: process.env.AUDIENCE,
  issuerBaseURL: process.env.ISSUERBASEURL,
  tokenSigningAlg: "RS256",
});

app.use(jwtCheck);

const getManagementToken = () => {
  let config = {
    method: "post",
    maxBodyLength: Infinity,
    url: "https://dev-pf0jivnn8aes74k4.us.auth0.com/oauth/token",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    data: {
      grant_type: "client_credentials",
      client_id: process.env.MANAGEMENTID,
      client_secret: process.env.MANAGEMENTSECRET,
      audience: process.env.MANAGEMENTAUDIENCE,
    },
  };

  return axios
    .request(config)
    .then((response) => {
      return response.data.access_token;
    })
    .catch((error) => {
      console.log(error);
    });
};

const getAccessToken = async (req, res, next) => {
  const token = await getManagementToken();

  // console.log(req.auth);
  const userId = req.auth.payload.sub;

  let config = {
    method: "get",
    maxBodyLength: Infinity,
    url: `https://dev-pf0jivnn8aes74k4.us.auth0.com/api/v2/users/${userId}`,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  };

  axios
    .request(config)
    .then((response) => {
      req.accessToken = response.data.identities[0].access_token;
      const oautID = response.data.user_id;
      const parts = oautID.split("|");
      req.user_id = parts[2];
      next();
    })
    .catch((error) => {
      console.log(error);
    });
};

// ROUTES
app.get("/api/user", getAccessToken, async (req, res) => {
  try {
    const user = await getUser(req.accessToken);
    res.send(JSON.stringify(user));
  } catch (err) {
    res.send(err);
  }
});

app.get("/api/events", getAccessToken, async (req, res) => {
  try {
    const events = await pool.query({
      text: "SELECT * FROM events_new WHERE user_id = $1",
      values: [req.user_id],
    });
    res.send(events.rows);
  } catch (error) {
    console.warn(error);
  }
});

app.post("/api/events", getAccessToken, async (req, res) => {
  let event_id;
  if (req.body.id === undefined) {
    event_id = Math.random().toString(20).substring(2, 10);
  } else {
    event_id = req.body.id;
  }
  const { name, date, songs } = req.body;
  const user_id = req.user_id;
  try {
    const events = await pool.query({
      text: "INSERT INTO events_new (id, event_type, event_date, songs, user_id) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO UPDATE SET event_type = $2, event_date = $3, songs = $4",
      values: [event_id, name, date, songs, user_id],
    });
    res.send(events);
  } catch (error) {
    console.warn(error);
  }
});

app.get("/api/songs", getAccessToken, async (req, res) => {
  const search = req.query.search;
  const data = await getSongs(req.accessToken, search);
  res.send(data);
});

app.get("/api/song", getAccessToken, async (req, res) => {
  const id = req.query.id;
  const data = await getSong(req.accessToken, id);
  res.send(data);
});

app.post("/api/arrangement", async (req, res) => {
  const {
    id,
    song_name,
    chord_chart,
    chord_chart_key,
    has_chords,
    lyrics,
    song_id,
    arrangement_name,
  } = req.body;

  const user_id = req.user_id;

  try {
    const arrangement = await pool.query({
      text: "INSERT INTO song_arrangement (id, song_name, chord_chart, chord_chart_key, has_chords, lyrics, song_id, arrangement_name, user_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT (id) DO UPDATE SET song_name = $2, lyrics = $3",
      values: [
        id,
        song_name,
        chord_chart,
        chord_chart_key,
        has_chords,
        lyrics,
        song_id,
        arrangement_name,
        user_id,
      ],
    });
    res.send(arrangement);
  } catch (error) {
    console.warn(error);
  }
});

app.listen(PORT, () => {
  console.log("server listening on port" + PORT);
});
module.exports = app;
