// Store layer: the bag lives in the browser for now. When the Shopify store is
// set up, fill in SHOPIFY below and checkout will create a real Shopify cart
// and redirect to Shopify's hosted checkout. Nothing else needs to change.
(function () {
  var SHOPIFY = {
    domain: "",          // e.g. "covet-sa.myshopify.com"
    storefrontToken: "", // Storefront API public access token
    apiVersion: "2025-10"
  };

  var KEY = "covet-bag-v1";

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; }
  }
  function save(lines) {
    try { localStorage.setItem(KEY, JSON.stringify(lines)); } catch (e) { /* private mode */ }
  }

  var lines = load();
  var listeners = [];
  function emit() { save(lines); listeners.forEach(function (fn) { fn(lines); }); }

  function connected() { return Boolean(SHOPIFY.domain && SHOPIFY.storefrontToken); }

  function storefront(query, variables) {
    return fetch("https://" + SHOPIFY.domain + "/api/" + SHOPIFY.apiVersion + "/graphql.json", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Storefront-Access-Token": SHOPIFY.storefrontToken
      },
      body: JSON.stringify({ query: query, variables: variables })
    }).then(function (r) { return r.json(); }).then(function (res) {
      if (res.errors) throw new Error(res.errors[0].message);
      return res.data;
    });
  }

  // Product handles and "Size" option values match data/shopify-products.csv,
  // so each bag line maps straight onto a Shopify variant.
  function variantId(handle, size) {
    return storefront(
      "query($h:String!){product(handle:$h){variants(first:50){nodes{id selectedOptions{name value}}}}}",
      { h: handle }
    ).then(function (d) {
      if (!d.product) throw new Error("Not in Shopify yet: " + handle);
      var v = d.product.variants.nodes.find(function (n) {
        return n.selectedOptions.some(function (o) { return o.name === "Size" && o.value === size; });
      });
      if (!v) throw new Error("Size " + size + " not found for " + handle);
      return v.id;
    });
  }

  window.CovetStore = {
    connected: connected,
    lines: function () { return lines.slice(); },
    onChange: function (fn) { listeners.push(fn); fn(lines); },
    add: function (handle, size) {
      var line = lines.find(function (l) { return l.handle === handle && l.size === size; });
      if (line) line.qty += 1; else lines.push({ handle: handle, size: size, qty: 1 });
      emit();
    },
    setQty: function (handle, size, qty) {
      lines = lines
        .map(function (l) { return l.handle === handle && l.size === size ? { handle: handle, size: size, qty: qty } : l; })
        .filter(function (l) { return l.qty > 0; });
      emit();
    },
    checkout: function () {
      if (!connected()) return Promise.reject(new Error("not-connected"));
      return Promise.all(lines.map(function (l) {
        return variantId(l.handle, l.size).then(function (id) { return { merchandiseId: id, quantity: l.qty }; });
      })).then(function (cartLines) {
        return storefront(
          "mutation($lines:[CartLineInput!]!){cartCreate(input:{lines:$lines}){cart{checkoutUrl} userErrors{message}}}",
          { lines: cartLines }
        );
      }).then(function (d) {
        var errs = d.cartCreate.userErrors;
        if (errs.length) throw new Error(errs[0].message);
        window.location.href = d.cartCreate.cart.checkoutUrl;
      });
    }
  };
})();
