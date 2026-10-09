/* PALESA VISUALS — site behaviour (no dependencies) */
(function () {
  'use strict';

  var CFG = window.PALESA_CONFIG || {};
  var services = (CFG.services || []).filter(function (s) { return s && s.id && s.name; });
  var OTHER = { id: 'other', name: 'Other / Not sure', formLabel: 'Other / Not Sure', questions: null };
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  function esc(str) {
    return String(str).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function pad(i) { return i < 10 ? '0' + i : String(i); }
  function scrollToEl(el, block) { el.scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth', block: block || 'start' }); }

  var ARROW = '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
  var WAVES = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="6" cy="18" r="2" fill="currentColor" stroke="none"/><path d="M6 12a6 6 0 0 1 6 6M6 6a12 12 0 0 1 12 12"/></svg>';

  /* ---------------- WhatsApp number ---------------- */
  var waNumber = String(CFG.whatsappNumber || '').replace(/\D/g, '');
  // wa.me needs full international format: country code + number, no leading 0.
  var waConfigured = /^[1-9]\d{7,14}$/.test(waNumber);
  function waUrl(text) { return 'https://wa.me/' + waNumber + (text ? '?text=' + encodeURIComponent(text) : ''); }

  /* ---------------- Toast ---------------- */
  var toastTimer;
  function toast(msg) {
    var el = $('#toast');
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.hidden = true; }, 5000);
  }

  /* ---------------- Services: render from config ---------------- */
  function renderServices() {
    var featuredEl = $('[data-featured-services]');
    var listEl = $('[data-service-list]');
    if (!featuredEl) return;
    var featured = services.filter(function (s) { return s.featured && s.photo; }).slice(0, 4);
    var rest = services.filter(function (s) { return featured.indexOf(s) === -1; });
    var n = 0;

    featuredEl.innerHTML = featured.map(function (s, i) {
      n++;
      return '<a class="card" href="' + quoteHref(s.id) + '" data-service="' + esc(s.id) + '" style="--d:' + (i % 2) + '">' +
        '<figure class="photo"><img src="' + esc(s.photo.src) + '"' +
        (s.photo.srcset ? ' srcset="' + esc(s.photo.srcset) + '" sizes="(max-width: 860px) 100vw, 60vw"' : '') +
        (s.photo.position ? ' style="object-position:' + esc(s.photo.position) + '"' : '') +
        ' alt="' + esc(s.photo.alt || '') + '" loading="lazy" width="' + (s.photo.width || 1200) + '" height="' + (s.photo.height || 800) + '">' +
        '<span class="photo-note">Service photo — add ' + esc(s.photo.src) + '</span></figure>' +
        '<div class="card-body"><span class="card-num">' + pad(n) + '</span><h3>' + esc(s.name) + '</h3>' +
        '<div class="card-reveal"><div><p>' + esc(s.description || '') + '</p></div></div>' +
        '<span class="card-cta"><i>' + ARROW + '</i>Request a Quote<span class="sr-only"> for ' + esc(s.name) + '</span></span></div>' +
        '</a>';
    }).join('');
    featuredEl.setAttribute('data-count', featured.length);
    if (!featured.length) featuredEl.hidden = true;

    if (!listEl) { $$('.bento img').forEach(watchImage); return; }
    listEl.innerHTML = rest.map(function (s, i) {
      n++;
      return '<li><a class="service-row" href="' + quoteHref(s.id) + '" data-service="' + esc(s.id) + '" style="--d:' + (i % 4) + '">' +
        '<span class="s-num" aria-hidden="true">' + pad(n) + '</span>' +
        '<h3>' + esc(s.name) + '</h3><p>' + esc(s.description || '') + '</p>' +
        '<span class="s-arrow" aria-hidden="true">' + ARROW + '</span>' +
        '<span class="sr-only">Request a quote for ' + esc(s.name) + '</span></a></li>';
    }).join('');
    if (!rest.length) $('.service-index').hidden = true;

    $$('.bento img').forEach(watchImage);
  }

  function quoteHref(id) { return 'contact.html?service=' + encodeURIComponent(id); }

  function watchImage(img) {
    var mark = function () { img.closest('.photo').classList.add('photo--pending'); };
    img.addEventListener('error', mark);
    if (img.complete && img.naturalWidth === 0 && img.getAttribute('src')) mark();
  }

  /* Home: big service names that reveal a photo on hover */
  function renderShowcase() {
    var list = $('[data-showcase]');
    if (!list) return;
    var items = services.filter(function (s) { return s.showcase; });
    list.innerHTML = items.map(function (s, i) {
      var photo = s.showcasePhoto || (s.photo && s.photo.src) || '';
      return '<li><a class="show-row" href="' + quoteHref(s.id) + '" style="--d:' + (i % 3) + '">' +
        (photo ? '<figure class="show-bg" aria-hidden="true"><img src="' + esc(photo) + '" alt="" loading="lazy"></figure>' : '') +
        '<span class="show-n" aria-hidden="true">' + pad(i + 1) + '</span>' +
        '<span class="show-name">' + esc(s.showcase) + '</span>' +
        '<span class="show-desc">' + esc(s.description || '') + '</span>' +
        '<span class="show-arrow" aria-hidden="true">' + ARROW + '</span>' +
        '<span class="sr-only"> — request a quote</span></a></li>';
    }).join('');
  }

  function renderMarquee() {
    var track = $('[data-marquee]');
    if (!track) return;
    var names = services.map(function (s) { return s.name.replace(/ Installation$/, ''); });
    var group = names.map(function (name) { return '<span class="marquee-item">' + esc(name) + WAVES + '</span>'; }).join('');
    // Two identical groups make the loop seamless.
    track.innerHTML = '<div class="marquee-group">' + group + '</div><div class="marquee-group" aria-hidden="true">' + group + '</div>';
  }

  /* ---------------- Contact details, areas, meta ---------------- */
  function contactItems() {
    var items = [];
    if (waConfigured) items.push({ k: 'WhatsApp', v: waDisplay(), href: waUrl(CFG.whatsappGreeting), ext: true });
    if (CFG.phoneNumber) items.push({ k: 'Phone', v: CFG.phoneNumber, href: telHref(CFG.phoneNumber) });
    if (CFG.email) items.push({ k: 'Email', v: CFG.email, href: 'mailto:' + CFG.email });
    if (CFG.businessHours) items.push({ k: 'Hours', v: CFG.businessHours });
    if (CFG.serviceAreaSummary) items.push({ k: 'Service areas', v: CFG.serviceAreaSummary });
    return items;
  }
  function itemsHtml(items) {
    return items.map(function (it) {
      var v = it.href
        ? '<a class="v" href="' + esc(it.href) + '"' + (it.ext ? ' target="_blank" rel="noopener"' : '') + '>' + esc(it.v) + '</a>'
        : '<span class="v">' + esc(it.v) + '</span>';
      return '<li><span class="k">' + esc(it.k) + '</span>' + v + '</li>';
    }).join('');
  }
  function renderContact() {
    var items = contactItems();
    var footerList = $('[data-contact-list]');
    if (footerList) footerList.innerHTML = items.length ? itemsHtml(items)
      : '<li><span class="k">The quickest way to reach us</span><a class="v" href="contact.html">Request a quote</a></li>';
    var reachable = items.filter(function (it) { return it.href; });
    $$('[data-cta-contact], [data-contact-direct]').forEach(function (list) {
      var rows = list.hasAttribute('data-contact-direct') ? items : reachable;
      if (rows.length) list.innerHTML = itemsHtml(rows); else list.hidden = true;
    });

    if (CFG.serviceAreaSummary) {
      var line = $('[data-areas-line]');
      if (line) {
        line.innerHTML = 'Serving <strong>' + esc(CFG.serviceAreaSummary) + '</strong>';
        line.hidden = false;
      }
      var regions = areas().map(function (g) { return g.region; });
      var faqArea = $('[data-areas-faq]');
      if (faqArea) faqArea.textContent = 'We work across ' + CFG.serviceAreaSummary +
        (regions.length ? ', including ' + listJoin(regions) : '') +
        '. Choose your area in the quotation form. If yours isn’t listed, select “Other area” and type it in, and we’ll let you know whether we can assist.';
    }
    $$('[data-year]').forEach(function (y) { y.textContent = new Date().getFullYear(); });
  }
  // tel: links work best in +27 international format.
  function telHref(n) { return 'tel:+' + digits(n); }
  function waDisplay() { return CFG.phoneNumber && digits(CFG.phoneNumber) === waNumber ? CFG.phoneNumber : '+' + waNumber; }
  function areas() {
    return (CFG.serviceAreas || []).filter(function (g) { return g && g.region && g.places && g.places.length; });
  }
  function digits(s) { var d = String(s).replace(/\D/g, ''); return d.charAt(0) === '0' ? '27' + d.slice(1) : d; }
  function listJoin(arr) { return arr.length < 2 ? arr.join('') : arr.slice(0, -1).join(', ') + ' and ' + arr[arr.length - 1]; }

  function applySiteUrl() {
    if (!CFG.siteUrl) return;
    var url = CFG.siteUrl;
    var link = document.createElement('link');
    link.rel = 'canonical'; link.href = url;
    document.head.appendChild(link);
    var m = document.createElement('meta'); m.setAttribute('property', 'og:url'); m.content = url; document.head.appendChild(m);
    var og = $('meta[property="og:image"]');
    if (og) og.content = new URL('assets/img/og-image.jpg', url).href;
  }

  /* ---------------- WhatsApp buttons ---------------- */
  function setupWhatsAppButtons() {
    $$('[data-whatsapp]').forEach(function (a) {
      if (waConfigured) {
        a.href = waUrl(CFG.whatsappGreeting);
        a.target = '_blank';
        a.rel = 'noopener';
      } else {
        a.setAttribute('aria-disabled', 'true');
        a.title = 'WhatsApp number not configured yet';
        a.addEventListener('click', function (e) {
          e.preventDefault();
          toast('WhatsApp chat isn’t available yet. Please use the quotation form.');
          console.warn('[Palesa Visuals] whatsappNumber is not set in js/config.js — WhatsApp buttons are disabled.');
        });
      }
    });
  }

  /* ---------------- Header + navigation ---------------- */
  function setupNav() {
    var header = $('.site-header');
    var toggle = $('.menu-toggle');
    var nav = $('#primary-nav');
    var label = $('.menu-toggle-label');

    var onScroll = function () { header.classList.toggle('is-scrolled', window.scrollY > 12); };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    function setOpen(open) {
      toggle.setAttribute('aria-expanded', String(open));
      label.textContent = open ? 'Close' : 'Menu';
      nav.classList.toggle('is-open', open);
      document.body.classList.toggle('nav-open', open);
    }
    toggle.addEventListener('click', function () { setOpen(toggle.getAttribute('aria-expanded') !== 'true'); });
    nav.addEventListener('click', function (e) { if (e.target.closest('a')) setOpen(false); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) { setOpen(false); toggle.focus(); }
    });
    window.matchMedia('(min-width: 961px)').addEventListener('change', function (m) { if (m.matches) setOpen(false); });
  }

  /* ---------------- Motion: scroll reveals ---------------- */
  function setupReveals() {
    var targets = $$('[data-reveal], .reveal-img, .card, .service-row, .show-row, [data-steps]');
    if (!('IntersectionObserver' in window) || reduceMotion.matches) {
      targets.forEach(function (el) { el.classList.add('is-in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });
    targets.forEach(function (el) { io.observe(el); });
  }

  /* Photo bands grow to full width, and strip photos drift, as you scroll. */
  function setupScrollMotion() {
    var expands = $$('[data-expand]');
    var drifters = $$('[data-speed]');
    if (reduceMotion.matches || (!expands.length && !drifters.length)) {
      expands.forEach(function (el) { el.style.setProperty('--p', 1); });
      return;
    }
    var header = $('.site-header');
    var ticking = false;
    var update = function () {
      ticking = false;
      var vh = window.innerHeight;
      var hh = header ? header.offsetHeight : 0;
      expands.forEach(function (el) {
        var p;
        if (el.closest('.hero, .page-hero')) p = window.scrollY / (vh * 0.45);
        else p = 1 - (el.getBoundingClientRect().top - hh) / (vh * 0.6);
        el.style.setProperty('--p', Math.max(0, Math.min(1, p)).toFixed(3));
      });
      drifters.forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) return;
        var offset = (r.top + r.height / 2 - vh / 2) * parseFloat(el.getAttribute('data-speed'));
        el.style.transform = 'translate3d(0,' + offset.toFixed(1) + 'px,0)';
      });
    };
    window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    window.addEventListener('resize', update);
    update();
  }

  /* Statement: words light up as the paragraph scrolls through the viewport. */
  function setupStatement() {
    var el = $('[data-words]');
    if (!el) return;
    el.innerHTML = el.textContent.trim().split(/\s+/).map(function (w) {
      return '<span class="w">' + esc(w) + '</span>';
    }).join(' ');
    var words = $$('.w', el);
    if (reduceMotion.matches) { words.forEach(function (w) { w.classList.add('is-lit'); }); return; }
    var ticking = false;
    var update = function () {
      ticking = false;
      var r = el.getBoundingClientRect();
      var vh = window.innerHeight;
      var progress = (vh * 0.85 - r.top) / (r.height + vh * 0.3);
      var lit = Math.round(Math.max(0, Math.min(1, progress)) * words.length);
      words.forEach(function (w, i) { w.classList.toggle('is-lit', i < lit); });
    };
    window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    window.addEventListener('resize', update);
    update();
  }

  /* ---------------- Privacy dialog ---------------- */
  function setupPrivacy() {
    var dlg = $('#privacy-dialog');
    if (!dlg) return;
    $$('[data-open-privacy]').forEach(function (b) {
      b.addEventListener('click', function () {
        if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
      });
    });
    dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
  }

  /* =================================================================
     QUOTE FORM — four steps, then WhatsApp
     ================================================================= */
  var form, result;
  var step = 1, maxStep = 1, TOTAL = 4;
  var allServices = function () { return services.concat([OTHER]); };
  function findService(id) { return allServices().filter(function (s) { return s.id === id; })[0]; }

  function setupForm() {
    form = $('#quote-form');
    if (!form) return;
    result = $('#form-result');

    $('[data-service-tiles]').innerHTML = allServices().map(function (s) {
      return '<label class="tile"><input type="radio" name="service" value="' + esc(s.id) + '"><span>' + esc(s.formLabel || s.name) + '</span></label>';
    }).join('');

    var d = new Date();
    $('#f-date').min = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());

    setupAreas();
    updateConditional();

    // Show one step at a time once JS is running.
    $$('.step-panel', form).forEach(function (p) { p.hidden = p.getAttribute('data-step') !== '1'; });

    form.addEventListener('change', function (e) {
      if (e.target.name === 'service') {
        updateConditional();
        // Picking a service moves straight on — fewer taps on a phone.
        setTimeout(function () { if (step === 1 && validateStep(1)) goStep(2); }, 220);
      }
      revalidate(e.target);
      updateSummary();
    });
    form.addEventListener('input', function (e) { revalidate(e.target); });
    form.addEventListener('focusout', function (e) {
      var t = e.target;
      if (t.required && t.value.trim() !== '') t.dataset.touched = '1';
      if (t.required && t.dataset.touched === '1') validateName(t.name);
    });

    form.addEventListener('click', function (e) {
      if (e.target.closest('[data-next]')) { if (validateStep(step)) goStep(step + 1); }
      else if (e.target.closest('[data-back]')) goStep(step - 1);
      else if (e.target.closest('[data-goto]')) goStep(+e.target.closest('[data-goto]').getAttribute('data-goto'));
      else if (e.target.closest('[data-change-service]')) goStep(1);
    });

    // "Request a quote" links on other pages arrive as contact.html?service=<id>.
    var wanted = new URLSearchParams(window.location.search).get('service');
    if (wanted && findService(wanted)) {
      $('input[name="service"][value="' + wanted + '"]', form).checked = true;
      updateConditional();
      updateSummary();
      goStep(2, true);
    }

    form.addEventListener('submit', onSubmit);
  }

  function goStep(n, silent) {
    if (n < 1 || n > TOTAL || n > maxStep + 1) return;
    var back = n < step;
    step = n;
    maxStep = Math.max(maxStep, n);
    $$('.step-panel', form).forEach(function (p) {
      var on = +p.getAttribute('data-step') === n;
      p.hidden = !on;
      p.classList.remove('is-entering', 'is-entering-back');
      if (on) { void p.offsetWidth; p.classList.add(back ? 'is-entering-back' : 'is-entering'); }
    });
    $$('[data-goto]', form).forEach(function (b) {
      var i = +b.getAttribute('data-goto');
      b.disabled = i > maxStep;
      b.classList.toggle('is-done', i < n);
      if (i === n) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
    });
    $('[data-progress]').style.width = (n / TOTAL * 100) + '%';

    var s = findService(val('service'));
    $('[data-chosen-service]').innerHTML = s
      ? 'Service: <strong>' + esc(s.formLabel || s.name) + '</strong> · <button type="button" class="link-btn" data-change-service>Change</button>'
      : '';
    result.hidden = true;

    if (!silent) {
      var top = form.getBoundingClientRect().top;
      if (top < 0) scrollToEl(form);
      var heading = $('.step-panel[data-step="' + n + '"] .step-title', form);
      heading.setAttribute('tabindex', '-1');
      heading.focus({ preventScroll: true });
    }
  }

  /* ---------- Area picker ---------- */
  var OTHER_AREA = 'Other area';
  function setupAreas() {
    var sel = $('#f-area');
    areas().forEach(function (g) {
      var og = document.createElement('optgroup');
      og.label = g.region;
      g.places.forEach(function (place) {
        var o = document.createElement('option');
        // "Other Soweto area" → send just the region name
        o.value = /^Other /.test(place) ? g.region : place + (g.region === 'Soweto' ? ', Soweto' : '');
        o.textContent = place;
        og.appendChild(o);
      });
      sel.appendChild(og);
    });
    var other = document.createElement('option');
    other.value = OTHER_AREA; other.textContent = 'Other area (type it in)';
    sel.appendChild(other);

    var suburb = $('#f-suburb');
    sel.addEventListener('change', function () {
      var isOther = sel.value === OTHER_AREA;
      suburb.required = isOther;
      $('[data-suburb-label]').textContent = isOther ? 'Your suburb or town' : 'Suburb or extension';
      $('[data-suburb-optional]').hidden = isOther;
      $('[data-suburb-req]').hidden = !isOther;
      suburb.placeholder = isOther ? 'e.g. Vereeniging' : 'e.g. Protea Glen Ext 11';
      if (!isOther) clearError('suburb');
      if (isOther) suburb.focus();
    });
  }

  function updateConditional() {
    var s = findService(val('service'));
    var group = s ? s.questions : null;
    $$('fieldset.conditional', form).forEach(function (fs) {
      var show = fs.getAttribute('data-group') === group;
      fs.hidden = !show;
      fs.disabled = !show; // disabled fieldsets are excluded from the message
    });
  }

  function updateSummary() {
    var box = $('[data-live-summary]');
    var s = findService(val('service'));
    var area = val('area') === OTHER_AREA ? val('suburb') : val('area');
    var rows = [
      ['Service', s ? (s.formLabel || s.name) : ''],
      ['Property', val('property')],
      ['Area', area],
      ['Urgency', val('urgency')]
    ].filter(function (r) { return r[1]; });
    box.hidden = !rows.length;
    $('dl', box).innerHTML = rows.map(function (r) { return '<dt>' + esc(r[0]) + '</dt><dd>' + esc(r[1]) + '</dd>'; }).join('');
  }

  /* ---------- Validation ---------- */
  var rules = {
    service: function (v) { if (!v) return 'Please choose a service, or “Other / Not sure”.'; },
    property: function (v) { if (!v) return 'Please choose the type of property.'; },
    status: function (v) { if (!v) return 'Please choose the option closest to your current setup.'; },
    area: function (v) { if (!v) return 'Please choose your area, or “Other area”.'; },
    suburb: function (v) { if (!v) return 'Please type your suburb or town.'; },
    name: function (v) {
      if (!v) return 'Please enter your name.';
      if (v.length < 2) return 'Please enter your full name.';
    },
    phone: function (v) {
      if (!v) return 'Please enter a WhatsApp or contact number so we can reply.';
      if (!validPhone(v)) return 'That number doesn’t look right. Use a format like 082 123 4567 or +27 82 123 4567.';
    },
    details: function (v) {
      if (!v) return 'Please describe the job in a few words.';
      if (v.length < 8) return 'Please add a little more detail so we can understand the job.';
    }
  };

  function validPhone(raw) {
    var v = raw.trim();
    if (/[^\d\s()+\-.]/.test(v)) return false;
    if (v.indexOf('+') > 0) return false;
    var d = v.replace(/\D/g, '');
    if (v.charAt(0) === '+' || d.indexOf('00') === 0) return d.replace(/^00/, '').length >= 8 && d.replace(/^00/, '').length <= 15;
    if (d.charAt(0) === '0') return d.length === 10;           // SA local: 0XX XXX XXXX
    if (d.indexOf('27') === 0) return d.length === 11;         // SA without +
    return d.length >= 8 && d.length <= 15;                    // other international without +
  }

  function targetFor(name) { return $('[data-required-group="' + name + '"]', form) || form.elements[name]; }

  function isRequired(name) {
    if ($('[data-required-group="' + name + '"]', form)) return true;
    var el = form.elements[name];
    return !!(el && el.required && !el.matches(':disabled'));
  }

  function validateName(name) {
    var rule = rules[name];
    if (!rule) return true;
    if (!isRequired(name)) { clearError(name); return true; }
    var msg = rule(val(name));
    if (!msg) { clearError(name); return true; }
    targetFor(name).setAttribute('aria-invalid', 'true');
    var err = $('[data-error-for="' + name + '"]', form);
    if (err) { err.textContent = msg; err.hidden = false; }
    return false;
  }

  function clearError(name) {
    var t = targetFor(name);
    if (t && t.removeAttribute) t.removeAttribute('aria-invalid');
    var err = $('[data-error-for="' + name + '"]', form);
    if (err) { err.hidden = true; err.textContent = ''; }
  }

  function revalidate(el) {
    if (!el || !el.name) return;
    var t = targetFor(el.name);
    if (t && t.getAttribute && t.getAttribute('aria-invalid') === 'true') validateName(el.name);
  }

  function namesInStep(n) {
    var panel = $('.step-panel[data-step="' + n + '"]', form);
    var names = $$('[data-required-group]', panel).map(function (g) { return g.getAttribute('data-required-group'); });
    $$('input[required], select[required], textarea[required]', panel).forEach(function (el) { names.push(el.name); });
    return names;
  }

  function validateStep(n) {
    var bad = namesInStep(n).filter(function (name) { return !validateName(name); });
    if (bad.length) {
      var t = targetFor(bad[0]);
      var focusEl = t.matches && t.matches('[data-required-group]') ? $('input', t) : t;
      if (focusEl) focusEl.focus();
    }
    return !bad.length;
  }

  /* ---------- Message ---------- */
  function val(name) {
    var els = form.elements[name];
    if (!els) return '';
    if (els.length && els[0] && els[0].type === 'radio') {
      for (var i = 0; i < els.length; i++) if (els[i].checked && !els[i].matches(':disabled')) return els[i].value;
      return '';
    }
    if (els.type === 'radio') return els.checked && !els.matches(':disabled') ? els.value : '';
    return els.matches(':disabled') ? '' : String(els.value || '').trim();
  }

  function formatDate(iso) {
    if (!iso) return '';
    var p = iso.split('-');
    var dt = new Date(+p[0], +p[1] - 1, +p[2]);
    if (isNaN(dt)) return iso;
    try {
      return dt.toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });
    } catch (e) { return iso; }
  }

  function buildMessage() {
    var service = findService(val('service'));
    var area = val('area') === OTHER_AREA ? '' : val('area');
    var location = [val('suburb'), area].filter(Boolean).join(', ');
    var lines = [];
    var add = function (label, value) { if (value) lines.push(label + ': ' + value); };
    var gap = function () { if (lines.length && lines[lines.length - 1] !== '') lines.push(''); };

    lines.push('*PALESA VISUALS — NEW QUOTATION REQUEST*', '');
    add('Customer', val('name'));
    add('Contact number', val('phone'));
    add('Location', location);
    gap();
    add('Service required', service ? (service.formLabel || service.name) : '');
    add('Property type', val('property'));
    add('Installation status', val('status'));
    gap();

    // Service-specific answers (only from the visible group, only if answered)
    add('Decoder purchased', val('decoderPurchased'));
    add('Number of TV points', val('tvPoints'));
    add('Reported issue', val('issue'));
    add('Problem started', val('problemStart'));
    add('TVs / rooms to connect', val('rooms'));
    add('Existing decoder / installation', val('existingSetup'));
    add('TV size', val('tvSize'));
    add('Wall bracket available', val('bracket'));
    var commercial = [val('premises'), val('commercialPoints') ? 'approx. ' + val('commercialPoints') + ' TV points' : ''].filter(Boolean).join(', ');
    add('Commercial requirements', commercial);
    add('Number of cameras', val('cameras'));
    add('Existing CCTV system', val('cctvExisting'));
    add('View cameras on phone', val('remoteView'));
    add('Projector', val('projectorHave'));
    add('Screen', val('screenHave'));
    add('Room', val('projectorRoom'));
    add('Sound setup wanted', val('soundType'));
    add('Sound equipment', val('soundHave'));
    gap();

    add('Preferred date', formatDate(val('date')));
    add('Urgency', val('urgency'));
    gap();

    lines.push('Additional details:', val('details'), '', 'Please follow up with this customer regarding their quotation.');
    return lines.join('\n').replace(/\n{3,}/g, '\n\n');
  }

  /* ---------- Submit ---------- */
  function onSubmit(e) {
    e.preventDefault();
    // Enter key on an earlier step means "next", not "send".
    if (step < TOTAL) { if (validateStep(step)) goStep(step + 1); return; }

    for (var n = 1; n <= TOTAL; n++) {
      if (!validateStep(n)) {
        if (n !== step) { goStep(n); validateStep(n); }
        var summary = $('#form-summary');
        summary.textContent = n === TOTAL ? 'Please check the highlighted fields.' : '';
        summary.hidden = n !== TOTAL;
        return;
      }
    }
    $('#form-summary').hidden = true;

    var message = buildMessage();
    if (!waConfigured) {
      console.warn('[Palesa Visuals] whatsappNumber is not set in js/config.js — cannot open WhatsApp.');
      showResult('unconfigured', message);
      return;
    }
    var url = waUrl(message);
    var win = window.open(url, '_blank');
    if (win) { try { win.opener = null; } catch (err) { /* ignore */ } }
    showResult(win ? 'opened' : 'blocked', message, url);
    if (!win) window.location.href = url; // pop-up blocked: navigate in this tab instead
  }

  function showResult(kind, message, url) {
    var fallbackContact = [];
    if (CFG.phoneNumber) fallbackContact.push('call us on <a href="' + esc(telHref(CFG.phoneNumber)) + '">' + esc(CFG.phoneNumber) + '</a>');
    if (CFG.email) fallbackContact.push('email <a href="mailto:' + esc(CFG.email) + '?subject=' + encodeURIComponent('Quotation request') + '&body=' + encodeURIComponent(message) + '">' + esc(CFG.email) + '</a>');

    var html;
    if (kind === 'unconfigured') {
      result.classList.add('is-warning');
      html = '<h3>WhatsApp quotes aren’t available on this page yet</h3>' +
        '<p>Your request has <strong>not</strong> been sent. You can copy the message below' +
        (fallbackContact.length ? ' and ' + fallbackContact.join(' or ') : ' to send it to us directly') + '.</p><div class="btn-row">';
    } else {
      result.classList.remove('is-warning');
      html = '<h3>Almost done — press Send in WhatsApp</h3>' +
        '<p>WhatsApp should now be open with your quotation request written out. <strong>Your request is only sent once you press Send in WhatsApp.</strong></p>' +
        '<p>WhatsApp didn’t open? Use the button below, or copy the message and send it to <strong>' + esc(waDisplay()) + '</strong>' +
        (fallbackContact.length ? '. You can also ' + fallbackContact.join(' or ') : '') + '.</p>' +
        '<div class="btn-row"><a class="btn btn-primary" href="' + esc(url) + '" target="_blank" rel="noopener"><span>Open WhatsApp again</span></a>';
    }
    html += '<button type="button" class="btn btn-outline" data-copy><span>Copy message</span></button></div>' +
      '<details' + (kind === 'unconfigured' ? ' open' : '') + '><summary>View your message</summary><pre class="message-preview"></pre></details>';

    result.innerHTML = html;
    $('.message-preview', result).textContent = message.replace(/\*/g, '');
    $('[data-copy]', result).addEventListener('click', function () { copyText(message.replace(/\*/g, '')); });
    result.hidden = false;
    result.focus({ preventScroll: true });
    scrollToEl(result);
  }

  function copyText(text) {
    var done = function () { toast('Message copied. Paste it into WhatsApp, SMS or email.'); };
    var fail = function () { toast('Couldn’t copy automatically — select the message text and copy it.'); };
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(done, function () { legacyCopy(text) ? done() : fail(); });
    } else {
      legacyCopy(text) ? done() : fail();
    }
  }
  function legacyCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    document.body.removeChild(ta);
    return ok;
  }

  /* ---------------- Setup notice (only for things that break the site) ---------------- */
  function setupNotice() {
    var missing = [];
    if (!waConfigured) missing.push('<code>whatsappNumber</code> — WhatsApp buttons and the quote form are disabled');
    if (!CFG.phoneNumber) missing.push('<code>phoneNumber</code>');
    if (!areas().length) missing.push('<code>serviceAreas</code>');
    if (!CFG.siteUrl) console.info('[Palesa Visuals] Set siteUrl in js/config.js once the domain is live.');

    var check = function () {
      var pending = $$('.photo--pending').length;
      var items = missing.slice();
      if (pending) items.push(pending + ' photo' + (pending > 1 ? 's' : '') + ' missing in <code>assets/photos/</code> (see README)');
      if (!items.length || sessionStorageGet('pv-setup-dismissed')) return;
      document.documentElement.classList.add('show-setup');
      var bar = $('#setup-bar');
      bar.innerHTML = '<details><summary>Site setup: ' + items.length + ' item' + (items.length > 1 ? 's' : '') + ' to finish</summary>' +
        '<div class="setup-body">Update <code>js/config.js</code>:<ul><li>' + items.join('</li><li>') + '</li></ul>' +
        '<button type="button">Hide for now</button></div></details>';
      bar.hidden = false;
      $('button', bar).addEventListener('click', function () {
        bar.hidden = true; document.documentElement.classList.remove('show-setup');
        sessionStorageSet('pv-setup-dismissed', '1');
      });
    };
    if (document.readyState === 'complete') check(); else window.addEventListener('load', check);
  }
  function sessionStorageGet(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }
  function sessionStorageSet(k, v) { try { sessionStorage.setItem(k, v); } catch (e) { /* ignore */ } }

  /* ---------------- Init ---------------- */
  renderServices();
  renderShowcase();
  renderMarquee();
  renderContact();
  applySiteUrl();
  setupWhatsAppButtons();
  setupNav();
  setupForm();
  setupPrivacy();
  setupStatement();
  setupScrollMotion();
  setupReveals();
  setupNotice();
})();
