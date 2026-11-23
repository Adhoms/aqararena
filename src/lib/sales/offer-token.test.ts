import assert from "node:assert/strict";
import { test } from "node:test";
import { isOfferToken, newOfferToken } from "./offer-token";

test("a token is 24 random bytes in base64url: 32 characters, never the same", () => {
  const tokens = Array.from({ length: 200 }, newOfferToken);
  for (const t of tokens) {
    assert.match(t, /^[A-Za-z0-9_-]{32}$/);
    assert.equal(Buffer.from(t, "base64url").length, 24);
    assert.equal(isOfferToken(t), true);
  }
  assert.equal(new Set(tokens).size, tokens.length);
});

test("anything else is not a token", () => {
  for (const bad of ["", "short", "a".repeat(31), "a".repeat(33), `${"a".repeat(31)}=`, `${"a".repeat(31)}/`]) assert.equal(isOfferToken(bad), false, bad);
});
