import { GoogleGenAI } from "@google/genai";

const defaultApiKey = process.env.GEMINI_API_KEY;

export const getGeminiClient = (customKey?: string) => {
  const apiKey = customKey || defaultApiKey || "";
  if (!apiKey) {
    console.warn("No Gemini API key available (environment or managed).");
  }
  return new GoogleGenAI({ apiKey });
};

export const MODELS = {
  chat: "gemini-3-flash-preview",
  webbuilder: "gemini-3.1-pro-preview",
};

