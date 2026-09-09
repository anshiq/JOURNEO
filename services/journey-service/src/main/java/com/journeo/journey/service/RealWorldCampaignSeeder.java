package com.journeo.journey.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.journeo.journey.entity.Campaign;
import com.journeo.journey.entity.Journey;
import com.journeo.journey.repository.CampaignRepository;
import com.journeo.journey.repository.JourneyRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.time.Instant;

@Component
public class RealWorldCampaignSeeder implements CommandLineRunner {
    private final CampaignRepository campaignRepository;
    private final JourneyRepository journeyRepository;
    private final ObjectMapper mapper = new ObjectMapper();
    @Value("${demo-data-seed:true}") private boolean enabled;
    @Value("${demo-data-reset:false}") private boolean reset;

    public RealWorldCampaignSeeder(CampaignRepository campaignRepository, JourneyRepository journeyRepository) {
        this.campaignRepository = campaignRepository;
        this.journeyRepository = journeyRepository;
    }

    record CampaignMeta(String id, String name, String description, String objective, String audience, String askAiPlaceholder) {}

    @Override
    public void run(String... args) {
        if (!enabled) return;
        if (reset) {
            journeyRepository.deleteAll();
            campaignRepository.deleteAll();
        }
        seed(new CampaignMeta(
            "apple-iphone-16-pro",
            "Apple — iPhone 16 Pro",
            "iPhone 16 Pro — A18 Pro chip, 48MP Fusion camera with 5x Telephoto, and Apple Intelligence built in.",
            "Drive qualified pre-orders and trade-ins for iPhone 16 Pro",
            "iOS upgraders and camera-first smartphone shoppers",
            "Ask about the iPhone 16 Pro..."
        ), buildAppleGraph());
        seed(new CampaignMeta(
            "nike-air-zoom-pegasus-41",
            "Nike — Air Zoom Pegasus 41",
            "Nike Air Zoom Pegasus 41 — ReactX foam midsole, dual Air Zoom units, and an engineered mesh upper for daily miles.",
            "Grow direct-to-consumer sales of the Pegasus 41",
            "Daily-trainer runners and everyday-mile sneaker shoppers",
            "Ask about the Pegasus 41..."
        ), buildNikeGraph());
        seed(new CampaignMeta(
            "tesla-model-y-2026",
            "Tesla — Model Y (2026)",
            "2026 Tesla Model Y — the Juniper-refreshed lineup, from Standard RWD to Performance AWD and the six-seat Model Y L.",
            "Generate configurator sessions and reservations for the 2026 Model Y",
            "EV shoppers comparing range, price, and trims",
            "Ask about the 2026 Model Y..."
        ), buildTeslaGraph());
    }

    private void seed(CampaignMeta m, Map<String, Object> graph) {
        Campaign campaign = campaignRepository.findById(m.id()).orElseGet(() -> {
            Campaign created = new Campaign();
            created.setId(m.id());
            return created;
        });
        campaign.setName(m.name());
        campaign.setDescription(m.description());
        campaign.setObjective(m.objective());
        campaign.setAudience(m.audience());
        campaign.setStatus("ACTIVE");
        campaign.setDeletedAt(null);
        campaign.setUpdatedAt(Instant.now());
        campaignRepository.save(campaign);

        graph.put("askAi", askAiFixture(m.askAiPlaceholder()));
        String graphJson = serialize(graph);
        Journey journey = journeyRepository.findFirstByCampaignIdOrderByCreatedAtAsc(m.id()).orElseGet(Journey::new);
        journey.setCampaignId(m.id());
        journey.setName(m.name() + " Journey");
        journey.setStatus("PUBLISHED");
        if (!graphJson.equals(journey.getGraphJson())) {
            journey.setGraphJson(graphJson);
            journey.setVersion(Math.max(1, journey.getVersion()) + 1);
        }
        journeyRepository.save(journey);
    }

    // ---------------------------------------------------------------------
    // Campaign 1 — Apple iPhone 16 Pro (12 screens)
    // ---------------------------------------------------------------------
    private Map<String, Object> buildAppleGraph() {
        String heroImg = commons("Camera_of_iPhone_16_Pro.jpg");
        String compareImg = commons("Compare_iPhone_16_Pro_with_the_iPhone_15_Pro.jpg");
        String maxImg = commons("IPhone_16_Pro_Max_(54252162478).jpg");
        String naturalImg = commons("Back_view_of_iPhone_16_Pro_Max_Natural_Titanium.jpg");
        String desertImg = commons("IPhone_16_Pro_Max_Desert_Titanium_Rear.png");
        String videoUrl = "https://www.youtube.com/watch?v=UUM8kcRFMCk";

        List<Map<String, Object>> screens = new ArrayList<>();
        List<Map<String, Object>> nodes = new ArrayList<>();
        List<Map<String, Object>> edges = new ArrayList<>();
        double x = -260;

        nodes.add(node("trigger", "trigger", pos(x, 220), Map.of()));
        nodes.add(node("ask-ai-node", "ask_ai", pos(x, -60), askAiNodeConfig("Ask about iPhone 16 Pro...")));
        x += 320;

        screens.add(screen("s1", "Welcome", List.of("b1"), 440, 560, "See what's new", x, 160));
        nodes.add(node("b1", "hero_section", pos(0, 0), heroConfig(
            "New", "iPhone 16 Pro", "Built for Apple Intelligence. A18 Pro chip inside.", heroImg, "right",
            List.of(ctaEntry("Learn more", "outline")),
            responsiveHero(maxImg, "left", compareImg, "right")
        )));
        x += 480;

        screens.add(screen("s2", "Performance", List.of("b2", "b3", "b4", "b24"), 440, 700, "See the camera", x, 160));
        nodes.add(node("b2", "text", pos(0, 0), textConfig("A18 Pro is built on a second-generation 3-nanometer process with smaller transistors for better efficiency and performance.")));
        nodes.add(node("b3", "divider", pos(0, 1), dividerConfig("horizontal", "Performance", "12px")));
        nodes.add(node("b4", "badge", pos(0, 2), badgeConfig("A18 Pro chip", "solid", true)));
        nodes.add(node("b24", "badge", pos(0, 3), badgeConfig("Up to 27 hrs video · 25W wireless / 45W wired charging", "soft", false)));
        x += 480;

        screens.add(screen("s3", "Camera", List.of("b5", "b6"), 440, 620, "Compare with iPhone 15 Pro", x, 160));
        nodes.add(node("b5", "image", pos(0, 0), imageConfig(heroImg, "Rear camera system of the iPhone 16 Pro", "4/3", "center",
            responsiveImage(maxImg, "iPhone 16 Pro Max camera detail", null))));
        nodes.add(node("b6", "text", pos(0, 1), textConfig("48MP Fusion main camera with a faster quad-pixel sensor for 4K 120fps Dolby Vision, a new 48MP Ultra Wide with macro, and a 5x Telephoto camera on both Pro models.")));
        x += 480;

        screens.add(screen("s4", "Compare", List.of("b7"), 440, 560, "Watch the film", x, 160));
        nodes.add(node("b7", "image", pos(0, 0), imageConfig(compareImg, "iPhone 16 Pro compared with the iPhone 15 Pro", "4/3", "center", null)));
        x += 480;

        screens.add(screen("s5", "Watch", List.of("b8"), 420, 480, "Configure yours", x, 160));
        nodes.add(node("b8", "video", pos(0, 0), videoConfig(videoUrl, null, null, null)));
        x += 480;

        screens.add(screen("s6", "Configure", List.of("b9", "b10"), 420, 560, "Pick a finish", x, 160));
        nodes.add(node("b9", "select", pos(0, 0), selectConfig("Storage", "Choose storage", List.of(
            opt("128gb", "128GB — from $999"), opt("256gb", "256GB — from $1,099"),
            opt("512gb", "512GB — from $1,299"), opt("1tb", "1TB — from $1,499")
        ), false, true)));
        nodes.add(node("b10", "checkbox", pos(0, 1), checkboxGroupConfig("AppleCare+", List.of(
            opt("applecare", "Add AppleCare+ coverage")
        ), 0, 1)));
        x += 480;

        screens.add(screen("s7", "Finishes", List.of("b11", "b23", "b25", "b12"), 440, 820, "Continue", x, 160));
        nodes.add(node("b11", "card", pos(0, 0), cardCarouselConfig("vertical", List.of(heroImg, maxImg, compareImg, naturalImg, desertImg), "New", "Desert Titanium", "A titanium design in a new finish.", List.of(ctaEntry("Learn more", "outline")))));
        nodes.add(node("b23", "select", pos(0, 1), selectConfig("Color", "Choose a finish", List.of(
            opt("black-titanium", "Black Titanium"), opt("white-titanium", "White Titanium"),
            opt("natural-titanium", "Natural Titanium"), opt("desert-titanium", "Desert Titanium")
        ), false, true)));
        nodes.add(node("b25", "image", pos(0, 2), imageConfig(desertImg, "iPhone 16 Pro Max in Desert Titanium", "4/3", "center",
            responsiveImage(naturalImg, "iPhone 16 Pro Max in Natural Titanium", null))));
        nodes.add(node("b12", "rating", pos(0, 3), ratingConfig("How much do you like this finish?", 5, "star", false, false)));
        x += 480;

        double condX = x;
        nodes.add(node("cond1", "condition", pos(condX, 220), conditionConfig("device", "eq", "mobile", List.of(branch("mobile", "eq", "mobile")), "desktop")));
        x += 380;

        screens.add(screen("s8a", "Mobile Offer", List.of("b13"), 400, 360, "Continue", x, 20));
        nodes.add(node("b13", "alert", pos(0, 0), alertConfig("info", "Quick checkout", "Apple Pay checkout is ready right on your phone.", 6000, null, true)));

        screens.add(screen("s8b", "Desktop Offer", List.of("b14"), 400, 360, "Continue", x, 340));
        nodes.add(node("b14", "alert", pos(0, 0), alertConfig("info", "Full configurator", "Open the full configurator on iPhone, iPad, or Mac to compare every finish.", null, null, false)));
        x += 480;

        screens.add(screen("s9", "Trade-in bonus", List.of("b15", "b16"), 420, 480, "Take the quiz", x, 160));
        nodes.add(node("b15", "countdown", pos(0, 0), countdownConfig("2026-10-15T23:59:59Z", "Trade-in bonus ends in", "Trade-in bonus has ended")));
        nodes.add(node("b16", "text", pos(0, 1), textConfig("Trade in your current phone for credit toward iPhone 16 Pro.")));
        x += 480;

        screens.add(screen("s10", "Quick question", List.of("b17"), 420, 520, "Tell us about you", x, 160));
        nodes.add(node("b17", "quiz", pos(0, 0), quizConfig("Which Apple Intelligence feature excites you most?", List.of(
            quizOpt("circle-to-search", "Circle to Search", true, 1),
            quizOpt("live-translate", "Live Translate", true, 1),
            quizOpt("note-assist", "Note Assist", true, 1),
            quizOpt("photo-assist", "Photo Assist", true, 1)
        ), true, true)));
        x += 480;

        screens.add(screen("s11", "Contact", List.of("b18"), 440, 560, "See your order", x, 160));
        nodes.add(node("b18", "form", pos(0, 0), formConfig(List.of(
            formField("name", "input", "Full name", null, true, null, null),
            formField("email", "input", "Email address", null, true, null, null),
            formField("wantsTradeIn", "checkbox", "I want to trade in my current phone", null, false, null, null),
            formField("tradeInModel", "input", "Current phone model", "e.g. iPhone 13", false, null, visibleWhen("wantsTradeIn", "eq", true))
        ), "Continue", false)));
        x += 480;

        screens.add(screen("s12", "Preorder", List.of("b19", "b20", "b21"), 440, 620, "Finish", x, 160));
        nodes.add(node("b19", "hero_section", pos(0, 0), heroConfig(null, "Preorder iPhone 16 Pro", "Starting at $999. iPhone 16 Pro Max starts at $1,199.", maxImg, "right", List.of(), null)));
        nodes.add(node("b20", "input", pos(0, 1), inputConfig("email", "you@example.com", "Email for order updates", true, true)));
        nodes.add(node("b21", "badge", pos(0, 2), badgeConfig("Only at apple.com", "outline", false)));
        Map<String, Object> b22 = node("b22", "button", pos(0, 3), linkButtonConfig("Shop iPhone 16 Pro", "https://www.apple.com/iphone-16-pro/"));
        screens.get(screens.size() - 1).put("blocks", List.of("b19", "b20", "b21", "b22"));
        nodes.add(b22);
        x += 480;

        nodes.add(node("end", "end", pos(x, 220), endConfig(null, "https://www.apple.com/iphone-16-pro/", 1500, null)));

        edges.add(edge("e-trigger-s1", "trigger", "s1", null));
        edges.add(edge("e-s1-s2", "s1", "s2", "default"));
        edges.add(edge("e-s2-s3", "s2", "s3", "default"));
        edges.add(edge("e-s3-s4", "s3", "s4", "default"));
        edges.add(edge("e-s4-s5", "s4", "s5", "default"));
        edges.add(edge("e-s5-s6", "s5", "s6", "default"));
        edges.add(edge("e-s6-s7", "s6", "s7", "default"));
        edges.add(edge("e-s7-cond1", "s7", "cond1", "default"));
        edges.add(edge("e-cond1-s8a", "cond1", "s8a", "mobile"));
        edges.add(edge("e-cond1-s8b", "cond1", "s8b", "desktop"));
        edges.add(edge("e-s8a-s9", "s8a", "s9", "default"));
        edges.add(edge("e-s8b-s9", "s8b", "s9", "default"));
        edges.add(edge("e-s9-s10", "s9", "s10", "default"));
        edges.add(edge("e-s10-s11", "s10", "s11", "default"));
        edges.add(edge("e-s11-s12", "s11", "s12", "default"));
        edges.add(edge("e-s12-end", "s12", "end", "default"));

        return graph(screens, nodes, edges);
    }

    // ---------------------------------------------------------------------
    // Campaign 2 — Nike Air Zoom Pegasus 41 (11 screens)
    // ---------------------------------------------------------------------
    private Map<String, Object> buildNikeGraph() {
        String shoeImg = commons("Nike_Zoom_Pegasus_38_running_shoe.jpg");
        String nikeShoes2Img = commons("Nike_shoes_2.jpg");
        String videoUrl = "https://www.youtube.com/watch?v=HiwUNVgsYBI";

        List<Map<String, Object>> screens = new ArrayList<>();
        List<Map<String, Object>> nodes = new ArrayList<>();
        List<Map<String, Object>> edges = new ArrayList<>();
        double x = -260;

        nodes.add(node("trigger", "trigger", pos(x, 220), Map.of()));
        nodes.add(node("ask-ai-node", "ask_ai", pos(x, -60), askAiNodeConfig("Ask about the Pegasus 41...")));
        x += 320;

        screens.add(screen("s1", "Welcome", List.of("b1"), 440, 540, "See what's new", x, 160));
        nodes.add(node("b1", "hero_section", pos(0, 0), heroConfig("New", "Nike Air Zoom Pegasus 41", "ReactX foam. Dual Air Zoom. Ready for every mile.", shoeImg, "right", List.of(ctaEntry("Learn more", "outline")), null)));
        x += 480;

        screens.add(screen("s2", "Midsole", List.of("b2", "b3", "b4"), 440, 580, "See the upper", x, 160));
        nodes.add(node("b2", "text", pos(0, 0), textConfig("The Pegasus 41 features ReactX, Nike's all-new midsole foam that's 13% more responsive than previous foams, with dual Air Zoom units in the heel and forefoot.")));
        nodes.add(node("b3", "divider", pos(0, 1), dividerConfig("horizontal", "New foam", null)));
        nodes.add(node("b4", "badge", pos(0, 2), badgeConfig("13% more responsive", "soft", true)));
        x += 480;

        screens.add(screen("s3", "Upper & fit", List.of("b5", "b6", "b20"), 440, 700, "Watch the review", x, 160));
        nodes.add(node("b5", "image", pos(0, 0), imageConfig(shoeImg, "Nike Air Zoom Pegasus running shoe", "4/3", "center",
            responsiveImage(nikeShoes2Img, "Nike running shoes detail view", null))));
        nodes.add(node("b6", "text", pos(0, 1), textConfig("An upgraded engineered mesh upper enhances breathability, with a plush tongue and sockliner for instant comfort.")));
        nodes.add(node("b20", "text", pos(0, 2), textConfig("Available in a range of colorways including Blueprint, the electric Racer Blue (new for 2025), Ashen Slate/Armory, Summit White/Bright Crimson/Glacier, and Black/Anthracite/Black.")));
        x += 480;

        screens.add(screen("s4", "Watch", List.of("b7"), 420, 480, "Check the numbers", x, 160));
        nodes.add(node("b7", "video", pos(0, 0), videoConfig(videoUrl, null, null, null)));
        x += 480;

        screens.add(screen("s5", "Specs", List.of("b8", "b9", "b21"), 420, 600, "Pick your size", x, 160));
        nodes.add(node("b8", "text", pos(0, 0), textConfig("Stack height: 37mm heel / 27mm forefoot, 10mm heel-to-toe drop. Weight: ~8.8oz (women's 8) / ~10.4oz (men's 9). Priced at $140.")));
        nodes.add(node("b9", "rating", pos(0, 1), ratingConfig("How does the cushioning feel to you?", 5, "heart", true, false)));
        nodes.add(node("b21", "badge", pos(0, 2), badgeConfig("5.0★ on Foot Locker (891 reviews) · 4.6 on Running Warehouse", "soft", false)));
        x += 480;

        screens.add(screen("s6", "Size & fit", List.of("b10", "b11"), 420, 560, "Continue", x, 160));
        nodes.add(node("b10", "select", pos(0, 0), selectConfig("Size", "Choose your US size", List.of(
            opt("8", "US 8"), opt("9", "US 9"), opt("10", "US 10"), opt("11", "US 11"), opt("12", "US 12"), opt("13", "US 13")
        ), true, true)));
        nodes.add(node("b11", "checkbox", pos(0, 1), checkboxGroupConfig("Width", List.of(
            opt("narrow", "Narrow"), opt("standard", "Standard"), opt("wide", "Wide")
        ), 1, 1)));
        x += 480;

        double condX = x;
        nodes.add(node("cond2", "condition", pos(condX, 220), conditionConfig("device", "eq", "mobile", List.of(branch("mobile", "eq", "mobile")), "desktop")));
        x += 380;

        screens.add(screen("s7a", "Quick buy", List.of("b12"), 400, 340, "Continue", x, 20));
        nodes.add(node("b12", "alert", pos(0, 0), alertConfig("success", "Ready to ship", "Buy now on your phone — ships in 2 days.", 5000, null, true)));

        screens.add(screen("s7b", "Compare sizes", List.of("b13"), 420, 420, "Continue", x, 340));
        nodes.add(node("b13", "card", pos(0, 0), cardCarouselConfig("horizontal", List.of(shoeImg, nikeShoes2Img), null, "Pegasus vs. your last pair", "See how the ReactX midsole stacks up.", List.of(ctaEntry("Compare", "outline")))));
        x += 480;

        screens.add(screen("s8", "Quick question", List.of("b14"), 420, 480, "Get updates", x, 160));
        nodes.add(node("b14", "quiz", pos(0, 0), quizConfig("What's your go-to run?", List.of(
            quizOpt("easy-recovery-jog", "Easy recovery jog", false, 0),
            quizOpt("tempo-run", "Tempo run", false, 0),
            quizOpt("long-distance", "Long distance", false, 0),
            quizOpt("everyday-miles", "Everyday miles", false, 0)
        ), true, false)));
        x += 480;

        screens.add(screen("s9", "Stay in the loop", List.of("b15"), 420, 460, "See the offer", x, 160));
        nodes.add(node("b15", "form", pos(0, 0), formConfig(List.of(
            formField("email", "input", "Email address", null, true, null, null),
            formField("notifyRestock", "checkbox", "Notify me about restocks and drops", null, false, null, null)
        ), "Continue", false)));
        x += 480;

        screens.add(screen("s10", "Member pricing", List.of("b16"), 420, 440, "Finish up", x, 160));
        nodes.add(node("b16", "countdown", pos(0, 0), countdownConfig("2026-10-01T23:59:59Z", "Member pricing ends in", "Member pricing has ended")));
        x += 480;

        screens.add(screen("s11", "Checkout", List.of("b17", "b18", "b19"), 440, 560, "Finish", x, 160));
        nodes.add(node("b17", "input", pos(0, 0), inputConfig("email", "you@example.com", "Email for order updates", true, true)));
        nodes.add(node("b18", "badge", pos(0, 1), badgeConfig("Free shipping & returns", "outline", false)));
        nodes.add(node("b19", "button", pos(0, 2), linkButtonConfig("Shop Air Zoom Pegasus 41", "https://www.nike.com/t/air-zoom-pegasus-41-road-running-shoes")));
        x += 480;

        nodes.add(node("end", "end", pos(x, 220), endConfig(null, "https://www.nike.com/t/air-zoom-pegasus-41-road-running-shoes", 1500, null)));

        edges.add(edge("e-trigger-s1", "trigger", "s1", null));
        edges.add(edge("e-s1-s2", "s1", "s2", "default"));
        edges.add(edge("e-s2-s3", "s2", "s3", "default"));
        edges.add(edge("e-s3-s4", "s3", "s4", "default"));
        edges.add(edge("e-s4-s5", "s4", "s5", "default"));
        edges.add(edge("e-s5-s6", "s5", "s6", "default"));
        edges.add(edge("e-s6-cond2", "s6", "cond2", "default"));
        edges.add(edge("e-cond2-s7a", "cond2", "s7a", "mobile"));
        edges.add(edge("e-cond2-s7b", "cond2", "s7b", "desktop"));
        edges.add(edge("e-s7a-s8", "s7a", "s8", "default"));
        edges.add(edge("e-s7b-s8", "s7b", "s8", "default"));
        edges.add(edge("e-s8-s9", "s8", "s9", "default"));
        edges.add(edge("e-s9-s10", "s9", "s10", "default"));
        edges.add(edge("e-s10-s11", "s10", "s11", "default"));
        edges.add(edge("e-s11-end", "s11", "end", "default"));

        return graph(screens, nodes, edges);
    }

    // ---------------------------------------------------------------------
    // Campaign 3 — Tesla Model Y 2026 (11 screens)
    // ---------------------------------------------------------------------
    private Map<String, Object> buildTeslaGraph() {
        String frontImg = commons("Tesla_Model_Y_Front_View.jpg");
        String cosmicImg = commons("Tesla_Model_Y_L_Premium_Long_Range_AWD_Cosmic_Silver_01.jpg");
        String interiorImg = commons("Tesla_Model_Y_2025_interior.jpg");
        String dsc8297Img = commons("Tesla_Model_Y_(2025)_DSC_8297.jpg");
        String videoUrl = "https://www.youtube.com/watch?v=i1Mah46LHIc";

        List<Map<String, Object>> screens = new ArrayList<>();
        List<Map<String, Object>> nodes = new ArrayList<>();
        List<Map<String, Object>> edges = new ArrayList<>();
        double x = -260;

        nodes.add(node("trigger", "trigger", pos(x, 220), Map.of()));
        nodes.add(node("ask-ai-node", "ask_ai", pos(x, -60), askAiNodeConfig("Ask about the 2026 Model Y...")));
        x += 320;

        screens.add(screen("s1", "Welcome", List.of("b1"), 440, 540, "See the lineup", x, 160));
        nodes.add(node("b1", "hero_section", pos(0, 0), heroConfig("2026", "Tesla Model Y", "The Juniper refresh. Six configurations, one mission.", frontImg, "right", List.of(ctaEntry("Learn more", "outline")), null)));
        x += 480;

        screens.add(screen("s2", "Lineup", List.of("b2", "b3", "b20"), 440, 700, "See what's new", x, 160));
        nodes.add(node("b2", "text", pos(0, 0), textConfig("Standard RWD $39,990 (321mi, 0-60 in 6.8s) · Standard AWD $41,990 (294mi) · Premium RWD $45,990 (357mi, longest range) · Premium AWD $49,990 (327mi, 0-60 in 4.6s) · Performance AWD $57,990 (306mi, 0-60 in 3.3s) · Model Y L Launch Series $61,990 (six-seat, 325mi, 0-60 in 4.4s).")));
        nodes.add(node("b3", "divider", pos(0, 1), dividerConfig("horizontal", "Configurations", null)));
        nodes.add(node("b20", "badge", pos(0, 2), badgeConfig("9 exterior colors · 10 interior colors · from $41,290 with destination", "outline", false)));
        x += 480;

        screens.add(screen("s3", "What's new", List.of("b4", "b5", "b18", "b19"), 440, 780, "Watch the walkthrough", x, 160));
        nodes.add(node("b4", "image", pos(0, 0), imageConfig(cosmicImg, "2026 Tesla Model Y L Premium Long Range AWD in Cosmic Silver", "4/3", "center", null)));
        nodes.add(node("b5", "badge", pos(0, 1), badgeConfig("2025 Juniper refresh", "solid", false)));
        nodes.add(node("b18", "image", pos(0, 2), imageConfig(interiorImg, "Tesla Model Y interior and dashboard", "4/3", "center",
            responsiveImage(dsc8297Img, "Tesla Model Y (2025) interior detail", null))));
        nodes.add(node("b19", "text", pos(0, 3), textConfig("Heated and ventilated front seats, power door locks and windows, push-button start, navigation, parking sensors, and premium connectivity.")));
        x += 480;

        screens.add(screen("s4", "Watch", List.of("b6"), 420, 480, "Pick your configuration", x, 160));
        nodes.add(node("b6", "video", pos(0, 0), videoConfig(videoUrl, null, null, null)));
        x += 480;

        screens.add(screen("s5", "Choose configuration", List.of("b7"), 440, 520, "Add options", x, 160));
        nodes.add(node("b7", "select", pos(0, 0), selectConfig("Configuration", "Choose a configuration", List.of(
            opt("standard-rwd", "Standard RWD — $39,990 · 321mi"),
            opt("standard-awd", "Standard AWD — $41,990 · 294mi"),
            opt("premium-rwd", "Premium RWD — $45,990 · 357mi"),
            opt("premium-awd", "Premium AWD — $49,990 · 327mi"),
            opt("performance-awd", "Performance AWD — $57,990 · 306mi"),
            opt("model-y-l", "Model Y L Launch Series — $61,990 · 325mi")
        ), true, true)));
        x += 480;

        screens.add(screen("s6", "Options", List.of("b8", "b9"), 420, 580, "Continue", x, 160));
        nodes.add(node("b8", "checkbox", pos(0, 0), checkboxGroupConfig("Add-ons", List.of(
            opt("tow-hitch", "Tow hitch"), opt("fsd", "Full Self-Driving (Supervised)"), opt("premium-interior", "Premium interior")
        ), 0, 3)));
        nodes.add(node("b9", "rating", pos(0, 1), ratingConfig("How important is range to you?", 5, "star", false, false)));
        x += 480;

        double condX = x;
        nodes.add(node("cond3", "condition", pos(condX, 220), conditionConfig("device", "eq", "mobile", List.of(branch("mobile", "eq", "mobile")), "desktop")));
        x += 380;

        screens.add(screen("s7a", "Reserve on mobile", List.of("b10"), 400, 340, "Continue", x, 20));
        nodes.add(node("b10", "alert", pos(0, 0), alertConfig("info", "Reserve with the app", "Reserve your Model Y right from the Tesla app.", 6000, null, true)));

        screens.add(screen("s7b", "Full configurator", List.of("b11"), 420, 420, "Continue", x, 340));
        nodes.add(node("b11", "card", pos(0, 0), cardCarouselConfig("overlay", List.of(frontImg, cosmicImg, interiorImg, dsc8297Img), null, "Design yours online", "Open the full configurator to compare colors, wheels, and interiors.", List.of(ctaEntry("Open configurator", "solid")))));
        x += 480;

        screens.add(screen("s8", "Quick question", List.of("b12"), 420, 480, "Get your quote", x, 160));
        nodes.add(node("b12", "quiz", pos(0, 0), quizConfig("Where would you take your Model Y first?", List.of(
            quizOpt("mountain-trail", "Mountain trail", false, 0),
            quizOpt("road-trip", "Cross-country road trip", false, 0),
            quizOpt("daily-commute", "Daily commute", false, 0),
            quizOpt("overlanding", "Overlanding trip", false, 0)
        ), true, false)));
        x += 480;

        screens.add(screen("s9", "Reserve today", List.of("b13"), 420, 440, "Tell us about you", x, 160));
        nodes.add(node("b13", "countdown", pos(0, 0), countdownConfig("2026-11-01T23:59:59Z", "Reserve before this price updates in", "Pricing has updated")));
        x += 480;

        screens.add(screen("s10", "Your details", List.of("b14"), 440, 620, "See your reservation", x, 160));
        nodes.add(node("b14", "form", pos(0, 0), formConfig(List.of(
            formField("name", "input", "Full name", null, true, null, null),
            formField("email", "input", "Email address", null, true, null, null),
            formField("zipCode", "input", "ZIP code", null, true, null, null),
            formField("wantsTestDrive", "checkbox", "I'd like to schedule a test drive", null, false, null, null),
            formField("preferredConfig", "input", "Preferred configuration", "e.g. Long Range AWD", false, null, visibleWhen("wantsTestDrive", "eq", true))
        ), "Continue", false)));
        x += 480;

        screens.add(screen("s11", "Reserve", List.of("b15", "b16", "b17"), 440, 600, "Finish", x, 160));
        nodes.add(node("b15", "input", pos(0, 0), inputConfig("email", "you@example.com", "Email for reservation updates", true, true)));
        nodes.add(node("b16", "badge", pos(0, 1), badgeConfig("$250 refundable deposit", "outline", false)));
        nodes.add(node("b17", "button", pos(0, 2), linkButtonConfig("Configure Model Y", "https://www.tesla.com/modely")));
        x += 480;

        nodes.add(node("end", "end", pos(x, 220), endConfig(null, "https://www.tesla.com/modely", 1500, null)));

        edges.add(edge("e-trigger-s1", "trigger", "s1", null));
        edges.add(edge("e-s1-s2", "s1", "s2", "default"));
        edges.add(edge("e-s2-s3", "s2", "s3", "default"));
        edges.add(edge("e-s3-s4", "s3", "s4", "default"));
        edges.add(edge("e-s4-s5", "s4", "s5", "default"));
        edges.add(edge("e-s5-s6", "s5", "s6", "default"));
        edges.add(edge("e-s6-cond3", "s6", "cond3", "default"));
        edges.add(edge("e-cond3-s7a", "cond3", "s7a", "mobile"));
        edges.add(edge("e-cond3-s7b", "cond3", "s7b", "desktop"));
        edges.add(edge("e-s7a-s8", "s7a", "s8", "default"));
        edges.add(edge("e-s7b-s8", "s7b", "s8", "default"));
        edges.add(edge("e-s8-s9", "s8", "s9", "default"));
        edges.add(edge("e-s9-s10", "s9", "s10", "default"));
        edges.add(edge("e-s10-s11", "s10", "s11", "default"));
        edges.add(edge("e-s11-end", "s11", "end", "default"));

        return graph(screens, nodes, edges);
    }

    // ---------------------------------------------------------------------
    // Shared plumbing
    // ---------------------------------------------------------------------
    private String commons(String filename) {
        return "https://commons.wikimedia.org/wiki/Special:FilePath/" + filename;
    }

    private Map<String, Object> graph(List<Map<String, Object>> screens, List<Map<String, Object>> nodes, List<Map<String, Object>> edges) {
        Map<String, Object> g = new LinkedHashMap<>();
        g.put("schemaVersion", 3);
        g.put("theme", theme());
        g.put("screens", screens);
        g.put("nodes", nodes);
        g.put("edges", edges);
        return g;
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

    private Map<String, Object> askAiFixture(String placeholder) {
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
        a.put("pinnedPanel", true);
        a.put("allowPin", true);
        a.put("allowAdjust", true);
        a.put("maxConcurrentQueries", 3);
        a.put("historyLimit", 100);
        return a;
    }

    private Map<String, Object> askAiNodeConfig(String placeholder) {
        Map<String, Object> c = new LinkedHashMap<>();
        c.put("placeholder", placeholder);
        c.put("buttonLabel", "Ask");
        c.put("refusalMessage", "This question is out of context.");
        c.put("ragK", 8);
        c.put("allowJourneyJump", true);
        c.put("allowRag", true);
        c.put("suggestedQuestions", List.of());
        Map<String, Object> placement = new LinkedHashMap<>();
        placement.put("mobile", "floating");
        placement.put("tablet", "floating");
        placement.put("desktop", "pinned");
        c.put("responsivePlacement", placement);
        return c;
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

    // ---------------------------------------------------------------------
    // Node config builders
    // ---------------------------------------------------------------------
    private Map<String, Object> ctaEntry(String label, String variant) {
        Map<String, Object> c = new LinkedHashMap<>();
        c.put("label", label);
        c.put("variant", variant);
        return c;
    }

    private Map<String, Object> responsiveHero(String mobileImage, String mobilePosition, String tabletImage, String tabletPosition) {
        Map<String, Object> r = new LinkedHashMap<>();
        Map<String, Object> mobile = new LinkedHashMap<>();
        mobile.put("image", mobileImage);
        mobile.put("imagePosition", mobilePosition);
        Map<String, Object> tablet = new LinkedHashMap<>();
        tablet.put("image", tabletImage);
        tablet.put("imagePosition", tabletPosition);
        r.put("mobile", mobile);
        r.put("tablet", tablet);
        return r;
    }

    private Map<String, Object> responsiveImage(String mobileSrc, String mobileAlt, String focalPoint) {
        Map<String, Object> r = new LinkedHashMap<>();
        Map<String, Object> mobile = new LinkedHashMap<>();
        mobile.put("src", mobileSrc);
        mobile.put("alt", mobileAlt);
        if (focalPoint != null) mobile.put("focalPoint", focalPoint);
        r.put("mobile", mobile);
        return r;
    }

    private Map<String, Object> heroConfig(String badge, String headline, String subheadline, String image, String imagePosition, List<Map<String, Object>> ctas, Map<String, Object> responsive) {
        Map<String, Object> c = new LinkedHashMap<>();
        c.put("badge", badge);
        c.put("headline", headline);
        c.put("subheadline", subheadline);
        c.put("image", image);
        c.put("imagePosition", imagePosition);
        c.put("ctas", ctas);
        if (responsive != null) c.put("responsive", responsive);
        return c;
    }

    private Map<String, Object> textConfig(String content) {
        Map<String, Object> c = new LinkedHashMap<>();
        c.put("content", content);
        c.put("variant", "body");
        c.put("style", responsiveStyle());
        return c;
    }

    private Map<String, Object> imageConfig(String src, String alt, String aspectRatio, String focalPoint, Map<String, Object> responsive) {
        Map<String, Object> c = new LinkedHashMap<>();
        c.put("src", src);
        c.put("alt", alt);
        c.put("aspectRatio", aspectRatio);
        if (focalPoint != null) c.put("focalPoint", focalPoint);
        if (responsive != null) c.put("responsive", responsive);
        c.put("style", responsiveMediaStyle());
        return c;
    }

    private Map<String, Object> videoConfig(String url, String poster, Boolean autoplay, Boolean loop) {
        Map<String, Object> c = new LinkedHashMap<>();
        c.put("url", url);
        c.put("poster", poster);
        c.put("controls", true);
        c.put("autoplay", Boolean.TRUE.equals(autoplay));
        c.put("loop", Boolean.TRUE.equals(loop));
        c.put("style", responsiveStyle());
        return c;
    }

    private Map<String, Object> opt(String value, String label) {
        Map<String, Object> o = new LinkedHashMap<>();
        o.put("value", value);
        o.put("label", label);
        return o;
    }

    private Map<String, Object> selectConfig(String label, String placeholder, List<Map<String, Object>> options, boolean searchable, boolean required) {
        Map<String, Object> c = new LinkedHashMap<>();
        c.put("label", label);
        c.put("placeholder", placeholder);
        c.put("options", options);
        c.put("searchable", searchable);
        c.put("required", required);
        c.put("blockKey", "field_" + label.toLowerCase().replaceAll("[^a-z0-9]+", "_"));
        c.put("style", responsiveStyle());
        return c;
    }

    private Map<String, Object> checkboxGroupConfig(String label, List<Map<String, Object>> group, int minSelected, int maxSelected) {
        Map<String, Object> c = new LinkedHashMap<>();
        c.put("label", label);
        c.put("group", group);
        c.put("minSelected", minSelected);
        c.put("maxSelected", maxSelected);
        c.put("blockKey", "field_" + label.toLowerCase().replaceAll("[^a-z0-9]+", "_"));
        c.put("style", responsiveStyle());
        return c;
    }

    private Map<String, Object> ratingConfig(String label, int max, String icon, boolean allowHalf, boolean readOnly) {
        Map<String, Object> c = new LinkedHashMap<>();
        c.put("label", label);
        c.put("value", 0);
        c.put("max", max);
        c.put("icon", icon);
        c.put("allowHalf", allowHalf);
        c.put("readOnly", readOnly);
        c.put("blockKey", "field_" + label.toLowerCase().replaceAll("[^a-z0-9]+", "_"));
        c.put("style", responsiveStyle());
        return c;
    }

    private Map<String, Object> dividerConfig(String orientation, String label, String mobileSpacing) {
        Map<String, Object> c = new LinkedHashMap<>();
        c.put("orientation", orientation);
        if (label != null) c.put("label", label);
        if (mobileSpacing != null) {
            Map<String, Object> r = new LinkedHashMap<>();
            Map<String, Object> mobile = new LinkedHashMap<>();
            mobile.put("spacing", mobileSpacing);
            r.put("mobile", mobile);
            c.put("responsive", r);
        }
        return c;
    }

    private Map<String, Object> cardCarouselConfig(String layout, List<String> images, String badge, String title, String description, List<Map<String, Object>> actions) {
        Map<String, Object> c = new LinkedHashMap<>();
        c.put("layout", layout);
        c.put("images", images);
        c.put("carousel", images.size() > 1);
        if (badge != null) c.put("badge", badge);
        c.put("title", title);
        c.put("description", description);
        c.put("actions", actions);
        return c;
    }

    private Map<String, Object> branch(String handle, String operator, Object value) {
        Map<String, Object> b = new LinkedHashMap<>();
        b.put("handle", handle);
        b.put("operator", operator);
        b.put("value", value);
        return b;
    }

    private Map<String, Object> conditionConfig(String field, String operator, Object value, List<Map<String, Object>> branches, String elseHandle) {
        Map<String, Object> c = new LinkedHashMap<>();
        c.put("field", field);
        c.put("operator", operator);
        c.put("value", value);
        c.put("branches", branches);
        c.put("elseHandle", elseHandle);
        return c;
    }

    private Map<String, Object> quizOpt(String id, String label, boolean correct, int score) {
        Map<String, Object> o = new LinkedHashMap<>();
        o.put("id", id);
        o.put("label", label);
        o.put("correct", correct);
        o.put("score", score);
        return o;
    }

    private Map<String, Object> quizConfig(String question, List<Map<String, Object>> options, boolean randomizeOrder, boolean showFeedback) {
        Map<String, Object> c = new LinkedHashMap<>();
        c.put("question", question);
        c.put("type", "mcq");
        c.put("options", options);
        c.put("allowSkip", true);
        c.put("skipLabel", "Skip question");
        c.put("submitMode", "instant");
        c.put("randomizeOrder", randomizeOrder);
        c.put("showFeedback", showFeedback);
        c.put("style", responsiveStyle());
        return c;
    }

    private Map<String, Object> visibleWhen(String field, String operator, Object value) {
        Map<String, Object> v = new LinkedHashMap<>();
        v.put("field", field);
        v.put("operator", operator);
        v.put("value", value);
        return v;
    }

    private Map<String, Object> formField(String id, String type, String label, String placeholder, boolean required, List<Map<String, Object>> options, Map<String, Object> visibleWhen) {
        Map<String, Object> f = new LinkedHashMap<>();
        f.put("id", id);
        f.put("type", type);
        f.put("label", label);
        if (placeholder != null) f.put("placeholder", placeholder);
        f.put("required", required);
        if (options != null) f.put("options", options);
        if (visibleWhen != null) f.put("visibleWhen", visibleWhen);
        return f;
    }

    private Map<String, Object> formConfig(List<Map<String, Object>> fields, String submitLabel, boolean multiStep) {
        Map<String, Object> c = new LinkedHashMap<>();
        c.put("fields", fields);
        c.put("submitLabel", submitLabel);
        c.put("multiStep", multiStep);
        c.put("style", responsiveStyle());
        return c;
    }

    private Map<String, Object> countdownConfig(String endTime, String label, String expiredMessage) {
        Map<String, Object> c = new LinkedHashMap<>();
        c.put("endTime", endTime);
        c.put("label", label);
        c.put("showLabel", true);
        c.put("size", "md");
        c.put("sizeMode", "auto");
        c.put("expiredMessage", expiredMessage);
        c.put("showExpiredMessage", true);
        c.put("onExpire", "advance");
        return c;
    }

    private Map<String, Object> alertConfig(String variant, String title, String message, Integer autoDismissMs, Map<String, Object> action, boolean mobileCompact) {
        Map<String, Object> c = new LinkedHashMap<>();
        c.put("variant", variant);
        if (title != null) c.put("title", title);
        c.put("message", message);
        if (autoDismissMs != null) c.put("autoDismissMs", autoDismissMs);
        if (action != null) c.put("action", action);
        if (mobileCompact) {
            Map<String, Object> r = new LinkedHashMap<>();
            Map<String, Object> mobile = new LinkedHashMap<>();
            mobile.put("compact", true);
            r.put("mobile", mobile);
            c.put("responsive", r);
        }
        return c;
    }

    private Map<String, Object> badgeConfig(String label, String variant, boolean pulse) {
        Map<String, Object> c = new LinkedHashMap<>();
        c.put("label", label);
        c.put("variant", variant);
        c.put("pulse", pulse);
        return c;
    }

    private Map<String, Object> inputConfig(String type, String placeholder, String label, boolean required, boolean checkUniqueness) {
        Map<String, Object> c = new LinkedHashMap<>();
        c.put("type", type);
        c.put("placeholder", placeholder);
        c.put("label", label);
        c.put("required", required);
        c.put("checkUniqueness", checkUniqueness);
        c.put("blockKey", "field_" + label.toLowerCase().replaceAll("[^a-z0-9]+", "_"));
        c.put("style", responsiveStyle());
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
        c.put("style", responsiveStyle());
        return c;
    }

    private Map<String, Object> endConfig(String message, String redirectUrl, Integer redirectDelayMs, String mobileRedirectUrl) {
        Map<String, Object> c = new LinkedHashMap<>();
        if (message != null) c.put("message", message);
        c.put("redirectUrl", redirectUrl);
        c.put("redirectDelayMs", redirectDelayMs);
        if (mobileRedirectUrl != null) {
            Map<String, Object> r = new LinkedHashMap<>();
            Map<String, Object> mobile = new LinkedHashMap<>();
            mobile.put("redirectUrl", mobileRedirectUrl);
            r.put("mobile", mobile);
            c.put("responsive", r);
        }
        return c;
    }

    private Map<String, Object> responsiveStyle() {
        Map<String, Object> s = new LinkedHashMap<>();
        s.put("width", "100%");
        s.put("maxWidth", "100%");
        s.put("minWidth", "0px");
        return s;
    }

    private Map<String, Object> responsiveMediaStyle() {
        Map<String, Object> s = responsiveStyle();
        s.put("objectFit", "cover");
        return s;
    }

    private String serialize(Map<String, Object> graph) {
        try {
            return mapper.writeValueAsString(graph);
        } catch (Exception e) {
            throw new RuntimeException("failed to serialize seed graph", e);
        }
    }
}
