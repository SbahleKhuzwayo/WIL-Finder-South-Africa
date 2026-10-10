(function () {
  "use strict";

  var FIELDS = ["ICT", "Engineering", "Finance & Accounting", "Business & Admin", "Human Resources",
    "Retail & Marketing", "Marketing & Media", "Logistics", "Hospitality & Tourism", "Public Management"];
  var PROVINCES = ["Eastern Cape", "Free State", "Gauteng", "KwaZulu-Natal", "Limpopo",
    "Mpumalanga", "North West", "Northern Cape", "Western Cape"];
  var TYPES = ["Employer", "Public sector", "SETA", "Job board"];
  var CHECKLIST = [
    "Certified copy of my South African ID",
    "Up-to-date CV (one page)",
    "Academic record showing theory completed",
    "WIL placement letter from my institution",
    "WIL logbook or portfolio from my institution",
    "Proof of registration or student card",
    "Matric certificate",
    "Professional email address and working phone number",
    "Certified copies are recent (check each employer's rule)",
    "A short application email ready to send (section 3)"
  ];

  var L = window.WILLogic;
  var DATA = window.WIL_DATA;

  // ---- storage that never crashes if the browser blocks it ----
  function load(key, fallback) {
    try { var v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
    catch (e) { return fallback; }
  }
  function save(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* ignore */ }
  }

  // ---- tiny helper to build elements safely (no innerHTML with user text) ----
  function h(tag, attrs, children) {
    var el = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === "text") el.textContent = attrs[k];
      else if (k === "class") el.className = attrs[k];
      else el.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) { if (c) el.appendChild(c); });
    return el;
  }
  function $(id) { return document.getElementById(id); }

  function fillSelect(sel, values) {
    values.forEach(function (v) { sel.appendChild(h("option", { value: v, text: v })); });
  }

  // =============== Directory ===============
  var saved = load("wil.saved", []);

  function renderCards() {
    var list = L.filterEntries(DATA, {
      q: $("q").value,
      field: $("f-field").value,
      province: $("f-province").value,
      type: $("f-type").value,
      savedOnly: $("f-saved").checked,
      savedIds: saved
    });
    var box = $("cards");
    box.textContent = "";
    $("count").textContent = list.length + (list.length === 1 ? " result" : " results");
    if (!list.length) {
      box.appendChild(h("p", { class: "empty", text: "Nothing matches those filters. Clear a filter or try a different word." }));
      return;
    }
    list.forEach(function (e) {
      var isSaved = saved.indexOf(e.id) !== -1;
      var saveBtn = h("button", { type: "button", class: "save" + (isSaved ? " on" : ""), "aria-pressed": String(isSaved), text: isSaved ? "Saved" : "Save" });
      saveBtn.addEventListener("click", function () {
        var i = saved.indexOf(e.id);
        if (i === -1) saved.push(e.id); else saved.splice(i, 1);
        save("wil.saved", saved);
        renderCards();
      });
      var tags = h("p", { class: "tags" }, [h("span", { class: "tag type", text: e.type }), h("span", { class: "tag", text: e.province })]
        .concat(e.fields.slice(0, 3).map(function (f) { return h("span", { class: "tag", text: f }); })));
      var web = h("a", { class: "btn", href: e.url, target: "_blank", rel: "noopener noreferrer", text: "Open website" });
      var ads = h("a", { class: "btn secondary", href: L.advertSearchUrl(e.name), target: "_blank", rel: "noopener noreferrer", text: "Search current adverts" });
      var use = h("button", { type: "button", class: "link", text: "Use in email builder" });
      use.addEventListener("click", function () {
        document.querySelector('#email-form [name="organisation"]').value = e.name;
        updateEmail();
        $("email").scrollIntoView({ behavior: "smooth" });
      });
      box.appendChild(h("article", { class: "card" }, [
        h("div", { class: "card-head" }, [h("h3", { text: e.name }), saveBtn]),
        tags,
        h("p", { text: e.note }),
        h("div", { class: "row" }, [web, ads]),
        use
      ]));
    });
  }

  function setupDirectory() {
    fillSelect($("f-field"), FIELDS);
    fillSelect($("f-province"), PROVINCES);
    fillSelect($("f-type"), TYPES);
    ["q", "f-field", "f-province", "f-type", "f-saved"].forEach(function (id) {
      $(id).addEventListener(id === "q" ? "input" : "change", renderCards);
    });
    renderCards();
  }

  // =============== Checklist ===============
  var ticks = load("wil.checklist", {});
  function renderChecklist() {
    var ul = $("checklist");
    ul.textContent = "";
    var done = 0;
    CHECKLIST.forEach(function (item, i) {
      var cb = h("input", { type: "checkbox", id: "chk" + i });
      cb.checked = !!ticks[i];
      if (cb.checked) done++;
      cb.addEventListener("change", function () {
        ticks[i] = cb.checked;
        save("wil.checklist", ticks);
        renderChecklist();
      });
      ul.appendChild(h("li", {}, [cb, h("label", { for: "chk" + i, text: item })]));
    });
    $("check-progress").textContent = done + " of " + CHECKLIST.length + " ready";
  }

  // =============== Email builder ===============
  function emailData() {
    var d = {};
    new FormData($("email-form")).forEach(function (v, k) { d[k] = v; });
    return d;
  }
  function updateEmail() {
    var m = L.buildEmail(emailData());
    $("out-subject").value = m.subject;
    $("out-body").value = m.body;
    $("mailto").href = "mailto:?subject=" + encodeURIComponent(m.subject) + "&body=" + encodeURIComponent(m.body);
    save("wil.emailForm", emailData());
  }
  function setupEmail() {
    var form = $("email-form");
    var prev = load("wil.emailForm", {});
    Object.keys(prev).forEach(function (k) {
      if (form.elements[k]) form.elements[k].value = prev[k];
    });
    form.addEventListener("input", updateEmail);
    $("copy-email").addEventListener("click", function () {
      var text = "Subject: " + $("out-subject").value + "\n\n" + $("out-body").value;
      var done = function () { $("copy-msg").textContent = "Copied. Paste it into your email."; };
      var fail = function () {
        $("out-body").select();
        $("copy-msg").textContent = "Press Ctrl+C to copy the selected text.";
      };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, fail);
      else fail();
    });
    updateEmail();
  }

  // =============== Tracker ===============
  var rows = load("wil.tracker", []);
  function renderTracker() {
    var body = document.querySelector("#track-table tbody");
    body.textContent = "";
    rows.forEach(function (r, i) {
      var del = h("button", { type: "button", class: "link", "aria-label": "Remove " + r.org, text: "Remove" });
      del.addEventListener("click", function () { rows.splice(i, 1); save("wil.tracker", rows); renderTracker(); });
      var sel = h("select", { "aria-label": "Status for " + r.org });
      ["Applied", "Followed up", "Interview", "Offer", "Placed", "Unsuccessful"].forEach(function (s) {
        var o = h("option", { value: s, text: s }); if (s === r.status) o.selected = true; sel.appendChild(o);
      });
      sel.addEventListener("change", function () { r.status = sel.value; save("wil.tracker", rows); renderSummary(); });
      body.appendChild(h("tr", {}, [
        h("td", { text: r.org }), h("td", { text: r.role }), h("td", { text: r.date }),
        h("td", {}, [sel]), h("td", { text: r.notes }), h("td", {}, [del])
      ]));
    });
    $("track-empty").hidden = rows.length > 0;
    $("export-csv").hidden = rows.length === 0;
    renderSummary();
  }
  function renderSummary() {
    var c = L.statusCounts(rows);
    var parts = Object.keys(c).map(function (k) { return c[k] + " " + k.toLowerCase(); });
    $("track-summary").textContent = rows.length ? rows.length + (rows.length === 1 ? " application: " : " applications: ") + parts.join(", ") : "";
  }
  function setupTracker() {
    $("track-form").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var d = {};
      new FormData(ev.target).forEach(function (v, k) { d[k] = String(v).trim(); });
      if (!d.org) return;
      rows.push(d);
      save("wil.tracker", rows);
      ev.target.reset();
      renderTracker();
    });
    $("export-csv").addEventListener("click", function () {
      var blob = new Blob(["﻿" + L.trackerToCsv(rows)], { type: "text/csv;charset=utf-8" });
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "my-wil-applications.csv";
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    });
    renderTracker();
  }

  setupDirectory();
  renderChecklist();
  setupEmail();
  setupTracker();
})();
