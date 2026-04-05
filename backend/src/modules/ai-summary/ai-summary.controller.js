"use strict";

const svc = require("./ai-summary.service");
const { successResponse } = require("../../common/utils/response.util");

/** GET /api/ai-summary/questions — danh sách câu hỏi hardcoded */
async function getQuestions(req, res, next) {
  try {
    return successResponse(
      res,
      svc.getQuestionList(),
      "Lấy danh sách câu hỏi thành công",
    );
  } catch (e) {
    next(e);
  }
}

/** POST /api/ai-summary/ask — hỏi AI */
async function ask(req, res, next) {
  try {
    const { questionType } = req.body;
    if (!questionType) {
      return res
        .status(400)
        .json({ success: false, message: "questionType là bắt buộc" });
    }
    const result = await svc.askAI(questionType, req.user);
    return successResponse(res, result, "Thành công");
  } catch (e) {
    next(e);
  }
}

module.exports = { getQuestions, ask };
