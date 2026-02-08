// Test fixtures - sample data for testing

export const testUsers = {
    admin: {
        id: '00000000-0000-0000-0000-000000000001',
        email: 'admin@test.com',
        name: 'Test Admin',
        role: 'admin' as const,
        password: 'Admin123!',
    },
    alliance: {
        id: '00000000-0000-0000-0000-000000000002',
        email: 'alliance@test.com',
        name: 'Test Alliance',
        role: 'alliance' as const,
        password: 'Alliance123!',
    },
    user: {
        id: '00000000-0000-0000-0000-000000000003',
        email: 'user@test.com',
        name: 'Test User',
        role: 'user' as const,
        password: 'User123!',
    },
};

export const testCase = {
    id: '00000000-0000-0000-0000-000000000010',
    title: 'Test Proje: E-Ticaret Platformu',
    description: 'Modern bir e-ticaret platformu geliştirme projesi',
    job_types: ['Frontend Developer', 'Backend Developer', 'UI/UX Designer'],
    specializations: ['React', 'Node.js', 'PostgreSQL', 'Figma'],
    requirements: [
        'Modern web teknolojileri deneyimi',
        'Takım çalışmasına yatkınlık',
        'Proje teslim sürecine uyum',
    ],
    initial_threshold: 70,
    target_team_count: 3,
    ideal_team_size: 8,
    status: 'active' as const,
};

export const testIdea = {
    id: '00000000-0000-0000-0000-000000000020',
    title: 'Kampüs Sosyal Platform',
    description: 'Üniversite öğrencileri için sosyal etkileşim platformu',
    category: 'Sosyal Medya',
    target_audience: 'Üniversite Öğrencileri',
    problem_statement: 'Kampüste etkinlik ve topluluk bilgilerinin dağınıklığı',
    proposed_solution: 'Merkezi bir platform ile tüm bilgilerin konsolidasyonu',
    status: 'pending' as const,
};

export const testSurveyTemplate = {
    id: '00000000-0000-0000-0000-000000000030',
    name: 'Teknik Yetenek Değerlendirme',
    description: 'Katılımcıların teknik becerilerini değerlendirme anketi',
    category: 'teknik',
    questions: [
        {
            id: 'q1',
            type: 'multiple_choice',
            text: 'Hangi programlama dillerinde deneyimlisiniz?',
            options: ['JavaScript', 'Python', 'Java', 'C#', 'Go'],
            required: true,
        },
        {
            id: 'q2',
            type: 'scale',
            text: 'React konusundaki deneyim seviyeniz (1-10)?',
            min: 1,
            max: 10,
            required: true,
        },
    ],
};

export const mockJWTToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIwMDAwMDAwMC0wMDAwLTAwMDAtMDAwMC0wMDAwMDAwMDAwMDEiLCJlbWFpbCI6ImFkbWluQHRlc3QuY29tIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzA3MzAwMDAwfQ.mock-signature';

// Helper function to create mock request
export const createMockRequest = (overrides: any = {}) => ({
    body: {},
    params: {},
    query: {},
    headers: {},
    user: null,
    ...overrides,
});

// Helper function to create mock response
export const createMockResponse = () => {
    const res: any = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    res.send = jest.fn().mockReturnValue(res);
    return res;
};

// Helper function to create mock next
export const createMockNext = () => jest.fn();
