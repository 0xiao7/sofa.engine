import { createSign } from 'node:crypto';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const TTS_URL = 'https://texttospeech.googleapis.com/v1/text:synthesize';
const CLOUD_SCOPE = 'https://www.googleapis.com/auth/cloud-platform';

function base64url(value) {
  return Buffer.from(value).toString('base64url');
}

export function buildSynthesisPayload({ text, voice }) {
  return {
    input: { text },
    voice: { name: voice.name, languageCode: voice.languageCode },
    audioConfig: {
      audioEncoding: 'LINEAR16',
      sampleRateHertz: 24000,
      speakingRate: voice.speakingRate,
      pitch: voice.pitch,
    },
  };
}

export async function getGoogleAccessToken({ credentials, fetchImpl = fetch }) {
  if (!credentials?.client_email || !credentials?.private_key) {
    throw new Error('Google TTS credentials are incomplete');
  }
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = base64url(JSON.stringify({
    iss: credentials.client_email,
    scope: CLOUD_SCOPE,
    aud: TOKEN_URL,
    iat: now,
    exp: now + 3600,
  }));
  const unsigned = `${header}.${claims}`;
  const signer = createSign('RSA-SHA256');
  signer.update(unsigned);
  signer.end();
  const assertion = `${unsigned}.${signer.sign(credentials.private_key).toString('base64url')}`;
  const body = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion,
  }).toString();
  const response = await fetchImpl(TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!response.ok) throw new Error(`Google OAuth ${response.status}`);
  const payload = await response.json();
  if (!payload.access_token) throw new Error('Google OAuth response missing access_token');
  return payload.access_token;
}

export async function synthesizeSegment({ text, voice, accessToken, fetchImpl = fetch }) {
  const response = await fetchImpl(TTS_URL, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(buildSynthesisPayload({ text, voice })),
  });
  if (!response.ok) throw new Error(`Google TTS ${response.status}: ${await response.text()}`);
  const payload = await response.json();
  if (!payload.audioContent) throw new Error('Google TTS response missing audioContent');
  return Buffer.from(payload.audioContent, 'base64');
}
