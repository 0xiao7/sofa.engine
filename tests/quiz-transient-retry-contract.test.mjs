import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const active = fs.readFileSync('quiz.html', 'utf8');

function extractFunction(source, name) {
  let start = source.indexOf(`function ${name}`);
  assert.notEqual(start, -1, `${name} not found`);
  const asyncStart = source.lastIndexOf('async ', start);
  if (asyncStart !== -1 && source.slice(asyncStart + 6, start) === '') start = asyncStart;
  let depth = 0;
  let end = -1;
  for (let i = start; i < source.length; i += 1) {
    const ch = source[i];
    if (ch === '{') depth += 1;
    if (ch === '}') {
      depth -= 1;
      if (depth === 0) {
        end = i + 1;
        break;
      }
    }
  }
  assert.ok(end > start, `${name} end not found`);
  return source.slice(start, end);
}

function retrySource() {
  return [
    extractFunction(active, 'formatQuizLoadErrorMessage'),
    extractFunction(active, 'isTransientQuizLoadErrorPayload'),
    extractFunction(active, 'isPageSpecificQuizUrl'),
    extractFunction(active, 'sleepQuizRetry'),
    extractFunction(active, 'fetchQuizJsonWithRetry'),
  ].join('\n');
}

test('law quiz retries transient 503 resource errors before showing failure', async () => {
  const calls = [];
  const sandbox = {
    fetch: async (url) => {
      calls.push(url);
      if (calls.length === 1) {
        return {
          ok: false,
          status: 503,
          json: async () => ({ detail: '[Errno 11] Resource temporarily unavailable' }),
        };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({ page_id: 'fresh-quiz', question: 'ok', options: ['A'], answer: 'A' }),
      };
    },
    setTimeout: (fn) => fn(),
  };
  vm.createContext(sandbox);
  vm.runInContext(`${retrySource()}; this.guard = fetchQuizJsonWithRetry;`, sandbox);

  const data = await sandbox.guard('https://api.example.test/api/quiz?law=商業會計法', {}, 3, 0);

  assert.equal(data.page_id, 'fresh-quiz');
  assert.equal(calls.length, 2);
});

test('page-specific quiz requests do not retry transient failures', async () => {
  let calls = 0;
  const sandbox = {
    fetch: async () => {
      calls += 1;
      return {
        ok: false,
        status: 503,
        json: async () => ({ detail: '[Errno 11] Resource temporarily unavailable' }),
      };
    },
    setTimeout: (fn) => fn(),
  };
  vm.createContext(sandbox);
  vm.runInContext(`${retrySource()}; this.guard = fetchQuizJsonWithRetry;`, sandbox);

  const data = await sandbox.guard('https://api.example.test/api/quiz?page_id=exact-a', {}, 3, 0);

  assert.equal(data.detail, '[Errno 11] Resource temporarily unavailable');
  assert.equal(calls, 1);
});

test('non-transient API errors return immediately', async () => {
  let calls = 0;
  const sandbox = {
    fetch: async () => {
      calls += 1;
      return {
        ok: false,
        status: 404,
        json: async () => ({ detail: 'not found' }),
      };
    },
    setTimeout: (fn) => fn(),
  };
  vm.createContext(sandbox);
  vm.runInContext(`${retrySource()}; this.guard = fetchQuizJsonWithRetry;`, sandbox);

  const data = await sandbox.guard('https://api.example.test/api/quiz?law=民法', {}, 3, 0);

  assert.equal(data.detail, 'not found');
  assert.equal(calls, 1);
});
