"use strict";

const { env } = require("../../config/env");

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

/**
 * Gọi Gemini API với prompt và trả về text response.
 * @param {string} systemPrompt  - Hướng dẫn hệ thống
 * @param {string} userPrompt    - Nội dung câu hỏi + data
 * @returns {Promise<{ text: string, tokensUsed: number }>}
 */
async function generateText(systemPrompt, userPrompt) {
  if (!env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY chưa được cấu hình.");
  }

  const model = env.GEMINI_MODEL;
  const url = `${GEMINI_BASE}/${model}:generateContent?key=${env.GEMINI_API_KEY}`;

  const body = {
    system_instruction: {
      parts: [{ text: systemPrompt }],
    },
    contents: [
      {
        role: "user",
        parts: [{ text: userPrompt }],
      },
    ],
    generationConfig: {
      temperature: 0.3, // Thấp → câu trả lời chính xác, ít sáng tạo
      maxOutputTokens: 1024,
    },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      `Gemini API error ${res.status}: ${err?.error?.message ?? "Unknown"}`,
    );
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  const tokens = data?.usageMetadata?.totalTokenCount ?? 0;

  return { text: text.trim(), tokensUsed: tokens };
}

module.exports = { generateText };
