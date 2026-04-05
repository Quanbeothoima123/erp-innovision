"use strict";

const router = require("express").Router();
const ctrl = require("./ai-summary.controller");
const { authenticate } = require("../../middlewares/auth.middleware");

router.use(authenticate);

router.get("/questions", ctrl.getQuestions);
router.post("/ask", ctrl.ask);

module.exports = router;
