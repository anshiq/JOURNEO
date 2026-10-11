export interface JourneyDoc {
assistant?: (Assistant | null)
links?: {

[k: string]: {
[k: string]: string
}
}
schemaVersion: 4
screens?: {
[k: string]: Screen
}
settings?: JourneySettings

steps?: (StartStep | ScreenStep | ConditionStep | RedirectStep)[]
theme?: Theme
}

export interface Assistant {
fallback?: string
fallbackCtaLabel?: (string | null)
fallbackTarget?: (string | null)
greeting?: string
placeholder?: string
placement?: ("floating" | "pinned")

suggested?: string[]
}

export interface Screen {
allowBack?: (boolean | null)
background?: (Background | null)
colorScheme?: ("theme" | "inverse")

elements?: (HeadingElement | TextElement | ImageElement | VideoElement | ButtonsElement | CardsElement | CountdownElement | SpacerElement | ChoiceElement | RatingElement | FormElement)[]
id: string
layout?: ScreenLayout
name: string
responsive?: (ScreenResponsive | null)
showAssistant?: boolean
stickyAction?: boolean
}

export interface Background {
color?: (("primary" | "accent" | "text" | "muted" | "surface" | "background") | string | null)
gradient?: (Gradient | null)
image?: (BackgroundImage | null)
type?: ("color" | "gradient" | "image")
}

export interface Gradient {
direction?: ("down" | "right" | "diagonal")
from?: (("primary" | "accent" | "text" | "muted" | "surface" | "background") | string)
to?: (("primary" | "accent" | "text" | "muted" | "surface" | "background") | string)
}

export interface BackgroundImage {
darken?: number
src: string
}

export interface HeadingElement {
hidden?: boolean
id: string
props: HeadingProps
responsive?: (ResponsiveOverrides | null)
style?: (StyleProps | null)
type: "heading"
visibleIf?: (AllGroup | AnyGroup | (TextCondition | NumberCondition | ChoiceCondition | BoolCondition | DeviceCondition | OutcomeCondition | DateCondition) | null)
}

export interface HeadingProps {
level?: (1 | 2 | 3)
text: string
}

export interface ResponsiveOverrides {
desktop?: (ResponsiveOverride | null)
tablet?: (ResponsiveOverride | null)
}

export interface ResponsiveOverride {
hidden?: (boolean | null)
src?: (string | null)
srcset?: (string | null)
style?: (StyleProps | null)
}

export interface StyleProps {
align?: (("left" | "center" | "right") | null)
colorRole?: (("primary" | "accent" | "text" | "muted" | "surface" | "background") | null)
columns?: ((1 | 2 | 3 | 4) | null)
emphasis?: (("normal" | "strong" | "subtle") | null)
fullWidth?: (boolean | null)
radius?: (("none" | "sm" | "md" | "lg" | "full") | null)
size?: (("xs" | "sm" | "md" | "lg" | "xl") | null)
spacingAfter?: (("none" | "sm" | "md" | "lg" | "xl") | null)
spacingBefore?: (("none" | "sm" | "md" | "lg" | "xl") | null)
variant?: (("primary" | "secondary" | "outline" | "link" | "solid" | "soft") | null)
width?: (("auto" | "full" | "narrow" | "normal" | "wide") | null)
}

export interface AllGroup {

all: (TextCondition | NumberCondition | ChoiceCondition | BoolCondition | DeviceCondition | OutcomeCondition | DateCondition)[]
}

export interface TextCondition {
answer: string
op: ("equals" | "notEquals" | "contains" | "notContains" | "isEmpty" | "isNotEmpty")
value?: (string | null)
}

export interface NumberCondition {
answer: string
op: ("eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "between")
value?: (number | null)
value2?: (number | null)
}

export interface ChoiceCondition {
answer: string
op: ("anyOf" | "noneOf" | "includesAny" | "includesAll" | "includesNone")

value?: string[]
}

export interface BoolCondition {
answer: string
op: ("isTrue" | "isFalse")
}

export interface DeviceCondition {
answer?: "device"
op: "is"
value?: ("mobile" | "tablet" | "desktop")
}

export interface OutcomeCondition {
answer?: "outcomes"
op: "topOutcome"
value: string
}

export interface DateCondition {
answer: string
op: ("before" | "after")
value: string
}

export interface AnyGroup {

any: (TextCondition | NumberCondition | ChoiceCondition | BoolCondition | DeviceCondition | OutcomeCondition | DateCondition)[]
}

export interface TextElement {
hidden?: boolean
id: string
props: TextProps
responsive?: (ResponsiveOverrides | null)
style?: (StyleProps | null)
type: "text"
visibleIf?: (AllGroup | AnyGroup | (TextCondition | NumberCondition | ChoiceCondition | BoolCondition | DeviceCondition | OutcomeCondition | DateCondition) | null)
}

export interface TextProps {
listStyle?: (("bullet" | "check" | "number") | null)
preset?: ("body" | "lead" | "caption" | "quote" | "eyebrow" | "notice")
text: string
}

export interface ImageElement {
hidden?: boolean
id: string
props: ImageProps
responsive?: (ResponsiveOverrides | null)
style?: (StyleProps | null)
type: "image"
visibleIf?: (AllGroup | AnyGroup | (TextCondition | NumberCondition | ChoiceCondition | BoolCondition | DeviceCondition | OutcomeCondition | DateCondition) | null)
}

export interface ImageProps {
action?: ((NextAction | GotoAction | UrlAction | CopyAction | CalendarAction | TelAction | MailtoAction) | null)
alt?: string
aspect?: ("auto" | "1:1" | "4:5" | "3:2" | "16:9")
attribution?: (string | null)
dominantColor?: (string | null)
focal?: Focal
height?: (number | null)
src: string
srcset?: (string | null)
width?: (number | null)
}

export interface NextAction {
kind: "next"
}

export interface GotoAction {
kind: "goto"
skipValidation?: boolean
}

export interface UrlAction {
kind: "url"
newTab?: boolean
passParams?: boolean
url: string
}

export interface CopyAction {
kind: "copy"
value: string
}

export interface CalendarAction {
end?: (string | null)
kind: "calendar"
location?: (string | null)
start: string
title: string
url?: (string | null)
}

export interface TelAction {
kind: "tel"
value: string
}

export interface MailtoAction {
kind: "mailto"
value: string
}
export interface Focal {
x?: number
y?: number
}

export interface VideoElement {
hidden?: boolean
id: string
props: VideoProps
responsive?: (ResponsiveOverrides | null)
style?: (StyleProps | null)
type: "video"
visibleIf?: (AllGroup | AnyGroup | (TextCondition | NumberCondition | ChoiceCondition | BoolCondition | DeviceCondition | OutcomeCondition | DateCondition) | null)
}

export interface VideoProps {
aspect?: ("16:9" | "4:5" | "1:1" | "9:16")
autoplay?: boolean
loop?: boolean
poster?: (string | null)
source: VideoSource
}

export interface VideoSource {
kind: ("youtube" | "vimeo" | "file")
url: string
}

export interface ButtonsElement {
hidden?: boolean
id: string
props: ButtonsProps
responsive?: (ResponsiveOverrides | null)
style?: (StyleProps | null)
type: "buttons"
visibleIf?: (AllGroup | AnyGroup | (TextCondition | NumberCondition | ChoiceCondition | BoolCondition | DeviceCondition | OutcomeCondition | DateCondition) | null)
}

export interface ButtonsProps {

items: ButtonItem[]
layout?: ("auto" | "stack" | "row")
}

export interface ButtonItem {
action: (NextAction | GotoAction | UrlAction | CopyAction | CalendarAction | TelAction | MailtoAction)
id: string
label: string
variant?: ("primary" | "secondary" | "outline" | "link")
}

export interface CardsElement {
hidden?: boolean
id: string
props: CardsProps
responsive?: (ResponsiveOverrides | null)
style?: (StyleProps | null)
type: "cards"
visibleIf?: (AllGroup | AnyGroup | (TextCondition | NumberCondition | ChoiceCondition | BoolCondition | DeviceCondition | OutcomeCondition | DateCondition) | null)
}

export interface CardsProps {
columns?: ((2 | 3 | 4) | null)

items: CardItem[]
layout?: ("auto" | "grid" | "carousel" | "list")
}

export interface CardItem {
badge?: (string | null)
button?: (CardButton | null)
id: string
image?: (string | null)
imageAlt?: (string | null)
price?: (string | null)
text?: (string | null)
title: string
}

export interface CardButton {
action: (NextAction | GotoAction | UrlAction | CopyAction | CalendarAction | TelAction | MailtoAction)
label: string
}

export interface CountdownElement {
hidden?: boolean
id: string
props: CountdownProps
responsive?: (ResponsiveOverrides | null)
style?: (StyleProps | null)
type: "countdown"
visibleIf?: (AllGroup | AnyGroup | (TextCondition | NumberCondition | ChoiceCondition | BoolCondition | DeviceCondition | OutcomeCondition | DateCondition) | null)
}

export interface CountdownProps {
deadline: string
labels?: CountdownLabels
message?: (string | null)
onExpire?: ("hide" | "message")
}
export interface CountdownLabels {
days?: string
hours?: string
minutes?: string
seconds?: string
}

export interface SpacerElement {
hidden?: boolean
id: string
props: SpacerProps
responsive?: (ResponsiveOverrides | null)
style?: (StyleProps | null)
type: "spacer"
visibleIf?: (AllGroup | AnyGroup | (TextCondition | NumberCondition | ChoiceCondition | BoolCondition | DeviceCondition | OutcomeCondition | DateCondition) | null)
}

export interface SpacerProps {
line?: boolean
size?: ("sm" | "md" | "lg" | "xl")
}

export interface ChoiceElement {
hidden?: boolean
id: string
props: ChoiceProps
responsive?: (ResponsiveOverrides | null)
style?: (StyleProps | null)
type: "choice"
visibleIf?: (AllGroup | AnyGroup | (TextCondition | NumberCondition | ChoiceCondition | BoolCondition | DeviceCondition | OutcomeCondition | DateCondition) | null)
}

export interface ChoiceProps {
autoAdvance?: boolean
branchByAnswer?: boolean
display?: ("list" | "buttons" | "pictures" | "dropdown" | "yesno")
key: string
max?: (number | null)
min?: (number | null)
multiple?: boolean

options: ChoiceOption[]
other?: boolean
question: string
randomize?: boolean
required?: boolean
scoring?: ("none" | "points" | "outcomes")
}

export interface ChoiceOption {
correct?: boolean
id: string
image?: (string | null)
label: string
outcome?: (string | null)
points?: (number | null)
value?: string
}

export interface RatingElement {
hidden?: boolean
id: string
props: RatingProps
responsive?: (ResponsiveOverrides | null)
style?: (StyleProps | null)
type: "rating"
visibleIf?: (AllGroup | AnyGroup | (TextCondition | NumberCondition | ChoiceCondition | BoolCondition | DeviceCondition | OutcomeCondition | DateCondition) | null)
}

export interface RatingProps {
bands?: (RatingBand[] | null)
branchByScore?: boolean
key: string
max?: number
maxLabel?: (string | null)
minLabel?: (string | null)
question: string
required?: boolean
scale?: ("stars" | "emoji" | "numbers" | "nps")
}

export interface RatingBand {
id: string
label: string
max?: number
min?: number
}

export interface FormElement {
hidden?: boolean
id: string
props: FormProps
responsive?: (ResponsiveOverrides | null)
style?: (StyleProps | null)
type: "form"
visibleIf?: (AllGroup | AnyGroup | (TextCondition | NumberCondition | ChoiceCondition | BoolCondition | DeviceCondition | OutcomeCondition | DateCondition) | null)
}

export interface FormProps {

fields: FormField[]
prefill?: boolean
submitLabel?: string
}

export interface FormField {
consentText?: (string | null)
half?: boolean
id: string
key: string
kind: ("name" | "email" | "phone" | "company" | "text" | "longtext" | "number" | "date" | "dropdown" | "consent")
label: string
max?: (number | null)
min?: (number | null)
options?: (string[] | null)
placeholder?: (string | null)
required?: boolean
unique?: boolean
}
export interface ScreenLayout {
hAlign?: ("left" | "center")
media?: (MediaSlot | null)
preset?: ("stack" | "split" | "cover")
spacing?: ("compact" | "comfortable" | "spacious")
vAlign?: ("top" | "center")
width?: ("narrow" | "normal" | "wide")
}

export interface MediaSlot {
alt?: string
darken?: number
focal?: Focal1
kind?: ("image" | "video")
onMobile?: ("top" | "background" | "hidden")
side?: ("left" | "right")
src?: string
srcset?: (string | null)
}
export interface Focal1 {
x?: number
y?: number
}

export interface ScreenResponsive {
desktop?: (ScreenOverride | null)
tablet?: (ScreenOverride | null)
}

export interface ScreenOverride {
hAlign?: (("left" | "center") | null)
mediaSide?: (("left" | "right") | null)
preset?: (("stack" | "split" | "cover") | null)
width?: (("narrow" | "normal" | "wide") | null)
}
export interface JourneySettings {
allowBack?: boolean
legal?: Legal
progress?: ("none" | "bar")
seo?: Seo
}
export interface Legal {
company?: (string | null)
privacyUrl?: (string | null)
termsUrl?: (string | null)
}
export interface Seo {
description?: (string | null)
image?: (string | null)
title?: (string | null)
}

export interface StartStep {
id: string
kind: "start"
}

export interface ScreenStep {
id: string
kind: "screen"
}

export interface ConditionStep {
id: string
kind: "condition"
label?: (string | null)

rules?: Rule[]
}

export interface Rule {
id: string
label: string
when: (AllGroup | AnyGroup | (TextCondition | NumberCondition | ChoiceCondition | BoolCondition | DeviceCondition | OutcomeCondition | DateCondition))
}

export interface RedirectStep {
delayMs?: number
id: string
kind: "redirect"
passParams?: boolean
url: string
}
export interface Theme {
background?: Background1
buttons?: ThemeButtons
colors?: ThemeColors
density?: ("compact" | "comfortable" | "spacious")
fonts?: ThemeFonts
inputs?: ThemeInputs
logo?: (ThemeLogo | null)
preset?: (string | null)
radius?: ("none" | "sm" | "md" | "lg" | "full")
typeScale?: ("compact" | "default" | "large")
voice?: (string | null)
}
export interface Background1 {
color?: (("primary" | "accent" | "text" | "muted" | "surface" | "background") | string | null)
gradient?: (Gradient | null)
image?: (BackgroundImage | null)
type?: ("color" | "gradient" | "image")
}
export interface ThemeButtons {
case?: ("normal" | "upper")
style?: ("solid" | "outline" | "soft")
}
export interface ThemeColors {
accent?: string
background?: string
border?: (string | null)
muted?: (string | null)
onPrimary?: (string | null)
primary?: string
surface?: string
text?: string
}
export interface ThemeFonts {
body?: (("inter" | "source-sans-3" | "playfair-display" | "space-grotesk" | "nunito" | "cormorant-garamond" | "lato" | "archivo" | "ibm-plex-sans" | "poppins" | "open-sans" | "dm-sans") | null)
heading?: (("inter" | "source-sans-3" | "playfair-display" | "space-grotesk" | "nunito" | "cormorant-garamond" | "lato" | "archivo" | "ibm-plex-sans" | "poppins" | "open-sans" | "dm-sans") | null)
pairing?: ("classic" | "editorial" | "modern" | "friendly" | "elegant" | "bold" | "tech" | "rounded")
}
export interface ThemeInputs {
style?: ("outline" | "filled" | "underline")
}

export interface ThemeLogo {
position?: ("left" | "center")
size?: ("sm" | "md" | "lg")
src: string
}

export interface CountdownLabels1 {
days?: string
hours?: string
minutes?: string
seconds?: string
}

export interface Focal2 {
x?: number
y?: number
}

export interface JourneySettings1 {
allowBack?: boolean
legal?: Legal
progress?: ("none" | "bar")
seo?: Seo
}

export interface Legal1 {
company?: (string | null)
privacyUrl?: (string | null)
termsUrl?: (string | null)
}

export interface ScreenLayout1 {
hAlign?: ("left" | "center")
media?: (MediaSlot | null)
preset?: ("stack" | "split" | "cover")
spacing?: ("compact" | "comfortable" | "spacious")
vAlign?: ("top" | "center")
width?: ("narrow" | "normal" | "wide")
}

export interface Seo1 {
description?: (string | null)
image?: (string | null)
title?: (string | null)
}

export interface Theme1 {
background?: Background1
buttons?: ThemeButtons
colors?: ThemeColors
density?: ("compact" | "comfortable" | "spacious")
fonts?: ThemeFonts
inputs?: ThemeInputs
logo?: (ThemeLogo | null)
preset?: (string | null)
radius?: ("none" | "sm" | "md" | "lg" | "full")
typeScale?: ("compact" | "default" | "large")
voice?: (string | null)
}

export interface ThemeButtons1 {
case?: ("normal" | "upper")
style?: ("solid" | "outline" | "soft")
}

export interface ThemeColors1 {
accent?: string
background?: string
border?: (string | null)
muted?: (string | null)
onPrimary?: (string | null)
primary?: string
surface?: string
text?: string
}

export interface ThemeFonts1 {
body?: (("inter" | "source-sans-3" | "playfair-display" | "space-grotesk" | "nunito" | "cormorant-garamond" | "lato" | "archivo" | "ibm-plex-sans" | "poppins" | "open-sans" | "dm-sans") | null)
heading?: (("inter" | "source-sans-3" | "playfair-display" | "space-grotesk" | "nunito" | "cormorant-garamond" | "lato" | "archivo" | "ibm-plex-sans" | "poppins" | "open-sans" | "dm-sans") | null)
pairing?: ("classic" | "editorial" | "modern" | "friendly" | "elegant" | "bold" | "tech" | "rounded")
}

export interface ThemeInputs1 {
style?: ("outline" | "filled" | "underline")
}
