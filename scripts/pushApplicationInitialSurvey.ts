import { supabaseAdmin } from '../src/config/database';

async function pushApplicationInitialSurvey() {
  try {
    console.log('🚀 Başvuru ve İlk Değerlendirme Anketi database\'e pushlanıyor...');

    if (!supabaseAdmin) {
      throw new Error('supabaseAdmin not configured');
    }

    // Yeni anket template'ini oluştur
    const templateData = {
      type: 'application-initial-assessment',
      category: 'evaluation',
      title: 'Başvuru ve İlk Değerlendirme Anketi',
      description: 'Kişisel bilgi soruları ve case domain\'ine göre 10 rastgele değerlendirme sorusu.',
      target_audience: 'all',
      is_active: true,
      is_dynamic: true,
      questions: [] // Boş array, dinamik sorular generate edilecek
    };

    // Önce mevcut template'i kontrol et
    const { data: existingTemplate, error: checkError } = await supabaseAdmin
      .from('survey_templates')
      .select('id')
      .eq('type', 'application-initial-assessment')
      .single();

    if (existingTemplate) {
      console.log('⚠️ Template zaten mevcut, güncelleniyor...');
      
      const { data: updatedTemplate, error: updateError } = await supabaseAdmin
        .from('survey_templates')
        .update(templateData)
        .eq('id', existingTemplate.id)
        .select()
        .single();

      if (updateError) {
        throw new Error(`Update failed: ${updateError.message}`);
      }

      console.log('✅ Template başarıyla güncellendi:', updatedTemplate.id);
    } else {
      console.log('📝 Yeni template oluşturuluyor...');
      
      const { data: newTemplate, error: insertError } = await supabaseAdmin
        .from('survey_templates')
        .insert(templateData)
        .select()
        .single();

      if (insertError) {
        throw new Error(`Insert failed: ${insertError.message}`);
      }

      console.log('✅ Template başarıyla oluşturuldu:', newTemplate.id);
    }

    console.log('🎉 Başvuru ve İlk Değerlendirme Anketi database\'e başarıyla pushlandı!');
    
  } catch (error) {
    console.error('❌ Hata:', error);
    process.exit(1);
  }
}

// Script'i çalıştır
pushApplicationInitialSurvey();
