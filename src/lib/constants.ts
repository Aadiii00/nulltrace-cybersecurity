import { 
  ShieldAlert, 
  Globe2, 
  Briefcase, 
  Mail, 
  Camera 
} from "lucide-react";
import React from 'react';

export type ToolId = 
  | "spam" 
  | "phishing" 
  | "job-scam" 
  | "email" 
  | "screenshot";

export interface ToolDefinition {
  id: ToolId;
  title: string;
  description: string;
  icon: any;
  gradient: string;
  tab: "message" | "url" | "file";
  systemPrompt: string;
}

export const TOOLS: ToolDefinition[] = [
  {
    id: "spam",
    title: "Spam Detector",
    description: "Identify marketing spam and unsolicited messages instantly.",
    icon: ShieldAlert,
    gradient: "from-primary/20 to-transparent",
    tab: "message",
    systemPrompt: "Focus on identifying unsolicited bulk messages, marketing spam, and repetitive promotional content. Look for common spam triggers like 'win prize', 'limited time offer', and generic link patterns.",
  },
  {
    id: "phishing",
    title: "Phishing URL Scanner",
    description: "Deep-link analysis for malicious domains and redirect chains.",
    icon: Globe2,
    gradient: "from-secondary/20 to-transparent",
    tab: "url",
    systemPrompt: "Focus on URL-based threats including typosquatting, suspicious TLDs, redirect chains, and brand impersonation in subdomains. Analyze the URL structure for malicious intent.",
  },
  {
    id: "job-scam",
    title: "Fake Job Detector",
    description: "Verify internship and job offers against known scam patterns.",
    icon: Briefcase,
    gradient: "from-primary/20 to-transparent",
    tab: "message",
    systemPrompt: "Focus on recruitment fraud, unrealistic salary promises, urgency in hiring, requests for payment for equipment/training, and generic 'HR' greetings without specific company details.",
  },
  {
    id: "email",
    title: "Email Analyzer",
    description: "Scan email headers and content for sophisticated phishing.",
    icon: Mail,
    gradient: "from-secondary/20 to-transparent",
    tab: "message",
    systemPrompt: "Focus on sophisticated email phishing techniques, display name spoofing, malicious attachments (simulated), and social engineering within professional contexts.",
  },
  {
    id: "screenshot",
    title: "Screenshot Analyzer",
    description: "OCR-powered detection for WhatsApp and social media scams.",
    icon: Camera,
    gradient: "from-primary/20 to-transparent",
    tab: "file",
    systemPrompt: "Focus on visual scam patterns found in screenshots of mobile apps. Detect social engineering, fake customer support chats, and crypto-investment scams shown in images.",
  },
];
