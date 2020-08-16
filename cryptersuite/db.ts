
import { AES } from "https://deno.land/x/god_crypto/mod.ts";

const code = Deno.readFileSync(Deno.env.get('CODE_PATH') ?? '');

const ivdb: { [key: string]: Uint8Array } = {
};

function base64_to_binary(b: string): Uint8Array {
  let binaryString = window.atob(b);
  let len = binaryString.length;
  let bytes = new Uint8Array(len);

  for (var i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  return bytes;
}

function appendInjector(code: string, maybeHost: string | null) {
  const injector = `
${maybeHost ? `window.GETCODE_HOST = 'http://${maybeHost}';` : ''}
function getCode(key) {
  var code = '${code}';
  const toUrlEncoded = obj => Object.keys(obj).map(k => encodeURIComponent(k) + '=' + encodeURIComponent(obj[k])).join('&');
  return fetch(window.GETCODE_HOST + '/d', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: toUrlEncoded({ code, key }),
  })
  .then((r) => r.text());
}
`;
  return injector;
}

export async function save(key: string, alias: string, maybeHost: string | null) {

  const iv = new Uint8Array(16);
  crypto.getRandomValues(iv);
  const aes = new AES(key, {
    mode: "cbc",
    iv,
  });

  const cipher = (await aes.encrypt(code)).base64();

  console.log(`alias=${alias}, key=${key}`);

  ivdb[key] = iv;

  return appendInjector(cipher, maybeHost);
}

export async function load(key: string, code: string) {

  const aes = new AES(key, {
    mode: "cbc",
    iv: ivdb[key],
  });

  return await (await aes.decrypt(base64_to_binary(code))).toString();
}
