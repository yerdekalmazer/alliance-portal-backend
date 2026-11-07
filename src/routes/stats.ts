import { Router } from 'express';
import { requireAdmin, requireAuth } from '../auth';
import { queryOne } from '../db';
import { ok, wrap } from '../util';

const router = Router();

router.get(
  '/',
  requireAuth,
  requireAdmin,
  wrap(async (_req, res) => {
    const row = await queryOne(`
      SELECT
        (SELECT COUNT(*)::int FROM alliance_applications WHERE status = 'pending') AS pending_applications,
        (SELECT COUNT(*)::int FROM alliance_members WHERE status = 'active')       AS active_members,
        (SELECT COUNT(*)::int FROM alliance_members)                               AS total_members,
        (SELECT COUNT(*)::int FROM ideas WHERE status = 'pending')                 AS pending_ideas,
        (SELECT COUNT(*)::int FROM ideas WHERE status = 'approved')                AS approved_ideas,
        (SELECT COUNT(*)::int FROM ideas WHERE status <> 'archived')               AS total_ideas,
        (SELECT COUNT(*)::int FROM cases WHERE status = 'active')                  AS active_cases,
        (SELECT COUNT(*)::int FROM cases WHERE status <> 'archived')               AS total_cases
    `);
    ok(res, row);
  }),
);

export default router;
