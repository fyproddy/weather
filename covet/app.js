(function () {
  var products = window.COVET_PRODUCTS || [];
  var byHandle = {};
  products.forEach(function (p) { byHandle[p.handle] = p; });

  var TITLES = { all: "All sneakers", sportswear: "Sportswear", designer: "Designer", rare: "Rare & Hype" };
  var state = { cat: "all", brand: "all", q: "", sort: "featured" };

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
    var img = new Image();
    img.alt = p.vendor + " " + p.title;
    img.loading = "lazy";
    img.decoding = "async";
    img.onerror = function () {
      img.remove();
      var f = el("div", "fallback");
      f.appendChild(el("span", null, p.vendor));
      f.appendChild(el("strong", null, p.model));
      box.appendChild(f);
    };
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

    var li = el("li"), btn = el("button");
    btn.type = "button";
    btn.appendChild(document.createTextNode(b));
    btn.appendChild(el("span", null, String(brands[b])));
    btn.addEventListener("click", function () {
      setState({ cat: "all", brand: b, q: "" });
      $("shop").scrollIntoView();
    });
    li.appendChild(btn);
    $("brandList").appendChild(li);
  });

  function filtered() {
    var q = state.q.trim().toLowerCase();
    var list = products.filter(function (p) {
      if (state.cat !== "all" && p.category !== state.cat) return false;
      if (state.brand !== "all" && p.vendor !== state.brand) return false;
      if (q && (p.vendor + " " + p.title).toLowerCase().indexOf(q) === -1) return false;
      return true;
    });
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
    if (p.category !== "sportswear") m.appendChild(el("span", "badge " + p.category, p.category === "rare" ? "Rare" : "Designer"));
    btn.appendChild(m);
    var body = el("div", "card-body");
    body.appendChild(el("p", "card-brand", p.vendor));
    body.appendChild(el("p", "card-title", p.title));
    body.appendChild(el("p", "card-price", money(p.price)));
    btn.appendChild(body);
    btn.addEventListener("click", function () { openProduct(p); });
    li.appendChild(btn);
    return li;
  }

  function render() {
    var list = filtered();
    grid.replaceChildren.apply(grid, list.map(card));
    $("empty").hidden = list.length > 0;
    $("resultCount").textContent = list.length + (list.length === 1 ? " pair" : " pairs");
    $("shopTitle").textContent = state.brand !== "all" ? state.brand : TITLES[state.cat];
    document.querySelectorAll(".tab").forEach(function (t) { t.classList.toggle("is-active", t.dataset.cat === state.cat); });
    brandSel.value = state.brand;
    $("search").value = state.q;
    $("sort").value = state.sort;
  }

  function setState(patch) {
    Object.keys(patch).forEach(function (k) { state[k] = patch[k]; });
    render();
  }

  document.querySelectorAll("[data-cat]").forEach(function (a) {
    a.addEventListener("click", function () { setState({ cat: a.dataset.cat, brand: "all" }); });
  });
  $("search").addEventListener("input", function (e) { setState({ q: e.target.value }); });
  brandSel.addEventListener("change", function (e) { setState({ brand: e.target.value }); });
  $("sort").addEventListener("change", function (e) { setState({ sort: e.target.value }); });

  // ----- Product dialog -----
  var dialog = $("product"), current = null, chosen = null;

  function openProduct(p) {
    current = p; chosen = null;
    $("pdMedia").replaceChildren(media(p, "pd-media-inner"));
    $("pdBrand").textContent = p.vendor;
    $("pdTitle").textContent = p.title;
    $("pdPrice").textContent = money(p.price);
    $("pdCat").textContent = p.categoryLabel;
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
