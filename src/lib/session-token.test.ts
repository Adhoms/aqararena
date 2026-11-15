import assert from "node:assert/strict";
import { test } from "node:test";
import { readToken, signToken } from "./session-token";

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
