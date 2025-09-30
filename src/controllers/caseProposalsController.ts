import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../config/database';

class CaseProposalsController {
  async submit(req: Request, res: Response, next: NextFunction) {
    try {
      if (!supabaseAdmin) {
        return res.status(500).json({ success: false, error: 'Service role key not configured' });
      }

      const payload = req.body || {};

      const required = ['title','target_audience','problem_statement','unique_value','partner_gains','sustainability_plan','archetype'];
      for (const key of required) {
        if (!payload[key]) {
          return res.status(400).json({ success: false, error: `Missing field: ${key}` });
        }
      }

      const userId = (req as any).userId || (req as any).user?.id;
      console.log('🔍 Case proposal submit - User ID:', userId, 'User object:', req.user);
      
      // Write directly into idea_submissions (legacy system backing "Projelerim")
      const ideaPayload = {
        // Core fields
        title: payload.title,
        description: payload.unique_value || null,
        category: payload.output_type || payload.archetype || null,
        problem_definition: payload.problem_statement || null,
        target_audience: payload.target_audience || null,
        expected_outcome: payload.partner_gains || null,
        pm_archetype: payload.archetype || null,
        submitted_by: userId || null,
        status: 'pending',
        stage: 'submitted',
        submitted_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        // Case proposal specific fields (new columns)
        problem_statement: payload.problem_statement || null,
        unique_value: payload.unique_value || null,
        partner_gains: payload.partner_gains || null,
        sustainability_plan: payload.sustainability_plan || null,
        contribution: payload.contribution || null,
        observations: payload.observations || null,
        current_process: payload.current_process || null,
        vision_success: payload.vision_success || null,
        core_functions: payload.core_functions || null,
        innovation_proposal: payload.innovation_proposal || null,
        organization: payload.organization || null,
        contact_name: payload.contact_name || null,
        email: payload.email || (req.user ? (req.user as any).email : null),
        // Output type field
        output_type: payload.output_type || null,
        // Legacy fields
        market_size: payload.market_size || null,
        expected_roi: payload.expected_roi || null,
        timeline: payload.timeline || null,
        budget: payload.budget || null,
        tags: payload.tags || [],
        rejection_reason: null
      } as any;

      console.log('📝 Inserting into idea_submissions with payload:', {
        title: ideaPayload.title,
        submitted_by: ideaPayload.submitted_by,
        email: ideaPayload.email,
        category: ideaPayload.category
      });

      const { data: idea, error } = await (supabaseAdmin as any)
        .from('idea_submissions')
        .insert(ideaPayload)
        .select('*')
        .single();

      if (error) {
        console.error('❌ Failed to insert into idea_submissions:', error);
        return res.status(500).json({ success: false, error: error.message });
      }

      console.log('✅ Idea submission created:', { id: idea?.id, title: idea?.title });
      return res.status(201).json({ success: true, data: idea, message: 'Idea submission created' });
    } catch (err) {
      next(err);
    }
  }

  async list(req: Request, res: Response, next: NextFunction) {
    try {
      if (!supabaseAdmin) {
        return res.status(500).json({ success: false, error: 'Service role key not configured' });
      }

      // Admin only
      if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ success: false, error: 'Admin access required' });
      }

      const { status, archetype } = req.query;
      let query = supabaseAdmin.from('case_proposals' as any).select('*').order('created_at', { ascending: false });
      if (status) query = (query as any).eq('status', status);
      if (archetype) query = (query as any).eq('archetype', archetype);

      const { data, error } = await query as any;
      if (error) return res.status(500).json({ success: false, error: error.message });
      return res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      if (!supabaseAdmin) {
        return res.status(500).json({ success: false, error: 'Service role key not configured' });
      }
      if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ success: false, error: 'Admin access required' });
      }
      const { id } = req.params;
      const { status, admin_notes } = req.body || {};
      if (!['pending','approved','rejected'].includes(status)) {
        return res.status(400).json({ success: false, error: 'Invalid status' });
      }
      const { data, error } = await supabaseAdmin
        .from('case_proposals' as any)
        .update({ status, admin_notes: admin_notes ?? null })
        .eq('id', id)
        .select('*')
        .single();
      if (error) return res.status(500).json({ success: false, error: error.message });
      return res.json({ success: true, data, message: 'Status updated' });
    } catch (err) {
      next(err);
    }
  }
}

export const caseProposalsController = new CaseProposalsController();


