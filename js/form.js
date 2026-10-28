/* После публикации Apps Script вставьте URL веб-приложения в кавычки ниже. */
window.SAHARNY_APPS_SCRIPT_URL = window.SAHARNY_APPS_SCRIPT_URL || 'https://script.google.com/macros/s/AKfycbyosSaMd9P4TRRsEy0N9hYWObOW7clBZXP5B4gy0sJQlsbHvgSg0Hz_jSeZP7Ij-Ocjmw/exec';
(function () {
  'use strict';
  const form = document.querySelector('[data-lead-form]');
  if (!form) return;
  const status = document.querySelector('#form-status');
  const submitButton = document.querySelector('#submit-order');
  const endpoint = window.SAHARNY_APPS_SCRIPT_URL || '';
  const fields = ['name', 'phone', 'email', 'cake_type', 'weight_kg', 'event_date', 'consent'];
  const setStatus = (message, kind) => {
    if (!status) return;
    status.className = 'toast show' + (kind === 'error' ? ' error-text' : '');
    status.textContent = message;
  };
  const setError = (name, message) => {
    const field = form.elements.namedItem(name);
    const label = form.querySelector('[data-error-for="' + name + '"]');
    if (field && field.classList) field.classList.toggle('invalid', Boolean(message));
    if (label) label.textContent = message || '';
  };
  const clearErrors = () => fields.forEach((name) => setError(name, ''));
  const validPhone = (value) => {
    const digits = String(value || '').replace(/\D/g, '');
    return digits.length === 11 && digits.startsWith('7');
  };
  const localDate = (date) => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  function validate() {
    clearErrors();
    let valid = true;
    const name = String(form.elements.name?.value || '').trim();
    const phone = String(form.elements.phone?.value || '').trim();
    const email = String(form.elements.email?.value || '').trim();
    const cakeType = String(form.elements.cake_type?.value || '').trim();
    const weight = Number(form.elements.weight_kg?.value);
    const dateValue = String(form.elements.event_date?.value || '');
    const consent = Boolean(form.elements.consent?.checked);
    const checks = [
      ['name', name.length >= 2, 'Введите имя (не менее 2 символов).'],
      ['phone', validPhone(phone), 'Укажите телефон с кодом страны: +7 и 10 цифр.'],
      ['email', !email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email), 'Проверьте формат e-mail.'],
      ['cake_type', Boolean(cakeType), 'Выберите модель торта.'],
      ['weight_kg', Number.isFinite(weight) && weight >= 1.5 && weight <= 10 && Math.round(weight * 2) === weight * 2, 'Вес должен быть от 1,5 до 10 кг с шагом 0,5 кг.'],
      ['event_date', Boolean(dateValue) && dateValue >= localDate(new Date(new Date().setDate(new Date().getDate() + 3))), 'Дата заказа должна быть не раньше чем через 3 дня.'],
      ['consent', consent, 'Для отправки заявки необходимо согласие на обработку данных.']
    ];
    checks.forEach(([key, ok, message]) => { if (!ok) { valid = false; setError(key, message); } });
    const tiers = Number(form.elements.tiers?.value || 1);
    if (tiers === 2 && weight < 3) { valid = false; setError('weight_kg', 'Для двухъярусного торта требуется вес от 3 кг.'); }
    if (!valid) window.trackEvent?.('form_error', { field_name: checks.find(([key, ok]) => !ok)?.[0] || 'unknown', error_type: 'validation' });
    return valid;
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!validate()) { setStatus('Проверьте поля, отмеченные сообщениями об ошибке.', 'error'); return; }
    if (!endpoint) {
      setStatus('Форма проверена в демо-режиме, но заявка не отправлена: подключите URL веб-приложения Apps Script в js/form.js. После подключения проверьте строку в Google Таблице.', 'error');
      window.trackEvent?.('form_error', { field_name: 'endpoint', error_type: 'not_configured' });
      return;
    }
    const buttonText = submitButton?.textContent || 'Отправить заявку';
    if (submitButton) { submitButton.disabled = true; submitButton.textContent = 'Отправляем…'; }
    setStatus('Отправляем заявку…');
    const data = Object.fromEntries(new FormData(form).entries());
    const requestId = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : 'req-' + Date.now() + '-' + Math.random().toString(16).slice(2, 8);
    if (form.elements.request_id) form.elements.request_id.value = requestId;
    const utm = window.saharnyUTM || {};
    const currentWeight = Number(data.weight_kg || 1.5);
    const fillingPrice = ['pistachio_raspberry', 'mango_passionfruit'].includes(data.filling) ? 2900 : 2400;
    const currentTiersPrice = Number(data.tiers || 1) === 2 ? 1500 : 0;
    const currentDecorationPrice = Number(data.decoration || 0);
    const currentTotal = currentWeight * fillingPrice + currentTiersPrice + currentDecorationPrice;
    const payload = {
      ...data,
      request_id: requestId,
      utm_source: utm.utm_source || 'direct',
      utm_medium: utm.utm_medium || 'none',
      utm_campaign: utm.utm_campaign || 'not_set',
      utm_content: utm.utm_content || 'not_set',
      utm_term: utm.utm_term || 'not_set',
      utm: utm,
      page_url: location.origin + location.pathname,
      tiers: Number(data.tiers || 1),
      decoration: data.decoration || '0',
      total_price: currentTotal
    };
    // Never include name, phone, email, comment or the full form payload in GA4.
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        mode: 'cors',
        redirect: 'follow',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error('server_http_' + response.status);
      const result = await response.json();
      if (!result || result.ok !== true) {
        const error = (result && result.error) ? String(result.error) : 'server_rejected';
        const errorField = error.includes('phone') ? 'phone' : error.includes('email') ? 'email' : error.includes('weight') || error.includes('two_tiers') ? 'weight_kg' : error.includes('event_date') ? 'event_date' : error.includes('cake_type') ? 'cake_type' : error.includes('consent') ? 'consent' : error.includes('name') ? 'name' : 'server';
        if (errorField !== 'server') setError(errorField, error === 'event_date_too_soon' ? 'Дата должна быть не раньше чем через 3 дня.' : 'Сервер отклонил это поле. Проверьте значение.');
        window.trackEvent?.('form_error', { field_name: errorField, error_type: 'server' });
        setStatus('Заявка не принята. ' + (error === 'event_date_too_soon' ? 'Выберите дату не раньше чем через 3 дня.' : 'Проверьте данные или попробуйте позже.'), 'error');
        if (submitButton) { submitButton.disabled = false; submitButton.textContent = buttonText; }
        return;
      }
      window.trackEvent?.('generate_lead', {
        lead_cake_type: String(payload.cake_type).slice(0, 40),
        weight_kg: Number(payload.weight_kg),
        value: Number(payload.total_price || 0),
        currency: 'RUB'
      });
      try {
        sessionStorage.setItem('saharny_last_order', JSON.stringify({ request_id: requestId, cake_type: payload.cake_type, weight_kg: payload.weight_kg, event_date: payload.event_date, total_price: payload.total_price }));
      } catch (_) {}
      location.href = 'thanks.html?request_id=' + encodeURIComponent(requestId);
    } catch (error) {
      console.error('Lead submission failed', error);
      window.trackEvent?.('form_error', { field_name: 'server', error_type: 'server' });
      setStatus('Не удалось подтвердить отправку. Проверьте подключение Apps Script и доступность веб-приложения; не отправляйте форму повторно, пока не проверите лист leads.', 'error');
      if (submitButton) { submitButton.disabled = false; submitButton.textContent = buttonText; }
    }
  });
})();
