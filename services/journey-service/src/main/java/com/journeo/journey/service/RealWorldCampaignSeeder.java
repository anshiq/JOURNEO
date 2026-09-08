package com.journeo.journey.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.journeo.journey.entity.Campaign;
import com.journeo.journey.entity.Journey;
import com.journeo.journey.repository.CampaignRepository;
import com.journeo.journey.repository.JourneyRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Component
public class RealWorldCampaignSeeder implements CommandLineRunner {
    private final CampaignRepository campaignRepository;
    private final JourneyRepository journeyRepository;
    private final ObjectMapper mapper = new ObjectMapper();
    @Value("${demo-data-seed:false}") private boolean enabled;
    @Value("${demo-data-reset:false}") private boolean reset;

    public RealWorldCampaignSeeder(CampaignRepository campaignRepository, JourneyRepository journeyRepository) {
        this.campaignRepository = campaignRepository;
        this.journeyRepository = journeyRepository;
    }

    record Product(
        String id, String name, String description, String objective, String audience,
        String heroBadge, String heroHeadline, String heroSubheadline, String heroImage,
        String factsHeadline, String factsBody,
        String galleryImage, String galleryCaption,
        String videoUrl, String videoCaption,
        String quizQuestion, List<String> quizOptions,
        String ctaHeadline, String ctaBody, String ctaButtonLabel, String ctaHref,
        String askAiPlaceholder
    ) {}

    @Override
    public void run(String... args) {
        if (!enabled) return;
        if (reset) {
            journeyRepository.deleteAll();
            campaignRepository.deleteAll();
        }
        for (Product p : products()) seed(p);
    }

    private List<Product> products() {
        return List.of(
            new Product(
                "samsung-galaxy-s24-ultra",
                "Samsung — Galaxy S24 Ultra",
                "Galaxy S24 Ultra — 200MP camera, titanium frame, Snapdragon 8 Gen 3 for Galaxy, Galaxy AI and S Pen included.",
                "Drive qualified pre-orders for the Galaxy S24 Ultra launch",
                "Android upgraders and camera-first smartphone shoppers",
                "Galaxy AI is here",
                "Galaxy S24 Ultra",
                "A 200MP camera, titanium frame, and Galaxy AI built in. S Pen included.",
                "https://commons.wikimedia.org/wiki/Special:FilePath/Samsung_Galaxy_S24_Ultra.jpg",
                "Built for the way you create",
                "6.8\" QHD+ Dynamic AMOLED 2X at 120Hz, Snapdragon 8 Gen 3 for Galaxy, a 5000mAh battery, and a 200MP main sensor with up to 100x Space Zoom. Titanium frame front to back.",
                "https://commons.wikimedia.org/wiki/Special:FilePath/SAMSUNG_Galaxy_S24_Ultra_(2).jpg",
                "Titanium frame, every angle",
                "https://www.youtube.com/watch?v=CYqOnILg8N4",
                "Galaxy S24 Ultra Official Film: Circle to Search | Samsung",
                "Which Galaxy AI feature excites you most?",
                List.of("Circle to Search", "Live Translate", "Note Assist", "Photo Assist"),
                "Preorder Galaxy S24 Ultra",
                "Starting at $1,299.99. Trade in your old phone for credit toward the new Galaxy S24 Ultra.",
                "Shop Galaxy S24 Ultra",
                "https://www.samsung.com/us/smartphones/galaxy-s24-ultra/",
                "Ask about the Galaxy S24 Ultra..."
            ),
            new Product(
                "adidas-ultraboost-22",
                "adidas — Ultraboost 22",
                "Ultraboost 22 running shoes — responsive BOOST midsole, PRIMEKNIT upper and Continental Rubber outsole.",
                "Grow direct-to-consumer sales of Ultraboost 22",
                "Regular runners and daily-trainer sneaker shoppers",
                "Feel the energy return",
                "Ultraboost 22",
                "Responsive BOOST midsole, PRIMEKNIT+ upper and Continental Rubber grip for daily miles.",
                "https://commons.wikimedia.org/wiki/Special:FilePath/Adidas_Ultra_Boost_4_running_shoes.jpeg",
                "Engineered for everyday energy",
                "A recalibrated BOOST midsole delivers incredible energy return with every stride, a supportive PRIMEKNIT+ upper hugs your foot, and a Continental Rubber outsole grips wet or dry roads. Made with at least 50% Parley Ocean Plastic.",
                "https://commons.wikimedia.org/wiki/Special:FilePath/Adidas_Boost_Material_in_focus_on_Adidas_Sesame-Trace_Green_NMD_R1s.jpg",
                "BOOST midsole up close",
                "https://www.youtube.com/watch?v=cn22StdauXk",
                "Adidas Ultraboost 22 Review - Is There A Better Alternative? | FORDY RUNS",
                "What's your go-to run?",
                List.of("Easy recovery jog", "Tempo run", "Long distance", "Everyday miles"),
                "Get your pair",
                "Starting at $190. Free shipping and returns on adidas.com.",
                "Shop Ultraboost 22",
                "https://www.adidas.com/us/ultraboost_22-shoes",
                "Ask about the Ultraboost 22..."
            ),
            new Product(
                "rivian-r1t",
                "Rivian — R1T",
                "Rivian R1T electric adventure truck — up to 420 miles of range, 3.4s 0-60 mph, Quad-Motor AWD and Gear Tunnel storage.",
                "Generate configurator sessions and reservations for the R1T",
                "Outdoor-focused EV shoppers and truck upgraders",
                "Adventurous forever",
                "Rivian R1T",
                "Up to 420 miles of range, 3.4s 0-60 mph, Quad-Motor AWD and Gear Tunnel storage.",
                "https://commons.wikimedia.org/wiki/Special:FilePath/Rivian-r1t-2021.jpg",
                "Built for the trail and the highway",
                "Quad-Motor AWD with independent torque vectoring, adjustable air suspension, and a Gear Tunnel that runs clean through the frame. Whichever way you're headed, R1T is ready.",
                "https://commons.wikimedia.org/wiki/Special:FilePath/2022_Rivian_R1T_(in_Glacier_White),_front_6.21.22.jpg",
                "R1T, Glacier White",
                "https://www.youtube.com/watch?v=aS9dWwNG3Wk",
                "Pikes Peak Full Run | Gen 2 Quad-Motor R1T | Rivian",
                "Where would you take your R1T first?",
                List.of("Mountain trail", "Cross-country road trip", "Daily commute", "Overlanding trip"),
                "Reserve your R1T",
                "Starting at $69,900. Configure your R1T and reserve online in minutes.",
                "Configure R1T",
                "https://rivian.com/r1t",
                "Ask about the Rivian R1T..."
            )
        );
    }

    private void seed(Product p) {
        Campaign campaign = campaignRepository.findById(p.id()).orElseGet(() -> {
            Campaign created = new Campaign();
            created.setId(p.id());
            return created;
        });
        campaign.setName(p.name());
        campaign.setDescription(p.description());
        campaign.setObjective(p.objective());
        campaign.setAudience(p.audience());
        campaign.setStatus("ACTIVE");
        campaignRepository.save(campaign);

        String graphJson = serialize(buildGraph(p));
        Journey journey = journeyRepository.findFirstByCampaignIdOrderByCreatedAtAsc(p.id()).orElseGet(Journey::new);
        journey.setCampaignId(p.id());
        journey.setName(p.name() + " Journey");
        journey.setStatus("PUBLISHED");
        if (!graphJson.equals(journey.getGraphJson())) {
            journey.setGraphJson(graphJson);
            journey.setVersion(Math.max(1, journey.getVersion()) + 1);
        }
        journeyRepository.save(journey);
    }

    private Map<String, Object> buildGraph(Product p) {
        Map<String, Object> overview = screen("s1", "Overview", List.of("b1", "b2"), 420, 620, "See highlights", 80, 160);
        Map<String, Object> highlights = screen("s2", "Highlights", List.of("b3", "b4"), 420, 620, "Watch it in action", 560, 160);
        Map<String, Object> watch = screen("s3", "Watch", List.of("b5"), 400, 460, "Take a quick quiz", 1040, 160);
        Map<String, Object> quiz = screen("s4", "Quick question", List.of("b6"), 400, 460, "Continue", 1500, 160);
        Map<String, Object> cta = screen("s5", p.ctaHeadline(), List.of("b7", "b8", "b9"), 420, 560, "Finish", 1960, 160);

        Map<String, Object> trigger = node("trigger", "trigger", pos(-260, 190), Map.of());
        Map<String, Object> end = node("end", "end", pos(2440, 190), Map.of());

        Map<String, Object> b1 = node("b1", "hero_section", pos(0, 0), heroConfig(p));
        Map<String, Object> b2 = node("b2", "text", pos(0, 1), textConfig(p.factsBody()));
        Map<String, Object> b3 = node("b3", "image", pos(0, 0), imageConfig(p.galleryImage(), p.galleryCaption()));
        Map<String, Object> b4 = node("b4", "text", pos(0, 1), textConfig(p.factsHeadline() + ". " + p.factsBody()));
        Map<String, Object> b5 = node("b5", "video", pos(0, 0), videoConfig(p.videoUrl()));
        Map<String, Object> b6 = node("b6", "quiz", pos(0, 0), quizConfig(p.quizQuestion(), p.quizOptions()));
        Map<String, Object> b7 = node("b7", "hero_section", pos(0, 0), ctaHeroConfig(p));
        Map<String, Object> b8 = node("b8", "text", pos(0, 1), textConfig(p.ctaBody()));
        Map<String, Object> b9 = node("b9", "button", pos(0, 2), linkButtonConfig(p.ctaButtonLabel(), p.ctaHref()));

        Map<String, Object> graph = new LinkedHashMap<>();
        graph.put("schemaVersion", 3);
        graph.put("theme", theme());
        graph.put("askAi", askAi(p.askAiPlaceholder()));
        graph.put("screens", List.of(overview, highlights, watch, quiz, cta));
        graph.put("nodes", List.of(trigger, b1, b2, b3, b4, b5, b6, b7, b8, b9, end));
        graph.put("edges", List.of(
            edge("e-trigger-s1", "trigger", "s1", null),
            edge("e-s1-s2", "s1", "s2", "default"),
            edge("e-s2-s3", "s2", "s3", "default"),
            edge("e-s3-s4", "s3", "s4", "default"),
            edge("e-s4-s5", "s4", "s5", "default"),
            edge("e-s5-end", "s5", "end", "default")
        ));
        return graph;
    }

    private Map<String, Object> theme() {
        Map<String, Object> t = new LinkedHashMap<>();
        t.put("primary", "#4f46e5");
        t.put("accent", "#f97316");
        t.put("surface", "#ffffff");
        t.put("foreground", "#111827");
        t.put("font", "Inter");
        t.put("radius", 16);
        t.put("cta", "Continue");
        return t;
    }

    private Map<String, Object> askAi(String placeholder) {
        Map<String, Object> a = new LinkedHashMap<>();
        a.put("id", "ask-ai");
        a.put("placeholder", placeholder);
        a.put("buttonLabel", "Ask");
        a.put("refusalMessage", "This question is out of context.");
        a.put("ragK", 8);
        a.put("allowJourneyJump", true);
        a.put("allowRag", true);
        a.put("answerStyle", "thread");
        a.put("persistence", "session");
        a.put("scope", "global");
        a.put("pinnedPanel", true);
        a.put("allowPin", true);
        a.put("allowAdjust", true);
        a.put("maxConcurrentQueries", 3);
        a.put("historyLimit", 100);
        return a;
    }

    private Map<String, Object> pos(double x, double y) {
        Map<String, Object> p = new LinkedHashMap<>();
        p.put("x", x);
        p.put("y", y);
        return p;
    }

    private Map<String, Object> size(int width, int height) {
        Map<String, Object> s = new LinkedHashMap<>();
        s.put("width", width);
        s.put("height", height);
        return s;
    }

    private Map<String, Object> screen(String id, String name, List<String> blocks, int width, int height, String advanceLabel, double x, double y) {
        Map<String, Object> layout = new LinkedHashMap<>();
        layout.put("mode", "stack");
        layout.put("direction", "column");
        layout.put("gap", "16px");
        layout.put("padding", "16px");
        layout.put("align", "stretch");
        layout.put("justify", "start");
        layout.put("scroll", "auto");

        Map<String, Object> advance = new LinkedHashMap<>();
        advance.put("mode", "button");
        advance.put("handle", "default");
        advance.put("label", advanceLabel);
        advance.put("position", "bottom-sticky");
        advance.put("variant", "solid");
        advance.put("fullWidth", true);
        advance.put("requireValid", false);
        advance.put("requireBlocks", List.of());

        Map<String, Object> back = new LinkedHashMap<>();
        back.put("show", false);
        back.put("label", "Back");

        Map<String, Object> s = new LinkedHashMap<>();
        s.put("id", id);
        s.put("name", name);
        s.put("position", pos(x, y));
        s.put("size", size(width, height));
        s.put("blocks", blocks);
        s.put("layout", layout);
        s.put("advance", advance);
        s.put("back", back);
        return s;
    }

    private Map<String, Object> node(String id, String type, Map<String, Object> position, Map<String, Object> config) {
        Map<String, Object> n = new LinkedHashMap<>();
        n.put("id", id);
        n.put("type", type);
        n.put("position", position);
        n.put("config", config);
        return n;
    }

    private Map<String, Object> edge(String id, String source, String target, String handle) {
        Map<String, Object> e = new LinkedHashMap<>();
        e.put("id", id);
        e.put("source", source);
        e.put("target", target);
        e.put("sourceHandle", handle);
        return e;
    }

    private Map<String, Object> heroConfig(Product p) {
        Map<String, Object> c = new LinkedHashMap<>();
        c.put("badge", p.heroBadge());
        c.put("headline", p.heroHeadline());
        c.put("subheadline", p.heroSubheadline());
        c.put("image", p.heroImage());
        c.put("imagePosition", "right");
        c.put("ctas", List.of());
        return c;
    }

    private Map<String, Object> ctaHeroConfig(Product p) {
        Map<String, Object> c = new LinkedHashMap<>();
        c.put("badge", (Object) null);
        c.put("headline", p.ctaHeadline());
        c.put("subheadline", (Object) null);
        c.put("image", p.heroImage());
        c.put("imagePosition", "right");
        c.put("ctas", List.of());
        return c;
    }

    private Map<String, Object> textConfig(String content) {
        Map<String, Object> c = new LinkedHashMap<>();
        c.put("content", content);
        c.put("variant", "body");
        return c;
    }

    private Map<String, Object> imageConfig(String src, String alt) {
        Map<String, Object> c = new LinkedHashMap<>();
        c.put("src", src);
        c.put("alt", alt);
        c.put("aspectRatio", "4/3");
        return c;
    }

    private Map<String, Object> videoConfig(String url) {
        Map<String, Object> c = new LinkedHashMap<>();
        c.put("url", url);
        c.put("controls", true);
        c.put("autoplay", false);
        c.put("loop", false);
        return c;
    }

    private Map<String, Object> quizConfig(String question, List<String> options) {
        Map<String, Object> c = new LinkedHashMap<>();
        c.put("question", question);
        c.put("type", "mcq");
        List<Map<String, Object>> opts = options.stream().map(label -> {
            Map<String, Object> o = new LinkedHashMap<>();
            o.put("id", label.toLowerCase().replaceAll("[^a-z0-9]+", "-"));
            o.put("label", label);
            return (Map<String, Object>) o;
        }).toList();
        c.put("options", opts);
        c.put("allowSkip", true);
        c.put("skipLabel", "Skip question");
        c.put("submitMode", "instant");
        return c;
    }

    private Map<String, Object> linkButtonConfig(String label, String href) {
        Map<String, Object> c = new LinkedHashMap<>();
        c.put("label", label);
        c.put("variant", "solid");
        c.put("size", "lg");
        c.put("fullWidth", true);
        c.put("action", "link");
        c.put("href", href);
        return c;
    }

    private String serialize(Map<String, Object> graph) {
        try {
            return mapper.writeValueAsString(graph);
        } catch (Exception e) {
            throw new RuntimeException("failed to serialize seed graph", e);
        }
    }
}
