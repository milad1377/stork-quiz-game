import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
const SUPABASE_URL = 'https://tubttdijbocrniuutdiz.supabase.co';
const questions = require('./questions.json');
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR1YnR0ZGlqYm9jcm5pdXV0ZGl6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUwMTQxODAsImV4cCI6MjA4MDU5MDE4MH0.FkAZAKxtZiO1HiJZADGVHTqs4TwDjtnrv3NTd4Stf4I';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function populateQuestions() {
    console.log('Starting to populate questions...');
    console.log(`Total questions to insert: ${questions.length}`);

    try {
        const { data: existingQuestions, error: checkError } = await supabase
            .from('questions')
            .select('id')
            .limit(1);

        if (checkError) {
            console.error('Error checking existing questions:', checkError);
            return;
        }

        if (existingQuestions && existingQuestions.length > 0) {
            console.log('Questions already exist in database. Skipping...');
            console.log('If you want to re-populate, delete existing questions first.');
            return;
        }

        const batchSize = 50;
        for (let i = 0; i < questions.length; i += batchSize) {
            const batch = questions.slice(i, i + batchSize);

            const { data, error } = await supabase
                .from('questions')
                .insert(batch)
                .select();

            if (error) {
                console.error(`Error inserting batch ${i / batchSize + 1}:`, error);
                throw error;
            }

            console.log(`Inserted batch ${i / batchSize + 1}: ${batch.length} questions`);
        }

        console.log('✅ Successfully populated all questions!');

        const { data: allQuestions, error: verifyError } = await supabase
            .from('questions')
            .select('id');

        if (verifyError) {
            console.error('Error verifying questions:', verifyError);
            return;
        }

        console.log(`Total questions in database: ${allQuestions.length}`);

    } catch (error) {
        console.error('Fatal error:', error);
    }
}

populateQuestions();
