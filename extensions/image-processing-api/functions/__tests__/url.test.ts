import * as http from 'http';
import { AddressInfo } from 'net';

import { assertUrlAllowed, isBlockedAddress } from '../src/url';
import { fetchImageBufferFromUrl, fetchLimits } from '../src/utils';

// 1x1 transparent PNG.
const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
);

describe('assertUrlAllowed', () => {
  const allowList = ['images.example.com', '*.cdn.example.com'];

  it('rejects every url when the allow list is empty', () => {
    expect(() =>
      assertUrlAllowed('https://images.example.com/a.png', []),
    ).toThrow(/disabled/);
  });

  it('accepts an exact host and a wildcard sub domain', () => {
    expect(
      assertUrlAllowed('https://images.example.com/a.png', allowList).hostname,
    ).toBe('images.example.com');
    expect(
      assertUrlAllowed('http://eu.cdn.example.com/a.png', allowList).hostname,
    ).toBe('eu.cdn.example.com');
  });

  it.each([
    'https://evil.example.org/a.png',
    'https://images.example.com.evil.org/a.png',
    'https://cdn.example.com/a.png',
    'https://xcdn.example.com/a.png',
    'https://images.example.com@evil.org/a.png',
  ])('rejects a host that is not allowed: %s', url => {
    expect(() => assertUrlAllowed(url, allowList)).toThrow();
  });

  it.each([
    'ftp://images.example.com/a.png',
    'file:///etc/passwd',
    'httpx://images.example.com/a.png',
    'not a url',
  ])('rejects a url that is not http or https: %s', url => {
    expect(() => assertUrlAllowed(url, allowList)).toThrow(/valid http url/);
  });

  it('rejects credentials in the url', () => {
    expect(() =>
      assertUrlAllowed('https://user:pass@images.example.com/a.png', allowList),
    ).toThrow(/credentials/);
  });

  it.each([
    'http://127.0.0.1/',
    'http://169.254.169.254/',
    'http://[::1]/',
    'http://[::ffff:127.0.0.1]/',
  ])('rejects an allowed literal ip that is not public: %s', url => {
    const host = new URL(url).hostname;
    expect(() => assertUrlAllowed(url, [host])).toThrow(/not a public address/);
  });
});

describe('isBlockedAddress', () => {
  it.each([
    '0.0.0.0',
    '10.1.2.3',
    '100.64.0.1',
    '127.0.0.1',
    '169.254.169.254',
    '172.16.0.1',
    '172.31.255.255',
    '192.0.0.1',
    '192.168.1.1',
    '198.18.0.1',
    '224.0.0.1',
    '255.255.255.255',
    '::',
    '::1',
    '::ffff:7f00:1',
    '::ffff:10.0.0.1',
    '64:ff9b::a00:1',
    'fc00::1',
    'fd12:3456::1',
    'fe80::1',
    'ff02::1',
    'not-an-ip',
  ])('blocks %s', address => {
    expect(isBlockedAddress(address)).toBe(true);
  });

  it.each([
    '8.8.8.8',
    '1.1.1.1',
    '172.15.0.1',
    '172.32.0.1',
    '192.0.1.1',
    '2001:4860:4860::8888',
  ])('allows %s', address => {
    expect(isBlockedAddress(address)).toBe(false);
  });
});

describe('fetchImageBufferFromUrl', () => {
  let server: http.Server;
  let port: number;

  beforeAll(done => {
    server = http
      .createServer((req, res) => {
        if (req.url === '/large') {
          res.end(Buffer.alloc(fetchLimits.maxContentLength + 1));
          return;
        }
        if (req.url === '/redirect') {
          res.writeHead(302, { Location: '/image' });
          res.end();
          return;
        }
        res.end(png);
      })
      .listen(0, '127.0.0.1', () => {
        port = (server.address() as AddressInfo).port;
        done();
      });
  });

  afterAll(done => {
    server.close(() => done());
  });

  it('refuses to connect to a host that resolves to loopback', async () => {
    await expect(
      fetchImageBufferFromUrl(`http://localhost:${port}/image`, {
        publicOnly: true,
      }),
    ).rejects.toThrow(/does not resolve to a public address/);
  });

  it('fetches a trusted internal url, such as the storage emulator', async () => {
    const buffer = await fetchImageBufferFromUrl(
      `http://127.0.0.1:${port}/image`,
    );
    expect(Buffer.compare(Buffer.from(buffer), png)).toBe(0);
  });

  it('refuses a response larger than the size limit', async () => {
    await expect(
      fetchImageBufferFromUrl(`http://127.0.0.1:${port}/large`),
    ).rejects.toThrow(/maxContentLength/);
  });

  it('does not follow redirects', async () => {
    await expect(
      fetchImageBufferFromUrl(`http://127.0.0.1:${port}/redirect`),
    ).rejects.toThrow(/status code of "302"/);
  });
});

describe('input operation of type url', () => {
  it('is disabled when no url hosts are allowed', async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { operationInput } = require('../src/operations/input');
    await expect(
      operationInput.build({
        operation: 'input',
        options: {
          operation: 'input',
          type: 'url',
          url: 'http://169.254.169.254/',
        },
      }),
    ).rejects.toThrow(/disabled/);
  });
});
