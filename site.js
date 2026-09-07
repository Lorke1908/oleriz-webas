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

  /* Hero figures count up the first time they scroll into view.
     Whatever is typed in the CMS is preserved around the number, so
     "230+", "14 d." and "92 %" all animate only their digits. */
  var figures = document.querySelectorAll(".hero-meta strong");
  var reduceMotion = window.matchMedia
    && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (figures.length && !reduceMotion && "IntersectionObserver" in window) {
    var parseFigure = function (text) {
      var m = /^(\D*?)(\d+(?:[.,]\d+)?)(.*)$/.exec(text);
      if (!m) return null;
      var digits = m[2];
      var decimalPart = digits.split(/[.,]/)[1];
      return {
        prefix: m[1],
        suffix: m[3],
        target: parseFloat(digits.replace(",", ".")),
        decimals: decimalPart ? decimalPart.length : 0,
        comma: digits.indexOf(",") > -1
      };
    };

    var countUp = function (el) {
      var f = parseFigure(el.textContent);
      if (!f) return;                       // no digits — leave the text alone
      var started = null;
      var step = function (now) {
        if (started === null) started = now;
        var t = Math.min((now - started) / 1100, 1);
        var eased = 1 - Math.pow(1 - t, 3);
        var value = (f.target * eased).toFixed(f.decimals);
        if (f.comma) value = value.replace(".", ",");
        el.textContent = f.prefix + value + f.suffix;
        if (t < 1) window.requestAnimationFrame(step);
      };
      window.requestAnimationFrame(step);
    };

    var figureObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        figureObserver.unobserve(entry.target);
        countUp(entry.target);
      });
    }, { threshold: 0.45 });

    Array.prototype.forEach.call(figures, function (f) {
      figureObserver.observe(f);
    });
  }

  /* Sections rise into view as you scroll. The class is added here rather
     than in the markup, so without JS nothing is ever left invisible. */
  if (!reduceMotion && "IntersectionObserver" in window) {
    var revealTargets = document.querySelectorAll(
      ".section-head, .split-card, .step, .t-card, .journey-step, " +
      ".faq-list, .contact-info, .contact-grid form, .form-fallback"
    );
    if (revealTargets.length) {
      var revealObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          revealObserver.unobserve(entry.target);
          entry.target.classList.add("is-visible");
        });
      }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });

      Array.prototype.forEach.call(revealTargets, function (el) {
        el.classList.add("reveal");
        // stagger siblings so a row of cards arrives in sequence
        var siblings = Array.prototype.filter.call(
          el.parentNode.children, function (c) { return c.classList.contains("reveal"); });
        var i = siblings.indexOf(el);
        if (i > 0) el.style.transitionDelay = Math.min(i * 80, 240) + "ms";
        revealObserver.observe(el);
      });
    }
  }

  /* One scroll handler for everything that reacts to scrolling: the header
     tightening, and the ridge layers drifting at their own rates. */
  var headerEl = document.getElementById("siteHeader");
  var ridgesEl = document.querySelector(".ridges");
  var parallax = ridgesEl && !reduceMotion;

  if (headerEl || parallax) {
    var ticking = false;
    var onScroll = function () {
      var y = window.scrollY || window.pageYOffset || 0;
      if (headerEl) headerEl.classList.toggle("is-scrolled", y > 8);
      // only worth moving while the hero is still on screen
      if (parallax && y < 1200) ridgesEl.style.setProperty("--sy", Math.round(y));
      ticking = false;
    };
    window.addEventListener("scroll", function () {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(onScroll);
      }
    }, { passive: true });
    onScroll();
  }

  /* The CV block only concerns candidates, so it appears when they say so.
     The select stores its own "candidate" wording, since it is translated. */
  var typeSelect = document.getElementById("f-type");
  var cvBlock = document.getElementById("cvBlock");
  if (typeSelect && cvBlock) {
    var syncCv = function () {
      cvBlock.hidden = typeSelect.value !== typeSelect.dataset.candidate;
    };
    typeSelect.addEventListener("change", syncCv);
    syncCv();
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
