(function () {
  'use strict';

  // Mobile navigation
  var toggle = document.querySelector('.site-header__toggle');
  var nav = document.getElementById('site-nav');
  if (toggle && nav) {
    var setOpen = function (open) {
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      nav.classList.toggle('is-open', open);
    };
    toggle.addEventListener('click', function () {
      setOpen(toggle.getAttribute('aria-expanded') !== 'true');
    });
    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) setOpen(false);
    });
  }

  // Industries tabs
  var tablist = document.querySelector('.industries__tabs');
  if (tablist) {
    var tabs = Array.prototype.slice.call(tablist.querySelectorAll('[role="tab"]'));
    var nameEl = document.querySelector('.industries__name');
    var descEl = document.querySelector('.industries__desc');
    var imgEl = document.querySelector('.industries__img');

    var select = function (tab, focus) {
      tabs.forEach(function (t) {
        var active = t === tab;
        t.classList.toggle('is-active', active);
        t.setAttribute('aria-selected', String(active));
        t.tabIndex = active ? 0 : -1;
      });
      nameEl.textContent = tab.dataset.title || tab.textContent.trim();
      descEl.textContent = tab.dataset.desc || '';
      if (tab.dataset.image) imgEl.src = tab.dataset.image;
      if (focus) tab.focus();
    };

    // If a photo is missing, show the plain dark panel instead of a broken image.
    imgEl.addEventListener('error', function () { imgEl.style.visibility = 'hidden'; });
    imgEl.addEventListener('load', function () { imgEl.style.visibility = ''; });

    // Warm the cache so switching industries doesn't flash an empty panel.
    var preload = function () {
      tabs.forEach(function (t) { if (t.dataset.image) new Image().src = t.dataset.image; });
    };
    if (document.readyState === 'complete') preload();
    else window.addEventListener('load', preload);

    tabs.forEach(function (tab, i) {
      tab.addEventListener('click', function () { select(tab, false); });
      tab.addEventListener('keydown', function (e) {
        var next = null;
        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') next = tabs[(i + 1) % tabs.length];
        if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') next = tabs[(i - 1 + tabs.length) % tabs.length];
        if (e.key === 'Home') next = tabs[0];
        if (e.key === 'End') next = tabs[tabs.length - 1];
        if (next) { e.preventDefault(); select(next, true); }
      });
    });
  }

  // Banner carousel: horizontal slide, loops both ways, auto-advances every 10s.
  // To add a banner, add another .banner__slide to the track.
  var AUTOPLAY_MS = 10000;
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  document.querySelectorAll('[data-carousel]').forEach(function (carousel) {
    var track = carousel.querySelector('.banner__track');
    var slides = Array.prototype.slice.call(track.children);
    var prev = carousel.querySelector('[data-carousel-prev]');
    var next = carousel.querySelector('[data-carousel-next]');
    var count = slides.length;

    if (count < 2) {
      if (prev) prev.hidden = true;
      if (next) next.hidden = true;
      return;
    }

    // Clones at both ends let the last slide slide into the first (and back) without rewinding.
    var headClone = slides[count - 1].cloneNode(true);
    var tailClone = slides[0].cloneNode(true);
    [headClone, tailClone].forEach(function (clone) {
      clone.setAttribute('aria-hidden', 'true');
      clone.removeAttribute('role');
      clone.removeAttribute('aria-label');
      clone.removeAttribute('aria-roledescription');
    });
    track.insertBefore(headClone, slides[0]);
    track.appendChild(tailClone);

    var index = 1; // position in the track, including the leading clone
    var moving = false;
    var timer = null;
    var settleTimer = null;

    var place = function (animate) {
      track.style.transition = animate ? '' : 'none';
      track.style.transform = 'translateX(' + (-index * 100) + '%)';
      if (!animate) void track.offsetWidth; // apply the jump before re-enabling transitions
    };

    var updateAria = function () {
      var current = (index - 1 + count) % count;
      slides.forEach(function (slide, i) { slide.setAttribute('aria-hidden', String(i !== current)); });
      // No "previous" arrow on the first banner, no "next" arrow on the last.
      // (Autoplay still loops from the last banner back to the first.)
      var onFirst = current === 0;
      var onLast = current === count - 1;
      if (onFirst && document.activeElement === prev) next.focus();
      if (onLast && document.activeElement === next) prev.focus();
      prev.hidden = onFirst;
      next.hidden = onLast;
    };

    var settle = function () {
      clearTimeout(settleTimer);
      moving = false;
      if (index === count + 1) { index = 1; place(false); }
      if (index === 0) { index = count; place(false); }
    };

    var go = function (step) {
      if (moving) return;
      moving = true;
      index += step;
      updateAria();
      if (reducedMotion.matches) { place(false); settle(); return; }
      place(true);
      settleTimer = setTimeout(settle, 700); // fallback if transitionend doesn't fire
    };

    track.addEventListener('transitionend', function (e) {
      if (e.target === track && e.propertyName === 'transform') settle();
    });

    // Autoplay pauses while the visitor is pointing at or keyboard-focused in the banner, or the tab is hidden.
    var hovering = false;
    var focused = false;
    var stop = function () { clearInterval(timer); timer = null; };
    var start = function () {
      stop();
      if (hovering || focused || document.hidden) return;
      timer = setInterval(function () { go(1); }, AUTOPLAY_MS);
    };

    next.addEventListener('click', function () { go(1); start(); });
    prev.addEventListener('click', function () { go(-1); start(); });

    carousel.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') { hovering = true; stop(); } });
    carousel.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') { hovering = false; start(); } });
    carousel.addEventListener('focusin', function (e) { focused = e.target.matches(':focus-visible'); if (focused) stop(); });
    carousel.addEventListener('focusout', function (e) { if (!carousel.contains(e.relatedTarget)) { focused = false; start(); } });
    document.addEventListener('visibilitychange', start);

    place(false);
    updateAria();
    start();
  });

  // Engineering steps — tablet & mobile stacking (desktop is pure CSS).
  // Turned on only when the tallest card fits under the header with room for the strips.
  var stepsList = document.querySelector('.steps');
  if (stepsList) {
    var siteHeader = document.querySelector('.site-header');
    var updateStack = function () {
      var small = window.matchMedia('(max-width: 1023px)').matches;
      if (!small || reducedMotion.matches) { stepsList.classList.remove('steps--stack'); return; }
      stepsList.classList.add('steps--stack'); // measure in the stacked layout
      // Strip size: enough to show label + title, but small enough that each card,
      // pinned at (header + i strips), still fits fully on screen.
      var headerH = siteHeader ? siteHeader.offsetHeight : 72;
      var room = window.innerHeight - headerH - 14;
      var stripH = 0, peek = Infinity;
      Array.prototype.forEach.call(stepsList.querySelectorAll('.step'), function (s, i) {
        var title = s.querySelector('.step__title');
        if (title) stripH = Math.max(stripH, title.getBoundingClientRect().bottom - s.getBoundingClientRect().top + 10);
        if (s.offsetHeight > room) peek = -1; // a card taller than the screen can't pin
        else if (i > 0) peek = Math.min(peek, (room - s.offsetHeight) / i);
      });
      peek = Math.floor(Math.min(peek, Math.ceil(stripH)));
      if (peek < 30) { stepsList.classList.remove('steps--stack'); return; } // too short: plain cards
      stepsList.style.setProperty('--step-peek', peek + 'px');
    };
    var stackTimer;
    window.addEventListener('resize', function () { clearTimeout(stackTimer); stackTimer = setTimeout(updateStack, 150); });
    window.addEventListener('load', updateStack);
    updateStack();
  }

  // Blog topic filter
  var postFilter = document.querySelector('.post-filter');
  if (postFilter) {
    var postCards = document.querySelectorAll('.post-card');
    postFilter.addEventListener('click', function (e) {
      var btn = e.target.closest('button');
      if (!btn) return;
      postFilter.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', String(b === btn)); });
      postCards.forEach(function (card) {
        card.hidden = btn.dataset.topic !== 'all' && card.dataset.topic !== btn.dataset.topic;
        card.style.setProperty('--reveal-delay', '0ms'); // no load-time stagger when cards reappear
      });
    });
  }

  // Events move from "next" to "past" on their own once their end date has gone by.
  var today = new Date().toISOString().slice(0, 10);
  document.querySelectorAll('[data-hide-after]').forEach(function (el) { if (today > el.dataset.hideAfter) el.hidden = true; });
  document.querySelectorAll('[data-show-after]').forEach(function (el) { if (today > el.dataset.showAfter) el.hidden = false; });

  // ---------------------------------------------------------------------------
  // Contact page: enquiry form. No backend yet, so a valid enquiry opens the
  // visitor's email app with everything filled in, addressed to the chosen team.
  // ---------------------------------------------------------------------------
  var enquiry = document.getElementById('enquiry');
  if (enquiry) {
    var teams = {
      sales: 'sales@nadrixsolutions.com',
      technical: 'pandurang.patole@nadrixsolutions.com'
    };
    var status = enquiry.querySelector('.enquiry__status');
    var checks = [
      { el: enquiry.elements.name, ok: function (v) { return v.length > 1; } },
      { el: enquiry.elements.email, ok: function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); } },
      { el: enquiry.elements.message, ok: function (v) { return v.length > 4; } }
    ];
    var setError = function (check, show) {
      var err = document.getElementById(check.el.id + '-error');
      check.el.setAttribute('aria-invalid', show ? 'true' : 'false');
      if (show) check.el.setAttribute('aria-describedby', err.id); else check.el.removeAttribute('aria-describedby');
      err.hidden = !show;
    };
    // Clear an error as soon as the field is fixed
    checks.forEach(function (check) {
      check.el.addEventListener('input', function () {
        if (check.el.getAttribute('aria-invalid') === 'true' && check.ok(check.el.value.trim())) setError(check, false);
      });
    });
    enquiry.addEventListener('submit', function (e) {
      e.preventDefault();
      var firstBad = null;
      checks.forEach(function (check) {
        var bad = !check.ok(check.el.value.trim());
        setError(check, bad);
        if (bad && !firstBad) firstBad = check.el;
      });
      if (firstBad) { status.textContent = ''; firstBad.focus(); return; }

      var f = enquiry.elements;
      var to = teams[f.team.value] || teams.sales;
      var body = [
        'Name: ' + f.name.value.trim(),
        'Email: ' + f.email.value.trim(),
        f.phone.value.trim() ? 'Phone: ' + f.phone.value.trim() : '',
        '',
        f.message.value.trim()
      ].filter(function (line, i) { return line !== '' || i === 3; }).join('\n');
      var subject = 'Website enquiry from ' + f.name.value.trim();
      window.location.href = 'mailto:' + to + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
      status.textContent = 'Your email app should open with the enquiry ready to send. If it doesn’t, email us at ' + to + '.';
    });
  }
  // "Contact us" card: scroll to the form and put the cursor in the first field
  document.querySelectorAll('[data-focus]').forEach(function (link) {
    link.addEventListener('click', function (e) {
      var field = document.getElementById(link.getAttribute('data-focus'));
      if (!field) return;
      e.preventDefault();
      field.closest('form').scrollIntoView({ behavior: reducedMotion.matches ? 'auto' : 'smooth', block: 'start' });
      field.focus({ preventScroll: true });
    });
  });

  // ---------------------------------------------------------------------------
  // Motion:letter-by-letter headings, fade-up reveals, count-up stats, parallax.
  // Skipped entirely for reduced-motion visitors or browsers without IntersectionObserver.
  // ---------------------------------------------------------------------------
  if (reducedMotion.matches || !('IntersectionObserver' in window)) return;
  document.documentElement.classList.add('anim-ready');

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      // Reveal on entering the screen, and also anything already scrolled past
      // (fast scrolling, or the browser restoring scroll position on reload).
      var above = entry.boundingClientRect.bottom < 0;
      if (!entry.isIntersecting && !above) return;
      entry.target.classList.add('is-visible');
      if (entry.target.hasAttribute('data-count')) countUp(entry.target);
      observer.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -12% 0px', threshold: 0.12 });

  // Observe after the hidden starting styles have been applied, so items already
  // on screen at load still animate in rather than appearing instantly.
  var watch = function (el) { requestAnimationFrame(function () { observer.observe(el); }); };
  var reveal = function (selector, step, maxDelay) {
    document.querySelectorAll(selector).forEach(function (el, i) {
      el.classList.add('reveal');
      if (step) el.style.setProperty('--reveal-delay', Math.min(i * step, maxDelay || 600) + 'ms');
      watch(el);
    });
  };
  // Stagger items within each parent group (so a second grid starts again at 0)
  var revealGroups = function (groupSelector, itemSelector, step) {
    document.querySelectorAll(groupSelector).forEach(function (group) {
      Array.prototype.slice.call(group.querySelectorAll(itemSelector)).forEach(function (el, i) {
        el.classList.add('reveal');
        el.style.setProperty('--reveal-delay', Math.min(i * step, 900) + 'ms');
        watch(el);
      });
    });
  };

  // Hero: photo settles in; intro text and buttons fade up (headings stay static)
  var hero = document.querySelector('.hero, .sys-hero, .contact-hero');
  if (hero) watch(hero);
  document.querySelectorAll('.sys-hero__copy, .contact-intro__lead').forEach(function (el) {
    el.classList.add('reveal');
    el.style.setProperty('--reveal-delay', '250ms');
    watch(el);
  });
  document.querySelectorAll('.hero__lead, .hero__actions').forEach(function (el, i) {
    el.classList.add('reveal');
    el.style.setProperty('--reveal-delay', (250 + i * 150) + 'ms');
    watch(el);
  });

  // Blocks and cards
  reveal('.about__copy, .systems__intro, .cta__lead, .cta .btn--cta', 0);
  revealGroups('.stats', '.stats__item', 90);
  reveal('.banner', 0);
  revealGroups('.partners__panel', '.partner', 90);
  revealGroups('.systems__grid', '.system-card', 90);
  revealGroups('.industries__body', '.industries__tabs, .industries__panel', 150);
  revealGroups('.clients__grid', '.client', 35);
  reveal('.certs__logos', 0);
  reveal('.next-event', 0);
  revealGroups('.post-grid', '.post-card', 90);
  revealGroups('.event-list', '.event-row', 90);
  revealGroups('.site-footer__cols', '.footer-col', 100);
  // Generic hooks for inner pages: data-reveal fades up; data-reveal-group staggers its data-reveal-item children
  reveal('[data-reveal]', 0);
  revealGroups('[data-reveal-group]', '[data-reveal-item]', 90);

  // Count-up numbers ("200+" counts 0 → 200 and keeps the "+")
  var countUp = function (el) {
    var target = +el.getAttribute('data-count');
    var suffix = el.getAttribute('data-suffix') || '';
    var pad = +el.getAttribute('data-pad') || 0; // keeps "04" two digits while counting
    var start = null, duration = 1600;
    var tick = function (now) {
      if (start === null) start = now;
      var p = Math.min((now - start) / duration, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      var n = String(Math.round(target * eased));
      while (n.length < pad) n = '0' + n;
      el.textContent = n + suffix;
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  document.querySelectorAll('.stats__value, .about-stat__value').forEach(function (el) {
    var m = el.textContent.trim().match(/^(\d+)(.*)$/);
    if (!m) return;
    var pad = m[1].charAt(0) === '0' ? m[1].length : 0;
    el.setAttribute('data-count', m[1]);
    el.setAttribute('data-suffix', m[2]);
    if (pad) el.setAttribute('data-pad', pad);
    el.setAttribute('aria-label', el.textContent.trim());
    el.textContent = (pad ? new Array(pad + 1).join('0') : '0') + m[2];
    watch(el);
  });

  // Gentle parallax on the call-to-action background photo
  var ctaSection = document.querySelector('.cta');
  var ctaImg = document.querySelector('.cta__bg img');
  if (ctaSection && ctaImg) {
    var ticking = false;
    var update = function () {
      ticking = false;
      var r = ctaSection.getBoundingClientRect();
      var vh = window.innerHeight;
      if (r.bottom < 0 || r.top > vh) return;
      var progress = (vh - r.top) / (vh + r.height); // 0 → 1 while the section crosses the screen
      ctaImg.style.transform = 'translate3d(0,' + ((progress - 0.5) * 60).toFixed(1) + 'px,0) scale(1.12)';
    };
    window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    update();
  }
})();
