import { supabaseAdmin } from '../config/database';

async function addApplicationInitialSurvey() {
  try {
    console.log('🚀 Başvuru ve İlk Değerlendirme Anketi template\'i ekleniyor...');

    if (!supabaseAdmin) {
      throw new Error('Supabase admin client not initialized');
    }

    // Check if template already exists
    const { data: existingTemplate, error: checkError } = await supabaseAdmin
      .from('survey_templates')
      .select('id')
      .eq('type', 'application-initial-assessment')
      .single();

    if (existingTemplate) {
      console.log('✅ Template zaten mevcut:', existingTemplate.id);
      return;
    }

    if (checkError && checkError.code !== 'PGRST116') {
      throw checkError;
    }

    // Insert the new template
    const { data, error } = await supabaseAdmin
      .from('survey_templates')
      .insert({
        type: 'application-initial-assessment',
        category: 'evaluation',
        title: 'Başvuru ve İlk Değerlendirme Anketi',
        description: 'Kişisel bilgi soruları ve case domain\'ine göre 10 rastgele değerlendirme sorusu.',
        target_audience: 'all',
        is_active: true,
        is_dynamic: true,
        questions: []
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    console.log('✅ Template başarıyla eklendi:', data);
  } catch (error) {
    console.error('❌ Hata:', error);
    process.exit(1);
  }
}

addApplicationInitialSurvey();
