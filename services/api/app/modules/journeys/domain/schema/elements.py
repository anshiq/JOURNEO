from typing import Annotated, Literal

from pydantic import Field, StringConstraints

from app.modules.journeys.domain.limits import L
from app.modules.journeys.domain.schema.actions import Action, AnswerKey, ColorRole, Hex, Id, Strict
from app.modules.journeys.domain.schema.conditions import Condition

Size = Literal["xs", "sm", "md", "lg", "xl"]
Spacing = Literal["none", "sm", "md", "lg", "xl"]


class StyleProps(Strict):
    align: Literal["left", "center", "right"] | None = None
    size: Size | None = None
    color_role: ColorRole | None = None
    emphasis: Literal["normal", "strong", "subtle"] | None = None
    width: Literal["auto", "full", "narrow", "normal", "wide"] | None = None
    radius: Literal["none", "sm", "md", "lg", "full"] | None = None
    variant: Literal["primary", "secondary", "outline", "link", "solid", "soft"] | None = None
    spacing_before: Spacing | None = None
    spacing_after: Spacing | None = None
    columns: Literal[1, 2, 3, 4] | None = None
    full_width: bool | None = None


class ResponsiveOverride(Strict):
    style: StyleProps | None = None
    hidden: bool | None = None
    src: Annotated[str, StringConstraints(max_length=L.url)] | None = None
    srcset: Annotated[str, StringConstraints(max_length=L.srcset)] | None = None


class ResponsiveOverrides(Strict):
    tablet: ResponsiveOverride | None = None
    desktop: ResponsiveOverride | None = None


class Focal(Strict):
    x: float = Field(default=50.0, ge=0, le=100)
    y: float = Field(default=50.0, ge=0, le=100)


class HeadingProps(Strict):
    text: Annotated[str, StringConstraints(max_length=L.heading)]
    level: Literal[1, 2, 3] = 1


class TextProps(Strict):
    text: Annotated[str, StringConstraints(max_length=L.text)]
    preset: Literal["body", "lead", "caption", "quote", "eyebrow", "notice"] = "body"
    list_style: Literal["bullet", "check", "number"] | None = None


class ImageProps(Strict):
    src: Annotated[str, StringConstraints(max_length=L.url)]
    srcset: Annotated[str, StringConstraints(max_length=L.srcset)] | None = None
    width: int | None = Field(default=None, ge=1, le=20000)
    height: int | None = Field(default=None, ge=1, le=20000)
    dominant_color: Hex | None = None
    alt: Annotated[str, StringConstraints(max_length=L.alt_text)] = ""
    aspect: Literal["auto", "1:1", "4:5", "3:2", "16:9"] = "auto"
    focal: Focal = Focal()
    attribution: Annotated[str, StringConstraints(max_length=L.attribution)] | None = None
    action: Action | None = None


class VideoSource(Strict):
    kind: Literal["youtube", "vimeo", "file"]
    url: Annotated[str, StringConstraints(max_length=L.url)]


class VideoProps(Strict):
    source: VideoSource
    poster: Annotated[str, StringConstraints(max_length=L.url)] | None = None
    autoplay: bool = False
    loop: bool = False
    aspect: Literal["16:9", "4:5", "1:1", "9:16"] = "16:9"


class ButtonItem(Strict):
    id: Id
    label: Annotated[str, StringConstraints(max_length=L.button_label)]
    variant: Literal["primary", "secondary", "outline", "link"] = "primary"
    action: Action


class ButtonsProps(Strict):
    items: list[ButtonItem] = Field(max_length=L.max_buttons)
    layout: Literal["auto", "stack", "row"] = "auto"


class CardButton(Strict):
    label: Annotated[str, StringConstraints(max_length=L.button_label)]
    action: Action


class CardItem(Strict):
    id: Id
    title: Annotated[str, StringConstraints(max_length=L.card_title)]
    text: Annotated[str, StringConstraints(max_length=L.card_text)] | None = None
    badge: Annotated[str, StringConstraints(max_length=L.badge)] | None = None
    price: Annotated[str, StringConstraints(max_length=L.price)] | None = None
    image: Annotated[str, StringConstraints(max_length=L.url)] | None = None
    image_alt: Annotated[str, StringConstraints(max_length=L.alt_text)] | None = None
    button: CardButton | None = None


class CardsProps(Strict):
    items: list[CardItem] = Field(max_length=L.max_items)
    layout: Literal["auto", "grid", "carousel", "list"] = "auto"
    columns: Literal[2, 3, 4] | None = None


class CountdownLabels(Strict):
    days: Annotated[str, StringConstraints(max_length=L.countdown_label)] = "Days"
    hours: Annotated[str, StringConstraints(max_length=L.countdown_label)] = "Hours"
    minutes: Annotated[str, StringConstraints(max_length=L.countdown_label)] = "Minutes"
    seconds: Annotated[str, StringConstraints(max_length=L.countdown_label)] = "Seconds"


class CountdownProps(Strict):
    deadline: Annotated[str, StringConstraints(max_length=L.iso_datetime)]
    labels: CountdownLabels = CountdownLabels()
    on_expire: Literal["hide", "message"] = "hide"
    message: Annotated[str, StringConstraints(max_length=L.text)] | None = None


class SpacerProps(Strict):
    size: Literal["sm", "md", "lg", "xl"] = "md"
    line: bool = False


class ChoiceOption(Strict):
    id: Id
    label: Annotated[str, StringConstraints(max_length=L.option_label)]
    value: Annotated[str, StringConstraints(max_length=L.option_label)] = ""
    image: Annotated[str, StringConstraints(max_length=L.url)] | None = None
    points: int | None = Field(default=None, ge=-1000, le=1000)
    outcome: Id | None = None
    correct: bool = False


class ChoiceProps(Strict):
    question: Annotated[str, StringConstraints(max_length=L.question)]
    key: AnswerKey
    multiple: bool = False
    min: int | None = Field(default=None, ge=0, le=L.max_options)
    max: int | None = Field(default=None, ge=1, le=L.max_options)
    display: Literal["list", "buttons", "pictures", "dropdown", "yesno"] = "list"
    options: list[ChoiceOption] = Field(max_length=L.max_options)
    other: bool = False
    randomize: bool = False
    auto_advance: bool = False
    branch_by_answer: bool = False
    scoring: Literal["none", "points", "outcomes"] = "none"
    required: bool = True


class RatingBand(Strict):
    id: Id
    label: Annotated[str, StringConstraints(max_length=L.rating_label)]
    min: int = Field(default=0, ge=0, le=10)
    max: int = Field(default=10, ge=0, le=10)


class RatingProps(Strict):
    question: Annotated[str, StringConstraints(max_length=L.question)]
    key: AnswerKey
    scale: Literal["stars", "emoji", "numbers", "nps"] = "stars"
    max: int = Field(default=5, ge=3, le=10)
    min_label: Annotated[str, StringConstraints(max_length=L.rating_label)] | None = None
    max_label: Annotated[str, StringConstraints(max_length=L.rating_label)] | None = None
    branch_by_score: bool = False
    bands: list[RatingBand] | None = Field(default=None, max_length=L.max_bands)
    required: bool = True


FieldKind = Literal["name", "email", "phone", "company", "text", "longtext", "number", "date", "dropdown", "consent"]


class FormField(Strict):
    id: Id
    kind: FieldKind
    label: Annotated[str, StringConstraints(max_length=L.field_label)]
    key: AnswerKey
    placeholder: Annotated[str, StringConstraints(max_length=L.placeholder)] | None = None
    required: bool = False
    half: bool = False
    options: list[Annotated[str, StringConstraints(max_length=L.option_label)]] | None = Field(
        default=None, max_length=L.max_options
    )
    consent_text: Annotated[str, StringConstraints(max_length=L.consent_text)] | None = None
    unique: bool = False
    min: float | None = None
    max: float | None = None


class FormProps(Strict):
    fields: list[FormField] = Field(max_length=L.max_fields)
    submit_label: Annotated[str, StringConstraints(max_length=L.button_label)] = "Submit"
    prefill: bool = False


class ElementBase(Strict):
    id: Id
    style: StyleProps | None = None
    visible_if: Condition | None = None
    hidden: bool = False
    responsive: ResponsiveOverrides | None = None


class HeadingElement(ElementBase):
    type: Literal["heading"]
    props: HeadingProps


class TextElement(ElementBase):
    type: Literal["text"]
    props: TextProps


class ImageElement(ElementBase):
    type: Literal["image"]
    props: ImageProps


class VideoElement(ElementBase):
    type: Literal["video"]
    props: VideoProps


class ButtonsElement(ElementBase):
    type: Literal["buttons"]
    props: ButtonsProps


class CardsElement(ElementBase):
    type: Literal["cards"]
    props: CardsProps


class CountdownElement(ElementBase):
    type: Literal["countdown"]
    props: CountdownProps


class SpacerElement(ElementBase):
    type: Literal["spacer"]
    props: SpacerProps


class ChoiceElement(ElementBase):
    type: Literal["choice"]
    props: ChoiceProps


class RatingElement(ElementBase):
    type: Literal["rating"]
    props: RatingProps


class FormElement(ElementBase):
    type: Literal["form"]
    props: FormProps


Element = Annotated[
    HeadingElement
    | TextElement
    | ImageElement
    | VideoElement
    | ButtonsElement
    | CardsElement
    | CountdownElement
    | SpacerElement
    | ChoiceElement
    | RatingElement
    | FormElement,
    Field(discriminator="type"),
]

ELEMENT_TYPES = (
    "heading",
    "text",
    "image",
    "video",
    "buttons",
    "cards",
    "countdown",
    "spacer",
    "choice",
    "rating",
    "form",
)
