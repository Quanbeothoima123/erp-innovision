import { api } from "../apiClient";

export interface AiQuestion {
  type: string;
  label: string;
  emoji: string;
  category: "task" | "salary";
}

export interface AiAnswerResponse {
  answer: string;
  fromCache: boolean;
  cachedAt?: string;
  expiresAt?: string;
  tokensUsed?: number;
}

/** GET /api/ai-summary/questions */
export async function getQuestions(): Promise<AiQuestion[]> {
  return api.get<AiQuestion[]>("/ai-summary/questions");
}

/** POST /api/ai-summary/ask */
export async function ask(questionType: string): Promise<AiAnswerResponse> {
  return api.post<AiAnswerResponse>("/ai-summary/ask", { questionType });
}
