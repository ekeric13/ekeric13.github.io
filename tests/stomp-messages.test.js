const assert = require("node:assert/strict");
const test = require("node:test");
const { createDeck, messages } = require("../js/mario-stomp-messages.js");

function seededRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 2 ** 32;
  };
}

test("stomp deck contains a substantial set of concise, unique achievements", () => {
  assert.equal(messages.length, 29);
  assert.equal(new Set(messages.map(({ id }) => id)).size, messages.length);
  for (const message of messages) {
    assert.ok(message.title.length <= 48, `${message.id} title is too long`);
    assert.ok(message.body.length <= 220, `${message.id} body is too long`);
    assert.match(message.kicker, /^(Intuit|AnimePics|Ethos)$/);
  }
});

test("resume facts survive the popup edit", () => {
  const copy = messages.map(({ title, body }) => `${title} ${body}`).join(" ");
  [
    "transcript analysis",
    "embeddings",
    "agentic workflows",
    "thousands of customer conversations",
    "nightly heap OOM",
    "50,000",
    "four hours to five seconds",
  ].forEach((fact) => {
    assert.ok(copy.includes(fact), `missing fact: ${fact}`);
  });

  ["4.2 million", "26,000", "0.2%", "36%", "$11.4 million", "$14 million", "$3.3 million", "90 weekly", "95.5%", "patent"].forEach((fact) => {
    assert.ok(!copy.includes(fact), `removed sensitive fact reappeared: ${fact}`);
  });
});

test("every message appears once before a newly shuffled cycle begins", () => {
  const deck = createDeck(seededRandom(42));
  const firstCycle = Array.from({ length: messages.length }, () => deck.next().id);
  assert.equal(new Set(firstCycle).size, messages.length);
  assert.deepEqual(deck.getState(), {
    total: messages.length,
    remaining: 0,
    cycle: 1,
    lastId: firstCycle.at(-1),
  });

  const nextMessage = deck.next();
  assert.notEqual(nextMessage.id, firstCycle.at(-1));
  assert.equal(deck.getState().cycle, 2);
  assert.equal(deck.getState().remaining, messages.length - 1);
});
