import assert from 'node:assert/strict';
import test from 'node:test';

import {
  applyPronunciationSsml,
  buildSsml,
  synthesizeAzureSegment,
} from '../scripts/azure-speech-tts-client.mjs';

test('Taiwan podcast pronunciation replaces every exact 會計 term and preserves written text', () => {
  assert.equal(
    applyPronunciationSsml('會計、商業會計法與會計師。'),
    '<sub alias="快計">會計</sub>、商業<sub alias="快計">會計</sub>法與<sub alias="快計">會計</sub>師。',
  );
});

test('pronunciation SSML escapes all ordinary text and cannot inject markup', () => {
  assert.equal(
    applyPronunciationSsml('會計 <break time="9s"/> & 稅法'),
    '<sub alias="快計">會計</sub> &lt;break time=&quot;9s&quot;/&gt; &amp; 稅法',
  );
});

test('Azure Speech SSML pins the approved Taiwan voice, rate, and pitch', () => {
  assert.equal(buildSsml({
    text: '土地徵收條例 & 第十六條',
    voice: { name: 'zh-TW-HsiaoChenNeural', rate: '-10%', pitch: '-2Hz' },
  }), '<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="zh-TW"><voice name="zh-TW-HsiaoChenNeural"><prosody rate="-10%" pitch="-2Hz">土地徵收條例 &amp; 第十六條</prosody></voice></speak>');
});

test('Azure Speech SSML applies the source-locked Taiwan pronunciation policy', () => {
  assert.equal(buildSsml({
    text: '商業會計法第三十八條',
    voice: { name: 'zh-TW-HsiaoChenNeural', rate: '-10%', pitch: '-2Hz' },
  }), '<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="zh-TW"><voice name="zh-TW-HsiaoChenNeural"><prosody rate="-10%" pitch="-2Hz">商業<sub alias="快計">會計</sub>法第三十八條</prosody></voice></speak>');
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
