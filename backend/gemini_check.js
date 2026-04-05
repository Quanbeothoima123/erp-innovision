const { GoogleGenerativeAI } = require("@google/generative-ai");

// Thay bằng API Key của bạn
const genAI = new GoogleGenerativeAI("AIzaSyBLba6w2Gg64MFlyHhYkKqggx2JVWCLhtQ");

async function checkModels() {
  try {
    // Lưu ý: SDK hiện tại không có hàm listModels trực tiếp trên genAI
    // Cách tốt nhất để check key và model là thử gọi một lệnh đơn giản

    console.log("--- ĐANG KIỂM TRA KEY VÀ MODEL ---");

    // Thử với Gemini 1.5 Flash (Model phổ biến nhất)
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent("ping");
    const response = await result.response;

    console.log("✅ Trạng thái Key: Đang hoạt động tốt!");
    console.log("✅ Model test (gemini-1.5-flash): Phản hồi thành công.");
    console.log("----------------------------------");
    console.log("💡 Mẹo: Bạn có thể dùng các model sau cho dự án ERP:");
    console.log("- gemini-1.5-flash (Nhanh, rẻ, quota cao)");
    console.log("- gemini-2.0-flash (Mới nhất, thông minh hơn)");
    console.log("- gemini-1.5-pro (Rất thông minh nhưng quota cực thấp)");
  } catch (error) {
    if (error.message.includes("429")) {
      console.error("❌ Lỗi: Bạn đã hết Quota (Rate Limit) cho model này rồi!");
    } else if (error.message.includes("API key not valid")) {
      console.error("❌ Lỗi: API Key của bạn không hợp lệ hoặc sai.");
    } else {
      console.error("❌ Lỗi phát sinh:", error.message);
    }
  }
}

checkModels();
