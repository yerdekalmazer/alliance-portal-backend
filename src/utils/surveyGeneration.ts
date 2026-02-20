/**
 * BACKEND SURVEY GENERATION UTILITY
 * Dynamic survey sorularını case bilgisine göre generate eder
 *
 * collectPersonalInfo toggle frontend tarafında handle edilir.
 * Bu utility sadece anket sorularını üretir.
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
  leadershipMapping?: Record<number, string>;
  leadershipScoring?: Record<number, { points: number; criteria: Record<string, number> }>;
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
  leadershipMapping?: Record<number, string>;
  leadershipScoring?: Record<number, { points: number; criteria: Record<string, number> }>;
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
 * Generate dynamic survey questions based on template type and case data
 */
export function generateDynamicSurveyQuestions(
  template: SurveyTemplate,
  caseScenario: CaseScenario
): SurveyQuestion[] {
  console.log('🔀 Backend Survey Generation:', { type: template.type, domain: caseScenario.domain, jobTypes: caseScenario.jobTypes });

  if (!template.is_dynamic) {
    return template.questions || [];
  }

  if (template.type === 'application-initial-assessment') {
    return generateInitialAssessmentQuestions(caseScenario, 10);
  }

  return template.questions || [];
}

/**
 * Generate initial assessment questions filtered by case job types and domain
 */
function generateInitialAssessmentQuestions(caseScenario: CaseScenario, maxQuestions: number): SurveyQuestion[] {
  let order = 1;
  const allQuestions: SurveyQuestion[] = [];

  // General questions
  const generalQuestions: SurveyQuestion[] = [
    {
      id: 'init-gen-001', type: 'radio', question: 'Hangi alanda kendinizi en güçlü hissediyorsunuz?',
      options: ['Tasarım ve Yaratıcılık', 'Yazılım Geliştirme', 'Analiz ve Problem Çözme', 'İletişim ve Koordinasyon'],
      correct: [0, 1, 2, 3], points: 10, required: true, order: order++, category: 'initial-assessment'
    },
    {
      id: 'init-gen-002', type: 'radio', question: 'Yeni bir şey öğrenirken hangi yöntemi tercih edersiniz?',
      options: ['Video eğitimler izlerim', 'Kitap ve dokümantasyon okurum', 'Uygulamalı projeler yaparım', 'Birinden öğrenirim'],
      correct: [1, 2], points: 10, required: true, order: order++, category: 'initial-assessment'
    },
    {
      id: 'init-gen-003', type: 'radio', question: 'Ekip çalışmasında kendinizi nasıl tanımlarsınız?',
      options: ['Liderlik yapmayı severim', 'İyi bir takım oyuncusuyum', 'Teknik konularda uzmanım', 'Organizasyon ve planlama konusunda iyiyim'],
      correct: [0, 1, 2, 3], points: 10, required: true, order: order++, category: 'initial-assessment'
    },
    {
      id: 'init-gen-004', type: 'radio', question: 'Bir problemi çözerken ilk ne yaparsınız?',
      options: ['Hemen çözüm aramaya başlarım', 'Problemi analiz edip parçalara bölerim', 'Deneyimli birinden yardım isterim', 'İnternetten araştırma yaparım'],
      correct: [1], points: 15, required: true, order: order++, category: 'initial-assessment'
    },
    {
      id: 'init-gen-005', type: 'radio', question: 'Yazılım geliştirme deneyiminiz kaç yıl?',
      options: ['0-1 yıl (Yeni başlayan)', '1-3 yıl (Junior)', '3-5 yıl (Mid-level)', '5+ yıl (Senior)'],
      correct: [0, 1, 2, 3], points: 10, required: true, order: order++, category: 'initial-assessment'
    }
  ];
  allQuestions.push(...generalQuestions);

  // Job type specific questions
  const jobTypeQuestionMap: Record<string, SurveyQuestion[]> = {
    'Frontend Developer': [
      {
        id: 'init-fe-001', type: 'radio', question: 'Kullanıcı arayüzü geliştirirken en çok hangi konuya odaklanırsınız?',
        options: ['Görsel tasarım ve estetiğe', 'Kullanıcı deneyimi ve kullanışlılığa', 'Performans ve hıza', 'Responsive tasarım ve uyumluluk'],
        correct: [1, 3], points: 15, required: true, order: order++, category: 'initial-assessment', jobType: 'Frontend Developer'
      }
    ],
    'Backend Developer': [
      {
        id: 'init-be-001', type: 'radio', question: 'Backend geliştirmede en önemli gördüğünüz konu hangisidir?',
        options: ['Veritabanı tasarımı ve optimizasyonu', 'API tasarımı ve güvenlik', 'Performans ve ölçeklenebilirlik', 'Veri güvenliği ve yedekleme'],
        correct: [1, 2], points: 15, required: true, order: order++, category: 'initial-assessment', jobType: 'Backend Developer'
      }
    ],
    'UI/UX Designer': [
      {
        id: 'init-ux-001', type: 'radio', question: 'Kullanıcı deneyimi tasarlarken en önemli ilkeniz nedir?',
        options: ['Kullanıcının ihtiyaçlarını anlamak', 'Görsel çekicilik sağlamak', 'Teknik sınırları gözetmek', 'Marka kimliğini yansıtmak'],
        correct: [0], points: 20, required: true, order: order++, category: 'initial-assessment', jobType: 'UI/UX Designer'
      }
    ],
    'Mobile Developer': [
      {
        id: 'init-mob-001', type: 'radio', question: 'Mobil uygulama geliştirirken en kritik faktör hangisidir?',
        options: ['Platform uyumluluğu (iOS/Android)', 'Batarya optimizasyonu', 'Çevrimdışı çalışabilme', 'Hızlı başlatma süresi'],
        correct: [0, 3], points: 15, required: true, order: order++, category: 'initial-assessment', jobType: 'Mobile Developer'
      }
    ],
    'Game Developer': [
      {
        id: 'init-game-001', type: 'radio', question: 'Oyun geliştirirken en zorlu kısım hangisidir?',
        options: ['Grafik ve görsel efektler', 'Oyun mekaniği ve dengesi', 'Ses ve müzik entegrasyonu', 'Performans optimizasyonu'],
        correct: [1, 3], points: 15, required: true, order: order++, category: 'initial-assessment', jobType: 'Game Developer'
      }
    ],
    'Data Scientist': [
      {
        id: 'init-ds-001', type: 'radio', question: 'Veri bilimi projelerinde ilk adımınız ne olur?',
        options: ['Veri toplama ve temizleme', 'Problem tanımlama ve hipotez oluşturma', 'Algoritma seçimi ve model geliştirme', 'Sonuçları görselleştirme'],
        correct: [1], points: 15, required: true, order: order++, category: 'initial-assessment', jobType: 'Data Scientist'
      }
    ],
    'Product Manager': [
      {
        id: 'init-pm-001', type: 'radio', question: 'Ürün yönetiminde en önemli gördüğünüz süreç hangisidir?',
        options: ['Kullanıcı ihtiyaçlarını anlama ve araştırma', 'Özellik önceliklendirme ve roadmap oluşturma', 'Takım koordinasyonu ve iletişim', 'Metrik takibi ve analiz'],
        correct: [0, 1], points: 15, required: true, order: order++, category: 'initial-assessment', jobType: 'Product Manager'
      }
    ],
    'Video Producer': [
      {
        id: 'init-vid-001', type: 'radio', question: 'Video içeriği üretirken hikaye anlatımında en önemli element nedir?',
        options: ['Görsel kalite ve çekim teknikleri', 'Ses kalitesi ve müzik seçimi', 'Senaryonun güçlü olması', 'Montaj ve post-prodüksiyon'],
        correct: [2], points: 20, required: true, order: order++, category: 'initial-assessment', jobType: 'Video Producer'
      }
    ]
  };

  // Add job type specific questions
  for (const jt of caseScenario.jobTypes) {
    const jtQuestions = jobTypeQuestionMap[jt];
    if (jtQuestions) {
      allQuestions.push(...jtQuestions);
    }
  }

  // Domain-based questions
  const domain = caseScenario.domain?.toLowerCase() || '';
  if (domain.includes('web')) {
    allQuestions.push({
      id: 'init-webgen-001', type: 'radio', question: 'Web uygulaması geliştirirken hangi teknoloji yığınında kendinizi daha rahat hissedersiniz?',
      options: ['Frontend odaklı (React, Vue, Angular)', 'Backend odaklı (Node.js, Python, PHP)', 'Full-stack geliştirme', 'Tasarım ve UX odaklı'],
      correct: [0, 1, 2, 3], points: 10, required: true, order: order++, category: 'initial-assessment', domain: 'web-platformu'
    });
  }
  if (domain.includes('mobil')) {
    allQuestions.push({
      id: 'init-mobgen-001', type: 'radio', question: 'Mobil uygulamalarda kullanıcı deneyimi için en kritik faktör hangisidir?',
      options: ['Hızlı açılış süresi', 'Sezgisel navigasyon', 'Offline çalışabilirlik', 'Push notification sistemi'],
      correct: [0, 1, 2], points: 10, required: true, order: order++, category: 'initial-assessment', domain: 'mobil-uygulama'
    });
  }

  return shuffleArray(allQuestions).slice(0, maxQuestions).map((q, i) => ({ ...q, order: i + 1 }));
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Calculate assessment score from survey responses
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

  surveyQuestions.forEach(question => {
    let response;
    if (Array.isArray(responses)) {
      const responseItem = responses.find((r: any) => r.questionId === question.id);
      response = responseItem?.answer;
    } else {
      response = responses[question.id];
    }

    if (response === undefined || response === null) return;

    // Skip personal info questions
    if (['text', 'email', 'phone', 'textarea'].includes(question.type)) return;
    if (question.id.includes('personal')) return;

    let userAnswer: number;
    if (typeof response === 'string' && response.includes('Seçenek')) {
      const optionMatch = response.match(/Seçenek ([A-D])/);
      userAnswer = optionMatch ? optionMatch[1].charCodeAt(0) - 65 : 0;
    } else {
      userAnswer = parseInt(response.toString());
      if (isNaN(userAnswer)) {
        if (question.category === 'leadership-scenarios' || question.sourceCategory === 'leadership-scenarios') {
          userAnswer = Math.floor(Math.random() * 4);
        } else {
          return;
        }
      }
    }

    let isCorrect = false;
    let questionScore = 0;
    const questionCategory = question.sourceCategory || question.jobType || question.category || 'General';

    if (!categoryScores[questionCategory]) {
      categoryScores[questionCategory] = 0;
    }

    // Check correctness
    let isPreferenceQuestion = false;
    if (question.correct !== undefined) {
      if (Array.isArray(question.correct)) {
        if (question.options && question.correct.length === question.options.length) {
          isPreferenceQuestion = true;
          isCorrect = true;
        } else {
          isCorrect = question.correct.includes(userAnswer);
        }
      } else {
        isCorrect = userAnswer === question.correct;
      }
    }

    // Leadership scoring
    if (question.category === 'leadership-scenarios' || question.sourceCategory === 'leadership-scenarios') {
      if (question.leadershipScoring?.[userAnswer]) {
        questionScore = question.leadershipScoring[userAnswer].points || question.points || 20;
      } else if (typeof question.points === 'number') {
        questionScore = question.points;
      } else {
        questionScore = 20;
      }
      isCorrect = true;
    } else if (question.points && typeof question.points === 'object') {
      // Category-based scoring (multi-dimensional)
      let totalCategoryScore = 0;
      let categoryCount = 0;
      Object.keys(question.points).forEach(cat => {
        if (question.points[cat]?.[userAnswer] !== undefined) {
          const score = question.points[cat][userAnswer];
          categoryScores[cat] = (categoryScores[cat] || 0) + score;
          totalCategoryScore += score;
          categoryCount++;
        }
      });
      if (categoryCount > 0) {
        questionScore = Math.round(totalCategoryScore / categoryCount);
      }
    } else {
      if (isPreferenceQuestion) {
        questionScore = 5;
      } else if (isCorrect) {
        questionScore = typeof question.points === 'number' ? question.points : 10;
      }
    }

    categoryScores[questionCategory] += questionScore;
    totalScore += questionScore;

    let maxQuestionScore = 10;
    if (isPreferenceQuestion) {
      maxQuestionScore = 5;
    } else if (typeof question.points === 'number') {
      maxQuestionScore = question.points;
    }
    maxPossibleScore += maxQuestionScore;

    detailedBreakdown.push({
      questionId: question.id,
      question: question.question || '',
      userAnswer,
      isCorrect,
      points: questionScore,
      maxPoints: maxQuestionScore,
      category: questionCategory
    });
  });

  const percentageScore = maxPossibleScore > 0 ? Math.round((totalScore / maxPossibleScore) * 100) : 0;

  // Leadership type aggregation
  const leadershipTypeScores: Record<string, number> = {
    'operasyonel-yetenek': 0,
    'teknik-leader': 0,
    'case-odakli-yetenek': 0,
    'gelistirici': 0
  };

  surveyQuestions.forEach(question => {
    if (question.category !== 'leadership-scenarios' && question.sourceCategory !== 'leadership-scenarios') return;

    let response;
    if (Array.isArray(responses)) {
      const responseItem = responses.find((r: any) => r.questionId === question.id);
      response = responseItem?.answer;
    } else {
      response = responses[question.id];
    }

    if (response === undefined || response === null) return;

    let userAnswer: number;
    if (typeof response === 'string' && response.includes('Seçenek')) {
      const optionMatch = response.match(/Seçenek ([A-D])/);
      userAnswer = optionMatch ? optionMatch[1].charCodeAt(0) - 65 : 0;
    } else {
      userAnswer = parseInt(String(response)) || 0;
    }

    if (question.leadershipMapping && question.leadershipScoring) {
      const leadershipType = question.leadershipMapping[userAnswer];
      const scoring = question.leadershipScoring[userAnswer];
      if (leadershipType && scoring?.points) {
        leadershipTypeScores[leadershipType] = (leadershipTypeScores[leadershipType] || 0) + scoring.points;
      }
    }
  });

  const dominantLeadershipType = Object.entries(leadershipTypeScores)
    .sort(([, a], [, b]) => b - a)[0]?.[0] || 'operasyonel-yetenek';

  return {
    totalScore: percentageScore,
    categoryScores,
    maxPossibleScore,
    leadershipTypeScores,
    dominantLeadershipType,
    detailedBreakdown
  };
}
