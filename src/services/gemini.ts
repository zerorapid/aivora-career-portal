import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

const getAI = () => new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export const startInterviewSession = (role: string = "Software Developer (CSE)", jd: string = "", resume: string = "") => {
  const ai = getAI();
  return ai.chats.create({
    model: "gemini-3.1-pro-preview",
    config: {
      systemInstruction: `You are an expert technical interviewer for a top-tier tech company. 
      You are interviewing a candidate for a ${role} position.
      
      CONTEXT:
      Job Description: ${jd || "Standard Software Engineering Role"}
      Candidate Resume: ${resume || "Standard CSE Student Profile"}

      Your goals:
      1. Ask challenging but fair technical questions based on the Job Description and the Candidate's Resume.
      2. Ask behavioral questions (STAR method).
      3. AFTER EACH ANSWER: Provide specific, actionable feedback. Highlight where they excelled, where they struggled, and give one clear suggestion for improvement.
      4. After feedback, transition smoothly to the next question.
      5. Keep each response concise but insightful.
      6. Start by introducing yourself briefly, acknowledging the specific role and JD, and asking the first question.
      
      FINAL REPORT TRIGGER: If the user says "GENERATE_FINAL_REPORT", provide a detailed summary:
      - Overall Score: [Score]/100
      - Key Strengths 🌟
      - Areas for Improvement 🛠️
      - Actionable Advice 🚀
      - Final Verdict (Hire/No Hire)
      
      Tone: Professional, encouraging, but rigorous.`,
    },
  });
};

export const sendMessageWithRetry = async (chat: any, message: string, maxRetries = 3): Promise<GenerateContentResponse> => {
  let lastError: any;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await chat.sendMessage({ message });
    } catch (error: any) {
      lastError = error;
      const errorMsg = error?.message || "";
      
      // If it's a 429 (Quota Exceeded), wait and retry
      if (errorMsg.includes("429") || errorMsg.includes("RESOURCE_EXHAUSTED") || errorMsg.includes("quota")) {
        const waitTime = Math.pow(2, i) * 1000 + Math.random() * 1000;
        console.warn(`Quota exceeded. Retrying in ${Math.round(waitTime)}ms... (Attempt ${i + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      
      // For other errors, throw immediately
      throw error;
    }
  }
  throw lastError;
};
