/* GA4: замените G-XXXXXXXXXX на настоящий Measurement ID ресурса. */
window.SAHARNY_GA_ID = window.SAHARNY_GA_ID || 'G-XXXXXXXXXX';
window.saharnyUTM = {};
(function () {
  'use strict';
  const GA_ID = window.SAHARNY_GA_ID;
  if (GA_ID && GA_ID !== 'G-XXXXXXXXXX') {
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', GA_ID, { send_page_view: true });
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(GA_ID);
    document.head.appendChild(script);
  } else {
    console.info('GA4 не активирован: укажите Measurement ID в js/analytics.js.');
  }

  const keys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
  const params = new URLSearchParams(window.location.search);
  keys.forEach(function (key) {
    let value = params.get(key);
    if (value) {
      try { sessionStorage.setItem('saharny_' + key, value.slice(0, 100)); } catch (_) {}
    } else {
      try { value = sessionStorage.getItem('saharny_' + key); } catch (_) { value = ''; }
    }
    window.saharnyUTM[key] = value || ({ utm_source: 'direct', utm_medium: 'none', utm_campaign: 'not_set', utm_content: 'not_set', utm_term: 'not_set' })[key];
  });

  window.trackEvent = function (name, params) {
    const safeParams = {};
    Object.entries(params || {}).forEach(function (entry) {
      const key = entry[0];
      const value = entry[1];
      if (value === undefined || value === null || value === '') return;
      if (key === 'items' && Array.isArray(value)) {
        safeParams.items = value.slice(0, 10).map(function (item) {
          return { item_id: String(item.item_id || '').slice(0, 40), item_name: String(item.item_name || '').slice(0, 100) };
        });
      } else if (typeof value === 'number' && Number.isFinite(value)) safeParams[key] = value;
      else safeParams[key] = String(value).slice(0, 100);
    });
    if (typeof window.gtag === 'function' && GA_ID !== 'G-XXXXXXXXXX') window.gtag('event', name, safeParams);
    console.info('[GA4 event]', name, safeParams);
  };

  function closest(el, selector) { return el && el.closest ? el.closest(selector) : null; }
  document.addEventListener('click', function (event) {
    const target = event.target;
    const annotated = closest(target, '[data-event]');
    if (annotated) {
      const name = annotated.dataset.event;
      const params = {};
      if (annotated.dataset.buttonName) params.button_name = annotated.dataset.buttonName;
      if (annotated.dataset.pageSection) params.page_section = annotated.dataset.pageSection;
      if (annotated.dataset.occasion) params.occasion = annotated.dataset.occasion;
      if (annotated.dataset.itemId) params.item_id = annotated.dataset.itemId;
      if (annotated.dataset.fillingName) params.filling_name = annotated.dataset.fillingName;
      if (annotated.dataset.contactType) params.contact_type = annotated.dataset.contactType;
      if (annotated.dataset.messengerName) params.messenger = annotated.dataset.messengerName;
      if (name === 'view_item') {
        params.currency = 'RUB';
        params.value = Number(annotated.dataset.value || 0);
        params.items = [{ item_id: annotated.dataset.itemId || 'CUSTOM', item_name: annotated.dataset.itemName || annotated.textContent.trim().slice(0, 60) }];
      }
      window.trackEvent(name, params);
    }
    const tel = closest(target, 'a[href^="tel:"]');
    const mail = closest(target, 'a[href^="mailto:"]');
    if ((tel || mail) && !(annotated && annotated.dataset.event === 'contact_click')) {
      window.trackEvent('contact_click', { contact_type: tel ? 'phone' : 'email' });
    }
    const messenger = closest(target, '[data-messenger]');
    if (messenger && !(annotated && annotated.dataset.event === 'messenger_click')) {
      window.trackEvent('messenger_click', { messenger: messenger.dataset.messenger });
    }
    const social = closest(target, '[data-social]');
    if (social) window.trackEvent('social_click', { network: social.dataset.social, page_section: 'footer_or_thanks' });
  });

  document.addEventListener('click', function (event) {
    const filter = closest(event.target, '[data-filter]');
    if (filter) window.trackEvent('cake_filter', { occasion: filter.dataset.filter });
    const allergen = closest(event.target, '[data-allergen]');
    if (allergen) window.trackEvent('allergen_filter', { allergen: allergen.dataset.allergen });
    const gallery = closest(event.target, '[data-gallery]');
    if (gallery) window.trackEvent('gallery_view', { item_id: gallery.dataset.itemId || 'unknown' });
    const promo = closest(event.target, '[data-promo]');
    if (promo) window.trackEvent('promo_copy', { promo_code: promo.dataset.promo });
  });

  document.addEventListener('change', function (event) {
    const el = event.target;
    if (!el) return;
    if (['weight_kg', 'tiers', 'filling', 'dec_berries', 'dec_figurine', 'dec_photo', 'decoration'].includes(el.id)) {
      const weight = Number(document.querySelector('#weight_kg')?.value || 1.5);
      const tiers = Number(document.querySelector('#tiers')?.value || 1);
      const filling = document.querySelector('#filling')?.value || 'vanilla_berry';
      const total = Number(document.querySelector('#total-price')?.dataset.raw || 0);
      window.trackEvent('cake_build', { weight_kg: weight, tiers: tiers, filling: filling, total_price: total });
    }
  });
})();
