import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../config/database';

export class QuestionBankController {
  async listQuestions(req: Request, res: Response, next: NextFunction) {
    try {
      if (!supabaseAdmin) return res.status(500).json({ success: false, error: 'SERVICE_ROLE_MISSING' });

      const { category, job_type, domain, difficulty, page = '1', limit = '100', search } = req.query as any;

      let query = supabaseAdmin.from('question_bank_questions' as any).select('*', { count: 'exact' }).order('created_at', { ascending: false });

      if (category) query = query.eq('category', category);
      if (job_type) query = query.eq('job_type', job_type);
      if (domain) query = query.eq('domain', domain);
      if (difficulty) query = query.eq('difficulty', difficulty);
      if (search) query = query.or(`question.ilike.%${search}%,job_type.ilike.%${search}%`);

      const pageNum = Math.max(1, parseInt(page) || 1);
      const limitNum = Math.min(500, Math.max(1, parseInt(limit) || 100));
      const from = (pageNum - 1) * limitNum;
      const to = from + limitNum - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;
      if (error) return res.status(500).json({ success: false, error: error.message });
      return res.json({ success: true, data, pagination: { page: pageNum, limit: limitNum, total: count || 0 } });
    } catch (e) { next(e); }
  }

  // İlk başvuru değerlendirme anketi için dinamik soru üretimi
  async generateDynamicQuestions(req: Request, res: Response, next: NextFunction) {
    try {
      if (!supabaseAdmin) return res.status(500).json({ success: false, error: 'SERVICE_ROLE_MISSING' });

      const { case_id, domain, job_types = [], max_questions = 10 } = req.body;

      console.log('🎯 Dinamik soru üretimi başlatılıyor:', { case_id, domain, job_types, max_questions });

      // Kişisel bilgi sorularını oluştur (sabit)
      const personalQuestions = this.getPersonalInfoQuestions();

      // Domain ve Job Type'a göre initial-assessment sorularını getir
      let assessmentQuestions: any[] = [];

      console.log(`🔍 Sorular aranıyor: Domain=${domain}, JobTypes=${job_types.join(', ')}`);

      let query = supabaseAdmin
        .from('question_bank_questions' as any)
        .select('*')
        .in('category', ['initial-assessment', 'Initial Assessment', 'Initial-Assessment', 'initial_assessment']);

      const { data: allQuestions, error } = await query;

      if (error) {
        console.error('❌ Soru çekme hatası:', error);
        return res.status(500).json({ success: false, error: error.message });
      }

      if (allQuestions) {
        // JS tarafında filtreleme (daha esnek kontrol için)
        assessmentQuestions = allQuestions.filter((q: any) => {
          // 1. Domain Kontrolü
          // Domain varsa eşleşmeli, yoksa (q.domain null ise) genel kabul edilir.
          // ANCAK: Job Type tam eşleşiyorsa domain farketmeksizin kabul etmeliyiz.
          const domainMatch = domain ? (q.domain === domain || !q.domain) : true;

          // 2. Job Type Kontrolü
          // Check both job_type (string) and job_types (array)
          let jobTypeSpecificMatch = false;
          let jobTypeGeneralMatch = false;

          // Check basic job_type string
          if (q.job_type) {
            jobTypeSpecificMatch = job_types.includes(q.job_type);
            jobTypeGeneralMatch = q.job_type === 'Genel' || q.job_type === 'All';
          }

          // Check job_types array if it exists
          if (!jobTypeSpecificMatch && Array.isArray(q.job_types)) {
            jobTypeSpecificMatch = q.job_types.some((jt: string) => job_types.includes(jt));
          }
          if (!jobTypeGeneralMatch && Array.isArray(q.job_types)) {
            jobTypeGeneralMatch = q.job_types.some((jt: string) => jt === 'Genel' || jt === 'All');
          }

          // Also allow if no job type is specified at all
          if (!q.job_type && (!q.job_types || q.job_types.length === 0)) {
            jobTypeGeneralMatch = true;
          }

          if (jobTypeSpecificMatch) return true; // Job type uyuyorsa domain'e bakma

          return domainMatch && jobTypeGeneralMatch;
        });

        console.log('🔍 ALL Questions found:', allQuestions.length);
        console.log('🔍 Filtered Questions:', assessmentQuestions.length);
        if (allQuestions.length > 0 && assessmentQuestions.length === 0) {
          console.log('⚠️ Filter dropped all questions. Sample question:', allQuestions[0]);
          console.log('⚠️ Filter criteria:', { domain, job_types });
        }

        console.log(`✅ Filtreleme sonucu: ${allQuestions.length} -> ${assessmentQuestions.length} soru`);

        // Önceliklendirme:
        // 1. Tam eşleşenler (Domain VE JobType)
        // 2. Sadece Domain eşleşenler
        // 3. Sadece JobType eşleşenler
        // 4. Genel sorular

        assessmentQuestions.sort((a, b) => {
          const aScore = (a.domain === domain ? 2 : 0) + (job_types.includes(a.job_type) ? 2 : 0);
          const bScore = (b.domain === domain ? 2 : 0) + (job_types.includes(b.job_type) ? 2 : 0);
          return bScore - aScore; // Puanı yüksek olan önce gelir
        });
      }

      // Rastgele karıştır ve en fazla max_questions kadar al
      const selectedQuestions = this.shuffleArray(assessmentQuestions).slice(0, max_questions);

      console.log(`✅ Seçilen soru sayısı: ${selectedQuestions.length}`);

      // Soruları frontend formatına çevir
      const formattedQuestions = selectedQuestions.map((q, index) => ({
        id: q.id,
        type: this.mapQuestionType(q.type),
        question: q.question,
        options: q.options,
        required: true,
        order: personalQuestions.length + index + 1,
        category: 'assessment',
        correct: q.correct,
        points: q.points,
        jobType: q.job_type,
        domain: q.domain,
        sourceCategory: 'initial-assessment'
      }));

      // Kişisel sorular + domain soruları
      const finalQuestions = [...personalQuestions, ...formattedQuestions];

      console.log(`🎯 Toplam dinamik soru hazırlandı: ${finalQuestions.length}`);

      return res.json({
        success: true,
        data: {
          questions: finalQuestions,
          personalQuestionCount: personalQuestions.length,
          assessmentQuestionCount: formattedQuestions.length,
          domain: domain,
          jobTypes: job_types
        },
        message: 'Dinamik sorular başarıyla oluşturuldu'
      });

    } catch (e) {
      console.error('❌ Dynamic questions generation error:', e);
      next(e);
    }
  }

  // Kişisel bilgi sorularını oluştur (PUAN VERİLMEZ - sadece bilgi toplama)
  private getPersonalInfoQuestions() {
    return [
      {
        id: 'personal-name',
        type: 'text',
        question: 'Tam Adınız',
        required: true,
        order: 1,
        category: 'personal',
        points: 0, // Kişisel bilgi sorularına puan verilmez
        correct: null
      },
      {
        id: 'personal-email',
        type: 'text',
        question: 'E-posta Adresiniz',
        required: true,
        order: 2,
        category: 'personal',
        points: 0, // Kişisel bilgi sorularına puan verilmez
        correct: null
      },
      {
        id: 'personal-phone',
        type: 'text',
        question: 'Telefon Numaranız',
        required: true,
        order: 3,
        category: 'personal',
        points: 0, // Kişisel bilgi sorularına puan verilmez
        correct: null
      },
      {
        id: 'personal-location-konya',
        type: 'radio',
        question: 'Konya\'da mısınız?',
        options: ['Evet, Konya\'dayım', 'Hayır, başka şehirdeyim ama Konya\'ya gelebilirim', 'Hayır, remote çalışmayı tercih ederim'],
        required: true,
        order: 4,
        category: 'personal',
        points: 0, // Kişisel bilgi sorularına puan verilmez
        correct: null
      },
      {
        id: 'personal-work-status',
        type: 'radio',
        question: 'Çalışma Durumunuz',
        options: [
          'Aktif olarak çalışmıyorum',
          'Part-time çalışıyorum',
          'Full-time çalışıyorum',
          'Freelancer olarak çalışıyorum',
          'Öğrenciyim'
        ],
        required: true,
        order: 5,
        category: 'personal',
        points: 0, // Kişisel bilgi sorularına puan verilmez
        correct: null
      },
      {
        id: 'personal-experience-years',
        type: 'radio',
        question: 'Kaç yıllık deneyiminiz var?',
        options: [
          '0-1 yıl (Yeni başlayan)',
          '1-3 yıl (Junior)',
          '3-5 yıl (Mid-level)',
          '5-8 yıl (Senior)',
          '8+ yıl (Expert)'
        ],
        required: true,
        order: 6,
        category: 'personal',
        points: 0, // Kişisel bilgi sorularına puan verilmez
        correct: null
      }
    ];
  }

  // Question type mapping
  private mapQuestionType(dbType: string): string {
    const typeMap: Record<string, string> = {
      'mcq': 'radio',
      'textarea': 'textarea',
      'scenario': 'radio',
      'priority': 'radio',
      'approach': 'radio'
    };
    return typeMap[dbType] || 'radio';
  }

  // Array shuffle utility
  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  async createQuestion(req: Request, res: Response, next: NextFunction) {
    try {
      if (!supabaseAdmin) return res.status(500).json({ success: false, error: 'SERVICE_ROLE_MISSING' });
      const payload = req.body;
      const { data, error } = await supabaseAdmin.from('question_bank_questions' as any).insert(payload).select('*').single();
      if (error) return res.status(500).json({ success: false, error: error.message });
      return res.status(201).json({ success: true, data });
    } catch (e) { next(e); }
  }

  async updateQuestion(req: Request, res: Response, next: NextFunction) {
    try {
      if (!supabaseAdmin) return res.status(500).json({ success: false, error: 'SERVICE_ROLE_MISSING' });
      const { id } = req.params;
      const payload = req.body;
      const { data, error } = await supabaseAdmin.from('question_bank_questions' as any).update(payload).eq('id', id).select('*').single();
      if (error) return res.status(500).json({ success: false, error: error.message });
      return res.json({ success: true, data });
    } catch (e) { next(e); }
  }

  async deleteQuestion(req: Request, res: Response, next: NextFunction) {
    try {
      if (!supabaseAdmin) return res.status(500).json({ success: false, error: 'SERVICE_ROLE_MISSING' });
      const { id } = req.params;
      const { error } = await supabaseAdmin.from('question_bank_questions' as any).delete().eq('id', id);
      if (error) return res.status(500).json({ success: false, error: error.message });
      return res.json({ success: true });
    } catch (e) { next(e); }
  }
}

export const questionBankController = new QuestionBankController();


