import { Request, Response, NextFunction } from 'express';
import { supabase, supabaseAdmin } from '../config/database';
import { ApiResponse } from '../models/types';

interface AdaptiveAssessmentConfig {
  basicSuccessThreshold: number; // %50
  minCorrectAnswers: number; // 1
  enableAdvancedAccess: boolean; // true
  showProgressIndicator: boolean; // true
  phases: string[]; // ['basic', 'advanced', 'leadership']
  advancementRule: 'one_correct' | 'threshold'; // En az 1 doğru ya da %threshold
  leadershipTrigger: 'all_complete' | 'any_complete'; // Tüm specializations ya da herhangi biri
}

interface AdaptiveQuestion {
  id: string;
  type: string;
  question: string;
  options?: string[];
  correct?: number[];
  points: number;
  difficulty: string;
  category: string;
  jobType: string;
}

interface AdaptiveJobTypeGroup {
  jobType: string;
  basicQuestions: AdaptiveQuestion[];
  advancedQuestions: AdaptiveQuestion[];
}

interface AdaptivePhaseScore {
  score: number;
  maxScore: number;
  percentage: number;
  hasAccess: boolean;
}

interface AdaptiveAssessmentState {
  currentJobType: string;
  currentPhase: 'basic' | 'advanced' | 'leadership';
  phaseScores: Record<string, AdaptivePhaseScore>;
  responses: Record<string, any>;
}

class AdaptiveTechnicalAssessmentController {
  private readonly config: AdaptiveAssessmentConfig = {
    basicSuccessThreshold: 50,
    minCorrectAnswers: 1,
    enableAdvancedAccess: true,
    showProgressIndicator: true,
    phases: ['basic', 'advanced', 'leadership'],
    advancementRule: 'one_correct', // En az 1 doğru cevap ile ileri seviyeye geç
    leadershipTrigger: 'all_complete' // Tüm specializations tamamlanınca liderlik soruları
  };

  // Liderlik soruları gerektiren roller (büyük/küçük harf duyarsız)
  private readonly leadershipEligibleRoles = [
    'frontend developer',
    'backend developer',
    'full stack developer',
    'fullstack developer',
    'software engineer',
    'lead developer',
    'tech lead',
    'engineering manager',
    'web platformu'
  ];

  // Bir job type'ın liderlik soruları alıp almayacağını kontrol et
  private isLeadershipEligible(jobType: string): boolean {
    const normalizedJobType = jobType.trim().toLowerCase();
    return this.leadershipEligibleRoles.some(role => 
      normalizedJobType.includes(role) || role.includes(normalizedJobType)
    );
  }

  // Aşamalı teknik değerlendirme anketi oluştur
  generateAdaptiveAssessment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { case_id, job_types = [] } = req.body;

      if (!supabase || !supabaseAdmin) {
        return res.status(500).json({
          success: false,
          error: 'Database connection not configured',
          code: 'DATABASE_MISSING'
        } as ApiResponse);
      }

      console.log('🎯 Aşamalı teknik değerlendirme anketi oluşturuluyor:', { case_id, job_types });

      const allJobTypeGroups: AdaptiveJobTypeGroup[] = [];

      // Leadership sorularını her zaman çek - 5 soru
      let sharedLeadershipQuestions: AdaptiveQuestion[] = [];
      console.log(`🔍 Leadership soruları (5 adet) getiriliyor...`);
      sharedLeadershipQuestions = await this.getPhaseQuestions('All', 'leadership-scenarios', 5);
      console.log(`✅ Leadership sorular bulundu:`, sharedLeadershipQuestions?.length || 0);

      // Her job type için aşamalı sorular oluştur (SADECE İLK AŞAMA VE İLERİ)
      for (const jobType of job_types) {
        console.log(`📝 ${jobType} için sorular hazırlanıyor...`);
        
        // Basic Technical Questions - İLK AŞAMA
        console.log(`🔍 ${jobType} için basic sorular aranıyor (first-stage-technical)...`);
        const basicQuestions = await this.getPhaseQuestions(jobType, 'first-stage-technical', 2);
        console.log(`✅ ${jobType} basic sorular bulundu:`, basicQuestions?.length || 0);
        
        // Advanced Technical Questions - İLERİ (2 soru, 1/2 doğruysa açılır)
        console.log(`🔍 ${jobType} için advanced sorular aranıyor (advanced-technical)...`);
        const advancedQuestions = await this.getPhaseQuestions(jobType, 'advanced-technical', 2);
        console.log(`✅ ${jobType} advanced sorular bulundu:`, advancedQuestions?.length || 0);

        const jobTypeGroup: AdaptiveJobTypeGroup = {
          jobType,
          basicQuestions: basicQuestions || [],
          advancedQuestions: advancedQuestions || []
        };

        allJobTypeGroups.push(jobTypeGroup);

        console.log(`📊 ${jobType} FINAL soru dağılımı:`, {
          basic: jobTypeGroup.basicQuestions.length,
          advanced: jobTypeGroup.advancedQuestions.length
        });
      }

      console.log('✅ Aşamalı teknik değerlendirme anketi hazırlandı:', {
        jobTypes: job_types.length,
        totalTechnicalQuestions: allJobTypeGroups.reduce((sum, group) => 
          sum + group.basicQuestions.length + group.advancedQuestions.length, 0
        ),
        leadershipQuestions: sharedLeadershipQuestions.length,
        config: this.config
      });

      res.json({
        success: true,
        data: {
          jobTypeGroups: allJobTypeGroups,
          leadershipQuestions: sharedLeadershipQuestions, // Ayrı bir field olarak
          config: this.config,
          assessmentType: 'adaptive-technical-assessment'
        },
        message: 'Aşamalı teknik değerlendirme anketi başarıyla oluşturuldu'
      } as ApiResponse);

    } catch (error) {
      console.error('❌ Aşamalı teknik değerlendirme anketi oluşturma hatası:', error);
      next(error);
    }
  }

  // Aşama bazlı soru getirme
  private getPhaseQuestions = async (jobType: string, category: string, limit: number): Promise<AdaptiveQuestion[]> => {
    if (!supabaseAdmin) return [];

    try {
      console.log(`🔍 Searching questions for:`, { jobType, category, limit });

      // Önce job type özel sorular
      const { data: jobSpecificQuestions, error: jobSpecificError } = await supabaseAdmin
        .from('question_bank_questions')
        .select('*')
        .eq('job_type', jobType)
        .eq('category', category)
        .order('difficulty', { ascending: true })
        .limit(limit);

      console.log(`📋 Job specific questions found:`, {
        jobType, 
        category, 
        count: jobSpecificQuestions?.length || 0,
        error: jobSpecificError?.message || null
      });

      // Sonra genel sorular (eksik sayıda soru varsa)
      let allQuestions = jobSpecificQuestions || [];
      
      if (allQuestions.length < limit && jobType !== 'All') {
        const remainingCount = limit - allQuestions.length;
        console.log(`🔍 Searching general questions. Need ${remainingCount} more...`);

        const { data: generalQuestions, error: generalError } = await supabaseAdmin
          .from('question_bank_questions')
          .select('*')
          .or('job_type.eq.All,job_type.is.null')
          .eq('category', category)
          .order('difficulty', { ascending: true })
          .limit(remainingCount);
        
        console.log(`📋 General questions found:`, {
          count: generalQuestions?.length || 0,
          error: generalError?.message || null
        });
        
        if (generalQuestions) {
          allQuestions = [...allQuestions, ...generalQuestions];
        }
      }

      // Database field'larını AdaptiveQuestion interface'ine map et
      const mappedQuestions: AdaptiveQuestion[] = allQuestions.slice(0, limit).map((q: any) => {
        const base = {
          id: q.id,
          type: q.type,
          question: q.question,
          options: Array.isArray(q.options) ? q.options : (typeof q.options === 'string' ? JSON.parse(q.options || '[]') : []),
          correct: Array.isArray(q.correct) ? q.correct : (typeof q.correct === 'string' ? JSON.parse(q.correct || '[]') : []),
          points: q.points ?? 25,
          difficulty: q.difficulty,
          category: q.category,
          jobType: q.job_type || jobType
        };
        if (category === 'leadership-scenarios' && q.leadership_scoring) {
          const ls = typeof q.leadership_scoring === 'string' ? JSON.parse(q.leadership_scoring) : q.leadership_scoring;
          const mapping: Record<number, string> = {};
          const scoring: Record<number, { points: number; criteria: Record<string, number> }> = {};
          if (ls && typeof ls === 'object') {
            Object.entries(ls).forEach(([k, v]: [string, any]) => {
              const i = parseInt(k, 10);
              if (!isNaN(i) && v?.points != null) {
                mapping[i] = v.leadershipType || `type-${k}`;
                scoring[i] = { points: v.points, criteria: v.criteria || {} };
              }
            });
          }
          if (Object.keys(scoring).length > 0) {
            return { ...base, leadershipMapping: mapping, leadershipScoring: scoring } as any;
          }
        }
        if (category === 'leadership-scenarios') {
          const opts = Array.isArray(base.options) ? base.options : [];
          const defMapping: Record<number, string> = {};
          const defScoring: Record<number, { points: number; criteria: Record<string, number> }> = {};
          opts.forEach((_: string, i: number) => {
            defMapping[i] = `liderlik-tipi-${i}`;
            defScoring[i] = { points: Math.round((base.points || 25) * 0.85), criteria: { 'Liderlik': 4 } };
          });
          return { ...base, leadershipMapping: defMapping, leadershipScoring: defScoring } as any;
        }
        return base as AdaptiveQuestion;
      });

      console.log(`✅ Final mapped questions for ${jobType} (${category}):`, mappedQuestions.length);
      
      // Eğer hiç soru bulunamadıysa, fallback sorular oluştur
      if (mappedQuestions.length === 0) {
        console.warn(`⚠️ No questions found for ${jobType} (${category}), creating fallback questions...`);
        return this.createFallbackQuestions(jobType, category, limit);
      }
      
      return mappedQuestions;
    } catch (error) {
      console.error(`❌ ${category} sorularını getirirken hata:`, error);
      // Hata durumunda fallback sorular döndür
      return this.createFallbackQuestions(jobType, category, limit);
    }
  }

  // Fallback sorular oluştur (veritabanında soru bulunamadığında)
  private createFallbackQuestions(jobType: string, category: string, limit: number): AdaptiveQuestion[] {
    const fallbackQuestions: AdaptiveQuestion[] = [];

    for (let i = 0; i < limit; i++) {
      const questionId = `fallback-${category}-${jobType}-${i + 1}`;
      let question: AdaptiveQuestion;

      switch (category) {
        case 'first-stage-technical':
          question = {
            id: questionId,
            type: 'multiple-choice',
            question: `${jobType} için temel seviye teknik soru ${i + 1}`,
            options: ['Seçenek A', 'Seçenek B', 'Seçenek C', 'Seçenek D'],
            correct: [0],
            points: 10,
            difficulty: 'Easy',
            category: 'first-stage-technical',
            jobType: jobType
          };
          break;

        case 'advanced-technical':
          question = {
            id: questionId,
            type: 'multiple-choice',
            question: `${jobType} için ileri seviye teknik soru ${i + 1}`,
            options: ['Gelişmiş A', 'Gelişmiş B', 'Gelişmiş C', 'Gelişmiş D'],
            correct: [0],
            points: 15,
            difficulty: 'Hard',
            category: 'advanced-technical',
            jobType: jobType
          };
          break;

        case 'leadership-scenarios':
          question = {
            id: questionId,
            type: 'multiple-choice',
            question: `Liderlik senaryosu ${i + 1}: Bir takım içinde çakışma yaşandığında nasıl davranırsınız?`,
            options: [
              'Çakışmayı görmezden gelirim',
              'Tarafları dinler ve ortak çözüm ararım',
              'En güçlü tarafı desteklerim',
              'Üst yönetimi bilgilendiririm'
            ],
            correct: [1],
            points: 12,
            difficulty: 'Medium',
            category: 'leadership-scenarios',
            jobType: 'All'
          };
          break;

        default:
          question = {
            id: questionId,
            type: 'multiple-choice',
            question: `Genel soru ${i + 1}`,
            options: ['A', 'B', 'C', 'D'],
            correct: [0],
            points: 10,
            difficulty: 'Medium',
            category: category,
            jobType: jobType
          };
      }

      fallbackQuestions.push(question);
    }

    console.log(`🔧 Created ${fallbackQuestions.length} fallback questions for ${jobType} (${category})`);
    return fallbackQuestions;
  }

  // Aşamalı değerlendirme analizi
  analyzeAdaptiveAssessment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { 
        responses, 
        job_types = [], 
        phase_scores = {},
        assessment_state = {} 
      } = req.body;

      if (!supabase) {
        return res.status(500).json({
          success: false,
          error: 'Database connection not configured',
          code: 'DATABASE_MISSING'
        } as ApiResponse);
      }

      console.log('🔍 Aşamalı teknik değerlendirme analizi başlatılıyor:', { 
        job_types: job_types.length,
        hasPhaseScores: Object.keys(phase_scores).length > 0,
        hasAssessmentState: Object.keys(assessment_state).length > 0
      });

      const analysisResults = [];
      let totalScore = 0;
      let maxScore = 0;

      // Her job type için detaylı analiz
      for (const jobType of job_types) {
        console.log(`📊 ${jobType} aşamalı analizi yapılıyor...`);

        const jobTypeAnalysis = await this.analyzeJobTypePhases(
          jobType, 
          responses, 
          phase_scores, 
          assessment_state
        );

        analysisResults.push(jobTypeAnalysis);
        totalScore += jobTypeAnalysis.totalScore;
        maxScore += jobTypeAnalysis.totalMaxScore;
      }

      // Genel değerlendirme
      const overallPercentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
      const adaptiveInsights = this.generateAdaptiveInsights(analysisResults);
      const progressiveDevelopment = this.createProgressiveDevelopment(analysisResults);

      console.log('📈 Aşamalı teknik değerlendirme analizi tamamlandı:', {
        overallPercentage,
        totalAnalyzedJobs: analysisResults.length,
        adaptiveInsights: adaptiveInsights.length
      });

      res.json({
        success: true,
        data: {
          overallScore: totalScore,
          maxScore,
          overallPercentage,
          jobTypeAnalysis: analysisResults,
          adaptiveInsights,
          progressiveDevelopment,
          assessmentType: 'adaptive-technical-assessment',
          config: this.config
        },
        message: 'Aşamalı teknik değerlendirme analizi tamamlandı'
      } as ApiResponse);

    } catch (error) {
      console.error('❌ Aşamalı teknik değerlendirme analizi hatası:', error);
      next(error);
    }
  }

  // Job type için aşama analizi
  private async analyzeJobTypePhases(
    jobType: string, 
    responses: Record<string, any>, 
    phaseScores: Record<string, any>,
    assessmentState: Record<string, any>
  ) {
    // Phase score'ları al
    const basicPhase = phaseScores[`${jobType}_basic`] || { score: 0, maxScore: 0, percentage: 0 };
    const advancedPhase = phaseScores[`${jobType}_advanced`] || { score: 0, maxScore: 0, percentage: 0 };
    const leadershipPhase = phaseScores[`${jobType}_leadership`] || { score: 0, maxScore: 0, percentage: 0 };

    // Advanced erişim kontrolü
    const hasAdvancedAccess = basicPhase.percentage >= this.config.basicSuccessThreshold || 
                             basicPhase.score >= this.config.minCorrectAnswers;

    // Aşama performans analizi
    const phasePerformance = {
      basic: {
        ...basicPhase,
        status: basicPhase.percentage >= 70 ? 'excellent' : 
                basicPhase.percentage >= 50 ? 'good' : 
                basicPhase.percentage >= 30 ? 'needs_improvement' : 'poor'
      },
      advanced: {
        ...advancedPhase,
        hasAccess: hasAdvancedAccess,
        status: !hasAdvancedAccess ? 'no_access' : 
                advancedPhase.percentage >= 70 ? 'excellent' : 
                advancedPhase.percentage >= 50 ? 'good' : 
                advancedPhase.percentage >= 30 ? 'needs_improvement' : 'poor'
      },
      leadership: {
        ...leadershipPhase,
        status: leadershipPhase.percentage >= 70 ? 'excellent' : 
                leadershipPhase.percentage >= 50 ? 'good' : 
                leadershipPhase.percentage >= 30 ? 'needs_improvement' : 'poor'
      }
    };

    return {
      jobType,
      hasAdvancedAccess,
      phasePerformance,
      totalScore: basicPhase.score + advancedPhase.score + leadershipPhase.score,
      totalMaxScore: basicPhase.maxScore + advancedPhase.maxScore + leadershipPhase.maxScore,
      overallPercentage: this.calculateOverallPercentage(phasePerformance),
      recommendations: this.generateJobTypeRecommendations(jobType, phasePerformance),
      developmentPath: this.createDevelopmentPath(jobType, phasePerformance)
    };
  }

  // Genel yüzde hesaplama
  private calculateOverallPercentage(phasePerformance: any): number {
    const phases = [phasePerformance.basic, phasePerformance.leadership];
    if (phasePerformance.advanced.hasAccess) {
      phases.push(phasePerformance.advanced);
    }

    const totalPercentage = phases.reduce((sum, phase) => sum + phase.percentage, 0);
    return Math.round(totalPercentage / phases.length);
  }

  // Job type önerileri
  private generateJobTypeRecommendations(jobType: string, phasePerformance: any): string[] {
    const recommendations: string[] = [];

    // Basic phase önerileri
    if (phasePerformance.basic.status === 'poor' || phasePerformance.basic.status === 'needs_improvement') {
      recommendations.push(`${jobType} temel konularında güçlenme gerekiyor`);
      recommendations.push('Temel kavramları yeniden gözden geçirin');
    }

    // Advanced phase önerileri
    if (!phasePerformance.advanced.hasAccess) {
      recommendations.push('İleri seviye konulara geçmek için temel bilgileri güçlendirin');
    } else if (phasePerformance.advanced.status === 'poor' || phasePerformance.advanced.status === 'needs_improvement') {
      recommendations.push(`${jobType} ileri seviye konularda çalışma gerekiyor`);
      recommendations.push('Kompleks projelerde deneyim kazanın');
    }

    // Leadership phase önerileri
    if (phasePerformance.leadership.status === 'poor' || phasePerformance.leadership.status === 'needs_improvement') {
      recommendations.push('Liderlik becerilerini geliştirmek için mentoring alın');
      recommendations.push('Takım yönetimi deneyimi kazanın');
    }

    return recommendations;
  }

  // Gelişim yolu oluştur
  private createDevelopmentPath(jobType: string, phasePerformance: any): any {
    const path = {
      current_level: 'junior',
      next_milestones: [] as string[],
      estimated_timeline: '6-12 months',
      focus_areas: [] as string[]
    };

    // Seviye belirleme
    const overallScore = this.calculateOverallPercentage(phasePerformance);
    if (overallScore >= 80) {
      path.current_level = 'senior';
      path.estimated_timeline = 'Ready for leadership roles';
    } else if (overallScore >= 60) {
      path.current_level = 'mid-level';
      path.estimated_timeline = '3-6 months to senior';
    } else if (overallScore >= 40) {
      path.current_level = 'junior+';
      path.estimated_timeline = '6-12 months to mid-level';
    }

    // Odak alanları
    if (phasePerformance.basic.status !== 'excellent') {
      path.focus_areas.push('Technical Foundations');
    }
    if (phasePerformance.advanced.hasAccess && phasePerformance.advanced.status !== 'excellent') {
      path.focus_areas.push('Advanced Technical Skills');
    }
    if (phasePerformance.leadership.status !== 'excellent') {
      path.focus_areas.push('Leadership & Communication');
    }

    return path;
  }

  // Adaptif içgörüler oluştur
  private generateAdaptiveInsights(analysisResults: any[]): string[] {
    const insights: string[] = [];

    // Genel başarı analizi
    const totalJobs = analysisResults.length;
    const advancedAccessCount = analysisResults.filter(r => r.hasAdvancedAccess).length;
    const advancedAccessRate = Math.round((advancedAccessCount / totalJobs) * 100);

    insights.push(`${advancedAccessRate}% job type'da ileri seviye sorulara erişim sağlandı`);

    // En iyi performans alanları
    const bestPerformances = analysisResults
      .filter(r => r.overallPercentage >= 70)
      .map(r => r.jobType);

    if (bestPerformances.length > 0) {
      insights.push(`En güçlü alanlar: ${bestPerformances.join(', ')}`);
    }

    // Gelişim alanları
    const developmentAreas = analysisResults
      .filter(r => r.overallPercentage < 50)
      .map(r => r.jobType);

    if (developmentAreas.length > 0) {
      insights.push(`Gelişim gereken alanlar: ${developmentAreas.join(', ')}`);
    }

    return insights;
  }

  // Aşamalı gelişim planı
  private createProgressiveDevelopment(analysisResults: any[]): any {
    return {
      short_term: analysisResults
        .filter(r => !r.hasAdvancedAccess)
        .map(r => `${r.jobType} temel konularında güçlenme`),
      
      medium_term: analysisResults
        .filter(r => r.hasAdvancedAccess && r.overallPercentage < 70)
        .map(r => `${r.jobType} ileri seviye beceri geliştirme`),
      
      long_term: analysisResults
        .filter(r => r.overallPercentage >= 70)
        .map(r => `${r.jobType} liderlik rollerine hazırlık`)
    };
  }
}

export const adaptiveTechnicalAssessmentController = new AdaptiveTechnicalAssessmentController();
