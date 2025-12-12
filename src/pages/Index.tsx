import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import ProjectVsCourse from "@/components/ProjectVsCourse";
import Pipeline from "@/components/Pipeline";
import Personas from "@/components/Personas";
import Metrics from "@/components/Metrics";
import CTA from "@/components/CTA";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Header />
      <main>
        <Hero />
        <div id="features">
          <Features />
        </div>
        <ProjectVsCourse />
        <div id="pipeline">
          <Pipeline />
        </div>
        <div id="personas">
          <Personas />
        </div>
        <div id="metrics">
          <Metrics />
        </div>
        <CTA />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
