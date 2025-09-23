import { Request, Response, NextFunction } from 'express';
import { supabase, supabaseAdmin } from '../config/database';
import { ApiResponse } from '../models/types';

class TechnicalAssessmentController {
  // Teknik değerlendirme anketi oluştur
  async generateTechnicalAssessment(req: Request, res: Response, next: NextFunction) {
    try {
      const { case_id, job_types = [] } = req.body;

      if (!supabase || !supabaseAdmin) {
        return res.status(500).json({
          success: false,
          error: 'Database connection not configured',
          code: 'DATABASE_MISSING'
        } as ApiResponse);
      }

      console.log('🎯 Teknik değerlendirme anketi oluşturuluyor:', { case_id, job_types });

      const allQuestions = [];
      const jobTypeScores: Record<string, { basic: number, advanced: number, leadership: number }> = {};

      // Liderlik ve karakter sorularını bir kez getir (genel) - 5 soru ile sınırla
      const { data: globalLeadershipQuestions } = await supabaseAdmin
        .from('question_bank_questions')
        .select('*')
        .in('category', ['leadership-scenario', 'leadership-scenarios'])
        .or('job_type.eq.All,job_type.is.null')
        .order('id')
        .limit(5);

      const { data: globalCharacterQuestions } = await supabaseAdmin
        .from('question_bank_questions')
        .select('*')
        .eq('category', 'character-analysis')
        .or('job_type.eq.All,job_type.is.null')
        .order('id');

      // Her job type için sorular oluştur
      for (const jobType of job_types) {
        console.log(`📝 ${jobType} için sorular hazırlanıyor...`);
        
        // İlk teknik değerlendirme soruları
        console.log(`🔍 ${jobType} için basic sorular aranıyor...`);
        // Önce job_type'a özel soruları çek
        const { data: jobSpecificQuestions } = await supabaseAdmin
          .from('question_bank_questions')
          .select('*')
          .eq('job_type', jobType)
          .in('category', [
            'first-stage-technical',
            'initial-technical',
            'basic-technical',
            'ilk-teknik'
          ])
          .order('difficulty', { ascending: true });

        // Sonra genel soruları çek (All veya NULL job_type)
        const { data: generalQuestions } = await supabaseAdmin
          .from('question_bank_questions')
          .select('*')
          .or('job_type.eq.All,job_type.is.null')
          .in('category', [
            'first-stage-technical',
            'initial-technical',
            'basic-technical',
            'ilk-teknik'
          ])
          .order('difficulty', { ascending: true });

        // Birleştir ve job type başına sınırlı sayıda temel soru seç (varsayılan 2)
        const basicQuestions = [...(jobSpecificQuestions || []), ...(generalQuestions || [])]
          .filter(q => q.category === 'first-stage-technical')
          .slice(0, 2);
        const basicError = null;
        
        if (basicError) {
          console.error(`❌ Basic questions error for ${jobType}:`, basicError);
        } else {
          console.log(`✅ ${jobType} basic questions found:`, basicQuestions?.length || 0);
        }

        // İleri teknik sorular (sadece ilk aşamada başarılı olanlar için)
        const { data: jobSpecificAdvanced } = await supabaseAdmin
          .from('question_bank_questions')
          .select('*')
          .eq('job_type', jobType)
          .in('category', [
            'advanced-technical',
            'advanced',
            'ileri-teknik'
          ])
          .order('difficulty', { ascending: true });

        const { data: generalAdvanced } = await supabaseAdmin
          .from('question_bank_questions')
          .select('*')
          .or('job_type.eq.All,job_type.is.null')
          .in('category', [
            'advanced-technical',
            'advanced',
            'ileri-teknik'
          ])
          .order('difficulty', { ascending: true });

        // İleri teknik soruları birleştir ve sınırlı sayıda seç (varsayılan 3)
        const advancedQuestions = [...(jobSpecificAdvanced || []), ...(generalAdvanced || [])]
          .filter(q => q.category === 'advanced-technical')
          .slice(0, 3);

        // Liderlik ve karakter soruları globalden kullan
        const leadershipQuestions = globalLeadershipQuestions || [];
        const characterQuestions = globalCharacterQuestions || [];

        // Job type için soru grupları oluştur
        const jobTypeQuestions = {
          jobType,
          basicQuestions: basicQuestions || [],
          advancedQuestions: advancedQuestions || [],
          leadershipQuestions: leadershipQuestions || [],
          characterQuestions: characterQuestions || []
        };

        // Eğer tüm gruplar boşsa, olası kategori uyumsuzlukları için job_type'a göre genel çekme dene
        if (
          jobTypeQuestions.basicQuestions.length === 0 &&
          jobTypeQuestions.advancedQuestions.length === 0 &&
          jobTypeQuestions.leadershipQuestions.length === 0 &&
          jobTypeQuestions.characterQuestions.length === 0
        ) {
          const { data: fallbackByJobType } = await supabaseAdmin
            .from('question_bank_questions')
            .select('*')
            .in('job_type', [jobType, 'All', null]);
          if (fallbackByJobType && fallbackByJobType.length > 0) {
            jobTypeQuestions.basicQuestions = fallbackByJobType.filter(q => q.category === 'first-stage-technical');
            jobTypeQuestions.advancedQuestions = fallbackByJobType.filter(q => q.category === 'advanced-technical');
            jobTypeQuestions.leadershipQuestions = fallbackByJobType.filter(q => q.category === 'leadership-scenario' || q.category === 'leadership-scenarios');
            jobTypeQuestions.characterQuestions = fallbackByJobType.filter(q => q.category === 'character-analysis');
          }
        }

        allQuestions.push(jobTypeQuestions);

        console.log('🔢 Soru sayıları', {
          jobType,
          basic: jobTypeQuestions.basicQuestions.length,
          advanced: jobTypeQuestions.advancedQuestions.length,
          leadership: jobTypeQuestions.leadershipQuestions.length,
          character: jobTypeQuestions.characterQuestions.length
        });

        // Puan hesaplama için job type skorları
        jobTypeScores[jobType] = {
          basic: (basicQuestions || []).reduce((sum, q) => sum + (q.points || 0), 0),
          advanced: (advancedQuestions || []).reduce((sum, q) => sum + (q.points || 0), 0),
          leadership: (leadershipQuestions || []).reduce((sum, q) => sum + (q.points || 0), 0)
        };
      }

      console.log('✅ Teknik değerlendirme anketi hazırlandı:', {
        jobTypes: job_types.length,
        totalQuestions: allQuestions.reduce((sum, group) => 
          sum + group.basicQuestions.length + group.advancedQuestions.length + 
          group.leadershipQuestions.length + group.characterQuestions.length, 0
        ),
        jobTypeScores
      });

      res.json({
        success: true,
        data: {
          questions: allQuestions,
          jobTypeScores,
          assessmentType: 'technical-team-assessment'
        },
        message: 'Teknik değerlendirme anketi başarıyla oluşturuldu'
      } as ApiResponse);

    } catch (error) {
      console.error('❌ Teknik değerlendirme anketi oluşturma hatası:', error);
      next(error);
    }
  }

  // Teknik değerlendirme sonuçlarını analiz et
  async analyzeTechnicalAssessment(req: Request, res: Response, next: NextFunction) {
    try {
      const { responses, job_types = [], scores = {} } = req.body;

      if (!supabase) {
        return res.status(500).json({
          success: false,
          error: 'Database connection not configured',
          code: 'DATABASE_MISSING'
        } as ApiResponse);
      }

      console.log('🔍 Teknik değerlendirme analizi başlatılıyor:', { 
        job_types: job_types.length,
        hasScores: Object.keys(scores).length > 0
      });

      const analysisResults = [];
      let totalScore = 0;
      let maxScore = 0;

      // Her job type için analiz yap
      for (const jobType of job_types) {
        console.log(`📊 ${jobType} analizi yapılıyor...`);

        // Job type'a özel soruları al
        const { data: jobTypeQuestions } = await supabase
          .from('question_bank_questions')
          .select('*')
          .eq('job_type', jobType);

        // Liderlik sorularını al
        const { data: leadershipQuestions } = await supabase
          .from('question_bank_questions')
          .select('*')
          .eq('category', 'leadership-scenario');

        // Karakter analizi sorularını al
        const { data: characterQuestions } = await supabase
          .from('question_bank_questions')
          .select('*')
          .eq('category', 'character-analysis');

        // Frontend'den gelen scores'ları kullan veya hesapla
        let jobTypeAnalysis;
        
        if (Object.keys(scores).length > 0) {
          // Frontend'den aşamalı puanlar geldi, onları kullan
          const basicKey = `${jobType}_basic`;
          const advancedKey = `${jobType}_advanced`;
          const leadershipKey = `${jobType}_leadership`;
          const characterKey = `${jobType}_character`;
          
          jobTypeAnalysis = {
            basicScore: scores[basicKey]?.score || 0,
            maxBasicScore: scores[basicKey]?.maxScore || 0,
            basicPercentage: scores[basicKey]?.percentage || 0,
            advancedScore: scores[advancedKey]?.score || 0,
            maxAdvancedScore: scores[advancedKey]?.maxScore || 0,
            advancedPercentage: scores[advancedKey]?.percentage || 0,
            hasAdvancedAccess: !!scores[advancedKey]?.score
          };
          
          console.log(`📊 ${jobType} aşamalı puanları:`, {
            basic: `${jobTypeAnalysis.basicScore}/${jobTypeAnalysis.maxBasicScore} (${jobTypeAnalysis.basicPercentage}%)`,
            advanced: `${jobTypeAnalysis.advancedScore}/${jobTypeAnalysis.maxAdvancedScore} (${jobTypeAnalysis.advancedPercentage}%)`,
            hasAdvancedAccess: jobTypeAnalysis.hasAdvancedAccess
          });
          
        } else {
          // Eski sistem - tüm skorları hesapla
          jobTypeAnalysis = this.calculateJobTypeScore(responses, jobTypeQuestions || [], jobType);
          // hasAdvancedAccess zaten calculateJobTypeScore metodunda true olarak set ediliyor
        }
        
        const leadershipAnalysis = this.analyzeLeadership(responses, leadershipQuestions || []);
        const characterAnalysis = this.analyzeCharacter(responses, characterQuestions || []);

        const jobTypeResult = {
          jobType,
          ...jobTypeAnalysis,
          leadershipAnalysis,
          characterAnalysis,
          overallScore: jobTypeAnalysis.basicScore + jobTypeAnalysis.advancedScore,
          maxOverallScore: jobTypeAnalysis.maxBasicScore + jobTypeAnalysis.maxAdvancedScore
        };

        analysisResults.push(jobTypeResult);
        totalScore += jobTypeResult.overallScore;
        maxScore += jobTypeResult.maxOverallScore;
      }

      // Genel değerlendirme
      const overallPercentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
      const recommendedRoles = this.recommendRoles(analysisResults);
      const teamCompatibility = this.analyzeTeamCompatibility(analysisResults);

      console.log('📈 Teknik değerlendirme analizi tamamlandı:', {
        overallPercentage,
        recommendedRoles: recommendedRoles.length,
        teamCompatibility
      });

      res.json({
        success: true,
        data: {
          overallScore: totalScore,
          maxScore,
          overallPercentage,
          jobTypeAnalysis: analysisResults,
          recommendedRoles,
          teamCompatibility,
          assessmentType: 'technical-team-assessment'
        },
        message: 'Teknik değerlendirme analizi tamamlandı'
      } as ApiResponse);

    } catch (error) {
      console.error('❌ Teknik değerlendirme analizi hatası:', error);
      next(error);
    }
  }

  // Job type skorunu hesapla
  private calculateJobTypeScore(responses: Record<string, any>, questions: any[], jobType: string) {
    let basicScore = 0;
    let maxBasicScore = 0;
    let advancedScore = 0;
    let maxAdvancedScore = 0;

    const basicQuestions = questions.filter(q => q.category === 'first-stage-technical');
    const advancedQuestions = questions.filter(q => q.category === 'advanced-technical');

    // İlk teknik değerlendirme skorları
    basicQuestions.forEach(question => {
      const response = responses[question.id];
      if (response && response.answer !== undefined) {
        const isCorrect = this.checkAnswer(question, response.answer);
        if (isCorrect) {
          basicScore += question.points || 0;
        }
        maxBasicScore += question.points || 0;
      }
    });

        // İleri teknik skorları (herkes için)
        advancedQuestions.forEach(question => {
          const response = responses[question.id];
          if (response && response.answer !== undefined) {
            const isCorrect = this.checkAnswer(question, response.answer);
            if (isCorrect) {
              advancedScore += question.points || 0;
            }
            maxAdvancedScore += question.points || 0;
          }
        });

    return {
      basicScore,
      maxBasicScore,
      advancedScore,
      maxAdvancedScore,
      basicPercentage: maxBasicScore > 0 ? Math.round((basicScore / maxBasicScore) * 100) : 0,
      advancedPercentage: maxAdvancedScore > 0 ? Math.round((advancedScore / maxAdvancedScore) * 100) : 0,
      hasAdvancedAccess: true // Eski sistem için varsayılan değer
    };
  }

  // Cevap kontrolü
  private checkAnswer(question: any, answer: any): boolean {
    if (question.type === 'mcq' || question.type === 'radio') {
      const correctAnswers = question.correct || [];
      const userAnswer = Array.isArray(answer) ? answer : [answer];
      return correctAnswers.every((correct: any) => userAnswer.includes(correct));
    }
    return false; // Diğer soru tipleri için şimdilik false
  }

  // Liderlik analizi
  private analyzeLeadership(responses: Record<string, any>, leadershipQuestions: any[]) {
    let leadershipScore = 0;
    let maxLeadershipScore = 0;
    const leadershipAnswers: string[] = [];

    leadershipQuestions.forEach(question => {
      const response = responses[question.id];
      if (response && response.answer !== undefined) {
        const isCorrect = this.checkAnswer(question, response.answer);
        if (isCorrect) {
          leadershipScore += question.points || 0;
        }
        maxLeadershipScore += question.points || 0;
        leadershipAnswers.push(response.answer);
      }
    });

    // Liderlik tarzı belirleme
    const leadershipStyle = this.determineLeadershipStyle(leadershipAnswers);

    return {
      score: leadershipScore,
      maxScore: maxLeadershipScore,
      percentage: maxLeadershipScore > 0 ? Math.round((leadershipScore / maxLeadershipScore) * 100) : 0,
      style: leadershipStyle,
      strengths: this.getLeadershipStrengths(leadershipAnswers),
      areas: this.getLeadershipAreas(leadershipAnswers)
    };
  }

  // Karakter analizi
  private analyzeCharacter(responses: Record<string, any>, characterQuestions: any[]) {
    const characterAnswers: string[] = [];
    
    characterQuestions.forEach(question => {
      const response = responses[question.id];
      if (response && response.answer !== undefined) {
        characterAnswers.push(response.answer);
      }
    });

    return {
      personality: this.determinePersonality(characterAnswers),
      workStyle: this.determineWorkStyle(characterAnswers),
      communicationStyle: this.determineCommunicationStyle(characterAnswers),
      conflictResolution: this.determineConflictResolution(characterAnswers)
    };
  }

  // Liderlik tarzı belirleme
  private determineLeadershipStyle(answers: string[]): string {
    const styles: Record<string, number> = {
      democratic: 0,
      authoritarian: 0,
      laissezFaire: 0,
      transformational: 0
    };

    answers.forEach(answer => {
      if (answer.includes('Demokratik') || answer.includes('Takım kararları')) styles.democratic++;
      if (answer.includes('Otoriter') || answer.includes('Hızlı karar')) styles.authoritarian++;
      if (answer.includes('Laissez-faire') || answer.includes('serbest')) styles.laissezFaire++;
      if (answer.includes('Transformational') || answer.includes('İlham')) styles.transformational++;
    });

    const maxStyle = Object.entries(styles).reduce((a, b) => styles[a[0]] > styles[b[0]] ? a : b);
    return maxStyle[0];
  }

  // Kişilik tipi belirleme
  private determinePersonality(answers: string[]): string {
    // Basit kişilik analizi - gerçek uygulamada daha karmaşık algoritma kullanılabilir
    const riskTaker = answers.filter(a => a.includes('Hesaplanmış risk') || a.includes('Yüksek risk')).length;
    const cautious = answers.filter(a => a.includes('Düşük risk') || a.includes('Risk almam')).length;
    
    if (riskTaker > cautious) return 'Risk Alıcı';
    if (cautious > riskTaker) return 'Temkinli';
    return 'Dengeli';
  }

  // Çalışma tarzı belirleme
  private determineWorkStyle(answers: string[]): string {
    const collaborative = answers.filter(a => a.includes('Takım') || a.includes('Demokratik')).length;
    const independent = answers.filter(a => a.includes('serbest') || a.includes('Laissez-faire')).length;
    
    if (collaborative > independent) return 'İşbirlikçi';
    if (independent > collaborative) return 'Bağımsız';
    return 'Esnek';
  }

  // İletişim tarzı belirleme
  private determineCommunicationStyle(answers: string[]): string {
    const direct = answers.filter(a => a.includes('Düzenli') || a.includes('Hızlı')).length;
    const indirect = answers.filter(a => a.includes('Yavaş') || a.includes('temkinli')).length;
    
    if (direct > indirect) return 'Direkt';
    if (indirect > direct) return 'Dolaylı';
    return 'Dengeli';
  }

  // Çatışma çözümü belirleme
  private determineConflictResolution(answers: string[]): string {
    const problemSolving = answers.filter(a => a.includes('Problem-solving')).length;
    const avoidance = answers.filter(a => a.includes('Kaçınma')).length;
    const accommodation = answers.filter(a => a.includes('Uyum')).length;
    const competition = answers.filter(a => a.includes('Rekabet')).length;
    
    const max = Math.max(problemSolving, avoidance, accommodation, competition);
    if (max === problemSolving) return 'Problem Çözücü';
    if (max === avoidance) return 'Kaçınmacı';
    if (max === accommodation) return 'Uyumlu';
    return 'Rekabetçi';
  }

  // Liderlik güçlü yönleri
  private getLeadershipStrengths(answers: string[]): string[] {
    const strengths = [];
    if (answers.some(a => a.includes('Problem-solving'))) strengths.push('Problem Çözme');
    if (answers.some(a => a.includes('Demokratik'))) strengths.push('İşbirlikçi Liderlik');
    if (answers.some(a => a.includes('Düzenli'))) strengths.push('Yapılandırılmış Feedback');
    if (answers.some(a => a.includes('Hesaplanmış risk'))) strengths.push('Risk Yönetimi');
    return strengths;
  }

  // Liderlik gelişim alanları
  private getLeadershipAreas(answers: string[]): string[] {
    const areas = [];
    if (answers.some(a => a.includes('Kaçınma'))) areas.push('Çatışma Yönetimi');
    if (answers.some(a => a.includes('Risk almam'))) areas.push('Risk Alma');
    if (answers.some(a => a.includes('Hiç vermem'))) areas.push('Feedback Verme');
    return areas;
  }

  // Roller öner
  private recommendRoles(analysisResults: any[]): string[] {
    const recommendations: string[] = [];
    
    analysisResults.forEach(result => {
      if (result.overallPercentage >= 80) {
        recommendations.push(`${result.jobType} - Senior Level`);
      } else if (result.overallPercentage >= 60) {
        recommendations.push(`${result.jobType} - Mid Level`);
      } else if (result.overallPercentage >= 40) {
        recommendations.push(`${result.jobType} - Junior Level`);
      } else {
        recommendations.push(`${result.jobType} - Training Required`);
      }
    });

    return recommendations;
  }

  // Takım uyumluluğu analizi
  private analyzeTeamCompatibility(analysisResults: any[]): any {
    const leadershipStyles = analysisResults.map(r => r.leadershipAnalysis.style);
    const personalities = analysisResults.map(r => r.characterAnalysis.personality);
    
    return {
      leadershipDiversity: [...new Set(leadershipStyles)].length,
      personalityBalance: this.calculatePersonalityBalance(personalities),
      teamSynergy: this.calculateTeamSynergy(analysisResults),
      recommendations: this.getTeamRecommendations(analysisResults)
    };
  }

  // Kişilik dengesi hesapla
  private calculatePersonalityBalance(personalities: string[]): number {
    const unique = [...new Set(personalities)].length;
    return Math.round((unique / personalities.length) * 100);
  }

  // Takım sinerjisi hesapla
  private calculateTeamSynergy(analysisResults: any[]): number {
    const avgLeadership = analysisResults.reduce((sum, r) => sum + r.leadershipAnalysis.percentage, 0) / analysisResults.length;
    const avgTechnical = analysisResults.reduce((sum, r) => sum + r.overallScore, 0) / analysisResults.length;
    return Math.round((avgLeadership + avgTechnical) / 2);
  }

  // Takım önerileri
  private getTeamRecommendations(analysisResults: any[]): string[] {
    const recommendations = [];
    
    const hasStrongLeader = analysisResults.some(r => r.leadershipAnalysis.percentage >= 80);
    if (!hasStrongLeader) {
      recommendations.push('Güçlü bir takım lideri atanması önerilir');
    }
    
    const hasTechnicalExpert = analysisResults.some(r => r.overallPercentage >= 80);
    if (!hasTechnicalExpert) {
      recommendations.push('Teknik uzman desteği gerekebilir');
    }
    
    return recommendations;
  }
}

export const technicalAssessmentController = new TechnicalAssessmentController();
