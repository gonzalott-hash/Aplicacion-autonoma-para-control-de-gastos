import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://epymtsotapeldzrutoug.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVweW10c290YXBlbGR6cnV0b3VnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwOTcwODMsImV4cCI6MjA4NjY3MzA4M30.VJOPS1EUA5muOAKUbFpqx2qUU1rXcQJ2awTkZHnZaCM';
const supabase = createClient(supabaseUrl, supabaseKey);

async function createUsers() {
    // Use unique emails to avoid conflicts if delete was partial
    const adminEmail = 'admin@stitch.com';
    const userEmail = 'user@stitch.com';

    console.log(`Creating Admin: ${adminEmail}`);
    const { data: admin, error: adminError } = await supabase.auth.signUp({
        email: adminEmail,
        password: 'password123',
        options: {
            data: { full_name: 'Admin User' } // Metadata
        }
    });

    if (adminError) {
        console.error('Admin Error:', adminError);
    } else {
        console.log('Admin Created ID:', admin.user?.id);
    }

    console.log(`Creating User: ${userEmail}`);
    const { data: user, error: userError } = await supabase.auth.signUp({
        email: userEmail,
        password: 'password123',
        options: {
            data: { full_name: 'Personal de Caja' }
        }
    });

    if (userError) {
        console.error('User Error:', userError);
    } else {
        console.log('User Created ID:', user.user?.id);
    }
}

createUsers();
