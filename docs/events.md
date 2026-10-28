# События GA4

| Событие | Когда | Параметры | Ключевое |
|---|---|---|---|
| `page_view` | просмотр страницы | стандартные GA4 | нет |
| `view_item_list` | фильтр каталога | item_list_name | нет |
| `select_item` | выбор модели | item_id при подключении | нет |
| `hero_builder_click` | CTA главной | link_text | нет |
| `contact_click` | клик по телефону | contact_method | да |
| `messenger_click` | переход в соцсеть/мессенджер | link_url | да |
| `form_start` | начало формы | form_name | нет |
| `generate_lead` | подтверждённая заявка | form_name, cake_type без PII | да |
| `contact_cta_click` | CTA контактов | link_text | нет |
| `promo_copy` | резерв | promo_code | нет |
| `gallery_view` | резерв | gallery_name | нет |

Не отправляйте в GA4 имя, телефон, email, комментарии и другие персональные данные. `generate_lead` должен отражать принятую заявку, а не только нажатие кнопки.
