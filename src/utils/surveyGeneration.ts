/**
 * BACKEND SURVEY GENERATION UTILITY
 * Dynamic survey sorularını case bilgisine göre generate eder
 */

interface Question {
  id: string;
  type: string;
  category: string;
  question: string;
  options?: string[];
  correct?: number | number[];
  jobType?: string;
  domain?: string;
  isFirstStage?: boolean;
  difficulty?: string;
  points?: number | any;
  [key: string]: any;
}

interface SurveyQuestion {
  id: string;
  type: string;
  question: string;
  options?: string[];
  required: boolean;
  order: number;
  category?: string;
  correct?: number | number[];
  points?: number | any;
  sourceCategory?: string;
  jobType?: string;
  [key: string]: any;
}

interface SurveyTemplate {
  id: string;
  type: string;
  category?: string;
  title: string;
  description?: string;
  target_audience?: string;
  is_active?: boolean;
  is_dynamic?: boolean;
  questions?: any[];
  created_at?: string;
  updated_at?: string;
  [key: string]: any;
}

interface CaseScenario {
  id: string;
  title: string;
  jobTypes: string[];
  specializations?: string[];
  domain?: string;
  [key: string]: any;
}

/**
 * Main function: Generate dynamic survey questions based on template and case
 */
export function generateDynamicSurveyQuestions(
  template: SurveyTemplate,
  caseScenario: CaseScenario
): SurveyQuestion[] {
  console.log('🔀 Backend Survey Generation - Template:', template.title);
  console.log('📊 Template type:', template.type);
  console.log('📊 Template is_dynamic:', template.is_dynamic);
  console.log('🎯 Case jobTypes:', caseScenario.jobTypes);
  console.log('🎯 Case domain:', caseScenario.domain);
  
  // Check if template is dynamic
  if (!template.is_dynamic) {
    console.log('📋 Statik template - mevcut soruları kullanıyor');
    return template.questions || [];
  }
  
  // Generate dynamic questions based on template type
  if (template.type === 'application-initial-assessment') {
    console.log('🎯 Başvuru ve İlk Değerlendirme anketi için case-özel sorular seçiliyor...');
    
    // Kişisel bilgi sorularını ekle
    const personalQuestions = getPersonalInfoQuestions();
    console.log(`📝 ${personalQuestions.length} kişisel bilgi sorusu eklendi`);
    
    // Case domain'ine göre sorular (simplified version)
    const domainQuestions = generateSimpleDomainQuestions(caseScenario, 10);
    console.log(`✅ Domain'e özel ${domainQuestions.length} soru seçildi`);
    
    // Kişisel bilgi + domain soruları
    const allDynamicQuestions = [...personalQuestions, ...domainQuestions];
    console.log(`🎯 Toplam ${allDynamicQuestions.length} dinamik soru hazırlandı`);
    
    return allDynamicQuestions;
  }
  
  if (template.type === 'initial-assessment') {
    console.log('🎯 İlk Değerlendirme anketi için case-özel sorular seçiliyor...');
    
    // Kişisel bilgi sorularını ekle
    const personalQuestions = getPersonalInfoQuestions();
    console.log(`📝 ${personalQuestions.length} kişisel bilgi sorusu eklendi`);
    
    // Case'e özel sorular
    const caseSpecificQuestions = generateSimpleDomainQuestions(caseScenario, 5);
    console.log(`✅ Case'e özel ${caseSpecificQuestions.length} soru seçildi`);
    
    // Kişisel bilgi + case özel sorular
    const allDynamicQuestions = [...personalQuestions, ...caseSpecificQuestions];
    console.log(`🎯 Toplam ${allDynamicQuestions.length} dinamik soru hazırlandı`);
    
    return allDynamicQuestions;
  }
  
  if (template.type === 'technical-assessment') {
    console.log('🔧 Teknik Değerlendirme anketi için sorular seçiliyor...');
    
    const technicalQuestions = generateSimpleTechnicalQuestions(caseScenario, 8);
    console.log(`✅ Teknik ${technicalQuestions.length} soru seçildi`);
    
    return technicalQuestions;
  }
  
  // Default: return template questions
  console.log('📋 Statik template soruları kullanılıyor (fallback)');
  return template.questions || [];
}

/**
 * Get personal information questions
 */
function getPersonalInfoQuestions(): SurveyQuestion[] {
  return [
    {
      id: 'personal-name',
      type: 'text',
      question: 'Tam Adınız',
      required: true,
      order: 1,
      category: 'personal'
    },
    {
      id: 'personal-email',
      type: 'text',
      question: 'E-posta Adresiniz',
      required: true,
      order: 2,
      category: 'personal'
    },
    {
      id: 'personal-phone',
      type: 'text',
      question: 'Telefon Numaranız',
      required: true,
      order: 3,
      category: 'personal'
    },
    {
      id: 'personal-location-konya',
      type: 'radio',
      question: 'Konya\'da mısınız?',
      options: ['Evet, Konya\'dayım', 'Hayır, başka şehirdeyim ama Konya\'ya gelebilirim', 'Hayır, remote çalışmayı tercih ederim'],
      required: true,
      order: 4,
      category: 'personal'
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
      category: 'personal'
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
      category: 'personal'
    }
  ];
}

/**
 * Generate simple domain-specific questions
 * This is a simplified version - frontend has the full question bank
 */
function generateSimpleDomainQuestions(caseScenario: CaseScenario, maxQuestions: number): SurveyQuestion[] {
  const questions: SurveyQuestion[] = [];
  let order = 7; // Start after personal questions
  
  // General questions that work for all domains
  const generalQuestions = [
    {
      id: 'initial-001',
      type: 'radio',
      question: 'Hangi alanda kendinizi en güçlü hissediyorsunuz?',
      options: [
        'Tasarım ve Yaratıcılık',
        'Yazılım Geliştirme',
        'Analiz ve Problem Çözme',
        'İletişim ve Koordinasyon'
      ],
      correct: [0, 1, 2, 3],
      points: 10,
      required: true,
      order: order++,
      category: 'initial-assessment'
    },
    {
      id: 'initial-002',
      type: 'radio',
      question: 'Yeni bir şey öğrenirken hangi yöntemi tercih edersiniz?',
      options: [
        'Video eğitimler izlerim',
        'Kitap ve dokümantasyon okurum',
        'Uygulamalı projeler yaparım',
        'Birinden öğrenirim'
      ],
      correct: [1, 2],
      points: 10,
      required: true,
      order: order++,
      category: 'initial-assessment'
    },
    {
      id: 'initial-003',
      type: 'radio',
      question: 'Ekip çalışmasında kendinizi nasıl tanımlarsınız?',
      options: [
        'Liderlik yapmayı severim',
        'İyi bir takım oyuncusuyum',
        'Teknik konularda uzmanım',
        'Organizasyon ve planlama konusunda iyiyim'
      ],
      correct: [0, 1, 2, 3],
      points: 10,
      required: true,
      order: order++,
      category: 'initial-assessment'
    },
    {
      id: 'initial-004',
      type: 'radio',
      question: 'Bir problemi çözerken ilk ne yaparsınız?',
      options: [
        'Hemen çözüm aramaya başlarım',
        'Problemi analiz edip parçalara bölerim',
        'Deneyimli birinden yardım isterim',
        'İnternetten araştırma yaparım'
      ],
      correct: [1],
      points: 15,
      required: true,
      order: order++,
      category: 'initial-assessment'
    },
    {
      id: 'initial-005',
      type: 'radio',
      question: 'Yazılım geliştirme deneyiminiz kaç yıl?',
      options: [
        '0-1 yıl (Yeni başlayan)',
        '1-3 yıl (Junior)',
        '3-5 yıl (Mid-level)',
        '5+ yıl (Senior)'
      ],
      correct: [0, 1, 2, 3],
      points: 10,
      required: true,
      order: order++,
      category: 'initial-assessment'
    }
  ];
  
  // Add domain-specific questions if we recognize the domain
  const domain = caseScenario.domain?.toLowerCase();
  if (domain && domain.includes('web')) {
    questions.push({
      id: 'initial-web-001',
      type: 'radio',
      question: 'Web platformu geliştirirken en önemli önceliğiniz ne olur?',
      options: [
        'Görsel tasarım ve kullanıcı deneyimi',
        'Performans ve hız optimizasyonu',
        'Güvenlik ve veri koruması',
        'Kolay bakım ve kod kalitesi'
      ],
      correct: [0, 1, 2, 3],
      points: 12,
      required: true,
      order: order++,
      category: 'initial-assessment',
      domain: 'web-platformu'
    });
  }
  
  if (domain && domain.includes('mobil')) {
    questions.push({
      id: 'initial-mobile-001',
      type: 'radio',
      question: 'Mobil uygulama geliştirirken en kritik faktör hangisidir?',
      options: [
        'Platform uyumluluğu (iOS/Android)',
        'Batarya optimizasyonu',
        'Çevrimdışı çalışabilme',
        'Hızlı başlatma süresi'
      ],
      correct: [0, 3],
      points: 15,
      required: true,
      order: order++,
      category: 'initial-assessment',
      domain: 'mobil-uygulama'
    });
  }
  
  // Combine general and domain-specific questions
  const allQuestions = [...generalQuestions, ...questions];
  
  // Shuffle and limit to maxQuestions
  return shuffleArray(allQuestions).slice(0, maxQuestions);
}

/**
 * Generate simple technical questions
 */
function generateSimpleTechnicalQuestions(caseScenario: CaseScenario, maxQuestions: number): SurveyQuestion[] {
  const questions: SurveyQuestion[] = [];
  let order = 1;
  
  // Add technical questions based on job types
  caseScenario.jobTypes.forEach(jobType => {
    if (jobType.toLowerCase().includes('frontend') || jobType.toLowerCase().includes('web')) {
      questions.push({
        id: `tech-frontend-${order}`,
        type: 'radio',
        question: 'Web geliştirmede HTML, CSS ve JavaScript arasındaki temel fark nedir?',
        options: [
          'Hepsi aynı işi yapar',
          'HTML yapı, CSS stil, JavaScript işlevsellik sağlar',
          'HTML stil, CSS yapı, JavaScript veri sağlar',
          'Sadece JavaScript yeterlidir'
        ],
        correct: [1],
        points: 10,
        required: true,
        order: order++,
        category: 'technical-assessment',
        jobType: jobType
      });
    }
    
    if (jobType.toLowerCase().includes('backend')) {
      questions.push({
        id: `tech-backend-${order}`,
        type: 'radio',
        question: 'API (Application Programming Interface) ne için kullanılır?',
        options: [
          'Sadece web sitesi tasarımı için',
          'Farklı yazılımlar arasında veri alışverişi için',
          'Sadece mobil uygulama geliştirme için',
          'Veritabanı oluşturmak için'
        ],
        correct: [1],
        points: 10,
        required: true,
        order: order++,
        category: 'technical-assessment',
        jobType: jobType
      });
    }
  });
  
  // Add general technical questions if not enough specific ones
  if (questions.length < maxQuestions) {
    const generalTechQuestions = [
      {
        id: 'tech-general-001',
        type: 'radio',
        question: 'Responsive web tasarımının temel amacı nedir?',
        options: [
          'Web sitesini renkli yapmak',
          'Farklı cihaz boyutlarına uyum sağlamak',
          'Sadece mobil cihazlar için optimize etmek',
          'Animasyon eklemek'
        ],
        correct: [1],
        points: 10,
        required: true,
        order: order++,
        category: 'technical-assessment'
      },
      {
        id: 'tech-general-002',
        type: 'radio',
        question: 'Versiyon kontrol sistemi (Git) neden kullanılır?',
        options: [
          'Sadece yedekleme için',
          'Kod değişikliklerini takip etmek ve işbirliği yapmak için',
          'Sadece büyük projeler için',
          'Otomatik kod yazmak için'
        ],
        correct: [1],
        points: 10,
        required: true,
        order: order++,
        category: 'technical-assessment'
      }
    ];
    
    questions.push(...generalTechQuestions);
  }
  
  return questions.slice(0, maxQuestions);
}

/**
 * Shuffle array utility
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Calculate assessment score from survey responses (BACKEND VERSION - IMPROVED)
 * Same logic as frontend for consistency
 */
export function calculateAssessmentScore(
  responses: Record<string, any>,
  surveyQuestions: SurveyQuestion[]
): {
  totalScore: number;
  categoryScores: Record<string, number>;
  maxPossibleScore: number;
  leadershipTypeScores: Record<string, number>;
  dominantLeadershipType: string;
  detailedBreakdown: Array<{
    questionId: string;
    question: string;
    userAnswer: any;
    isCorrect: boolean;
    points: number;
    maxPoints: number;
    category: string;
  }>;
} {
  let totalScore = 0;
  let maxPossibleScore = 0;
  const categoryScores: Record<string, number> = {};
  const detailedBreakdown: Array<any> = [];

  console.log('🔢 BACKEND SCORING - Calculating scores for', surveyQuestions.length, 'questions');
  console.log('📊 User responses count:', Object.keys(responses).length);

  surveyQuestions.forEach(question => {
    // Handle both old and new response formats
    let response;
    if (Array.isArray(responses)) {
      const responseItem = responses.find((r: any) => r.questionId === question.id);
      response = responseItem?.answer;
    } else {
      response = responses[question.id];
    }
    
    console.log(`🔍 Processing question ${question.id}:`, { hasResponse: response !== undefined });
    
    if (response === undefined || response === null) {
      console.log(`❌ No response for question ${question.id}`);
      return;
    }

    // Filter personal info questions (no scoring)
    const personalInfoTypes = ['text', 'email', 'phone', 'textarea'];
    const personalInfoKeywords = ['personal', 'kişisel', 'ad', 'soyad', 'email', 'telefon', 'phone'];
    const isPersonalInfo = personalInfoTypes.includes(question.type) || 
                          personalInfoKeywords.some(keyword => question.id.toLowerCase().includes(keyword));
    
    if (isPersonalInfo) {
      console.log(`📝 Personal info question, skipping scoring: ${question.id}`);
      return;
    }

    // Parse user answer
    let userAnswer: number;
    if (typeof response === 'string' && response.includes('Seçenek')) {
      const optionMatch = response.match(/Seçenek ([A-D])/);
      if (optionMatch) {
        userAnswer = optionMatch[1].charCodeAt(0) - 65; // A=0, B=1, C=2, D=3
      } else {
        userAnswer = 0;
      }
    } else {
      userAnswer = parseInt(response.toString());
      if (isNaN(userAnswer)) {
        if (question.category === 'leadership-scenarios' || question.sourceCategory === 'leadership-scenarios') {
          console.log(`🎯 Leadership question with empty answer: ${question.id}, using random answer`);
          userAnswer = Math.floor(Math.random() * 4);
        } else {
          console.log(`❌ Invalid numeric answer: ${response}`);
          return;
        }
      }
    }
    
    let isCorrect = false;
    let questionScore = 0;
    const questionCategory = question.sourceCategory || question.jobType || question.category || 'General';

    // Initialize category if not exists
    if (!categoryScores[questionCategory]) {
      categoryScores[questionCategory] = 0;
    }

    // Check if answer is correct
    let isPreferenceQuestion = false;
    if (question.correct !== undefined) {
      if (Array.isArray(question.correct)) {
        // Eğer tüm seçenekler doğru ise (preference/tercih sorusu)
        if (question.options && question.correct.length === question.options.length) {
          isPreferenceQuestion = true;
          isCorrect = true; // Tercih soruları her zaman doğru
        } else {
          isCorrect = question.correct.includes(userAnswer);
        }
      } else {
        isCorrect = userAnswer === question.correct;
      }
    }
    
    // Leadership scenarios special handling
    if (question.category === 'leadership-scenarios' || question.sourceCategory === 'leadership-scenarios') {
      console.log(`🎯 Processing leadership question: ${question.id}`);
      
      if ((question as any).leadershipMapping && (question as any).leadershipScoring) {
        const leadershipType = (question as any).leadershipMapping[userAnswer];
        const scoring = (question as any).leadershipScoring[userAnswer];
        
        if (leadershipType && scoring) {
          questionScore = scoring.points || 20;
          console.log(`🎯 Leadership scoring: ${leadershipType} = ${questionScore} points`);
        } else {
          questionScore = 20;
        }
      } else {
        const leadershipScores = [18, 20, 19, 21];
        questionScore = leadershipScores[userAnswer] || 20;
        console.log(`🎯 Default leadership scoring: ${questionScore} points`);
      }
      
      isCorrect = true;
    }

    // Calculate score based on question type
    if (question.points && typeof question.points === 'object') {
      if (question.points.yonlendirilebilirTeknik) {
        const categories = ['yonlendirilebilirTeknik', 'takimLideri', 'yeniBaslayan', 'operasyonelYetenek'];
        let totalCategoryScore = 0;
        let categoryCount = 0;
        
        categories.forEach(cat => {
          if (question.points[cat] && question.points[cat][userAnswer] !== undefined) {
            totalCategoryScore += question.points[cat][userAnswer];
            categoryCount++;
          }
        });
        
        if (categoryCount > 0) {
          questionScore = Math.round(totalCategoryScore / categoryCount);
        }
      } else {
        Object.keys(question.points).forEach(category => {
          if (question.points[category] && question.points[category][userAnswer] !== undefined) {
            const score = question.points[category][userAnswer];
            categoryScores[category] = (categoryScores[category] || 0) + score;
            questionScore += score;
          }
        });
      }
    } else {
      if (!(question.category === 'leadership-scenarios' || question.sourceCategory === 'leadership-scenarios')) {
        if (isPreferenceQuestion) {
          // Tercih soruları: Daha düşük puan (profil oluşturma için kullanılır, test değil)
          questionScore = 5; // Sabit 5 puan
        } else if (isCorrect) {
          questionScore = question.points || 10;
        } else {
          questionScore = 0;
        }
      }
    }

    // Add to category and total score
    categoryScores[questionCategory] += questionScore;
    totalScore += questionScore;
    
    // Calculate max possible score for this question
    let maxQuestionScore = 10;
    
    // Tercih soruları için max score düşük
    if (isPreferenceQuestion) {
      maxQuestionScore = 5;
    } else if (question.points && typeof question.points === 'object') {
      if (question.points.yonlendirilebilirTeknik) {
        const categories = ['yonlendirilebilirTeknik', 'takimLideri', 'yeniBaslayan', 'operasyonelYetenek'];
        let maxCategoryScore = 0;
        
        categories.forEach(cat => {
          if (question.points[cat] && Array.isArray(question.points[cat])) {
            const categoryMax = Math.max(...question.points[cat]);
            maxCategoryScore = Math.max(maxCategoryScore, categoryMax);
          }
        });
        
        maxQuestionScore = maxCategoryScore;
      } else {
        let maxCategoryScore = 0;
        Object.keys(question.points).forEach(category => {
          if (question.points[category] && Array.isArray(question.points[category])) {
            const categoryMax = Math.max(...question.points[category]);
            maxCategoryScore = Math.max(maxCategoryScore, categoryMax);
          }
        });
        maxQuestionScore = maxCategoryScore;
      }
    } else if (typeof question.points === 'number') {
      maxQuestionScore = question.points;
    }
    
    maxPossibleScore += maxQuestionScore;

    // Add to detailed breakdown
    detailedBreakdown.push({
      questionId: question.id,
      question: question.question || 'No question text',
      userAnswer,
      isCorrect,
      points: questionScore,
      maxPoints: maxQuestionScore,
      category: questionCategory
    });

    console.log(`📝 Question ${question.id}: Answer=${userAnswer}, Score=${questionScore}/${maxQuestionScore}, Category=${questionCategory}`);
  });

  // Convert to percentage (0-100)
  const percentageScore = maxPossibleScore > 0 ? Math.round((totalScore / maxPossibleScore) * 100) : 0;

  // Calculate leadership type scores
  const leadershipTypeScores: Record<string, number> = {
    'operasyonel-yetenek': 0,
    'teknik-leader': 0,
    'case-odakli-yetenek': 0,
    'gelistirici': 0
  };

  surveyQuestions.forEach(question => {
    if (question.category === 'leadership-scenarios') {
      let response;
      if (Array.isArray(responses)) {
        const responseItem = responses.find((r: any) => r.questionId === question.id);
        response = responseItem?.answer;
      } else {
        response = responses[question.id];
      }
      
      if (response !== undefined && response !== null) {
        let userAnswer: number;
        if (typeof response === 'string' && response.includes('Seçenek')) {
          const optionMatch = response.match(/Seçenek ([A-D])/);
          if (optionMatch) {
            userAnswer = optionMatch[1].charCodeAt(0) - 65;
          } else {
            userAnswer = 0;
          }
        } else {
          userAnswer = parseInt(String(response)) || 0;
        }
        
        if ((question as any).leadershipMapping && (question as any).leadershipScoring) {
          const leadershipType = (question as any).leadershipMapping[userAnswer];
          if (leadershipType) {
            const scoring = (question as any).leadershipScoring[userAnswer];
            if (scoring && scoring.points) {
              leadershipTypeScores[leadershipType] += scoring.points;
              console.log(`🎯 Leadership type score: ${leadershipType} += ${scoring.points}`);
            }
          }
        }
      }
    }
  });

  const dominantLeadershipType = Object.entries(leadershipTypeScores)
    .sort(([,a], [,b]) => b - a)[0]?.[0] || 'operasyonel-yetenek';

  console.log('🎯 BACKEND Final scores:', {
    totalScore: percentageScore,
    categoryScores,
    maxPossibleScore,
    leadershipTypeScores,
    dominantLeadershipType,
    breakdownCount: detailedBreakdown.length
  });

  return {
    totalScore: percentageScore,
    categoryScores,
    maxPossibleScore,
    leadershipTypeScores,
    dominantLeadershipType,
    detailedBreakdown
  };
}
