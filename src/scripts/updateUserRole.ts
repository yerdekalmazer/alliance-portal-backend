// Load environment variables first
import dotenv from 'dotenv';
dotenv.config();

import { supabaseAdmin } from '../config/database';

async function updateUserToAdmin() {
  try {
    console.log('🔄 Updating test user to admin role...');

    if (!supabaseAdmin) {
      throw new Error('Supabase admin client not available');
    }

    // Update test user to admin role
    const { data, error } = await supabaseAdmin
      .from('users')
      .update({ role: 'admin' })
      .eq('email', 'test@example.com')
      .select()
      .single();

    if (error) {
      console.error('❌ Error updating user role:', error);
      return;
    }

    console.log('✅ User role updated successfully:');
    console.log(`   Email: ${data.email}`);
    console.log(`   Name: ${data.name}`);
    console.log(`   Role: ${data.role}`);
    console.log('\n🔑 You can now login as admin with:');
    console.log('   Email: test@example.com');
    console.log('   Password: Test123!');
    console.log('   Role: admin');

  } catch (error) {
    console.error('❌ Failed to update user role:', error);
    throw error;
  }
}

// Execute if this file is run directly
if (require.main === module) {
  updateUserToAdmin()
    .then(() => {
      console.log('\n✅ User role update completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ User role update failed:', error);
      process.exit(1);
    });
}

export { updateUserToAdmin };

