# Подключение GA4 и формы
1. В `js/analytics.js` замените `G-XXXXXXXXXX` на настоящий Measurement ID.
2. В `js/form.js` задайте `window.SAHARNY_APPS_SCRIPT_URL` URL развёрнутого Apps Script до обработчика формы.
3. Создайте Google Таблицу и лист `leads`; в Script Properties задайте `SPREADSHEET_ID`.
4. Deploy → New deployment → Web app. Выполните тестовую заявку и проверьте строку.
5. Из-за режима `no-cors` браузер не читает ответ сервера; подтверждайте успех фактической записью в таблице. Не отправляйте PII в GA4.
