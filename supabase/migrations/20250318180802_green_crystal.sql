/*
  # Create teachers consultation hours schema

  1. New Tables
    - `teachers`
      - `id` (uuid, primary key)
      - `nombre` (text)
      - `apellido` (text)
      - `curso` (text)
      - `division` (text)
      - `materia` (text)
      - `dia` (text)
      - `hora_inicio` (time)
      - `hora_fin` (time)
      - `created_at` (timestamp)
      - `user_id` (uuid, foreign key to auth.users)

  2. Security
    - Enable RLS on `teachers` table
    - Add policies for authenticated users to:
      - Read all records
      - Create their own records
      - Update their own records
*/

CREATE TABLE IF NOT EXISTS teachers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  apellido text NOT NULL,
  curso text NOT NULL,
  division text NOT NULL,
  materia text NOT NULL,
  dia text NOT NULL,
  hora_inicio time NOT NULL,
  hora_fin time NOT NULL,
  created_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users(id)
);

ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read teachers"
  ON teachers
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create their own records"
  ON teachers
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own records"
  ON teachers
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);