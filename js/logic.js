/*
  Pure functions (no page access) so they can be tested with Node.
  Used by app.js in the browser and by tests/test_logic.js.
*/
(function (root) {
  "use strict";

  /** Return the entries that match the search text and every chosen filter. */
  function filterEntries(entries, opts) {
    var o = opts || {};
    var q = (o.q || "").trim().toLowerCase();
    var saved = o.savedIds || [];
    return entries.filter(function (e) {
      if (o.field && e.fields.indexOf(o.field) === -1) return false;
      if (o.type && e.type !== o.type) return false;
      if (o.province) {
        // National organisations place students in every province, so keep them.
        if (e.province !== o.province && e.province !== "National") return false;
      }
      if (o.savedOnly && saved.indexOf(e.id) === -1) return false;
      if (q) {
        var hay = (e.name + " " + e.note + " " + e.fields.join(" ") + " " + e.type).toLowerCase();
        var words = q.split(/\s+/);
        for (var i = 0; i < words.length; i++) {
          if (hay.indexOf(words[i]) === -1) return false;
        }
      }
      return true;
    });
  }

  /** Link that searches Google for current adverts from one organisation. */
  function advertSearchUrl(name) {
    var q = name + " work integrated learning OR WIL OR internship OR in-service training";
    return "https://www.google.com/search?q=" + encodeURIComponent(q);
  }

  /** Build the application email from the student's details. */
  function buildEmail(d) {
    var name = (d.name || "[Your full name]").trim();
    var course = (d.course || "[Your qualification]").trim();
    var inst = (d.institution || "[Your institution]").trim();
    var role = (d.role || "").trim();
    var org = (d.organisation || "").trim();
    var duration = (d.duration || "").trim();
    var phone = (d.phone || "").trim();
    var skills = (d.skills || "").trim();

    var subject = "Application for Work-Integrated Learning (WIL) Placement - " + course + " - " + name;
    var lines = [];
    lines.push("Dear " + (org ? org + " Recruitment Team" : "Hiring Manager") + ",");
    lines.push("");
    var target = role ? "the " + role + " opportunity" : "a Work-Integrated Learning (WIL) placement";
    lines.push(
      "I am writing to apply for " + target + (org ? " at " + org : "") +
        ". I have completed the theory coursework for my " + course + " at " + inst +
        " and now need to complete the Work-Integrated Learning (WIL) component to qualify."
    );
    lines.push("");
    if (skills) {
      lines.push("My strengths include: " + skills + ".");
      lines.push("");
    }
    lines.push(
      "I am available for a placement" + (duration ? " of " + duration : "") +
        " and am ready to learn quickly, follow instructions and contribute to the team."
    );
    lines.push("");
    lines.push("I have attached my CV, ID copy, academic record and my institution's WIL placement letter.");
    lines.push("");
    lines.push("Thank you for your time. I look forward to hearing from you.");
    lines.push("");
    lines.push("Kind regards,");
    lines.push(name);
    if (phone) lines.push(phone);
    return { subject: subject, body: lines.join("\n") };
  }

  /** Quote one CSV cell and neutralise spreadsheet formulas. */
  function csvCell(v) {
    var s = String(v == null ? "" : v);
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return '"' + s.replace(/"/g, '""') + '"';
  }

  /** Turn the tracker rows into CSV text. */
  function trackerToCsv(rows) {
    var head = ["Organisation", "Role", "Date applied", "Status", "Notes"];
    var out = [head.map(csvCell).join(",")];
    rows.forEach(function (r) {
      out.push([r.org, r.role, r.date, r.status, r.notes].map(csvCell).join(","));
    });
    return out.join("\r\n");
  }

  /** Count tracker rows per status. */
  function statusCounts(rows) {
    var c = {};
    rows.forEach(function (r) { c[r.status] = (c[r.status] || 0) + 1; });
    return c;
  }

  var api = {
    filterEntries: filterEntries,
    advertSearchUrl: advertSearchUrl,
    buildEmail: buildEmail,
    trackerToCsv: trackerToCsv,
    statusCounts: statusCounts
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.WILLogic = api;
})(typeof window !== "undefined" ? window : this);
