import assert from "node:assert/strict";
import test from "node:test";
import { getDefaultWelcomeSettings, renderWelcomeMessage } from "./welcome.js";

test("welcome defaults start disabled and contain useful templates", () => {
  const settings = getDefaultWelcomeSettings();
  assert.equal(settings.welcomeEnabled, false);
  assert.equal(settings.leaveEnabled, false);
  assert.match(settings.welcomeMessage, /\{user\}/);
  assert.match(settings.leaveMessage, /\{username\}/);
});

test("message renderer replaces every supported placeholder", () => {
  const message = renderWelcomeMessage(
    "{user}|{username}|{server}|{memberCount}|{userId}|{serverId}",
    {
      userId: "123456789012345678",
      username: "Hussein",
      server: "OSCAR",
      memberCount: 42,
      serverId: "987654321098765432",
    },
  );
  assert.equal(
    message,
    "<@123456789012345678>|Hussein|OSCAR|42|123456789012345678|987654321098765432",
  );
});
