import assert from 'node:assert/strict';
import test from 'node:test';

import { buildSsml, synthesizeAzureSegment } from '../scripts/azure-speech-tts-client.mjs';

test('Azure Speech SSML pins the approved Taiwan voice, rate, and pitch', () => {
  assert.equal(buildSsml({
    text: '土地徵收條例 & 第十六條',
    voice: { name: 'zh-TW-HsiaoChenNeural', rate: '-10%', pitch: '-2Hz' },
  }), '<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="zh-TW"><voice name="zh-TW-HsiaoChenNeural"><prosody rate="-10%" pitch="-2Hz">土地徵收條例 &amp; 第十六條</prosody></voice></speak>');
});

test('Azure Speech uses the paid regional endpoint and fails closed', async () => {
  let request;
  await assert.rejects(() => synthesizeAzureSegment({
    text: '測試',
    voice: { name: 'zh-TW-YunJheNeural', rate: '-10%', pitch: '-3Hz' },
    region: 'eastasia',
    subscriptionKey: 'secret-key',
    fetchImpl: async (url, options) => {
      request = { url, options };
      return new Response('denied', { status: 403 });
    },
  }), /Azure Speech 403: denied/);
  assert.equal(request.url, 'https://eastasia.tts.speech.microsoft.com/cognitiveservices/v1');
  assert.equal(request.options.headers['Ocp-Apim-Subscription-Key'], 'secret-key');
  assert.equal(request.options.headers['X-Microsoft-OutputFormat'], 'audio-24khz-48kbitrate-mono-mp3');
});
