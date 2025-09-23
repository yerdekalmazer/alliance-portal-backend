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

      // Domain'e göre initial-assessment sorularını getir
      let domainQuestions: any[] = [];
      
      if (domain) {
        console.log(`🔍 ${domain} domain'i için sorular aranıyor...`);
        
        let query = supabaseAdmin
          .from('question_bank_questions' as any)
          .select('*')
          .eq('category', 'initial-assessment');

        // Domain eşleşmesi (esnek)
        query = query.or(`domain.eq.${domain},domain.is.null`);

        const { data: questions, error } = await query;
        
        if (error) {
          console.error('❌ Soru çekme hatası:', error);
          return res.status(500).json({ success: false, error: error.message });
        }

        // Domain-spesifik soruları öncelikle al
        const domainSpecific = questions?.filter((q: any) => q.domain === domain) || [];
        const general = questions?.filter((q: any) => !q.domain) || [];
        
        console.log(`📝 Domain-spesifik sorular: ${domainSpecific.length}, Genel sorular: ${general.length}`);
        
        // Önce domain-spesifik, sonra genel sorular
        const allAvailable = [...domainSpecific, ...general];
        
        // Rastgele karıştır ve istenen sayıda seç
        domainQuestions = this.shuffleArray(allAvailable).slice(0, max_questions);
        
        console.log(`✅ Seçilen soru sayısı: ${domainQuestions.length}`);
      }

      // Soruları frontend formatına çevir
      const formattedQuestions = domainQuestions.map((q, index) => ({
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
      const allQuestions = [...personalQuestions, ...formattedQuestions];

      console.log(`🎯 Toplam dinamik soru hazırlandı: ${allQuestions.length}`);

      return res.json({
        success: true,
        data: {
          questions: allQuestions,
          personalQuestionCount: personalQuestions.length,
          assessmentQuestionCount: formattedQuestions.length,
          domain: domain
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


