import assert from "node:assert/strict";
import { test } from "node:test";
import { deriveKey, readSessionToken, readToken, signToken } from "./session-token";

const KEY = "test-key";

test("a signed token reads back its parts", () => {
  const token = signToken(["acc1", "1900000000000", "3"], KEY);
  assert.deepEqual(readToken(token, KEY, 3), ["acc1", "1900000000000", "3"]);
});

test("a token signed with another key, or changed, is refused", () => {
  const token = signToken(["acc1", "1900000000000", "3"], KEY);
  assert.equal(readToken(token, "other-key", 3), null);
  assert.equal(readToken(token.replace("acc1", "acc2"), KEY, 3), null);
});

test("the wrong number of parts is refused", () => {
  const token = signToken(["acc1", "1900000000000"], KEY);
  assert.equal(readToken(token, KEY, 3), null);
  assert.equal(readToken("", KEY, 3), null);
});

test("parts may not contain the separator", () => {
  assert.throws(() => signToken(["a.b", "1"], KEY));
});

test("a session token gives its id and version until it expires", () => {
  const token = signToken(["acc1", "2000", "4"], KEY);
  assert.deepEqual(readSessionToken(token, KEY, 1999), { id: "acc1", version: 4 });
  assert.equal(readSessionToken(token, KEY, 2001), null);
});

test("a session token with non-digit expiry or version is refused even when signed", () => {
  assert.equal(readSessionToken(signToken(["acc1", "1e20", "0"], KEY), KEY, 0), null);
  assert.equal(readSessionToken(signToken(["acc1", "2000", "-1"], KEY), KEY, 0), null);
  assert.equal(readSessionToken(signToken(["", "2000", "0"], KEY), KEY, 0), null);
});

test("derived keys differ per salt and are stable", () => {
  assert.equal(deriveKey("secret", "a"), deriveKey("secret", "a"));
  assert.notEqual(deriveKey("secret", "a"), deriveKey("secret", "b"));
  assert.notEqual(deriveKey("secret", "a"), "secret");
});
