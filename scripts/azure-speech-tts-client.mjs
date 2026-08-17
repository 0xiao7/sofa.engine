function xml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

export function buildSsml({ text, voice }) {
  return `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="zh-TW"><voice name="${xml(voice.name)}"><prosody rate="${xml(voice.rate)}" pitch="${xml(voice.pitch)}">${xml(text)}</prosody></voice></speak>`;
}

export async function synthesizeAzureSegment({
  text,
  voice,
  region,
  subscriptionKey,
  fetchImpl = fetch,
}) {
  if (!region || !subscriptionKey) throw new Error('Azure Speech requires SPEECH_REGION and SPEECH_KEY');
  const response = await fetchImpl(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': subscriptionKey,
      'Content-Type': 'application/ssml+xml',
      'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
      'User-Agent': 'SoFa-Podcast-Production',
    },
    body: buildSsml({ text, voice }),
  });
  if (!response.ok) throw new Error(`Azure Speech ${response.status}: ${await response.text()}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (!bytes.length) throw new Error('Azure Speech returned empty audio');
  return bytes;
}
