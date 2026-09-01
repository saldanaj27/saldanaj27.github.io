#!/usr/bin/env node
/**
 * Fetch top Spotify artists and write them to src/data/spotify.json.
 *
 * Runs in CI on a schedule (.github/workflows/spotify.yml), never in the
 * browser: the refresh token stays a repo secret and no credential is ever
 * shipped to the client. The site itself remains fully static.
 *
 * Required env: SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, SPOTIFY_REFRESH_TOKEN
 *
 * Failure policy: this script must never break the site. If credentials are
 * missing or Spotify errors, it leaves any existing data file untouched and
 * exits 0. A stale music list is fine; a failed deploy is not.
 */

import fs from 'node:fs';
import path from 'node:path';

const OUT = path.join(process.cwd(), 'src', 'data', 'spotify.json');

const { SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, SPOTIFY_REFRESH_TOKEN } =
  process.env;

function bail(reason) {
  console.warn(`spotify: ${reason}; leaving existing data in place`);
  process.exit(0);
}

if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET || !SPOTIFY_REFRESH_TOKEN) {
  bail('credentials not set');
}

async function getAccessToken() {
  const basic = Buffer.from(
    `${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`
  ).toString('base64');

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: SPOTIFY_REFRESH_TOKEN,
    }),
  });

  if (!res.ok) {
    throw new Error(`token request failed: ${res.status} ${await res.text()}`);
  }
  const json = await res.json();
  return json.access_token;
}

async function getTopArtists(token) {
  const url = new URL('https://api.spotify.com/v1/me/top/artists');
  // short_term is roughly the last four weeks: current enough to feel alive,
  // stable enough that it is never empty (unlike "now playing").
  url.searchParams.set('time_range', 'short_term');
  url.searchParams.set('limit', '5');

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error(`top artists failed: ${res.status} ${await res.text()}`);
  }
  const json = await res.json();

  return (json.items ?? []).map((a) => ({
    name: a.name,
    url: a.external_urls?.spotify ?? null,
  }));
}

try {
  const token = await getAccessToken();
  const artists = await getTopArtists(token);

  if (artists.length === 0) {
    bail('no artists returned');
  }

  const payload = {
    artists,
    updated: new Date().toISOString(),
  };

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(`spotify: wrote ${artists.length} artists to ${OUT}`);
} catch (err) {
  bail(err.message);
}
