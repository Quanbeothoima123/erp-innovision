const { GoogleGenerativeAI } = require("@google/generative-ai");
import dotenv from "dotenv";
dotenv.config();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function test() {
  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash", // 🔥 QUAN TRỌNG
    });

    const result = await model.generateContent("Hello");
    const response = await result.response;

    console.log(response.text());
  } catch (err) {
    console.error("Lỗi:", err.message);
  }
}

test();
