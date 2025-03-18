/*
  # Create teacher_subjects junction table and modify teachers table

  1. Changes
    - Remove subject-related columns from teachers table
    - Create teacher_subjects junction table for many-to-many relationship
    - Add RLS policies for the new table

  2. New Table Structure
    - `teacher_subjects`
      - `id` (uuid, primary key)
      - `teacher_id` (uuid, references teachers)
      - `subject_id` (uuid, references subjects)
      - `dia` (text)
      - `hora_inicio` (time)
      - `hora_fin` (time)
      - `created_at` (timestamp)
      - `user_id` (uuid, references auth.users)
*/

-- Remove subject-related columns from teachers table
ALTER TABLE teachers 
DROP COLUMN materia,
DROP COLUMN curso,
DROP COLUMN division,
DROP COLUMN dia,
DROP COLUMN hora_inicio,
DROP COLUMN hora_fin;

-- Create junction table
CREATE TABLE teacher_subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid REFERENCES teachers(id) ON DELETE CASCADE,
  subject_id uuid REFERENCES subjects(id) ON DELETE CASCADE,
  dia text NOT NULL,
  hora_inicio time NOT NULL,
  hora_fin time NOT NULL,
  created_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE teacher_subjects ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
CREATE POLICY "Anyone can read teacher_subjects"
  ON teacher_subjects
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create their own records"
  ON teacher_subjects
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own records"
  ON teacher_subjects
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);