/* PALESA VISUALS — site behaviour (no dependencies) */
(function () {
  'use strict';

  var CFG = window.PALESA_CONFIG || {};
  var services = (CFG.services || []).filter(function (s) { return s && s.id && s.name; });
  var OTHER = { id: 'other', name: 'Other / Not sure', formLabel: 'Other / Not Sure', questions: null };

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  function esc(str) {
    return String(str).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  var ARROW = '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';

  /* ---------------- WhatsApp number ---------------- */
  var waNumber = String(CFG.whatsappNumber || '').replace(/\D/g, '');
  // wa.me needs full international format: country code + number, no leading 0.
  var waConfigured = /^[1-9]\d{7,14}$/.test(waNumber);

  function waUrl(text) {
    return 'https://wa.me/' + waNumber + (text ? '?text=' + encodeURIComponent(text) : '');
  }

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
    var featured = services.filter(function (s) { return s.featured && s.photo; }).slice(0, 4);
    var rest = services.filter(function (s) { return featured.indexOf(s) === -1; });
    var n = 0;

    featuredEl.innerHTML = featured.map(function (s) {
      n++;
      return '<article class="feature">' +
        '<figure class="photo"><img src="' + esc(s.photo.src) + '"' +
        (s.photo.srcset ? ' srcset="' + esc(s.photo.srcset) + '" sizes="(max-width: 860px) 100vw, 640px"' : '') +
        (s.photo.position ? ' style="object-position:' + esc(s.photo.position) + '"' : '') +
        ' alt="' + esc(s.photo.alt || '') + '" loading="lazy" width="' + (s.photo.width || 1200) + '" height="' + (s.photo.height || 800) + '">' +
        '<span class="photo-note">Service photo for “' + esc(s.name) + '” — add ' + esc(s.photo.src) + '</span></figure>' +
        '<div class="feature-meta"><span class="feature-num">' + pad(n) + '</span><h3>' + esc(s.name) + '</h3></div>' +
        '<p>' + esc(s.description || '') + '</p>' +
        '<a class="arrow-link" href="#quote" data-service="' + esc(s.id) + '">Request a Quote<span class="sr-only"> for ' + esc(s.name) + '</span>' + ARROW + '</a>' +
        '</article>';
    }).join('');
    if (!featured.length) featuredEl.hidden = true;
    featuredEl.setAttribute('data-count', featured.length);

    listEl.innerHTML = rest.map(function (s) {
      n++;
      return '<li class="service-item"><span class="service-num" aria-hidden="true">' + pad(n) + '</span><div>' +
        '<h3>' + esc(s.name) + '</h3><p>' + esc(s.description || '') + '</p>' +
        '<a class="arrow-link" href="#quote" data-service="' + esc(s.id) + '">Request a Quote<span class="sr-only"> for ' + esc(s.name) + '</span>' + ARROW + '</a>' +
        '</div></li>';
    }).join('');
    if (!rest.length) $('.service-index').hidden = true;

    // Images injected after the head error listener still need a failure hook.
    $$('.featured-services img').forEach(watchImage);
  }
  function pad(i) { return i < 10 ? '0' + i : String(i); }

  function watchImage(img) {
    var mark = function () { img.closest('.photo').classList.add('photo--pending'); };
    img.addEventListener('error', mark);
    if (img.complete && img.naturalWidth === 0 && img.getAttribute('src')) mark();
  }

  /* ---------------- Contact details, areas, meta ---------------- */
  function renderContact() {
    var items = [];
    if (waConfigured) items.push({ k: 'WhatsApp', v: waDisplay(), href: waUrl(CFG.whatsappGreeting) , ext: true });
    if (CFG.phoneNumber) items.push({ k: 'Phone', v: CFG.phoneNumber, href: telHref(CFG.phoneNumber) });
    if (CFG.email) items.push({ k: 'Email', v: CFG.email, href: 'mailto:' + CFG.email });
    if (CFG.businessHours) items.push({ k: 'Hours', v: CFG.businessHours });
    if (CFG.serviceAreaSummary) items.push({ k: 'Service areas', v: CFG.serviceAreaSummary });

    var html = items.map(function (it) {
      var v = it.href
        ? '<a class="v" href="' + esc(it.href) + '"' + (it.ext ? ' target="_blank" rel="noopener"' : '') + '>' + esc(it.v) + '</a>'
        : '<span class="v">' + esc(it.v) + '</span>';
      return '<li><span class="k">' + esc(it.k) + '</span>' + v + '</li>';
    }).join('');
    if (!items.length) html = '<li><span class="k">The quickest way to reach us</span><a class="v" href="#quote">Request a quote</a></li>';
    $('[data-contact-list]').innerHTML = html;

    if (CFG.serviceAreaSummary) {
      var line = $('[data-areas-line]');
      line.innerHTML = 'Serving <strong>' + esc(CFG.serviceAreaSummary) + '</strong>';
      line.hidden = false;
      var regions = areas().map(function (g) { return g.region; });
      $('[data-areas-faq]').textContent = 'We work across ' + CFG.serviceAreaSummary +
        (regions.length ? ', including ' + listJoin(regions) : '') +
        '. Choose your area in the quotation form. If yours isn’t listed, select “Other area” and type it in, and we’ll let you know whether we can assist.';
    }
    $('[data-year]').textContent = new Date().getFullYear();
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
    var add = function (prop, content) {
      var m = document.createElement('meta'); m.setAttribute('property', prop); m.content = content; document.head.appendChild(m);
    };
    add('og:url', url);
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

  /* ---------------- Navigation ---------------- */
  function setupNav() {
    var toggle = $('.menu-toggle');
    var nav = $('#primary-nav');
    var label = $('.menu-toggle-label');

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

    // Highlight the section currently in view.
    if (!('IntersectionObserver' in window)) return;
    var links = $$('.primary-nav ul a');
    var map = {};
    links.forEach(function (l) { map[l.getAttribute('href').slice(1)] = l; });
    var sectionFor = { quote: 'contact', faq: 'contact' };
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var id = sectionFor[en.target.id] || en.target.id;
        links.forEach(function (l) { l.removeAttribute('aria-current'); });
        if (map[id]) map[id].setAttribute('aria-current', 'true');
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    ['home', 'services', 'about', 'how-it-works', 'quote', 'faq', 'contact'].forEach(function (id) {
      var el = document.getElementById(id); if (el) io.observe(el);
    });
  }

  /* ---------------- Privacy dialog ---------------- */
  function setupPrivacy() {
    var dlg = $('#privacy-dialog');
    $$('[data-open-privacy]').forEach(function (b) {
      b.addEventListener('click', function () {
        if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
      });
    });
    dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
  }

  /* =================================================================
     QUOTE FORM
     ================================================================= */
  var form, serviceSelect, result;
  var allServices = function () { return services.concat([OTHER]); };

  function findService(id) {
    return allServices().filter(function (s) { return s.id === id; })[0];
  }

  function setupForm() {
    form = $('#quote-form');
    serviceSelect = $('#f-service');
    result = $('#form-result');

    allServices().forEach(function (s) {
      var o = document.createElement('option');
      o.value = s.id; o.textContent = s.formLabel || s.name;
      serviceSelect.appendChild(o);
    });

    // Small privacy note visible on mobile, where the side column text is hidden.
    var pm = document.createElement('p');
    pm.className = 'privacy-mobile';
    pm.innerHTML = 'Your details are only used to respond to your quotation request. <button type="button" class="link-btn" data-open-privacy>Privacy notice</button>';
    $('.form-submit').appendChild(pm);

    // Dates: can't pick a day in the past.
    var d = new Date();
    $('#f-date').min = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());

    setupAreas();
    serviceSelect.addEventListener('change', updateConditional);
    updateConditional();

    // "Request a quote" links anywhere on the page preselect the service.
    document.addEventListener('click', function (e) {
      var link = e.target.closest('[data-service]');
      if (!link) return;
      var id = link.getAttribute('data-service');
      if (!findService(id)) return;
      e.preventDefault();
      serviceSelect.value = id;
      updateConditional();
      clearError(serviceSelect);
      var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      form.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
      history.replaceState(null, '', '#quote');
      setTimeout(function () { $('#f-name').focus({ preventScroll: true }); }, reduce ? 0 : 450);
    });

    // Live re-validation once a field has been flagged.
    form.addEventListener('input', function (e) { if (e.target.getAttribute('aria-invalid') === 'true') validateField(e.target); });
    form.addEventListener('change', function (e) { if (e.target.getAttribute('aria-invalid') === 'true') validateField(e.target); });
    form.addEventListener('focusout', function (e) {
      var t = e.target;
      if (t.required && t.value.trim() !== '' && t.dataset.touched !== '1') { t.dataset.touched = '1'; }
      if (t.required && t.dataset.touched === '1') validateField(t);
    });

    form.addEventListener('submit', onSubmit);
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
      if (!isOther) clearError(suburb);
      if (isOther) suburb.focus();
    });
  }

  function updateConditional() {
    var s = findService(serviceSelect.value);
    var group = s ? s.questions : null;
    $$('fieldset.conditional', form).forEach(function (fs) {
      var show = fs.getAttribute('data-group') === group;
      fs.hidden = !show;
      fs.disabled = !show; // disabled fieldsets are excluded from the message
    });
  }

  /* ---------- Validation ---------- */
  var rules = {
    name: function (v) {
      if (!v) return 'Please enter your name.';
      if (v.length < 2) return 'Please enter your full name.';
    },
    phone: function (v) {
      if (!v) return 'Please enter a WhatsApp or contact number so we can reply.';
      if (!validPhone(v)) return 'That number doesn’t look right. Use a format like 082 123 4567 or +27 82 123 4567.';
    },
    area: function (v) { if (!v) return 'Please choose your area, or “Other area”.'; },
    suburb: function (v) { if (!v) return 'Please type your suburb or town.'; },
    service: function (v) { if (!v) return 'Please choose a service, or “Other / Not sure”.'; },
    property: function (v) { if (!v) return 'Please choose the type of property.'; },
    status: function (v) { if (!v) return 'Please choose the option closest to your current setup.'; },
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

  function validateField(el) {
    var rule = rules[el.name];
    if (!rule) return true;
    var msg = rule(el.value.trim());
    var err = document.getElementById(el.id + '-error');
    if (msg) {
      el.setAttribute('aria-invalid', 'true');
      if (err) {
        err.textContent = msg; err.hidden = false;
        var desc = (el.getAttribute('aria-describedby') || '').split(' ').filter(Boolean);
        if (desc.indexOf(err.id) === -1) { desc.push(err.id); el.setAttribute('aria-describedby', desc.join(' ')); }
      }
      return false;
    }
    clearError(el);
    return true;
  }

  function clearError(el) {
    el.removeAttribute('aria-invalid');
    var err = document.getElementById(el.id + '-error');
    if (err) { err.hidden = true; err.textContent = ''; }
  }

  function validateAll() {
    var invalid = $$('[required]', form).filter(function (el) { el.dataset.touched = '1'; return !validateField(el); });
    var summary = $('#form-summary');
    if (invalid.length) {
      summary.textContent = invalid.length === 1
        ? 'Please check the highlighted field above.'
        : 'Please check the ' + invalid.length + ' highlighted fields above.';
      summary.hidden = false;
      invalid[0].focus();
      return false;
    }
    summary.hidden = true;
    return true;
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
    if (!validateAll()) return;

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
        (fallbackContact.length ? ' and ' + fallbackContact.join(' or ') : ' to send it to us directly') + '.</p>';
    } else {
      result.classList.remove('is-warning');
      html = '<h3>Almost done — press Send in WhatsApp</h3>' +
        '<p>WhatsApp should now be open with your quotation request written out. <strong>Your request is only sent once you press Send in WhatsApp.</strong></p>' +
        '<p>WhatsApp didn’t open? Use the button below, or copy the message and send it to <strong>' + esc(waDisplay()) + '</strong>' +
        (fallbackContact.length ? '. You can also ' + fallbackContact.join(' or ') : '') + '.</p>' +
        '<div class="btn-row"><a class="btn btn-primary" href="' + esc(url) + '" target="_blank" rel="noopener">Open WhatsApp again</a>';
    }
    html += (kind === 'unconfigured' ? '<div class="btn-row">' : '') +
      '<button type="button" class="btn btn-outline" data-copy>Copy message</button></div>' +
      '<details' + (kind === 'unconfigured' ? ' open' : '') + '><summary>View your message</summary><pre class="message-preview"></pre></details>';

    result.innerHTML = html;
    $('.message-preview', result).textContent = message.replace(/\*/g, '');
    $('[data-copy]', result).addEventListener('click', function () { copyText(message.replace(/\*/g, '')); });
    result.hidden = false;
    result.focus({ preventScroll: true });
    result.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  }

  function copyText(text) {
    var done = function () { toast('Message copied. Paste it into WhatsApp, SMS or email.'); };
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(done, function () { legacyCopy(text) ? done() : toast('Couldn’t copy automatically — select the message text and copy it.'); });
    } else {
      legacyCopy(text) ? done() : toast('Couldn’t copy automatically — select the message text and copy it.');
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

  /* ---------------- Setup notice (until config is complete) ---------------- */
  function setupNotice() {
    var missing = [];
    if (!waConfigured) missing.push('<code>whatsappNumber</code> — WhatsApp buttons and the quote form are disabled');
    if (!CFG.phoneNumber) missing.push('<code>phoneNumber</code>');
    if (!CFG.email) missing.push('<code>email</code> (optional)');
    if (!areas().length) missing.push('<code>serviceAreas</code>');
    if (!CFG.serviceAreaSummary) missing.push('<code>serviceAreaSummary</code>');
    if (!CFG.businessHours) missing.push('<code>businessHours</code> (optional)');
    if (!CFG.siteUrl) missing.push('<code>siteUrl</code> (for SEO, once the domain is known)');
    if (!CFG.servicesConfirmed) missing.push('confirm the service list, then set <code>servicesConfirmed: true</code>');

    var check = function () {
      var pending = $$('.photo--pending').length;
      var items = missing.slice();
      if (pending) items.push(pending + ' photo' + (pending > 1 ? 's' : '') + ' missing in <code>assets/photos/</code> (see README)');
      if (!items.length) return;
      if (sessionStorageGet('pv-setup-dismissed')) return;
      document.documentElement.classList.add('show-setup');
      var bar = $('#setup-bar');
      var open = '';
      bar.innerHTML = '<details' + open + '><summary>Site setup: ' + items.length + ' item' + (items.length > 1 ? 's' : '') + ' to finish</summary>' +
        '<div class="setup-body">Shown until configured. Update <code>js/config.js</code>:<ul><li>' + items.join('</li><li>') + '</li></ul>' +
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
  renderContact();
  applySiteUrl();
  setupWhatsAppButtons();
  setupNav();
  setupForm();
  setupPrivacy();
  setupNotice();
})();
