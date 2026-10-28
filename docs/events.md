# События GA4 — ТЗ-12/2026

Все собственные вызовы событий централизованы в `js/analytics.js`. Автоматические события требуют включённой расширенной статистики (Enhanced measurement) в настройках веб-потока GA4. До подключения реального Measurement ID события только выводятся в консоль браузера.

| № | Событие | Тип | Где и когда | Параметры |
|---:|---|---|---|---|
| 1 | `page_view` | автоматическое | Просмотр каждой HTML-страницы; `send_page_view: true` | `page_location`, `page_title` |
| 2 | `scroll` | автоматическое | Прокрутка страницы до 90%; включить Enhanced measurement | `percent_scrolled` |
| 3 | `click` | автоматическое | Переход по внешней ссылке; включить Enhanced measurement | `link_url`, `outbound` |
| 4 | `file_download` | автоматическое | Скачивание PDF; включить Enhanced measurement | `file_name`, `file_extension` |
| 5 | `form_start` | автоматическое | Первое взаимодействие с формой; включить Enhanced measurement | `form_id` |
| 6 | `form_submit` | автоматическое | Отправка формы; включить Enhanced measurement | `form_id` |
| 7 | `generate_lead` | рекомендованное, ключевое | `js/form.js`: только после ответа приёмника `ok: true` | `lead_cake_type`, `weight_kg`, `value`, `currency` |
| 8 | `cta_click` | своё | Кнопки заказа размечены `data-event` | `button_name`, `page_section` |
| 9 | `cake_filter` | своё | Выбор категории в каталоге или на главной | `occasion` |
| 10 | `view_item` | рекомендованное | Открытие иллюстрации или выбор модели | `items`, `currency`, `value` |
| 11 | `cake_build` | своё | Изменение веса, ярусов, начинки или декора | `weight_kg`, `tiers`, `filling`, `total_price` |
| 12 | `filling_view` | своё | Клик по варианту начинки | `filling_name` |
| 13 | `allergen_filter` | своё | Выбор фильтра по аллергену | `allergen` |
| 14 | `guests_calc` | своё | Изменение числа гостей или запаса | `guests`, `weight_kg` |
| 15 | `contact_click` | своё, ключевое | Клик по телефону или e-mail | `contact_type` |
| 16 | `messenger_click` | своё, ключевое | Клик по Telegram или WhatsApp | `messenger` |
| 17 | `social_click` | своё | Клик по ссылке социальной/коммуникационной сети в подвале или на `thanks.html` | `network`, `page_section` |
| 18 | `form_error` | своё | Ошибка валидации, серверная ошибка или отсутствие URL приёмника | `field_name`, `error_type` |
| 19 | `promo_copy` | по выбору | Клик по кнопке копирования `SWEET5` | `promo_code` |
| 20 | `gallery_view` | по выбору | Открытие иллюстрации торта крупно | `item_id` |

## Ключевые события

В ресурсе GA4 нужно отметить ключевыми только `generate_lead`, `contact_click` и `messenger_click`.

## Пользовательские определения

В GA4 → Admin → Custom definitions зарегистрировать параметры уровня события: `button_name`, `page_section`, `occasion`, `filling`, `allergen`, `guests`, `messenger`.

## Ограничения и проверка

- Не отправлять в GA4 имя, телефон, e-mail, комментарий, request_id и полный URL формы.
- `generate_lead` нельзя считать успешным до ответа `{ "ok": true }` от Apps Script.
- Проверить все события в DebugView и сохранить реальные кадры в `screens/ga4/`.
- Автоматические события `scroll`, `click`, `file_download`, `form_start`, `form_submit` требуют соответствующих переключателей Enhanced measurement в веб-потоке.
