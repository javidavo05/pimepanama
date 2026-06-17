"use client";

import { ResumeProvider } from "./context/ResumeContext";
import { LanguageSelector } from "./components/LanguageSelector";
import { ScrollProgress } from "./components/ScrollProgress";
import { PrintResume } from "./components/PrintResume";
import { HeroSection } from "./components/HeroSection";
import { ExecutiveSummary } from "./components/ExecutiveSummary";
import { CoreStats } from "./components/CoreStats";
import { ValueProp } from "./components/ValueProp";
import { ProjectsSection } from "./components/ProjectsSection";
import { TechExpertise } from "./components/TechExpertise";
import { AISection } from "./components/AISection";
import { ExperienceTimeline } from "./components/ExperienceTimeline";
import { IndustriesSection } from "./components/IndustriesSection";
import { ContactSection } from "./components/ContactSection";

export default function ResumePage() {
  return (
    <ResumeProvider>
      <ScrollProgress />
      <LanguageSelector />
      <main>
        <HeroSection />
        <ExecutiveSummary />
        <CoreStats />
        <ValueProp />
        <ProjectsSection />
        <TechExpertise />
        <AISection />
        <ExperienceTimeline />
        <IndustriesSection />
        <ContactSection />
      </main>
      <PrintResume />
    </ResumeProvider>
  );
}
