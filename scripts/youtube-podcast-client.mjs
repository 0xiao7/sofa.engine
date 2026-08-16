import { readFileSync } from 'node:fs';

const API = 'https://www.googleapis.com/youtube/v3';
const UPLOAD = 'https://www.googleapis.com/upload/youtube/v3';

export class YoutubeProviderError extends Error {
  constructor(code, status) {
    super(`YouTube provider request failed: ${code}`);
    this.name = 'YoutubeProviderError';
    this.code = code;
    this.status = status;
  }
}

function errorCode(status, payload) {
  const reason = payload?.error?.errors?.[0]?.reason || '';
  if (reason === 'quotaExceeded' || reason === 'dailyLimitExceeded') return 'quota_exceeded';
  if (reason === 'insufficientPermissions' || reason === 'forbidden') return 'scope_insufficient';
  if (status === 401) return 'credential_invalid';
  if (status === 403) return 'provider_forbidden';
  return `provider_http_${status}`;
}

async function safeJson(response) {
  try { return await response.json(); } catch { return {}; }
}

export function createYoutubeClient({ fetchImpl = fetch, clientId, clientSecret, refreshToken }) {
  if (!clientId || !clientSecret || !refreshToken) throw new YoutubeProviderError('credential_missing');
  let accessToken;

  async function token() {
    if (accessToken) return accessToken;
    const body = new URLSearchParams({
      client_id: clientId, client_secret: clientSecret,
      refresh_token: refreshToken, grant_type: 'refresh_token',
    });
    const response = await fetchImpl('https://oauth2.googleapis.com/token', {
      method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body,
    });
    const payload = await safeJson(response);
    if (!response.ok || !payload.access_token) throw new YoutubeProviderError('credential_invalid', response.status);
    accessToken = payload.access_token;
    return accessToken;
  }

  async function request(url, options = {}) {
    const bearer = await token();
    const response = await fetchImpl(url, {
      ...options,
      headers: { Authorization: `Bearer ${bearer}`, ...(options.headers || {}) },
    });
    if (!response.ok) throw new YoutubeProviderError(errorCode(response.status, await safeJson(response)), response.status);
    return response;
  }

  return {
    async uploadPrivate({ path, metadata }) {
      if (metadata?.status?.privacyStatus !== 'private') throw new Error('initial YouTube upload must be private');
      const params = new URLSearchParams({ uploadType: 'resumable', part: 'snippet,status' });
      const initialized = await request(`${UPLOAD}/videos?${params}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json; charset=UTF-8', 'x-upload-content-type': 'video/mp4' },
        body: JSON.stringify(metadata),
      });
      const location = initialized.headers.get('location');
      if (!location) throw new YoutubeProviderError('upload_session_missing');
      const uploaded = await request(location, {
        method: 'PUT', headers: { 'content-type': 'video/mp4' }, body: readFileSync(path),
      });
      const payload = await safeJson(uploaded);
      if (!payload.id) throw new YoutubeProviderError('upload_video_id_missing');
      return { videoId: payload.id };
    },

    async findOrCreatePodcastPlaylist({ title }) {
      const query = new URLSearchParams({ part: 'snippet,status', mine: 'true', maxResults: '50' });
      const listed = await request(`${API}/playlists?${query}`);
      const existing = (await safeJson(listed)).items?.find(item => item.snippet?.title === title);
      if (existing?.id) return existing.id;
      const createQuery = new URLSearchParams({ part: 'snippet,status' });
      const created = await request(`${API}/playlists?${createQuery}`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ snippet: { title }, status: { privacyStatus: 'public', podcastStatus: 'enabled' } }),
      });
      const payload = await safeJson(created);
      if (!payload.id) throw new YoutubeProviderError('playlist_id_missing');
      return payload.id;
    },

    async addVideoToPlaylist({ playlistId, videoId }) {
      const query = new URLSearchParams({ part: 'snippet' });
      await request(`${API}/playlistItems?${query}`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ snippet: { playlistId, resourceId: { kind: 'youtube#video', videoId } } }),
      });
      return { playlistId, videoId };
    },

    async publishVideo({ videoId }) {
      const query = new URLSearchParams({ part: 'status' });
      await request(`${API}/videos?${query}`, {
        method: 'PUT', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: videoId, status: { privacyStatus: 'public' } }),
      });
      return { videoId, privacyStatus: 'public', exactUrl: `https://www.youtube.com/watch?v=${videoId}` };
    },
  };
}
