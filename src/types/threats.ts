export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface ThreatAnalysis {
  trustScore: number;
  riskLevel: RiskLevel;
  analysis: string;
  intent: 'scam' | 'marketing' | 'legit' | 'unknown';
  emotion: string;
  patterns: string[];
  riskyParts: string[];
}

export interface ScanResult {
  id: string;
  type: 'message' | 'url' | 'file';
  input: string;
  results: ThreatAnalysis;
  createdAt: string;
}
