// Run with:  node tests/test_logic.js
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const L = require("../js/logic.js");

// Load the directory data the same way the browser does.
const sandbox = { window: {} };
new Function("window", fs.readFileSync(path.join(__dirname, "../js/data.js"), "utf8"))(sandbox.window);
const DATA = sandbox.window.WIL_DATA;

let passed = 0;
function test(name, fn) { fn(); passed++; console.log("ok  - " + name); }

test("data: every entry has the required fields and a valid https link", () => {
  const ids = new Set();
  DATA.forEach((e) => {
    ["id", "name", "type", "province", "url", "note"].forEach((k) => assert.ok(e[k], e.id + " missing " + k));
    assert.ok(Array.isArray(e.fields) && e.fields.length > 0, e.id + " needs fields");
    assert.ok(/^https:\/\//.test(e.url), e.id + " url must be https");
    assert.ok(!ids.has(e.id), "duplicate id " + e.id);
    ids.add(e.id);
  });
});

test("filter: by field", () => {
  const r = L.filterEntries(DATA, { field: "ICT" });
  assert.ok(r.length > 0 && r.every((e) => e.fields.includes("ICT")));
});

test("filter: by type", () => {
  const r = L.filterEntries(DATA, { type: "SETA" });
  assert.ok(r.length > 0 && r.every((e) => e.type === "SETA"));
});

test("filter: province keeps national organisations", () => {
  const r = L.filterEntries(DATA, { province: "Western Cape" });
  assert.ok(r.some((e) => e.id === "capitec"));
  assert.ok(r.some((e) => e.province === "National"));
  assert.ok(!r.some((e) => e.province === "Gauteng"));
});

test("filter: search words must all match", () => {
  const r = L.filterEntries(DATA, { q: "bank finance" });
  assert.ok(r.length > 0);
  assert.strictEqual(L.filterEntries(DATA, { q: "zzzznotfound" }).length, 0);
});

test("filter: saved only", () => {
  const r = L.filterEntries(DATA, { savedOnly: true, savedIds: ["telkom", "sars"] });
  assert.deepStrictEqual(r.map((e) => e.id).sort(), ["sars", "telkom"]);
});

test("advert search link is encoded", () => {
  const u = L.advertSearchUrl("Pick n Pay");
  assert.ok(u.startsWith("https://www.google.com/search?q="));
  assert.ok(!u.includes(" "));
});

test("email: includes name, course, institution and organisation", () => {
  const m = L.buildEmail({ name: "Sam Dube", course: "National Diploma: IT", institution: "TUT", organisation: "Telkom", role: "IT Support" });
  assert.ok(m.subject.includes("Sam Dube") && m.subject.includes("National Diploma: IT"));
  assert.ok(m.body.includes("Telkom") && m.body.includes("TUT") && m.body.includes("IT Support"));
  assert.ok(m.body.trim().endsWith("Sam Dube"));
});

test("email: works with empty fields using placeholders", () => {
  const m = L.buildEmail({});
  assert.ok(m.body.includes("[Your full name]") && m.body.includes("Dear Hiring Manager"));
});

test("csv: quotes cells and blocks formula injection", () => {
  const csv = L.trackerToCsv([{ org: "=cmd()", role: 'He said "hi"', date: "2026-10-01", status: "Applied", notes: "" }]);
  assert.ok(csv.includes("\"'=cmd()\""));
  assert.ok(csv.includes('"He said ""hi"""'));
});

test("status counts", () => {
  assert.deepStrictEqual(L.statusCounts([{ status: "Applied" }, { status: "Applied" }, { status: "Offer" }]), { Applied: 2, Offer: 1 });
});

console.log("\n" + passed + " tests passed");
