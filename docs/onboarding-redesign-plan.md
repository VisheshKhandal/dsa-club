# DSA Club onboarding redesign — product & implementation plan

## निर्णय

Onboarding का काम profile भरवाना नहीं, user को **पहली उपयोगी DSA session तक पहुँचाना** है। आठ numbered steps के बदले चार तेज़ फैसले, फिर एक वास्तविक editable plan: लगभग एक मिनट का लक्ष्य रखें; समय का दावा analytics से validate करें। अलग welcome/marketing screen हटे—उसका छोटा benefit और expected effort पहले सवाल के ऊपर रहे।

## मौजूदा flow का read-only audit

Screenshot और code में onboarding `/onboarding` पर एक ही wizard है: desktop पर left explanatory rail और right step-card; आठ steps में welcome, experience, target companies, daily time, language, 14-topic self-assessment, learning goal, फिर सात-day roadmap preview आते हैं। हर Continue पर draft और अगला numeric step save होता है; answer चुनते ही नहीं। इसलिए मौजूदा “Saved automatically” status पूरी तरह सटीक नहीं है। Skip confirmation starter roadmap बनाकर dashboard भेजता है; calibrate mode भी इसी wizard से खुलता है।

Preview की मजबूत नींव पहले से है: `generateRoadmapPreview` और `generatePersonalizedRoadmap` एक planner इस्तेमाल करते हैं। मगर personalization copy को वास्तविक rule से बाँधना होगा: company boosts topic order और time pacing बदलते हैं; language roadmap/profile में save होती है पर topic order नहीं; `learningGoal` में अभी मुख्य फर्क interview ordering का है, बाकी goals लगभग एक ही curriculum order देते हैं। Experience और 14 known topics का असर भी सीमित/शर्तों पर है। इन सीमाओं के रहते “हर जवाब से पूरी तरह अलग plan” का दावा न करें।

## नया user journey: चार फैसले + plan

| Full-page screen | सवाल और interaction | असर / वैकल्पिक रास्ता |
|---|---|---|
| **1. Goal** | “तुम DSA किसलिए सीख रहे हो?” — Foundations, Campus placement, Internship, Interviews, Job switch, “अभी तय नहीं” (balanced foundation default)। बड़े selectable विकल्प, एक चयन। | Goal तभी अलग roadmap promise करे जब planner अलग priorities दे। इसी पेज पर “Company focus जोड़ें” optional disclosure हो; कोई company न चुनना valid हो। |
| **2. Starting point** | “आज problem solving में तुम कहाँ हो?” — “मैं DSA में नया हूँ”, “Basics जानता हूँ; patterns की practice चाहिए”, “Problems solve करता हूँ; interview depth चाहिए।” छोटे behavior-based anchors, judgemental labels नहीं। | पुराने 14-topic grid को यहाँ अनिवार्य न रखें। “मैं ये topics जानता हूँ” बाद में plan edit/पहली session के बाद contextual option हो। |
| **3. Realistic time** | “किस daily समय को तुम लगातार दे पाओगे?” — 15, 30, 45 या 60 मिनट। चुनने पर छोटा schedule preview बदले। | `180 min = 3+ hours` वाला दबाव हटे। अगर product 15/45 मिनट चुनता है तो validator और planner भी वही स्वीकारें। Missed day को failure न बताएं। |
| **4. Coding language** | “किस भाषा में code करना पसंद करोगे?” — C++, Java, Python, JavaScript; profile में language हो तो पहले से चुनी हुई। | यह code walkthroughs के लिए preference है; इसे topic-order personalization न कहें। |
| **5. Your plan** | “तुम्हारी पहली DSA session” — आज का असली topic/mission और समय सबसे प्रमुख; उसके नीचे अगले सात दिनों का हल्का preview। हर preference के पास छोटा **Edit** link। | Primary CTA **“अपनी पहली session शुरू करो”**; सीधे first mission पर, या dashboard पर उसी mission को सबसे स्पष्ट CTA बनाकर। Topics/goal की वजहें तभी दिखें जब planner उन्हें सच में लागू करता हो। |

हर सवाल पर केवल एक मुख्य निर्णय हो। ऊपर “4 quick choices · ~1 minute · बाद में बदल सकते हो” जैसी स्पष्ट expectation हो। Company चुनना और पुराने topics mark करना optional/deferred है; “Not sure” को सम्मानजनक default रखें। कोई जवाब गलत नहीं, कोई streak/commitment trap नहीं।

## Page और interaction design

- Screenshot वाला split composition हटाकर एक ही **full-page canvas** रखें: consistent top bar, logo, वास्तविक save status; नीचे पूरे viewport में question content। explanatory left rail और उसके सामने nested form card नहीं। प्रश्न और choices को पर्याप्त whitespace वाला एक column/चौड़ा grid दें; अंतिम plan ही full-width timeline/mission view हो।
- Progress को “2 of 4 · Starting point” जैसे नाम और bar से दिखाएँ; welcome/preview को सवालों की गिनती में न जोड़ें। हर page पर Back और साफ़ primary Continue; मोबाइल पर sticky footer, desktop पर भी स्थिर action placement।
- एक वाक्य का prompt, एक वाक्य का “इससे क्या बदलेगा”; लंबा “How this shapes your plan” callout हर screen पर न दोहराएँ। Selection पर स्पष्ट check/contrast और छोटा live plan hint दें। Continue explicit रहे ताकि accidental auto-advance न हो। Subtle transition, reduced-motion support, keyboard navigation, visible focus, semantic radio/checkbox behavior और screen-reader announcement रखें।
- Skip मौजूद रहे पर एक ही शांत secondary link **“Starter plan से शुरू करें”** के रूप में; दो अलग skip controls और guilt-based confirmation copy नहीं। Current starter-plan behavior बचाएँ। “Saved” केवल server save सफल होने के बाद दिखे; draft को answer के बाद debounce या Continue से पहले save करें। Browser Back/refresh पर जवाब और सही अगला सवाल लौटे।
- Preview में पहले mission को dominant रखें; सातों दिन एक साथ भारी list न बनें—पहला दिन और अगले 2–3 दिन दिखाएँ, बाकी expand हों। Edit करने पर बाकी answers न खोएँ। User plan देखकर उसे बदल सके या सीधे शुरू कर सके; review को अतिरिक्त अनिवार्य step न बनाएँ।

## Implementation क्रम और code map

1. **Personalization contract तय करें:** `curriculum-rules.ts` और `roadmap-planner.ts` में goal/company/level/time के वास्तविक असर तय करें। जो preference materially plan नहीं बदलती उसे optional करें या copy में साफ़ कहें। Generic company चयन के लिए schema में वैध “no company focus” रखें; `other` को बिना company नाम के reuse न करें।
2. **Draft और compatibility:** `onboarding.validators.ts` में नए time bands और optional company/known-topic behavior रखें। `onboarding/page.tsx` profile defaults से prefill और URL-backed step खोल सके। पुराने numeric `currentStep` drafts को उनकी भरी हुई fields से निकटतम नए unanswered screen पर map करें; completed/skipped users और existing calibrate entry सुरक्षित रहें।
3. **Full-page flow:** `onboarding-wizard.tsx` को साझा shell + अलग full-page question views में बाँटें; query/route में step ID push करें ताकि Next, Back और browser navigation संगत हों। Answer save, retry/error state और “Saving / Saved” संकेत को `onboarding.actions.ts` और `onboarding.service.ts` के साथ विश्वसनीय करें।
4. **Plan-to-first-value:** `roadmap-preview.mapper.ts` में planner के समान वास्तविक preview रखें। Final CTA, generated roadmap और dashboard/mission destination में first step एक ही हो। Profile calibration इसी shell में prefilled answers और **“Plan update करें”** CTA से चले।
5. **Quality और rollout:** `onboarding-wizard.test.ts` के पुराने copy/layout assertions को नई behavior contract से बदलें; validator, resume, skip, calibrate, preview-vs-generated-plan parity, keyboard/mobile और reduced-motion cases cover करें। पहले funnel baseline लें, फिर small cohort में drop-off और first-session completion देखकर copy/flow सुधारें।

**Success measures:** onboarding start → plan preview → first session start → first session complete funnel; हर screen का drop-off और answer-to-start समय; starter-plan बनाम personalized completion; अगले दिन वापसी। केवल “onboarding complete” को सफलता न मानें—पहली session तक पहुँचना मुख्य activation signal हो।

## Product-design reference

यह किसी company के hidden internal process का दावा या visual clone नहीं है। Published guidance से लागू होने वाले principles हैं: Apple — fast, optional, interactive onboarding और defaults; Microsoft Fluent — relevant, non-distracting, benefit-focused flow व action-first copy; Google Material — कम, meaningful choices और first key action तक जल्दी पहुँचना। [Apple HIG: Onboarding](https://developer.apple.com/design/human-interface-guidelines/onboarding), [Microsoft Fluent 2: Onboarding](https://fluent2.microsoft.design/onboarding/), [Google Material: Onboarding](https://m1.material.io/growth-communications/onboarding.html).
