/*
  # Create subjects and course associations

  1. New Tables
    - `subjects`
      - `id` (uuid, primary key)
      - `nombre` (text)
      - `curso` (text)
      - `division` (text)
      - `created_at` (timestamp)
      - `user_id` (uuid, foreign key to auth.users)

  2. Security
    - Enable RLS on `subjects` table
    - Add policies for authenticated users to:
      - Read all records
      - Create their own records
      - Update their own records
*/

CREATE TABLE IF NOT EXISTS subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  curso text NOT NULL,
  division text NOT NULL,
  created_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users(id)
);

ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read subjects"
  ON subjects
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create their own records"
  ON subjects
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own records"
  ON subjects
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);