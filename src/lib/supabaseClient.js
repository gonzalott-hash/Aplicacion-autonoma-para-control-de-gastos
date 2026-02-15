
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ajjtijnophjewokygndp.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqanRpam5vcGhqZXdva3lnbmRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4ODkxMjEsImV4cCI6MjA4NjQ2NTEyMX0.3QXbZ4bdZQbNLoo17aMd2Rgl42TfIf9t2GIm2KDDFIU'

export const supabase = createClient(supabaseUrl, supabaseKey)
