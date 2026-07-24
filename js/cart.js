/* ============================================================
   فیضان دواخانہ — Cart logic (shared across all pages)
   Cart is stored in localStorage under the key "faizan_cart" so
   it persists between the Home / Products / Cart pages.
   ============================================================ */

const CART_KEY = "faizan_cart";
const WHATSAPP_NUMBER = "923000505070"; // same number used across the site — replace with your real WhatsApp number
const DELIVERY_CHARGES = 200;   // flat delivery charge added to every home-delivery order (Rs.) — change here
const TAX_RATE = 0;             // set to e.g. 0.05 for 5% tax if you ever need to add one — 0 = no tax
const PICKUP_BRANCHES = [
  "فیضان دواخانہ - مرکزی دکان"   // add more branches here as "نام، شہر" if you open more locations
];
const PROMO_CODES = {           // add / edit promo codes here (code: discount in Rs.)
  "SEHAT10": 100,
  "FAIZAN200": 200
};

/* Some browsers (mainly Firefox, or private/incognito windows) block
   localStorage when a page is opened straight from disk (file://
   instead of http://), or when storage is disabled by the user. To
   make sure the cart NEVER resets while browsing the site, we fall
   back to a cookie (which works almost everywhere) and only fall
   back further to a plain in-memory array as an absolute last
   resort. The memory fallback is the only case that can't survive a
   full page reload — running the site through a real server/domain
   avoids that entirely, since normal localStorage works fine there. */
let _memoryCart = [];
let _storageOK = true;
let selectedDeliveryService = "home-delivery";
let selectedPickupBranch = "";
try {
  localStorage.setItem("__fd_test__", "1");
  localStorage.removeItem("__fd_test__");
} catch (e) {
  _storageOK = false;
}

/* ---- Cookie fallback helpers (used only if localStorage fails) ---- */
function setCookie(name, value, days = 365) {
  const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

function getCookie(name) {
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? decodeURIComponent(match[2]) : null;
}

function getCart() {
  if (_storageOK) {
    try {
      return JSON.parse(localStorage.getItem(CART_KEY)) || [];
    } catch (e) {
      _storageOK = false;
    }
  }
  try {
    const cookieVal = getCookie(CART_KEY);
    if (cookieVal) return JSON.parse(cookieVal);
  } catch (e) { /* fall through to memory */ }
  return _memoryCart;
}

function saveCart(cart) {
  let saved = false;
  if (_storageOK) {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(cart));
      saved = true;
    } catch (e) {
      _storageOK = false;
    }
  }
  if (!saved) {
    try {
      setCookie(CART_KEY, JSON.stringify(cart));
      saved = true;
    } catch (e) { /* cookie failed too */ }
  }
  _memoryCart = cart;
  updateCartCountBadge();
}

/* Adds an item. If the same product + same variant combo already
   exists in the cart, it just increases the quantity. */
function addToCart({ id, name, image, price, qty, variantLabel }) {
  const cart = getCart();
  const key = id + "|" + (variantLabel || "");
  const existing = cart.find(item => item.key === key);
  if (existing) {
    existing.qty += qty;
  } else {
    cart.push({ key, id, name, image, price, qty, variantLabel: variantLabel || "" });
  }
  saveCart(cart);
  showToast(name + " ٹوکری میں شامل کر دیا گیا");
}

function removeFromCart(key) {
  const cart = getCart().filter(item => item.key !== key);
  saveCart(cart);
}

function setQty(key, qty) {
  const cart = getCart();
  const item = cart.find(i => i.key === key);
  if (!item) return;
  item.qty = Math.max(1, qty);
  saveCart(cart);
}

function cartCount() {
  return getCart().reduce((sum, i) => sum + i.qty, 0);
}

function cartSubtotal() {
  return getCart().reduce((sum, i) => sum + i.qty * i.price, 0);
}

function cartTax(subtotal = cartSubtotal()) {
  return Math.round(subtotal * TAX_RATE);
}

function getDeliveryService() {
  return selectedDeliveryService;
}

function setDeliveryService(service) {
  selectedDeliveryService = service === "pickup" ? "pickup" : "home-delivery";
  if (selectedDeliveryService !== "pickup") {
    selectedPickupBranch = "";
  }
}

function getPickupBranch() {
  return selectedPickupBranch;
}

function setPickupBranch(branch) {
  selectedPickupBranch = branch;
}

function getPickupBranches() {
  return PICKUP_BRANCHES;
}

function cartDeliveryCharges() {
  return getDeliveryService() === "pickup" ? 0 : DELIVERY_CHARGES;
}

function cartDeliveryLabel() {
  return getDeliveryService() === "pickup" ? "دکان سے وصولی" : "ہوم ڈیلیوری";
}

/* Full order total: subtotal - discount (promo code) + delivery charges + tax. */
function cartTotal(discount = 0) {
  const discountedSubtotal = Math.max(0, cartSubtotal() - discount);
  return discountedSubtotal + cartDeliveryCharges() + cartTax(discountedSubtotal);
}

function clearCart() {
  if (_storageOK) {
    try {
      localStorage.removeItem(CART_KEY);
    } catch (e) { /* ignore */ }
  }
  try {
    setCookie(CART_KEY, "", -1);
  } catch (e) { /* ignore */ }
  _memoryCart = [];
  updateCartCountBadge();
}

function updateCartCountBadge() {
  document.querySelectorAll(".cart-count").forEach(el => {
    const count = cartCount();
    el.textContent = count;
    el.style.display = count > 0 ? "flex" : "none";
  });
}

function formatRs(n) {
  return "Rs. " + n.toLocaleString("en-PK");
}

function showToast(message) {
  let toast = document.querySelector(".toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.className = "toast";
    toast.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg><span></span>`;
    document.body.appendChild(toast);
  }
  toast.querySelector("span").textContent = message;
  toast.classList.add("show");
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove("show"), 2200);
}

document.addEventListener("DOMContentLoaded", updateCartCountBadge);
// Attach add-to-cart handlers on pages that render product cards or a product detail
function attachAddToCartHandlers(){
  // Listing pages: buttons with class .cart-btn inside a .card
  document.querySelectorAll('.cart-btn').forEach(btn => {
    // avoid double-binding
    if (btn._cartBound) return; btn._cartBound = true;
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const card = btn.closest('.card');
      if (!card) return;
      // try to extract product id from link
      let id = null;
      const link = card.querySelector('a[href*="product.html?id="]');
      if (link) {
        try { id = parseInt(new URL(link.href, location.href).searchParams.get('id'), 10); } catch (e) { id = null; }
      }
      const name = (card.querySelector('h3')?.textContent || '').trim() || 'نامعلوم پروڈکٹ';
      const img = card.querySelector('img')?.getAttribute('src') || '';
      const priceText = Array.from(card.querySelectorAll('span')).find(s => /Rs\.|Rs\b|Rs\./i.test(s.textContent))?.textContent || card.querySelector('.price')?.textContent || '';
      const price = parseInt((priceText || '').replace(/[^0-9]/g, ''), 10) || 0;
      addToCart({ id: id || ('p_' + Date.now()), name, image: img, price, qty: 1 });
    });
  });

  // Product detail page: primary add-to-cart inside .pd-actions
  const pdBtn = document.querySelector('.pd-actions .btn.primary, .pd-actions a.primary');
  if (pdBtn && !pdBtn._cartBound){
    pdBtn._cartBound = true;
    pdBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const qty = parseInt(document.getElementById('qtyInput')?.value || '1', 10) || 1;
      let id, name, img, price;
      if (typeof current !== 'undefined') {
        id = current.id; name = current.name; img = current.img; price = current.price;
      } else {
        id = Date.now();
        name = document.getElementById('pdTitle')?.textContent || 'نامعلوم پروڈکٹ';
        img = document.getElementById('mainImg')?.getAttribute('src') || '';
        price = parseInt((document.getElementById('pdPrice')?.textContent || '').replace(/[^0-9]/g, ''), 10) || 0;
      }
      addToCart({ id, name, image: img, price, qty });
    });
  }
}

// Run on DOM ready to wire up buttons and ensure badge shows correctly
document.addEventListener('DOMContentLoaded', () => {
  try { attachAddToCartHandlers(); } catch (e) { /* non-fatal */ }
});
