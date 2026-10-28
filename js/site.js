(function () {
  'use strict';
  const $ = (selector, root) => (root || document).querySelector(selector);
  const $$ = (selector, root) => Array.from((root || document).querySelectorAll(selector));
  const rub = (value) => Math.round(value).toLocaleString('ru-RU') + ' ₽';
  const localDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Catalogue filter: supports a direct link such as cakes.html?category=children.
  const filterButtons = $$('[data-filter]');
  const products = $$('.product-card[data-category]');
  function applyCategoryFilter(category) {
    const value = category || 'all';
    products.forEach((card) => { card.hidden = !(value === 'all' || card.dataset.category === value); });
    filterButtons.forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.filter === value)));
  }
  if (products.length && filterButtons.length) {
    filterButtons.forEach((button) => button.addEventListener('click', () => applyCategoryFilter(button.dataset.filter)));
    const category = new URLSearchParams(location.search).get('category');
    applyCategoryFilter(filterButtons.some((button) => button.dataset.filter === category) ? category : 'all');
  }

  // Gallery modal. The art is a local decorative illustration, not a real product photograph.
  const modal = $('#gallery-modal');
  if (modal) {
    const close = $('.modal-close', modal);
    const title = $('#gallery-title', modal);
    const code = $('#gallery-code', modal);
    const order = $('#gallery-order', modal);
    function openGallery(card) {
      const itemId = card.dataset.itemId || 'CUSTOM';
      title.textContent = card.dataset.itemName || itemId;
      code.textContent = itemId;
      order.href = 'builder.html?cake_type=' + encodeURIComponent(itemId);
      modal.classList.add('open');
      document.body.style.overflow = 'hidden';
      window.trackEvent?.('view_item', { currency: 'RUB', value: 0, items: [{ item_id: itemId, item_name: title.textContent }] });
      close?.focus();
    }
    function closeGallery() { modal.classList.remove('open'); document.body.style.overflow = ''; }
    $$('[data-gallery]').forEach((card) => {
      card.addEventListener('click', () => openGallery(card));
      card.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openGallery(card); } });
    });
    close?.addEventListener('click', closeGallery);
    modal.addEventListener('click', (event) => { if (event.target === modal) closeGallery(); });
    document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && modal.classList.contains('open')) closeGallery(); });
  }

  // Filling allergen filters are conservative: unknown recipe details are disclosed on the cards.
  const allergenButtons = $$('.allergen-filter');
  const fillingCards = $$('.filling-card');
  allergenButtons.forEach((button) => button.addEventListener('click', () => {
    const allergen = button.dataset.allergen;
    fillingCards.forEach((card) => {
      if (allergen === 'all') { card.hidden = false; return; }
      const data = card.dataset.allergens || '';
      const requested = allergen === 'лактоза' ? 'молоко' : allergen;
      // Only profiles that explicitly list the allergen are hidden. Unknown profiles are not advertised as safe.
      card.hidden = data.includes(requested) || data.includes('уточнить');
    });
    allergenButtons.forEach((b) => b.setAttribute('aria-pressed', String(b === button)));
    const grid = $('#fillings-grid');
    if (grid && !fillingCards.some((card) => !card.hidden)) {
      let note = $('#allergen-empty');
      if (!note) { note = document.createElement('p'); note.id = 'allergen-empty'; note.className = 'notice'; grid.after(note); }
      note.textContent = 'Нет вариантов с подтверждённым отсутствием этого аллергена. Уточните состав у менеджера.';
    } else $('#allergen-empty')?.remove();
  }));

  // Cake configurator price calculation.
  const weight = $('#weight_kg');
  const tiers = $('#tiers');
  const filling = $('#filling');
  const decorationChecks = ['dec_berries', 'dec_figurine', 'dec_photo'].map((id) => $('#' + id)).filter(Boolean);
  const inscription = $('#inscription');
  function getDecorationTotal() {
    return decorationChecks.reduce((sum, item) => sum + (item.checked ? Number(item.value) : 0), 0);
  }
  function getFillingPrice() {
    const option = filling?.selectedOptions?.[0];
    if (option?.dataset.price) return Number(option.dataset.price);
    return ['pistachio_raspberry', 'mango_passionfruit'].includes(filling?.value) ? 2900 : 2400;
  }
  function getTotal() {
    const kg = Math.max(1.5, Number(weight?.value || 1.5));
    const tierPrice = Number(tiers?.value || 1) === 2 ? 1500 : 0;
    const decorationSelect = $('#decoration');
    const decorationPrice = decorationSelect ? Number(decorationSelect.value || 0) : getDecorationTotal();
    return kg * getFillingPrice() + tierPrice + decorationPrice;
  }
  function updateBuilder() {
    if (!weight || !filling) return;
    const kg = Math.max(1.5, Number(weight.value || 1.5));
    if (Number(tiers?.value || 1) === 2 && kg < 3) {
      const warning = $('#builder-warning');
      if (warning) warning.textContent = 'Для двухъярусного торта нужен вес не менее 3 кг. Выбран 1 ярус; увеличьте вес до 3 кг, чтобы выбрать 2 яруса.';
    } else {
      const warning = $('#builder-warning');
      if (warning) warning.textContent = 'Для двухъярусного торта необходим вес не менее 3 кг.';
    }
    const total = getTotal();
    const totalEl = $('#total-price');
    if (totalEl) { totalEl.textContent = rub(total); totalEl.dataset.raw = String(total); }
    const servings = $('#servings');
    if (servings) servings.textContent = String(Math.ceil(kg * 1000 / 150));
    const prepay = $('#prepay');
    if (prepay) prepay.textContent = rub(total / 2);
    const summaryWeight = $('#summary-weight');
    if (summaryWeight) summaryWeight.textContent = String(kg).replace('.', ',') + ' кг';
    const summaryFilling = $('#summary-filling');
    if (summaryFilling && filling.selectedOptions[0]) summaryFilling.textContent = filling.selectedOptions[0].textContent.split(' — ')[0];
    const link = $('#builder-order');
    if (link) {
      const params = new URLSearchParams({
        cake_type: $('#cake_type')?.value || 'CUSTOM', weight_kg: String(kg), tiers: String(tiers?.value || 1),
        filling: filling.value, decoration: String(Number($('#decoration')?.value || getDecorationTotal())), inscription: inscription?.value || '',
        total_price: String(total)
      });
      link.href = 'contacts.html?' + params.toString();
    }
  }
  [weight, tiers, filling, ...decorationChecks, $('#decoration'), $('#cake_type'), inscription].filter(Boolean).forEach((el) => el.addEventListener('input', updateBuilder));
  [weight, tiers, filling, ...decorationChecks, $('#decoration'), $('#cake_type')].filter(Boolean).forEach((el) => el.addEventListener('change', updateBuilder));
  updateBuilder();

  // Guest calculator: 150 g per person, optional reserve, round up by 0.5 kg.
  const people = $('#people');
  const extra = $('#extra');
  const weightResult = $('#weight-result');
  function updateGuests() {
    if (!people || !weightResult) return;
    const guests = Math.min(500, Math.max(1, Number(people.value || 1)));
    const reserve = 1 + Number(extra?.value || 0) / 100;
    const kg = Math.max(1.5, Math.ceil((guests * 0.15 * reserve) * 2) / 2);
    weightResult.textContent = String(kg).replace('.', ',') + ' кг';
    window.trackEvent?.('guests_calc', { guests: guests, weight_kg: kg });
  }
  [people, extra].filter(Boolean).forEach((el) => el.addEventListener('input', updateGuests));
  if (people) updateGuests();

  // Promo code copy.
  const promo = $('#copy-promo');
  if (promo) promo.addEventListener('click', async () => {
    const code = promo.dataset.promo || 'SWEET5';
    const status = $('#promo-status');
    try { await navigator.clipboard.writeText(code); if (status) status.textContent = 'Промокод ' + code + ' скопирован.'; }
    catch (_) { if (status) status.textContent = 'Промокод: ' + code + '. Скопируйте его вручную.'; }
  });

  // Date minimum is computed in local time, not UTC.
  const eventDate = $('#event_date');
  if (eventDate) {
    const minDate = new Date(); minDate.setHours(0, 0, 0, 0); minDate.setDate(minDate.getDate() + 3);
    eventDate.min = localDate(minDate);
  }


  ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'].forEach((key) => {
    const hidden = document.querySelector('input[name="' + key + '"]');
    if (hidden) hidden.value = (window.saharnyUTM && window.saharnyUTM[key]) || ({utm_source:'direct',utm_medium:'none',utm_campaign:'not_set',utm_content:'not_set'})[key];
  });

  // Carry constructor choices from builder.html to contacts.html.
  const params = new URLSearchParams(location.search);
  ['cake_type', 'weight_kg', 'tiers', 'filling', 'decoration', 'inscription'].forEach((key) => {
    const field = $('#' + key);
    const value = params.get(key);
    if (field && value !== null) {
      if (field.type === 'checkbox') field.checked = value === 'true';
      else if (Array.from(field.options || []).some((option) => option.value === value)) field.value = value;
      else if (field.type !== 'select-one') field.value = value;
    }
  });
  updateBuilder();
  if (people) updateGuests();
})();
