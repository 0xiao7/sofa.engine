import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import test from 'node:test';

import {
  buildSynthesisPayload,
  getGoogleAccessToken,
  synthesizeSegment,
} from '../scripts/google-tts-client.mjs';

const voice = {
  name: 'cmn-TW-Chirp3-HD-HsiaoChen',
  languageCode: 'cmn-TW',
  speakingRate: 0.9,
  pitch: -10,
};

test('payload pins the approved Taiwan voice', () => {
  assert.deepEqual(buildSynthesisPayload({ text: '土地徵收條例', voice }), {
    input: { text: '土地徵收條例' },
    voice: { name: 'cmn-TW-Chirp3-HD-HsiaoChen', languageCode: 'cmn-TW' },
    audioConfig: { audioEncoding: 'LINEAR16', sampleRateHertz: 24000, speakingRate: 0.9, pitch: -10 },
  });
});

test('provider failure blocks instead of selecting another voice', async () => {
  await assert.rejects(
    () => synthesizeSegment({ text: '測試', voice, accessToken: 'x', fetchImpl: async () => new Response('denied', { status: 403 }) }),
    /Google TTS 403: denied/,
  );
});

test('service account exchanges a signed assertion without leaking the private key', async () => {
  const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const privateKeyPem = privateKey.export({ type: 'pkcs8', format: 'pem' });
  let requestBody = '';
  const token = await getGoogleAccessToken({
    credentials: { client_email: 'podcast@example.iam.gserviceaccount.com', private_key: privateKeyPem },
    fetchImpl: async (_url, options) => {
      requestBody = options.body;
      return Response.json({ access_token: 'token-123' });
    },
  });
  assert.equal(token, 'token-123');
  assert.match(requestBody, /grant_type=/);
  assert.doesNotMatch(requestBody, /BEGIN PRIVATE KEY/);
});
