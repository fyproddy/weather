(function () {
  var products = window.COVET_PRODUCTS || [];
  var byHandle = {};
  products.forEach(function (p) { byHandle[p.handle] = p; });

  var TITLES = { all: "All sneakers", luxury: "Luxury", sportswear: "Sportswear", rare: "Rare & Hype" };
  var PAGE = 48;
  var state = { cat: "all", brand: "all", collection: "all", q: "", sort: "featured", limit: PAGE };

  var $ = function (id) { return document.getElementById(id); };
  var grid = $("grid"), brandSel = $("brand");

  function money(n) {
    return "R " + Math.round(n).toLocaleString("en-ZA").replace(/,/g, " ");
  }

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  // Product image with a plain typographic tile if the image can't load.
  function media(p, wrapCls) {
    var box = el("div", wrapCls);
    function fallback() {
      var f = el("div", "fallback");
      f.appendChild(el("span", null, p.vendor));
      f.appendChild(el("strong", null, p.model));
      box.appendChild(f);
    }
    if (!p.image) { fallback(); return box; }
    var img = new Image();
    img.alt = p.vendor + " " + p.title;
    img.loading = "lazy";
    img.decoding = "async";
    img.onerror = function () { img.remove(); fallback(); };
    img.src = p.image;
    box.appendChild(img);
    return box;
  }

  // ----- Catalogue -----
  var brands = {};
  products.forEach(function (p) { brands[p.vendor] = (brands[p.vendor] || 0) + 1; });
  var brandNames = Object.keys(brands).sort(function (a, b) { return a.localeCompare(b, "en", { sensitivity: "base" }); });
  brandNames.forEach(function (b) {
    var o = el("option", null, b + " (" + brands[b] + ")");
    o.value = b;
    brandSel.appendChild(o);

  });

  function filtered() {
    var q = state.q.trim().toLowerCase();
    var list = products.filter(function (p) {
      if (state.cat !== "all" && p.category !== state.cat) return false;
      if (state.brand !== "all" && p.vendor !== state.brand) return false;
      if (state.collection !== "all" && p.collection !== state.collection) return false;
      if (q && (p.vendor + " " + p.title + " " + p.collection).toLowerCase().indexOf(q) === -1) return false;
      return true;
    });
    // Featured: pairs with a photo first, catalogue order otherwise.
    if (state.sort === "featured") list = list.filter(function (p) { return p.image; }).concat(list.filter(function (p) { return !p.image; }));
    if (state.sort === "price-asc") list.sort(function (a, b) { return a.price - b.price; });
    if (state.sort === "price-desc") list.sort(function (a, b) { return b.price - a.price; });
    if (state.sort === "name") list.sort(function (a, b) { return (a.vendor + a.title).localeCompare(b.vendor + b.title); });
    return list;
  }

  function card(p) {
    var li = el("li", "card"), btn = el("button");
    btn.type = "button";
    btn.setAttribute("aria-label", p.vendor + " " + p.title + ", " + money(p.price));
    var m = media(p, "media");
    if (p.category !== "sportswear") m.appendChild(el("span", "badge " + p.category, p.category === "rare" ? "Rare" : "Luxury"));
    btn.appendChild(m);
    var body = el("div", "card-body");
    body.appendChild(el("p", "card-brand", p.vendor));
    body.appendChild(el("p", "card-title", p.title));
    body.appendChild(priceRow(p, "card-price"));
    btn.appendChild(body);
    btn.addEventListener("click", function () { openProduct(p); });
    li.appendChild(btn);
    return li;
  }

  function render() {
    var list = filtered();
    grid.replaceChildren.apply(grid, list.slice(0, state.limit).map(card));
    $("empty").hidden = list.length > 0;
    $("more").hidden = list.length <= state.limit;
    $("more").textContent = "Load more (" + (list.length - state.limit) + " left)";
    $("resultCount").textContent = list.length + (list.length === 1 ? " pair" : " pairs");
    $("shopTitle").textContent = state.collection !== "all" ? state.collection
      : state.brand !== "all" ? state.brand : TITLES[state.cat];
    document.querySelectorAll(".tab").forEach(function (t) { t.classList.toggle("is-active", t.dataset.cat === state.cat); });
    brandSel.value = state.brand;
    $("search").value = state.q;
    $("sort").value = state.sort;
  }

  function setState(patch) {
    if (!("limit" in patch)) patch.limit = PAGE;
    Object.keys(patch).forEach(function (k) { state[k] = patch[k]; });
    render();
  }

  function priceRow(p, cls) {
    var row = el("p", cls);
    row.appendChild(el("span", "now", money(p.price)));
    return row;
  }

  $("more").addEventListener("click", function () { setState({ limit: state.limit + PAGE }); });

  function byHandle_(h) { return byHandle[h]; }
  function firstWithPhoto(test) { return products.find(function (p) { return p.image && test(p); }); }
  function photo(p, cls) {
    var img = new Image();
    img.className = cls || "";
    img.alt = p ? p.vendor + " " + p.title : "";
    img.src = p ? p.image : "";
    return img;
  }

  // ----- Hero: a few standout pairs, one at a time -----
  // [handle, short headline]
  var HERO = [["jordan-air-jordan-1-x-dior-high-grey", "Air Jordan 1 High Dior"],
              ["louis-vuitton-lv-trainer-takashi-murakami-white", "LV Trainer Murakami"],
              ["nike-air-force-1-low-x-louis-vuitton-virgil-abloh-white-green", "Louis Vuitton Air Force 1"]]
    .map(function (h) { var p = byHandle_(h[0]); return p && { p: p, title: h[1] }; }).filter(Boolean);
  var slides = $("heroSlides"), dots = $("heroDots"), heroAt = 0, heroTimer = null;
  HERO.forEach(function (h, i) {
    var p = h.p, s = el("div", "hero-slide");
    var txt = el("div", "hero-text wrap");
    txt.appendChild(el("p", "hero-brand", p.vendor));
    txt.appendChild(el("h1", "hero-title", h.title));
    var go = el("button", "btn", "Shop now");
    go.type = "button";
    go.addEventListener("click", function () { openProduct(p); });
    txt.appendChild(go);
    s.appendChild(photo(p, "hero-img"));
    s.appendChild(txt);
    slides.appendChild(s);
    var d = el("button", "hero-dot");
    d.type = "button";
    d.setAttribute("aria-label", "Show " + p.vendor + " " + p.title);
    d.addEventListener("click", function () { showHero(i); restartHero(); });
    dots.appendChild(d);
  });
  function showHero(i) {
    heroAt = i;
    slides.querySelectorAll(".hero-slide").forEach(function (s, j) { s.classList.toggle("is-on", j === i); });
    dots.querySelectorAll(".hero-dot").forEach(function (d, j) { d.classList.toggle("is-on", j === i); });
  }
  function restartHero() {
    clearInterval(heroTimer);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    heroTimer = setInterval(function () { showHero((heroAt + 1) % HERO.length); }, 6000);
  }
  if (HERO.length) { showHero(0); restartHero(); }

  // ----- Category tiles -----
  document.querySelectorAll(".tile").forEach(function (t) {
    var key = t.dataset.tile;
    var p = key === "sportswear" ? firstWithPhoto(function (x) { return x.category === "sportswear" && x.vendor === "Jordan"; }) : byHandle_(key);
    if (p) t.insertBefore(photo(p, "tile-img"), t.firstChild);
  });

  // ----- Collections rail: photo cards -----
  var RAIL = ["LV Trainer", "Dior x Air Jordan 1", "Triple S", "Ace", "Louis Vuitton x Air Force 1", "B30",
              "Travis Scott x Jordan", "Geobasket", "Off-White x Nike", "Oversized Sneaker", "Yeezy", "LV Skate",
              "Gucci x adidas", "Out Of Office", "Air Jordan Retro", "Track.2", "adidas Originals", "Skel-Top Low",
              "New Balance Lifestyle", "Wales Bonner x adidas"];
  var rail = $("rail");
  RAIL.forEach(function (name) {
    var p = firstWithPhoto(function (x) { return x.collection === name; });
    if (!p) return;
    var li = el("li", "rail-item"), b = el("button", "rail-card");
    b.type = "button";
    var box = el("div", "rail-media");
    box.appendChild(photo(p));
    b.appendChild(box);
    b.appendChild(el("span", "rail-brand", p.vendor));
    b.appendChild(el("span", "rail-name", name));
    b.addEventListener("click", function () {
      setState({ cat: "all", brand: "all", collection: name, q: "" });
      $("shop").scrollIntoView();
    });
    li.appendChild(b);
    rail.appendChild(li);
  });
  function railStep(dir) { rail.scrollBy({ left: dir * rail.clientWidth * 0.8, behavior: "smooth" }); }
  $("railPrev").addEventListener("click", function () { railStep(-1); });
  $("railNext").addEventListener("click", function () { railStep(1); });

  document.querySelectorAll("[data-cat]").forEach(function (a) {
    a.addEventListener("click", function () { setState({ cat: a.dataset.cat, brand: "all", collection: "all" }); });
  });
  $("search").addEventListener("input", function (e) { setState({ q: e.target.value }); });
  brandSel.addEventListener("change", function (e) { setState({ brand: e.target.value, collection: "all" }); });
  $("sort").addEventListener("change", function (e) { setState({ sort: e.target.value }); });

  // ----- Product dialog -----
  var dialog = $("product"), current = null, chosen = null;

  // Main photo plus a row of extra angles (StockX 360 views) when available.
  function showGallery(p) {
    var main = $("pdMedia"), thumbs = $("pdThumbs");
    thumbs.replaceChildren();
    if (!p.images || p.images.length < 2) {
      main.replaceChildren(media(p, "pd-media-inner"));
      return;
    }
    var big = new Image();
    big.alt = p.vendor + " " + p.title;
    main.replaceChildren(big);
    p.images.forEach(function (src, i) {
      var b = el("button", "thumb-btn");
      b.type = "button";
      b.setAttribute("aria-label", "View " + (i + 1));
      var t = new Image();
      t.alt = "";
      t.loading = "lazy";
      t.src = src;
      t.onerror = function () { b.remove(); };
      b.appendChild(t);
      b.addEventListener("click", function () { select(i); });
      thumbs.appendChild(b);
    });
    function select(i) {
      big.src = p.images[i];
      thumbs.querySelectorAll(".thumb-btn").forEach(function (x, j) { x.classList.toggle("is-active", j === i); });
    }
    select(0);
  }

  function openProduct(p) {
    current = p; chosen = null;
    showGallery(p);
    $("pdBrand").textContent = p.vendor;
    $("pdTitle").textContent = p.title;
    $("pdPrice").replaceChildren(priceRow(p, "pd-price-row"));
    $("pdCat").textContent = p.categoryLabel + " / " + p.collection;
    var sizes = $("pdSizes");
    sizes.replaceChildren();
    p.sizes.forEach(function (s) {
      var b = el("button", "size", s.replace("UK ", ""));
      b.type = "button";
      b.setAttribute("aria-label", s);
      b.addEventListener("click", function () {
        chosen = s;
        sizes.querySelectorAll(".size").forEach(function (x) { x.classList.toggle("is-active", x === b); });
        $("pdAdd").disabled = false;
        $("pdAdd").textContent = "Add to bag / " + s;
      });
      sizes.appendChild(b);
    });
    $("pdAdd").disabled = true;
    $("pdAdd").textContent = "Select a size";
    dialog.showModal();
  }

  $("pdAdd").addEventListener("click", function () {
    if (!current || !chosen) return;
    CovetStore.add(current.handle, chosen);
    dialog.close();
    openBag();
  });
  dialog.querySelector("[data-close]").addEventListener("click", function () { dialog.close(); });
  dialog.addEventListener("click", function (e) { if (e.target === dialog) dialog.close(); });

  // ----- Bag -----
  var bag = $("bag"), scrim = $("scrim");
  function openBag() { bag.classList.add("is-open"); bag.setAttribute("aria-hidden", "false"); scrim.hidden = false; }
  function closeBag() { bag.classList.remove("is-open"); bag.setAttribute("aria-hidden", "true"); scrim.hidden = true; }
  $("bagOpen").addEventListener("click", openBag);
  $("bagClose").addEventListener("click", closeBag);
  scrim.addEventListener("click", closeBag);
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeBag(); });

  CovetStore.onChange(function (lines) {
    lines = lines.filter(function (l) { return byHandle[l.handle]; });
    var count = 0, total = 0;
    var items = lines.map(function (l) {
      var p = byHandle[l.handle];
      count += l.qty; total += l.qty * p.price;
      var li = el("li", "bag-item");
      li.appendChild(media(p, "thumb"));
      var info = el("div");
      info.appendChild(el("p", "name", p.model.indexOf(p.vendor) > -1 ? p.model : p.vendor + " " + p.model));
      info.appendChild(el("p", "muted", p.colourway + " / " + l.size));
      var qty = el("div", "qty");
      var minus = el("button", null, "-"), plus = el("button", null, "+");
      minus.type = plus.type = "button";
      minus.setAttribute("aria-label", "Decrease quantity");
      plus.setAttribute("aria-label", "Increase quantity");
      minus.addEventListener("click", function () { CovetStore.setQty(l.handle, l.size, l.qty - 1); });
      plus.addEventListener("click", function () { CovetStore.setQty(l.handle, l.size, l.qty + 1); });
      qty.appendChild(minus); qty.appendChild(el("span", null, String(l.qty))); qty.appendChild(plus);
      info.appendChild(qty);
      li.appendChild(info);
      var right = el("div");
      right.appendChild(el("p", "name", money(p.price * l.qty)));
      var rm = el("button", "remove", "Remove");
      rm.type = "button";
      rm.addEventListener("click", function () { CovetStore.setQty(l.handle, l.size, 0); });
      right.appendChild(rm);
      li.appendChild(right);
      return li;
    });
    $("bagItems").replaceChildren.apply($("bagItems"), items);
    $("bagEmpty").hidden = items.length > 0;
    $("bagCount").textContent = count;
    $("bagTotal").textContent = money(total);
    $("checkout").disabled = items.length === 0;
  });

  $("checkout").addEventListener("click", function () {
    var note = $("checkoutNote");
    if (!CovetStore.connected()) {
      note.textContent = "Online checkout opens soon. Your bag is saved on this device.";
      return;
    }
    $("checkout").disabled = true;
    note.textContent = "Taking you to checkout...";
    CovetStore.checkout().catch(function (err) {
      $("checkout").disabled = false;
      note.textContent = "Checkout failed: " + err.message;
    });
  });

  $("year").textContent = new Date().getFullYear();
  render();
})();
