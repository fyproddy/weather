(function () {
  var products = window.COVET_PRODUCTS || [];
  var byHandle = {};
  products.forEach(function (p) { byHandle[p.handle] = p; });

  var TITLES = { all: "Shop all", sneakers: "Sneakers", clothing: "Clothing", luxury: "Luxury sneakers",
                 sportswear: "Sportswear", rare: "Rare & Hype", hoodies: "Hoodies & Knits", tops: "Tops", bottoms: "Bottoms" };
  function dept(p) { return p.department || "sneakers"; }
  function inCat(p, cat) {
    if (cat === "all") return true;
    if (cat === "sneakers" || cat === "clothing") return dept(p) === cat;
    if (cat === "rare") return p.category === "rare" || p.badge === "Rare";
    return p.category === cat;
  }
  var PAGE = 24;
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
      if (!inCat(p, state.cat)) return false;
      if (state.brand !== "all" && p.vendor !== state.brand) return false;
      if (state.collection !== "all" && p.collection !== state.collection) return false;
      if (q && (p.vendor + " " + p.title + " " + p.collection).toLowerCase().indexOf(q) === -1) return false;
      return true;
    });
    // Featured: take one piece from each brand in turn, so the first page shows range, not one model.
    if (state.sort === "featured") {
      var groups = {}, order = [];
      list.forEach(function (p) {
        if (!groups[p.vendor]) { groups[p.vendor] = []; order.push(p.vendor); }
        groups[p.vendor].push(p);
      });
      var mixed = [];
      for (var round = 0; mixed.length < list.length; round++) {
        order.forEach(function (c) { if (groups[c][round]) mixed.push(groups[c][round]); });
      }
      list = mixed.filter(function (p) { return p.image; }).concat(mixed.filter(function (p) { return !p.image; }));
    }
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
    // Only rare pieces get a label; nearly everything else is designer, so a badge there is noise.
    if (p.badge === "Rare" || (p.badge === undefined && p.category === "rare")) m.appendChild(el("span", "badge", "Rare"));
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
    var shoes = list.every(function (p) { return dept(p) === "sneakers"; });
    $("resultCount").textContent = list.length + " " + (shoes ? (list.length === 1 ? "pair" : "pairs") : (list.length === 1 ? "item" : "items"));
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

  // ----- Hero: a few standout pieces, one at a time -----
  // [handle, short headline, label above it]
  var HERO = [["jordan-air-jordan-1-x-dior-high-grey", "Air Jordan 1 High Dior", "Dior x Jordan"],
              ["louis-vuitton-lv-trainer-takashi-murakami-white", "LV Trainer Murakami", "Louis Vuitton"],
              ["chrome-hearts-american-flag-fleece-hoodie-black", "American Flag Hoodie", "Chrome Hearts"],
              ["nike-air-force-1-low-x-louis-vuitton-virgil-abloh-white-green", "Air Force 1 by Virgil Abloh", "Louis Vuitton x Nike"]]
    .map(function (h) { var p = byHandle_(h[0]); return p && { p: p, title: h[1], label: h[2] }; }).filter(Boolean);
  var slides = $("heroSlides"), dots = $("heroDots"), heroAt = 0, heroTimer = null;
  HERO.forEach(function (h, i) {
    var p = h.p, s = el("div", "hero-slide");
    var txt = el("div", "hero-text wrap");
    txt.appendChild(el("p", "eyebrow", h.label));
    txt.appendChild(el("h1", "hero-title", h.title));
    txt.appendChild(el("p", "hero-price", money(p.price)));
    var actions = el("div", "hero-actions");
    var go = el("button", "btn", "Shop now");
    go.type = "button";
    go.addEventListener("click", function () { openProduct(p); });
    var more = el("a", "text-link", "View collection");
    more.href = "#shop";
    more.addEventListener("click", function () { setState({ cat: "all", brand: "all", collection: p.collection, q: "" }); });
    actions.appendChild(go);
    actions.appendChild(more);
    txt.appendChild(actions);
    s.appendChild(photo(p, "hero-img"));
    s.appendChild(txt);
    slides.appendChild(s);
    var d = el("button", "hero-dot", String(i + 1).padStart(2, "0"));
    d.type = "button";
    d.setAttribute("aria-label", "Show " + h.title);
    d.addEventListener("click", function () { showHero(i); restartHero(); });
    dots.appendChild(d);
  });
  function showHero(i) {
    heroAt = i;
    slides.querySelectorAll(".hero-slide").forEach(function (s, j) {
      s.classList.toggle("is-on", j === i);
      s.setAttribute("aria-hidden", j === i ? "false" : "true");
      s.querySelectorAll("button, a").forEach(function (x) { x.tabIndex = j === i ? 0 : -1; });
    });
    dots.querySelectorAll(".hero-dot").forEach(function (d, j) { d.classList.toggle("is-on", j === i); });
  }
  function restartHero() {
    clearInterval(heroTimer);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    heroTimer = setInterval(function () { showHero((heroAt + 1) % HERO.length); }, 6500);
  }
  if (HERO.length) { showHero(0); restartHero(); }

  // ----- Category tiles -----
  document.querySelectorAll(".tile").forEach(function (t) {
    var key = t.dataset.tile;
    var p = key === "sportswear" ? firstWithPhoto(function (x) { return x.category === "sportswear" && x.vendor === "Jordan"; })
      : key === "clothing" ? firstWithPhoto(function (x) { return dept(x) === "clothing" && x.category === "hoodies"; })
      : byHandle_(key);
    if (p) t.insertBefore(photo(p, "tile-img"), t.firstChild);
  });

  function showCollection(name) {
    setState({ cat: "all", brand: "all", collection: name, q: "" });
    $("shop").scrollIntoView();
  }
  function railCard(name, p, label) {
    var li = el("li", "rail-item"), b = el("button", "rail-card");
    b.type = "button";
    var box = el("div", "rail-media");
    box.appendChild(photo(p));
    b.appendChild(box);
    b.appendChild(el("span", "rail-brand", label));
    b.appendChild(el("span", "rail-name", name));
    b.addEventListener("click", function () { showCollection(name); });
    li.appendChild(b);
    return li;
  }
  function countIn(name) { return products.filter(function (x) { return x.collection === name; }).length; }

  // ----- Sneaker collections -----
  var RAIL = ["LV Trainer", "Dior x Air Jordan 1", "Triple S", "Ace", "Louis Vuitton x Air Force 1", "B30",
              "Travis Scott x Jordan", "Geobasket", "Off-White x Nike", "Oversized Sneaker", "Yeezy", "LV Skate",
              "Gucci x adidas", "Out Of Office", "Air Jordan Retro", "Track.2", "adidas Originals", "Skel-Top Low",
              "New Balance Lifestyle", "Wales Bonner x adidas"];
  var rail = $("rail");
  RAIL.forEach(function (name) {
    var p = firstWithPhoto(function (x) { return x.collection === name; });
    if (p) rail.appendChild(railCard(name, p, p.vendor));
  });

  // ----- Clothing collections, in the order the catalogue lists them -----
  var rail2 = $("rail2"), clothColls = [];
  products.forEach(function (p) {
    if (dept(p) !== "clothing" || !p.image || clothColls.indexOf(p.collection) > -1) return;
    clothColls.push(p.collection);
    rail2.appendChild(railCard(p.collection, p, countIn(p.collection) + " pieces"));
  });

  // ----- Trending: one standout piece from each big collection, sneakers and clothing in turn -----
  var trend = $("trend"), shoes = [], clothes = [];
  RAIL.forEach(function (name) {
    var list = products.filter(function (x) { return x.collection === name && x.image; });
    if (list.length) shoes.push(list[Math.min(1, list.length - 1)]);
  });
  clothColls.forEach(function (name) {
    var list = products.filter(function (x) { return x.collection === name && x.image; });
    if (list.length) clothes.push(list[Math.min(1, list.length - 1)]);
  });
  for (var t = 0; t < 8; t++) {
    [shoes[t], clothes[t]].forEach(function (p) {
      if (!p) return;
      var li = card(p);
      li.className = "rail-item card";
      trend.appendChild(li);
    });
  }

  // ----- Clothing feature: four pieces from the brand-led collections -----
  var fg = $("featureGrid");
  clothColls.slice(0, 4).forEach(function (name) {
    var p = firstWithPhoto(function (x) { return x.collection === name; });
    var b = el("button", "feature-cell");
    b.type = "button";
    b.setAttribute("aria-label", name);
    b.appendChild(photo(p));
    b.appendChild(el("span", "feature-label", name));
    b.addEventListener("click", function () { showCollection(name); });
    fg.appendChild(b);
  });

  // ----- Shop by brand: the biggest names, as plain type -----
  var bg = $("brandGrid");
  Object.keys(brands).sort(function (a, b) { return brands[b] - brands[a]; }).slice(0, 20)
    .sort(function (a, b) { return a.localeCompare(b, "en", { sensitivity: "base" }); })
    .forEach(function (name) {
      var li = el("li"), b = el("button", "brand-cell");
      b.type = "button";
      b.appendChild(el("span", "brand-name", name));
      b.appendChild(el("span", "brand-count", String(brands[name])));
      b.addEventListener("click", function () {
        setState({ cat: "all", brand: name, collection: "all", q: "" });
        $("shop").scrollIntoView();
      });
      li.appendChild(b);
      bg.appendChild(li);
    });

  document.querySelectorAll(".rail-btn").forEach(function (b) {
    b.addEventListener("click", function () {
      var r = $(b.dataset.rail);
      r.scrollBy({ left: Number(b.dataset.dir) * r.clientWidth * 0.8, behavior: "smooth" });
    });
  });
  $("searchLink").addEventListener("click", function (e) {
    e.preventDefault();
    $("shop").scrollIntoView();
    setTimeout(function () { $("search").focus({ preventScroll: true }); }, 400);
  });

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
    $("pdSizeNote").textContent = (dept(p) === "clothing" ? "Sizes as the brand labels them." : "Sizes shown in UK.") + " Stock is confirmed at checkout.";
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
