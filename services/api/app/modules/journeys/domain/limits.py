from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class Limits:
    campaign_name: int = 80
    brief: int = 2000
    audience: int = 300
    screen_name: int = 60
    heading: int = 140
    text: int = 2000
    button_label: int = 40
    option_label: int = 100
    question: int = 200
    field_label: int = 80
    placeholder: int = 80
    consent_text: int = 500
    card_title: int = 80
    card_text: int = 300
    badge: int = 24
    price: int = 24
    countdown_label: int = 30
    rating_label: int = 40
    rule_label: int = 60
    answer_key: int = 40
    alt_text: int = 250
    url: int = 2048
    email: int = 254
    phone: int = 32
    company: int = 120
    short_answer: int = 250
    long_answer: int = 2000
    coupon_code: int = 40
    calendar_title: int = 120
    calendar_location: int = 200
    seo_title: int = 70
    seo_description: int = 160
    slug: int = 60
    chat_greeting: int = 200
    chat_placeholder: int = 80
    suggested_question: int = 120
    chat_question: int = 500
    fallback_text: int = 300
    brand_voice: int = 500
    legal_company: int = 120
    template_name: int = 60
    ai_prompt: int = 1000
    playground_question: int = 300
    stock_query: int = 100
    webhook_url: int = 2048
    srcset: int = 4000
    attribution: int = 300
    iso_datetime: int = 40
    port: int = 64
    max_suggested: int = 6
    max_bands: int = 6
    max_buttons: int = 3
    max_steps: int = 60
    max_elements_per_screen: int = 30
    max_items: int = 12
    max_options: int = 24
    max_fields: int = 12
    max_rules: int = 10
    doc_max_bytes: int = 1000000
    events_batch: int = 100
    events_body_bytes: int = 65536


L = Limits()

LIMITS: dict[str, int] = {k: getattr(L, k) for k in L.__dataclass_fields__}
