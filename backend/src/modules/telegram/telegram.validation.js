"use strict";

const Joi = require("joi");

const settingsSchema = Joi.object({
  notifyAttendanceRequest: Joi.boolean(),
  notifyAttendanceApproved: Joi.boolean(),
  notifyAttendanceRejected: Joi.boolean(),
  notifyLeaveRequest: Joi.boolean(),
  notifyLeaveApproved: Joi.boolean(),
  notifyLeaveRejected: Joi.boolean(),
  notifyLeaveBalanceLow: Joi.boolean(),
  notifyOvertimeRequest: Joi.boolean(),
  notifyOvertimeApproved: Joi.boolean(),
  notifyOvertimeRejected: Joi.boolean(),
  notifyTaskAssigned: Joi.boolean(),
  notifyTaskUpdated: Joi.boolean(),
  notifyTaskDueSoon: Joi.boolean(),
  notifyPayroll: Joi.boolean(),
  notifyPayslip: Joi.boolean(),
  notifyCompensation: Joi.boolean(),
  notifyProject: Joi.boolean(),
  notifyMilestone: Joi.boolean(),
  notifyGeneral: Joi.boolean(),
}).min(1);

const toggleSchema = Joi.object({
  enabled: Joi.boolean().required(),
});

const groupSchema = Joi.object({
  name: Joi.string().max(100).required(),
  groupChatId: Joi.string().max(50).required(),
  description: Joi.string().max(500).optional(),
  isActive: Joi.boolean().optional(),
});

const broadcastSchema = Joi.object({
  title: Joi.string().max(200).required(),
  message: Joi.string().max(2000).required(),
});

module.exports = { settingsSchema, toggleSchema, groupSchema, broadcastSchema };
