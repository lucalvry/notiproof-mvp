/**
 * Testimonial Submission Debug Utilities
 * 
 * Load this script in the browser console to access debugging tools.
 * 
 * Usage:
 * 1. Open testimonial collection page
 * 2. Open browser console (F12)
 * 3. Run: window.TestimonialDebug.checkSetup()
 */

window.TestimonialDebug = {
  /**
   * Check if the form submission environment is properly configured
   */
  async checkSetup() {
    console.log('=== TESTIMONIAL SUBMISSION SETUP CHECK ===\n');
    
    const checks = {
      supabase: false,
      storage: false,
      rlsPolicies: false,
      formActive: false
    };

    // Check 1: Supabase client available
    try {
      if (typeof window.supabase !== 'undefined') {
        checks.supabase = true;
        console.log('✅ Supabase client: Available');
      } else {
        console.error('❌ Supabase client: Not found');
      }
    } catch (error) {
      console.error('❌ Supabase client: Error', error);
    }

    // Check 2: Storage bucket accessible
    try {
      const { data, error } = await supabase.storage.getBucket('testimonials');
      if (!error) {
        checks.storage = true;
        console.log('✅ Storage bucket: Accessible');
        console.log('   - Public:', data.public);
      } else {
        console.error('❌ Storage bucket: Error', error);
      }
    } catch (error) {
      console.error('❌ Storage bucket: Exception', error);
    }

    // Check 3: Can insert testimonial (test RLS)
    try {
      const testData = {
        website_id: '00000000-0000-0000-0000-000000000000', // Fake ID for test
        source: 'form',
        author_name: 'Test',
        rating: 5,
        message: 'Test',
        metadata: { form_id: '00000000-0000-0000-0000-000000000000' },
        status: 'pending'
      };

      // Try to insert (will fail due to fake IDs but should not be RLS error)
      const { error } = await supabase.from('testimonials').insert(testData).select();
      
      if (error) {
        if (error.message.includes('violates row-level security policy')) {
          console.error('❌ RLS Policies: Not configured correctly');
          console.error('   Run Phase 3 migration to fix');
        } else if (error.message.includes('foreign key') || error.message.includes('does not exist')) {
          checks.rlsPolicies = true;
          console.log('✅ RLS Policies: Configured (foreign key error expected)');
        } else {
          console.warn('⚠️  RLS Policies: Unknown error', error.message);
        }
      } else {
        checks.rlsPolicies = true;
        console.log('✅ RLS Policies: Configured');
      }
    } catch (error) {
      console.error('❌ RLS Policies: Exception', error);
    }

    // Check 4: Current form status (if on collection page)
    try {
      const pathMatch = window.location.pathname.match(/\/collect\/([^\/]+)/);
      if (pathMatch) {
        const slug = pathMatch[1];
        const { data, error } = await supabase
          .from('testimonial_forms')
          .select('id, name, is_active, website_id')
          .eq('slug', slug)
          .single();

        if (!error && data) {
          checks.formActive = data.is_active;
          console.log(`${data.is_active ? '✅' : '❌'} Current form: ${data.is_active ? 'Active' : 'Inactive'}`);
          console.log('   - Name:', data.name);
          console.log('   - ID:', data.id);
          console.log('   - Website ID:', data.website_id);
        } else {
          console.error('❌ Current form: Not found');
        }
      } else {
        console.log('ℹ️  Not on collection page, skipping form check');
      }
    } catch (error) {
      console.error('❌ Current form: Exception', error);
    }

    console.log('\n=== SUMMARY ===');
    const allPassed = Object.values(checks).every(c => c);
    if (allPassed) {
      console.log('✅ All checks passed! Ready to accept submissions.');
    } else {
      console.log('❌ Some checks failed. Review errors above.');
    }

    return checks;
  },

  /**
   * Test file upload to storage
   */
  async testUpload(fileType = 'avatar') {
    console.log(`=== TESTING ${fileType.toUpperCase()} UPLOAD ===\n`);

    // Create a tiny test file
    const testData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const response = await fetch(testData);
    const blob = await response.blob();
    const file = new File([blob], 'test.png', { type: 'image/png' });

    const websiteId = '00000000-0000-0000-0000-000000000000'; // Test ID
    const fileName = `test-${Date.now()}.png`;
    const filePath = `${websiteId}/${fileType}s/${fileName}`;

    console.log('Uploading to:', filePath);

    try {
      const { data, error } = await supabase.storage
        .from('testimonials')
        .upload(filePath, file);

      if (error) {
        console.error('❌ Upload failed:', error);
        return false;
      }

      console.log('✅ Upload successful!');
      console.log('   - Path:', data.path);

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('testimonials')
        .getPublicUrl(filePath);

      console.log('   - Public URL:', urlData.publicUrl);

      // Clean up
      await supabase.storage.from('testimonials').remove([filePath]);
      console.log('   - Cleanup: Test file deleted');

      return true;
    } catch (error) {
      console.error('❌ Upload exception:', error);
      return false;
    }
  },

  /**
   * View recent submission errors
   */
  async viewErrors(limit = 10) {
    console.log('=== RECENT SUBMISSION ERRORS ===\n');

    try {
      const { data, error } = await supabase
        .from('integration_logs')
        .select('*')
        .eq('integration_type', 'testimonial_submission')
        .eq('status', 'error')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('❌ Failed to fetch errors:', error);
        return;
      }

      if (!data || data.length === 0) {
        console.log('✅ No errors found!');
        return;
      }

      console.log(`Found ${data.length} error(s):\n`);
      data.forEach((log, index) => {
        console.log(`${index + 1}. ${new Date(log.created_at).toLocaleString()}`);
        console.log(`   Action: ${log.action}`);
        console.log(`   Error: ${log.error_message}`);
        if (log.details) {
          console.log('   Details:', log.details);
        }
        console.log('');
      });
    } catch (error) {
      console.error('❌ Exception fetching errors:', error);
    }
  },

  /**
   * View recent successful submissions
   */
  async viewSubmissions(limit = 10) {
    console.log('=== RECENT SUBMISSIONS ===\n');

    try {
      const { data, error } = await supabase
        .from('testimonials')
        .select('*')
        .eq('source', 'form')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('❌ Failed to fetch submissions:', error);
        return;
      }

      if (!data || data.length === 0) {
        console.log('ℹ️  No submissions found');
        return;
      }

      console.log(`Found ${data.length} submission(s):\n`);
      data.forEach((sub, index) => {
        console.log(`${index + 1}. ${new Date(sub.created_at).toLocaleString()}`);
        console.log(`   Author: ${sub.author_name}`);
        console.log(`   Rating: ${sub.rating}/5`);
        console.log(`   Status: ${sub.status}`);
        console.log(`   Has Avatar: ${sub.avatar_url ? 'Yes' : 'No'}`);
        console.log(`   Has Video: ${sub.video_url ? 'Yes' : 'No'}`);
        console.log('');
      });
    } catch (error) {
      console.error('❌ Exception fetching submissions:', error);
    }
  },

  /**
   * Enable verbose logging
   */
  enableVerboseLogging() {
    console.log('✅ Verbose logging enabled');
    console.log('All console.log() calls will now show in the console');
    // This is already the default, but we're documenting it
    localStorage.setItem('debug', 'testimonials:*');
  },

  /**
   * Print help
   */
  help() {
    console.log(`
=== TESTIMONIAL DEBUG UTILITIES ===

Available commands:

  TestimonialDebug.checkSetup()
    Check if form submission environment is properly configured
    
  TestimonialDebug.testUpload('avatar')
    Test avatar upload to storage (or 'video')
    
  TestimonialDebug.viewErrors(10)
    View recent submission errors from logs
    
  TestimonialDebug.viewSubmissions(10)
    View recent successful submissions
    
  TestimonialDebug.enableVerboseLogging()
    Enable detailed console logging
    
  TestimonialDebug.help()
    Show this help message

Example usage:
  await TestimonialDebug.checkSetup()
  await TestimonialDebug.testUpload('avatar')
  await TestimonialDebug.viewErrors()
    `);
  }
};

// Auto-run setup check when loaded
console.log('📋 Testimonial Debug Utilities loaded!');
console.log('Run TestimonialDebug.help() for available commands');
console.log('');
