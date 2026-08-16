import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { YoutubeProviderError, createYoutubeClient } from '../scripts/youtube-podcast-client.mjs';

function response(status, body = {}, headers = {}) {
  return new Response(typeof body === 'string' ? body : JSON.stringify(body), {
    status, headers: { 'content-type': 'application/json', ...headers },
  });
}

test('client refreshes token without putting credentials in the URL and uploads privately', async () => {
  const calls = [];
  const fetchImpl = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    if (String(url).includes('oauth2.googleapis.com/token')) return response(200, { access_token: 'access-secret' });
    if (String(url).includes('upload/youtube/v3/videos') && options.method === 'POST') return response(200, '', { location: 'https://upload.example/session' });
    if (String(url) === 'https://upload.example/session') return response(200, { id: 'video123' });
    throw new Error(`unexpected ${url}`);
  };
  const path = join(tmpdir(), `youtube-upload-${process.pid}.mp4`);
  writeFileSync(path, Buffer.from('video'));
  const client = createYoutubeClient({ fetchImpl, clientId: 'client', clientSecret: 'secret', refreshToken: 'refresh' });
  const result = await client.uploadPrivate({ path, metadata: { snippet: { title: 'EP007' }, status: { privacyStatus: 'private' } } });
  assert.equal(result.videoId, 'video123');
  assert.ok(calls.every(call => !call.url.includes('secret') && !call.url.includes('refresh')));
  assert.match(calls[1].options.headers.Authorization, /^Bearer /);
});

test('client reuses or creates the exact podcast playlist and attaches a video', async () => {
  const requests = [];
  const fetchImpl = async (url, options = {}) => {
    requests.push({ url: String(url), options });
    if (String(url).includes('/token')) return response(200, { access_token: 'token' });
    if (String(url).includes('/playlists?') && (!options.method || options.method === 'GET')) return response(200, { items: [] });
    if (String(url).includes('/playlists?part=snippet%2Cstatus') && options.method === 'POST') return response(200, { id: 'playlist1' });
    if (String(url).includes('/playlistItems?part=snippet')) return response(200, { id: 'item1' });
    throw new Error(`unexpected ${url}`);
  };
  const client = createYoutubeClient({ fetchImpl, clientId: 'c', clientSecret: 's', refreshToken: 'r' });
  const playlistId = await client.findOrCreatePodcastPlaylist({ title: 'SoFa Engine 國考 Podcast' });
  await client.addVideoToPlaylist({ playlistId, videoId: 'video1' });
  assert.equal(playlistId, 'playlist1');
  const createBody = JSON.parse(requests.find(row => row.options.method === 'POST' && row.url.includes('/playlists?')).options.body);
  assert.equal(createBody.snippet.title, 'SoFa Engine 國考 Podcast');
  assert.equal(createBody.status.podcastStatus, 'enabled');
});

test('publish changes only privacy status and provider errors are safely classified', async () => {
  const bodies = [];
  const okFetch = async (url, options = {}) => {
    if (String(url).includes('/token')) return response(200, { access_token: 'token' });
    bodies.push(JSON.parse(options.body));
    return response(200, { id: 'video1' });
  };
  const client = createYoutubeClient({ fetchImpl: okFetch, clientId: 'c', clientSecret: 's', refreshToken: 'r' });
  await client.publishVideo({ videoId: 'video1' });
  assert.deepEqual(bodies[0], { id: 'video1', status: { privacyStatus: 'public' } });

  const quotaFetch = async url => String(url).includes('/token')
    ? response(200, { access_token: 'token' })
    : response(403, { error: { errors: [{ reason: 'quotaExceeded' }], message: 'secret should not escape' } });
  const blocked = createYoutubeClient({ fetchImpl: quotaFetch, clientId: 'c', clientSecret: 's', refreshToken: 'r' });
  await assert.rejects(() => blocked.publishVideo({ videoId: 'v' }), error => {
    assert.ok(error instanceof YoutubeProviderError);
    assert.equal(error.code, 'quota_exceeded');
    assert.doesNotMatch(error.message, /secret should not escape/);
    return true;
  });
});
