import React from "react";
import { SmoothScrollProvider } from "./smooth-scroll-provider";
import { LandingNav } from "./landing-nav";
import { LandingHero } from "./landing-hero";
import { PainPointSection } from "./pain-point-section";
import { LearnerStorySection } from "./learner-story-section";
import { LearningLoopSection } from "./learning-loop-section";
import { FeaturesSection } from "./features-section";
import { SocialProofSection } from "./social-proof-section";
import { FinalCtaSection } from "./final-cta-section";
import { LandingFooter } from "./landing-footer";
import { ClickRipple } from "./click-ripple";

export function LandingPage() {
  return (
    <SmoothScrollProvider>
      <div className="min-h-screen text-(--text-primary) selection:bg-(--accent-lime)/30 selection:text-(--text-primary) bg-(--bg-app) relative overflow-x-hidden">
        {/* Global Click Ripple */}
        <ClickRipple />

        {/* Navigation */}
        <LandingNav />

        {/* Section 1: Hero */}
        <LandingHero />

        {/* Section 2: Pain Point Problem */}
        <PainPointSection />

        {/* Section 3: 30-Minute Learner Story */}
        <LearnerStorySection />

        {/* Section 4: The Learning Loop (How It Works / Learning Path) */}
        <LearningLoopSection />

        {/* Section 5: What Makes It Different (Features) */}
        <FeaturesSection />

        {/* Section 6: Social Proof (Evidence-Based Learning) */}
        <SocialProofSection />

        {/* Section 7: Final CTA */}
        <FinalCtaSection />

        {/* Footer */}
        <LandingFooter />
      </div>
    </SmoothScrollProvider>
  );
}

