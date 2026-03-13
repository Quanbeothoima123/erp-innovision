'use strict';

const { Router } = require('express');
const controller = require('./job-titles.controller');
const { validate } = require('../../middlewares/validate.middleware');
const { authenticate, hrOrAdmin, authorize } = require('../../middlewares/auth.middleware');
const { ROLES } = require('../../config/constants');
const {
  listJobTitlesSchema,
  createJobTitleSchema,
  updateJobTitleSchema,
} = require('./job-titles.validation');

const router = Router();

router.use(authenticate);

/**
 * GET /api/job-titles/options  — Dropdown, mọi role đều xem được
 */
router.get('/options', controller.getJobTitleOptions);

/**
 * GET  /api/job-titles         — Danh sách chức danh
 * POST /api/job-titles         — Tạo chức danh (HR/Admin)
 */
router.get('/', validate(listJobTitlesSchema, 'query'), controller.listJobTitles);
router.post('/', hrOrAdmin, validate(createJobTitleSchema), controller.createJobTitle);

/**
 * GET    /api/job-titles/:id   — Chi tiết
 * PATCH  /api/job-titles/:id   — Cập nhật (HR/Admin)
 * DELETE /api/job-titles/:id   — Xóa (Admin only)
 */
router.get('/:id', controller.getJobTitleById);
router.patch('/:id', hrOrAdmin, validate(updateJobTitleSchema), controller.updateJobTitle);
router.delete('/:id', authorize(ROLES.ADMIN), controller.deleteJobTitle);

module.exports = router;
