import * as path from "https://deno.land/std@0.65.0/path/mod.ts";

import { DB } from "https://deno.land/x/sqlite/mod.ts";
import { AES } from "https://deno.land/x/god_crypto/mod.ts";

export const db = new DB(Deno.env.get('DB_PATH') ?? path.join(Deno.cwd(), 'data', 'database.cryptersuite.sqlite'));
db.query(`
CREATE TABLE IF NOT EXISTS crypted_session
(id INTEGER PRIMARY KEY AUTOINCREMENT,
alias TEXT NOT NULL,
key TEXT NOT NULL,
iv TEXT NOT NULL,
is_approved INTEGER NOT NULL DEFAULT 0
)
`);

const code = Deno.readFileSync(Deno.env.get('CODE_PATH') ?? '');


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

  db.query("INSERT INTO crypted_session (alias, key, iv) VALUES (?,?,?)", [alias, key, iv]);

  return appendInjector(cipher, maybeHost);
}

export async function load(key: string, code: string): Promise<string | null> {

  try {

    const [ row ] = db.query("SELECT alias, iv FROM crypted_session WHERE key=? AND is_approved=1 LIMIT 1", [key]).asObjects();
    if (!row) {
      throw new Error('no approved session found');
    }

    const { alias, iv } = row;
    const aes = new AES(key, {
      mode: "cbc",
      iv,
    });
    const decryptedCode = await (await aes.decrypt(base64_to_binary(code))).toString();
    console.log(`alias=${alias} decrypted`);
    return decryptedCode;

  } catch (err) {
    console.error(`key=${key} decrypted error`);
    return null;
  }

}

export async function approve(alias: string) {
  db.query("UPDATE crypted_session SET is_approved=1 WHERE alias=?", [alias]);
}
