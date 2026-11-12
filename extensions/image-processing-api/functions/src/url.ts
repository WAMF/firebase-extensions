/*
 * Copyright (c) 2016-present Invertase Limited
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this library except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as dns from 'dns';
import * as net from 'net';
import { AssertionError } from 'assert';

/**
 * Parses a caller supplied url and checks it against the host allow list.
 * Only `http:` and `https:` urls without credentials are accepted. An allow
 * list entry is either an exact host name or a `*.` wildcard that matches
 * any sub domain. An empty allow list rejects every url.
 */
export function assertUrlAllowed(rawUrl: string, allowList: string[]): URL {
  if (!allowList.length) {
    throw new AssertionError({
      message: `Input type 'url' is disabled. Set the URL_HOST_ALLOW_LIST parameter to allow it.`,
    });
  }

  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new AssertionError({
      message: `'${rawUrl}' does not appear to be a valid http url.`,
    });
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new AssertionError({
      message: `'${rawUrl}' does not appear to be a valid http url.`,
    });
  }

  if (url.username || url.password) {
    throw new AssertionError({
      message: `Input urls must not contain credentials.`,
    });
  }

  const hostname = url.hostname.toLowerCase();
  if (!allowList.some(entry => hostMatches(hostname, entry))) {
    throw new AssertionError({
      message: `The host '${hostname}' is not in the allowed url hosts.`,
    });
  }

  // A literal ip address skips the dns lookup, so check it here as well.
  const literal = hostname.replace(/^\[|\]$/g, '');
  if (net.isIP(literal) && isBlockedAddress(literal)) {
    throw new AssertionError({
      message: `The host '${hostname}' is not a public address.`,
    });
  }

  return url;
}

function hostMatches(hostname: string, entry: string): boolean {
  if (entry.startsWith('*.')) {
    return hostname.endsWith(entry.slice(1));
  }
  return hostname === entry;
}

/**
 * True when the address is loopback, private, link-local (this includes
 * cloud metadata services), shared, multicast, reserved or unspecified.
 */
export function isBlockedAddress(address: string): boolean {
  const family = net.isIP(address);
  if (family === 4) return isBlockedIPv4(address);
  if (family === 6) return isBlockedIPv6(address);
  return true;
}

function isBlockedIPv4(address: string): boolean {
  const [a, b, c] = address.split('.').map(part => parseInt(part, 10));
  return (
    a === 0 || // "this" network
    a === 10 || // private
    a === 127 || // loopback
    (a === 100 && b >= 64 && b <= 127) || // carrier-grade nat
    (a === 169 && b === 254) || // link-local and metadata
    (a === 172 && b >= 16 && b <= 31) || // private
    (a === 192 && b === 0 && (c === 0 || c === 2)) || // ietf and test-net-1
    (a === 192 && b === 168) || // private
    (a === 198 && (b === 18 || b === 19)) || // benchmarking
    a >= 224 // multicast, reserved and broadcast
  );
}

function isBlockedIPv6(address: string): boolean {
  const lower = address.toLowerCase();
  const [first, second] = lower
    .split(':')
    .map(part => parseInt(part || '0', 16));
  return (
    // ::/16 holds the unspecified, loopback, IPv4-mapped and IPv4-compatible
    // addresses, which can all reach an IPv4 host.
    first === 0 ||
    (first === 0x64 && second === 0xff9b) || // nat64
    (first & 0xfe00) === 0xfc00 || // unique local fc00::/7
    (first & 0xffc0) === 0xfe80 || // link-local fe80::/10
    (first & 0xff00) === 0xff00 // multicast ff00::/8
  );
}

/**
 * A `lookup` for http agents that resolves the host name and refuses to
 * connect when any resolved address is blocked. The check runs on the
 * address that the socket connects to, so a redirect or a dns change
 * between validation and connection cannot bypass it.
 */
export const publicOnlyLookup: net.LookupFunction = (
  hostname,
  options,
  callback,
) => {
  dns.lookup(hostname, { ...options, all: true }, (error, addresses) => {
    if (error) return callback(error, '', 0);
    const blocked = addresses.find(entry => isBlockedAddress(entry.address));
    if (blocked || !addresses.length) {
      const refused: NodeJS.ErrnoException = new Error(
        `The host '${hostname}' does not resolve to a public address.`,
      );
      refused.code = 'EADDRNOTPUBLIC';
      return callback(refused, '', 0);
    }
    // Newer Node versions ask for every address (`all: true`).
    if ((options as dns.LookupOptions).all) {
      const all = callback as unknown as (
        error: null,
        addresses: dns.LookupAddress[],
      ) => void;
      return all(null, addresses);
    }
    callback(null, addresses[0].address, addresses[0].family);
  });
};
