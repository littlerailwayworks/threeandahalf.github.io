/* One optional responsive display banner. No refresh loop or synthetic clicks. */
(() => {
  "use strict";
  const config = window.STUDIO_ADSENSE;
  const valid = config && config.enabled === true && /^ca-pub-\d{16}$/.test(config.client) && /^\d+$/.test(config.slot);
  if (!valid) return;

  document.querySelectorAll("[data-ads-enabled]").forEach(el => { el.hidden = false; });
  document.querySelectorAll("[data-ads-disabled]").forEach(el => { el.hidden = true; });

  // Google's own consent interface controls consent. Readiness is not consent.
  const choices = document.getElementById("privacy-choices");
  if (choices) {
    window.googlefc = window.googlefc || {};
    window.googlefc.callbackQueue = window.googlefc.callbackQueue || [];
    window.googlefc.callbackQueue.push({ CONSENT_API_READY: () => {
      if (typeof window.googlefc.showRevocationMessage !== "function") return;
      choices.hidden = false;
      choices.addEventListener("click", () => {
        window.googlefc.callbackQueue.push({ CONSENT_API_READY: () => window.googlefc.showRevocationMessage() });
      });
    }});
  }

  const script = document.createElement("script");
  script.async = true;
  script.crossOrigin = "anonymous";
  script.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=" + encodeURIComponent(config.client);
  const host = document.getElementById("google-ad-host");
  const house = document.getElementById("house-ad");
  if (!host || !house) {
    // The privacy page needs the same Google consent controls, but no ad unit.
    document.head.appendChild(script);
    return;
  }

  const unit = document.createElement("ins");
  unit.className = "adsbygoogle";
  unit.setAttribute("data-ad-client", config.client);
  unit.setAttribute("data-ad-slot", config.slot);
  unit.setAttribute("data-ad-format", "horizontal");
  unit.setAttribute("data-full-width-responsive", "true");
  host.appendChild(unit);
  host.hidden = false;
  house.hidden = true;

  const fallback = () => { host.hidden = true; house.hidden = false; };
  const observer = new MutationObserver(() => {
    const status = unit.getAttribute("data-ad-status");
    if (status === "unfilled") fallback();
    else if (status === "filled") { host.hidden = false; house.hidden = true; }
  });
  observer.observe(unit, { attributes: true, attributeFilter: ["data-ad-status"] });

  script.onerror = fallback;
  document.head.appendChild(script);
  try { (window.adsbygoogle = window.adsbygoogle || []).push({}); }
  catch (_) { fallback(); }
  // A blocked or stalled request may never publish a status. No ad refresh occurs;
  // the observer can still reveal this same unit if it is filled later.
  window.setTimeout(() => {
    if (unit.getAttribute("data-ad-status") !== "filled") fallback();
  }, 12000);
})();
