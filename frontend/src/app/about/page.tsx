"use client";
import { useEffect, useState } from "react";
import Navbar from "../Components/Navbar"
import { Cpu, Code2, Sparkles, Github } from "lucide-react";
import Link from "next/link";

function useTypewriter(text: string, speed: number = 10) {
  const [displayed, setDisplayed] = useState("");
  useEffect(() => {
    setDisplayed("");
    let i = 0;
    const interval = setInterval(() => {
      setDisplayed(text.slice(0, i + 1));
      i++;
      if (i === text.length) clearInterval(interval);
    }, speed);
    return () => clearInterval(interval);
  }, [text, speed]);
  return displayed;
}

const aboutText = `AutoDev is an AI-powered GitHub assistant that deeply understands your codebase. It automatically labels issues, summarizes threads, and suggests solutions to issues, helping open-source maintainers save time and focus on what matters.`;

const AboutPage = () => {
  const displayed = useTypewriter(aboutText, 18);
  return (<>
    <Navbar/>
    <div className="max-w-5xl mx-auto px-6 py-16">
      <h1 className="text-4xl md:text-5xl font-bold mb-6 text-center text-gray-900">
        About
      </h1>
      <p className="text-lg text-gray-700 mb-12 text-center max-w-3xl mx-auto min-h-[120px]">
        {displayed}
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
        <FeatureCard
          icon={<Cpu className="h-6 w-6 text-blue-600" />}
          title="Understands Your Codebase"
          description="Indexes your repository using vector embeddings to find the most relevant code for each issue."
        />
        <FeatureCard
          icon={<Code2 className="h-6 w-6 text-green-600" />}
          title="AI Fix Suggestions"
          description="AutoDev uses large language models like GPT-4 to generate code patches and PRs for common bugs."
        />
        <FeatureCard
          icon={<Sparkles className="h-6 w-6 text-purple-600" />}
          title="Issue Summarization & Labeling"
          description="Automatically classifies and summarizes issues to help maintainers stay organized."
        />
        <FeatureCard
          icon={<Github className="h-6 w-6 text-black" />}
          title="Seamless GitHub Integration"
          description="Connect your repositories with one click via GitHub OAuth and install our GitHub App."
        />
      </div>
      <div className="text-center">
        <Link
          href="../signup"
          className="inline-block bg-blue-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-blue-700 transition"
        >
          Get Started
        </Link>
      </div>
    </div>
    </>
  );
};

type FeatureCardProps = {
  icon: React.ReactNode;
  title: string;
  description: string;
};

const FeatureCard = ({ icon, title, description }: FeatureCardProps) => (
  <div className="bg-white p-6 shadow-md rounded-xl flex items-start space-x-4 hover:shadow-lg transition">
    <div>{icon}</div>
    <div>
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      <p className="text-gray-600 text-sm mt-1">{description}</p>
    </div>
  </div>
);

export default AboutPage;
