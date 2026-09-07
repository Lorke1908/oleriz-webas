/* Shared behaviour for every page. Each page sets window.SITE before loading
   this file: which job list to read, how many roles to show, whether to show
   the category filters, and the wording for anything this script renders. */
(function () {
  "use strict";

  var S = window.SITE || {};
  var T = S.strings || {};

  var jobList = document.getElementById("jobList");
  var filtersEl = document.getElementById("filters");
  var emptyEl = document.getElementById("rolesEmpty");

  var JOBS = [];
  var activeCat = null;

  function esc(s) {
    var d = document.createElement("div");
    d.textContent = s == null ? "" : s;
    return d.innerHTML;
  }

  function message(msg) {
    if (filtersEl) filtersEl.innerHTML = "";
    if (jobList) jobList.innerHTML = "";
    if (emptyEl) {
      emptyEl.textContent = msg;
      emptyEl.hidden = false;
    }
  }

  function renderFilters() {
    if (!filtersEl || !S.filters) return;
    var cats = [T.all].concat(JOBS.map(function (j) { return j.category; })
      .filter(function (c, i, a) { return c && a.indexOf(c) === i; }));
    filtersEl.innerHTML = cats.map(function (c) {
      var on = c === activeCat;
      return '<button class="chip' + (on ? " active" : "") + '" data-cat="' +
        esc(c) + '" aria-pressed="' + on + '">' + esc(c) + "</button>";
    }).join("");
  }

  function renderJobs() {
    if (!jobList) return;
    var shown = (!activeCat || activeCat === T.all)
      ? JOBS
      : JOBS.filter(function (j) { return j.category === activeCat; });

    var limited = S.limit ? shown.slice(0, S.limit) : shown;

    if (emptyEl) {
      emptyEl.textContent = T.empty || "";
      emptyEl.hidden = shown.length > 0;
    }

    jobList.innerHTML = limited.map(function (j) {
      var where = [j.location, j.type].filter(Boolean).map(esc).join(" · ");
      return '' +
        '<div class="job-row">' +
          '<div class="jr-main">' +
            '<div class="jr-title">' + esc(j.title) + "</div>" +
            '<div class="jr-team">' + esc(j.team) + "</div>" +
          "</div>" +
          '<div class="jr-cell">' +
            (j.category ? '<span class="jr-pill">' + esc(j.category) + "</span>" : "") +
          "</div>" +
          '<div class="jr-cell">' +
            '<span class="jr-val">' + where + "</span>" +
            (j.experience ? '<span class="jr-sub">' + esc(j.experience) + "</span>" : "") +
          "</div>" +
          '<div class="jr-cell jr-pay">' +
            '<span class="jr-val">' + esc(j.salary) + "</span>" +
            (j.level ? '<span class="jr-sub">' + esc(j.level) + "</span>" : "") +
          "</div>" +
          '<a class="btn ghost" href="' + esc(j.link || "#contact") + '">' + esc(T.apply) + "</a>" +
        "</div>";
    }).join("");
  }

  if (filtersEl) {
    filtersEl.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-cat]");
      if (!btn) return;
      activeCat = btn.dataset.cat;
      renderFilters();
      renderJobs();
    });
  }

  /* The floating header tightens once the page has moved off the top. */
  var headerEl = document.getElementById("siteHeader");
  if (headerEl) {
    var ticking = false;
    var syncHeader = function () {
      headerEl.classList.toggle("is-scrolled", window.scrollY > 8);
      ticking = false;
    };
    window.addEventListener("scroll", function () {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(syncHeader);
      }
    }, { passive: true });
    syncHeader();
  }

  var nav = document.getElementById("navLinks");
  var toggle = document.querySelector(".menu-toggle");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      toggle.setAttribute("aria-expanded", nav.classList.toggle("open"));
    });
    nav.addEventListener("click", function (e) {
      if (e.target.tagName === "A") {
        nav.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
      }
    });
  }

  if (jobList && S.jobsUrl) {
    activeCat = T.all;
    fetch(S.jobsUrl, { cache: "no-cache" })
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .then(function (data) {
        if (!Array.isArray(data)) throw new Error("job list must be an array");
        JOBS = data;
        if (!JOBS.length) { message(T.empty); return; }
        renderFilters();
        renderJobs();
      })
      .catch(function (err) {
        console.error("Could not load " + S.jobsUrl + ":", err);
        message(T.error);
      });
  }
})();
