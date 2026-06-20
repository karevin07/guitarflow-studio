-- Initialize GlobalChord table and seed standard chords
CREATE TABLE IF NOT EXISTS guitarflow_globalchord (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    frets JSONB NOT NULL
);

INSERT INTO guitarflow_globalchord (name, frets) VALUES
('C', '[0, 1, 0, 2, 3, null]'),
('G', '[3, 0, 0, 0, 2, 3]'),
('D', '[2, 3, 2, 0, null, null]'),
('Am', '[0, 1, 2, 2, 0, null]'),
('E', '[0, 0, 1, 2, 2, 0]'),
('Em', '[0, 0, 0, 2, 2, 0]'),
('F', '[1, 1, 2, 3, 3, 1]'),
('A', '[0, 2, 2, 2, 0, null]'),
('B', '[2, 4, 4, 4, 2, null]'),
('Bb', '[1, 3, 3, 3, 1, null]'),
('Dm', '[1, 3, 2, 0, null, null]'),
('Cm', '[3, 4, 5, 5, 3, null]'),
('Gm', '[3, 3, 3, 5, 5, 3]'),
('Bm', '[2, 3, 4, 4, 2, null]'),
('Fm', '[1, 1, 1, 3, 3, 1]'),
('F#m', '[2, 2, 2, 4, 4, 2]'),
('C#m', '[4, 5, 6, 6, 4, null]'),
('C7', '[0, 1, 3, 2, 3, null]'),
('G7', '[1, 0, 0, 0, 2, 3]'),
('D7', '[2, 1, 2, 0, null, null]'),
('A7', '[3, 2, 0, 2, 0, null]'),
('E7', '[0, 3, 1, 0, 2, 0]'),
('B7', '[2, 0, 2, 1, 2, null]'),
('F7', '[1, 1, 2, 1, 3, 1]')
ON CONFLICT (name) DO NOTHING;
