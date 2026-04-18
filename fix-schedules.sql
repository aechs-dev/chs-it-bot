-- fix-schedules.sql: Replace schedule data from Excel source of truth
-- Covers 41 individual files + Elem+Int master + KG master
BEGIN TRANSACTION;

-- Miss Alik Stanboulian (8 slots)
DELETE FROM schedules WHERE teacher = 'Miss Alik Stanboulian';
INSERT INTO schedules (teacher, day, period, class) VALUES ('Miss Alik Stanboulian', 'Thursday', 'Period 1', 'Grade 12 (SE)');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Miss Alik Stanboulian', 'Tuesday', 'Period 2', 'Grade 7');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Miss Alik Stanboulian', 'Wednesday', 'Period 2', 'Grade 11 (H)');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Miss Alik Stanboulian', 'Monday', 'Period 3', 'Grade 10');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Miss Alik Stanboulian', 'Monday', 'Period 4', 'Grade 8');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Miss Alik Stanboulian', 'Friday', 'Period 5', 'Grade 12 (LS)');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Miss Alik Stanboulian', 'Monday', 'Period 7', 'Grade 9');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Miss Alik Stanboulian', 'Tuesday', 'Period 7', 'Grade 12 (SE/LS)');

-- Ms. Heghnar (6 slots)
DELETE FROM schedules WHERE teacher = 'Ms. Heghnar';
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Heghnar', 'Thursday', 'Period 2', 'Grade 4');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Heghnar', 'Thursday', 'Period 3', 'Grade 3');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Heghnar', 'Thursday', 'Period 4', 'Grade 5');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Heghnar', 'Thursday', 'Period 5', 'Grade 2');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Heghnar', 'Thursday', 'Period 6', 'Grade 6');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Heghnar', 'Thursday', 'Period 7', 'Grade 1');

-- Mr. Alfredo Dawlabani (10 slots)
DELETE FROM schedules WHERE teacher = 'Mr. Alfredo Dawlabani';
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mr. Alfredo Dawlabani', 'Tuesday', 'Period 1', 'Grade 11 (H)');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mr. Alfredo Dawlabani', 'Wednesday', 'Period 1', 'Grade 9');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mr. Alfredo Dawlabani', 'Thursday', 'Period 1', 'Grade 11 (H)');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mr. Alfredo Dawlabani', 'Friday', 'Period 1', 'Grade 9');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mr. Alfredo Dawlabani', 'Monday', 'Period 2', 'Grade 11 (H)');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mr. Alfredo Dawlabani', 'Wednesday', 'Period 2', 'Grade 9');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mr. Alfredo Dawlabani', 'Thursday', 'Period 2', 'Grade 9');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mr. Alfredo Dawlabani', 'Monday', 'Period 3', 'Grade 9');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mr. Alfredo Dawlabani', 'Wednesday', 'Period 3', 'Grade 11 (H)');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mr. Alfredo Dawlabani', 'Thursday', 'Period 3', 'Grade 9');

-- Mr. Atam Tazian (6 slots)
DELETE FROM schedules WHERE teacher = 'Mr. Atam Tazian';
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mr. Atam Tazian', 'Wednesday', 'Period 1', 'Math (LS)');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mr. Atam Tazian', 'Wednesday', 'Period 2', 'Math (LS)');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mr. Atam Tazian', 'Friday', 'Period 2', 'Math (LS)');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mr. Atam Tazian', 'Friday', 'Period 3', 'Math (LS)');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mr. Atam Tazian', 'Monday', 'Period 5', 'Math (LS)');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mr. Atam Tazian', 'Monday', 'Period 6', 'Math (LS)');

-- Mr. Ghazar Keoshgerian (7 slots)
DELETE FROM schedules WHERE teacher = 'Mr. Ghazar Keoshgerian';
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mr. Ghazar Keoshgerian', 'Tuesday', 'Period 4', 'Grade 2');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mr. Ghazar Keoshgerian', 'Thursday', 'Period 4', 'Grade 6');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mr. Ghazar Keoshgerian', 'Friday', 'Period 4', 'Grade 1');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mr. Ghazar Keoshgerian', 'Tuesday', 'Period 5', 'Grade 4');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mr. Ghazar Keoshgerian', 'Friday', 'Period 5', 'Grade 3');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mr. Ghazar Keoshgerian', 'Friday', 'Period 6', 'Grade 5');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mr. Ghazar Keoshgerian', 'Friday', 'Period 7', 'Club/Assembly');

-- Mr. Jano Baghboudarian (11 slots)
DELETE FROM schedules WHERE teacher = 'Mr. Jano Baghboudarian';
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mr. Jano Baghboudarian', 'Monday', 'Period 1', 'Grade 10');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mr. Jano Baghboudarian', 'Tuesday', 'Period 1', 'Grade 10');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mr. Jano Baghboudarian', 'Friday', 'Period 1', 'Grade 11 (S)');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mr. Jano Baghboudarian', 'Monday', 'Period 2', 'Coordination');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mr. Jano Baghboudarian', 'Tuesday', 'Period 2', 'Grade 11 (S)');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mr. Jano Baghboudarian', 'Friday', 'Period 2', 'Grade 10');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mr. Jano Baghboudarian', 'Monday', 'Period 3', 'Grade 11 (S)');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mr. Jano Baghboudarian', 'Tuesday', 'Period 3', 'Grade 11 (S)');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mr. Jano Baghboudarian', 'Friday', 'Period 3', 'Grade 11 (S)');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mr. Jano Baghboudarian', 'Thursday', 'Period 4', 'Grade 10');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mr. Jano Baghboudarian', 'Thursday', 'Period 5', 'Grade 11 (S)');

-- Mr. Jawad Mestrah (5 slots)
DELETE FROM schedules WHERE teacher = 'Mr. Jawad Mestrah';
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mr. Jawad Mestrah', 'Friday', 'Period 2', 'Grade 7');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mr. Jawad Mestrah', 'Friday', 'Period 3', 'Grade 11 (H)');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mr. Jawad Mestrah', 'Friday', 'Period 4', 'Grade 9');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mr. Jawad Mestrah', 'Friday', 'Period 5', 'Grade 8');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mr. Jawad Mestrah', 'Friday', 'Period 6', 'Grade 10');

-- Mr. Khachig Seropian (12 slots)
DELETE FROM schedules WHERE teacher = 'Mr. Khachig Seropian';
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mr. Khachig Seropian', 'Thursday', 'Period 1', 'Grade 5');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mr. Khachig Seropian', 'Friday', 'Period 1', 'grade 4');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mr. Khachig Seropian', 'Thursday', 'Period 3', 'Grade 2');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mr. Khachig Seropian', 'Friday', 'Period 3', 'Grade 1');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mr. Khachig Seropian', 'Thursday', 'Period 4', 'Grade 3');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mr. Khachig Seropian', 'Friday', 'Period 4', 'Grade 6');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mr. Khachig Seropian', 'Thursday', 'Period 5', 'Grade 8');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mr. Khachig Seropian', 'Friday', 'Period 5', 'Grade 7');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mr. Khachig Seropian', 'Thursday', 'Period 6', 'Grade 10');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mr. Khachig Seropian', 'Friday', 'Period 6', 'Grade 9');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mr. Khachig Seropian', 'Thursday', 'Period 7', 'Grade 11');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mr. Khachig Seropian', 'Friday', 'Period 7', 'Club/Assembly');

-- Mr. Pascal Al Ferzly (10 slots)
DELETE FROM schedules WHERE teacher = 'Mr. Pascal Al Ferzly';
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mr. Pascal Al Ferzly', 'Monday', 'Period 1', 'Grade 11 (civics)');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mr. Pascal Al Ferzly', 'Tuesday', 'Period 1', 'Grade 9 (Geography)');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mr. Pascal Al Ferzly', 'Monday', 'Period 2', 'Grade 9 (history)');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mr. Pascal Al Ferzly', 'Tuesday', 'Period 2', 'Grade 10 (Geography)');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mr. Pascal Al Ferzly', 'Tuesday', 'Period 3', 'Grade 9 (civics)');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mr. Pascal Al Ferzly', 'Monday', 'Period 4', 'Grade 11 (Geography)');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mr. Pascal Al Ferzly', 'Tuesday', 'Period 4', 'Grade 10 (civics)');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mr. Pascal Al Ferzly', 'Tuesday', 'Period 5', 'Grade 12');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mr. Pascal Al Ferzly', 'Tuesday', 'Period 6', 'Grade 12');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mr. Pascal Al Ferzly', 'Tuesday', 'Period 7', 'Grade 12');

-- Mr. Ralph Ibrahim (22 slots)
DELETE FROM schedules WHERE teacher = 'Mr. Ralph Ibrahim';
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mr. Ralph Ibrahim', 'Monday', 'Period 1', 'Dep. Meeting');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mr. Ralph Ibrahim', 'Tuesday', 'Period 1', 'Ap Grade 9');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mr. Ralph Ibrahim', 'Wednesday', 'Period 1', 'Grade 10');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mr. Ralph Ibrahim', 'Thursday', 'Period 1', 'Grade 10');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mr. Ralph Ibrahim', 'Friday', 'Period 1', 'AP Grade 8');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mr. Ralph Ibrahim', 'Monday', 'Period 2', 'AP Grade 7');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mr. Ralph Ibrahim', 'Tuesday', 'Period 2', 'AP Grade 10');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mr. Ralph Ibrahim', 'Wednesday', 'Period 2', 'Grade 10');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mr. Ralph Ibrahim', 'Thursday', 'Period 2', 'AP Grade 7');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mr. Ralph Ibrahim', 'Tuesday', 'Period 3', 'AP Grade 9');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mr. Ralph Ibrahim', 'Wednesday', 'Period 3', 'AP Grade 8');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mr. Ralph Ibrahim', 'Thursday', 'Period 3', 'AP Grade 11 (H)');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mr. Ralph Ibrahim', 'Friday', 'Period 3', 'Grade 10');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mr. Ralph Ibrahim', 'Monday', 'Period 4', 'Grade 10');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mr. Ralph Ibrahim', 'Wednesday', 'Period 4', 'Grade 11 ©');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mr. Ralph Ibrahim', 'Thursday', 'Period 4', 'Grade 11 ©');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mr. Ralph Ibrahim', 'Friday', 'Period 4', 'Grade 11 ©');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mr. Ralph Ibrahim', 'Monday', 'Period 5', 'Grade 10');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mr. Ralph Ibrahim', 'Tuesday', 'Period 5', 'AP Gr 11(S)/12');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mr. Ralph Ibrahim', 'Wednesday', 'Period 5', 'Grade 11 ©');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mr. Ralph Ibrahim', 'Friday', 'Period 5', 'Grade 11 ©');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mr. Ralph Ibrahim', 'Monday', 'Period 7', 'Grade 11 ©');

-- Mr. Viken Dishgekenian (9 slots)
DELETE FROM schedules WHERE teacher = 'Mr. Viken Dishgekenian';
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mr. Viken Dishgekenian', 'Monday', 'Period 1', 'Grade 9 (phys)');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mr. Viken Dishgekenian', 'Tuesday', 'Period 1', 'Grade 12 (LS)');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mr. Viken Dishgekenian', 'Thursday', 'Period 1', 'Grade 9 (chem)');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mr. Viken Dishgekenian', 'Monday', 'Period 2', 'Grade 11 (S)');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mr. Viken Dishgekenian', 'Tuesday', 'Period 2', 'Grade 12 (LS)');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mr. Viken Dishgekenian', 'Thursday', 'Period 2', 'Grade 11 (S)');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mr. Viken Dishgekenian', 'Monday', 'Period 3', 'Grade 12 (LS)');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mr. Viken Dishgekenian', 'Tuesday', 'Period 3', 'Grade 10');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mr. Viken Dishgekenian', 'Thursday', 'Period 3', 'Grade 12 (LS)');

-- Mr. Vicken Koujanian (20 slots)
DELETE FROM schedules WHERE teacher = 'Mr. Vicken Koujanian';
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mr. Vicken Koujanian', 'Monday', 'Period 1', 'Coordination');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mr. Vicken Koujanian', 'Tuesday', 'Period 1', 'Grade 11 (S)');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mr. Vicken Koujanian', 'Wednesday', 'Period 1', 'Grade 11 (S)');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mr. Vicken Koujanian', 'Thursday', 'Period 1', 'Grade 11 (S)');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mr. Vicken Koujanian', 'Friday', 'Period 1', 'Grade 10');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mr. Vicken Koujanian', 'Monday', 'Period 2', 'Grade 10');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mr. Vicken Koujanian', 'Tuesday', 'Period 2', 'Grade 12 (SE) Math');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mr. Vicken Koujanian', 'Wednesday', 'Period 2', 'Grade 11 (S)');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mr. Vicken Koujanian', 'Thursday', 'Period 2', 'Grade 12 (LS)');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mr. Vicken Koujanian', 'Friday', 'Period 2', 'Grade 12 (SE) Math');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mr. Vicken Koujanian', 'Monday', 'Period 3', 'Gr 12 (SE) Math');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mr. Vicken Koujanian', 'Tuesday', 'Period 3', 'Grade 12 (SE) Physics');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mr. Vicken Koujanian', 'Wednesday', 'Period 3', 'Grade 12 (LS)');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mr. Vicken Koujanian', 'Thursday', 'Period 3', 'Grade 11 (S)');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mr. Vicken Koujanian', 'Friday', 'Period 3', 'Grade 12 (SE) Math');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mr. Vicken Koujanian', 'Monday', 'Period 4', 'Grade 12 (LS)');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mr. Vicken Koujanian', 'Tuesday', 'Period 4', 'Grade 12 (LS)');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mr. Vicken Koujanian', 'Wednesday', 'Period 4', 'Grade 12 (SE) Math');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mr. Vicken Koujanian', 'Thursday', 'Period 4', 'Grade 12 (LS)');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mr. Vicken Koujanian', 'Friday', 'Period 4', 'Grade 12 (LS)');

-- Mr. Yeghia Boghossian (2 slots)
DELETE FROM schedules WHERE teacher = 'Mr. Yeghia Boghossian';
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mr. Yeghia Boghossian', 'Wednesday', 'Period 5', 'Grade 9/10');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mr. Yeghia Boghossian', 'Wednesday', 'Period 7', 'Grade 7/8');

-- Mrs. Maria Guiragossian (8 slots)
DELETE FROM schedules WHERE teacher = 'Mrs. Maria Guiragossian';
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mrs. Maria Guiragossian', 'Monday', 'Period 2', 'Briefing');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mrs. Maria Guiragossian', 'Monday', 'Period 3', 'Grade 8');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mrs. Maria Guiragossian', 'Wednesday', 'Period 3', 'Accreditation');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mrs. Maria Guiragossian', 'Thursday', 'Period 3', 'Grade 8');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mrs. Maria Guiragossian', 'Friday', 'Period 3', 'Grade 8');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mrs. Maria Guiragossian', 'Monday', 'Period 5', 'Grade 8');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mrs. Maria Guiragossian', 'Tuesday', 'Period 5', 'Grade 8');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mrs. Maria Guiragossian', 'Wednesday', 'Period 5', 'Grade 8');

-- Ms. Aline Kevorkian (6 slots)
DELETE FROM schedules WHERE teacher = 'Ms. Aline Kevorkian';
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Aline Kevorkian', 'Monday', 'Period 1', 'Economics 12 (SE)');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Aline Kevorkian', 'Wednesday', 'Period 1', 'Economics 12 (SE)');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Aline Kevorkian', 'Monday', 'Period 2', 'Economics 12 (SE)');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Aline Kevorkian', 'Wednesday', 'Period 2', 'Economics 12 (SE)');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Aline Kevorkian', 'Monday', 'Period 3', 'Economics 11 (H)');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Aline Kevorkian', 'Wednesday', 'Period 3', 'Economics 12 (SE)');

-- Ms. Ani Manougian (13 slots)
DELETE FROM schedules WHERE teacher = 'Ms. Ani Manougian';
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Ani Manougian', 'Wednesday', 'Period 1', 'Grade 8 Armenian');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Ani Manougian', 'Thursday', 'Period 3', 'Grade 10 Armenian');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Ani Manougian', 'Friday', 'Period 3', 'Dep. Meeting');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Ani Manougian', 'Tuesday', 'Period 4', 'Grade 8 Arm. Hist.');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Ani Manougian', 'Tuesday', 'Period 5', 'Grade 10 Arm. Hist.');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Ani Manougian', 'Friday', 'Period 5', 'Grade 9 Armenian');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Ani Manougian', 'Tuesday', 'Period 6', 'Grade 11 Armenian');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Ani Manougian', 'Wednesday', 'Period 6', 'Grade 10 Armenian');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Ani Manougian', 'Thursday', 'Period 6', 'Grade 11 Armenian');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Ani Manougian', 'Friday', 'Period 6', 'Grade 11 Arm. Hist.');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Ani Manougian', 'Tuesday', 'Period 7', 'Grade 8 Arm');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Ani Manougian', 'Wednesday', 'Period 7', 'Grade 9 Arm. Hist.');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Ani Manougian', 'Thursday', 'Period 7', 'Grade 9 Armenian');

-- Ms. Cynthia Shaker (24 slots)
DELETE FROM schedules WHERE teacher = 'Ms. Cynthia Shaker';
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Cynthia Shaker', 'Monday', 'Period 1', 'Gr 11 (H/S) civics');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Cynthia Shaker', 'Tuesday', 'Period 1', 'Grade 12 (SE)');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Cynthia Shaker', 'Wednesday', 'Period 1', 'Grade 11 (H)');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Cynthia Shaker', 'Thursday', 'Period 1', 'Grade 7');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Cynthia Shaker', 'Friday', 'Period 1', 'Grade 11 (H)');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Cynthia Shaker', 'Monday', 'Period 2', 'Grade 9');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Cynthia Shaker', 'Thursday', 'Period 2', 'Grade 10');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Cynthia Shaker', 'Friday', 'Period 2', 'Grade 8');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Cynthia Shaker', 'Monday', 'Period 3', 'Grade 7');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Cynthia Shaker', 'Tuesday', 'Period 3', 'Grade 12 (LS)');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Cynthia Shaker', 'Wednesday', 'Period 3', 'Grade 11 (S)');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Cynthia Shaker', 'Friday', 'Period 3', 'Grade 9');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Cynthia Shaker', 'Tuesday', 'Period 4', 'Grade 12 (SE)');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Cynthia Shaker', 'Wednesday', 'Period 4', 'Grade 10');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Cynthia Shaker', 'Thursday', 'Period 4', 'Grade 9');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Cynthia Shaker', 'Friday', 'Period 4', 'Grade 10');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Cynthia Shaker', 'Monday', 'Period 5', 'Grade 11 (S)');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Cynthia Shaker', 'Tuesday', 'Period 5', 'Grade 7');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Cynthia Shaker', 'Thursday', 'Period 5', 'Grade 12 (LS)');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Cynthia Shaker', 'Thursday', 'Period 6', 'Grade 8');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Cynthia Shaker', 'Friday', 'Period 6', 'Grade 7');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Cynthia Shaker', 'Monday', 'Period 7', 'Grade 8');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Cynthia Shaker', 'Tuesday', 'Period 7', 'Grade 9');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Cynthia Shaker', 'Thursday', 'Period 7', 'Grade 8');

-- Ms. Haverj Kojaoghlanian (10 slots)
DELETE FROM schedules WHERE teacher = 'Ms. Haverj Kojaoghlanian';
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Haverj Kojaoghlanian', 'Wednesday', 'Period 3', 'Accreditation');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Haverj Kojaoghlanian', 'Friday', 'Period 3', 'Arm. Dep. Meeting');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Haverj Kojaoghlanian', 'Tuesday', 'Period 4', 'Grade 4');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Haverj Kojaoghlanian', 'Thursday', 'Period 4', 'AP Grade 12 SE');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Haverj Kojaoghlanian', 'Monday', 'Period 5', 'Grade 4');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Haverj Kojaoghlanian', 'Wednesday', 'Period 5', 'Grade 4');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Haverj Kojaoghlanian', 'Monday', 'Period 6', 'AP Grade 9/10');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Haverj Kojaoghlanian', 'Wednesday', 'Period 6', 'AP Grade 7/8');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Haverj Kojaoghlanian', 'Thursday', 'Period 6', 'Grade 4');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Haverj Kojaoghlanian', 'Friday', 'Period 6', 'Grade 4');

-- Ms. Houry Kevorkian (7 slots)
DELETE FROM schedules WHERE teacher = 'Ms. Houry Kevorkian';
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Houry Kevorkian', 'Thursday', 'Period 1', '12 (LS) English');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Houry Kevorkian', 'Thursday', 'Period 2', '12 (SE) Sociology');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Houry Kevorkian', 'Thursday', 'Period 3', '12 (SE) Sociology');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Houry Kevorkian', 'Monday', 'Period 4', '12 (SE) Sociology');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Houry Kevorkian', 'Monday', 'Period 5', '12 (SE) Sociology');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Houry Kevorkian', 'Monday', 'Period 6', '11 (H) Sociology');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Houry Kevorkian', 'Monday', 'Period 7', '12 (SE) English');

-- Ms. Kawkab Haddad (22 slots)
DELETE FROM schedules WHERE teacher = 'Ms. Kawkab Haddad';
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Kawkab Haddad', 'Monday', 'Period 1', 'Grade 3');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Kawkab Haddad', 'Tuesday', 'Period 1', 'Grade 1');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Kawkab Haddad', 'Friday', 'Period 1', 'Grade 2');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Kawkab Haddad', 'Tuesday', 'Period 2', 'Grade 3');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Kawkab Haddad', 'Wednesday', 'Period 2', 'Grade 2');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Kawkab Haddad', 'Thursday', 'Period 2', 'Grade 2');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Kawkab Haddad', 'Friday', 'Period 2', 'Grade 3');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Kawkab Haddad', 'Tuesday', 'Period 3', 'Grade 2');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Kawkab Haddad', 'Wednesday', 'Period 3', 'Grade 1');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Kawkab Haddad', 'Thursday', 'Period 3', 'Grade 1');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Kawkab Haddad', 'Monday', 'Period 4', 'Grade 3');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Kawkab Haddad', 'Wednesday', 'Period 4', 'Grade 3');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Kawkab Haddad', 'Monday', 'Period 5', 'Grade 2');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Kawkab Haddad', 'Tuesday', 'Period 5', 'Grade 1');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Kawkab Haddad', 'Wednesday', 'Period 5', 'Grade 1');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Kawkab Haddad', 'Thursday', 'Period 5', 'Grade 1');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Kawkab Haddad', 'Friday', 'Period 5', 'Grade 2');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Kawkab Haddad', 'Monday', 'Period 6', 'Grade 1');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Kawkab Haddad', 'Tuesday', 'Period 6', 'Dep. Meeting');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Kawkab Haddad', 'Wednesday', 'Period 6', 'Grade 2');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Kawkab Haddad', 'Thursday', 'Period 6', 'Grade 3');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Kawkab Haddad', 'Friday', 'Period 7', 'Grade 3');

-- Ms. Lena Titizian (23 slots)
DELETE FROM schedules WHERE teacher = 'Ms. Lena Titizian';
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Lena Titizian', 'Thursday', 'Period 1', 'Grade7');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Lena Titizian', 'Friday', 'Period 1', 'Grade 8');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Lena Titizian', 'Monday', 'Period 2', 'Grade 7');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Lena Titizian', 'Thursday', 'Period 2', 'Grade 7');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Lena Titizian', 'Friday', 'Period 2', 'Grade 8');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Lena Titizian', 'Monday', 'Period 3', 'Grade 7');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Lena Titizian', 'Tuesday', 'Period 3', 'Grade 8');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Lena Titizian', 'Wednesday', 'Period 3', 'Grade 8');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Lena Titizian', 'Friday', 'Period 3', 'Grade 9');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Lena Titizian', 'Monday', 'Period 4', 'Grade 8');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Lena Titizian', 'Thursday', 'Period 4', 'Grade 9');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Lena Titizian', 'Tuesday', 'Period 5', 'Grade 7');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Lena Titizian', 'Wednesday', 'Period 5', 'Grade 9');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Lena Titizian', 'Thursday', 'Period 5', 'Grade 9');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Lena Titizian', 'Monday', 'Period 6', 'Grade 9');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Lena Titizian', 'Tuesday', 'Period 6', 'Dep. Meeting');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Lena Titizian', 'Wednesday', 'Period 6', 'Grade 8');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Lena Titizian', 'Thursday', 'Period 6', 'Grade 8');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Lena Titizian', 'Friday', 'Period 6', 'Grade 7');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Lena Titizian', 'Monday', 'Period 7', 'Grade 9');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Lena Titizian', 'Tuesday', 'Period 7', 'Grade 9');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Lena Titizian', 'Wednesday', 'Period 7', 'Grade 7');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Lena Titizian', 'Friday', 'Period 7', 'Assembly');

-- Ms. Maggie Boghossian (22 slots)
DELETE FROM schedules WHERE teacher = 'Ms. Maggie Boghossian';
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Maggie Boghossian', 'Monday', 'Period 1', 'Grade 4');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Maggie Boghossian', 'Tuesday', 'Period 1', 'Grade 4');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Maggie Boghossian', 'Tuesday', 'Period 2', 'Grade 6');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Maggie Boghossian', 'Wednesday', 'Period 2', 'Grade 5');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Maggie Boghossian', 'Thursday', 'Period 2', 'Grade 5');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Maggie Boghossian', 'Friday', 'Period 2', 'Grade 4');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Maggie Boghossian', 'Monday', 'Period 3', 'Grade 5');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Maggie Boghossian', 'Tuesday', 'Period 3', 'Grade 4');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Maggie Boghossian', 'Wednesday', 'Period 3', 'Grade 5');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Maggie Boghossian', 'Thursday', 'Period 3', 'Grade 4');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Maggie Boghossian', 'Friday', 'Period 3', 'Grade 5');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Maggie Boghossian', 'Monday', 'Period 4', 'Grade 6');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Maggie Boghossian', 'Monday', 'Period 5', 'Grade 6');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Maggie Boghossian', 'Tuesday', 'Period 5', 'Grade 5');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Maggie Boghossian', 'Wednesday', 'Period 5', 'Grade 6');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Maggie Boghossian', 'Thursday', 'Period 5', 'Grade 6');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Maggie Boghossian', 'Friday', 'Period 5', 'Grade 6');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Maggie Boghossian', 'Tuesday', 'Period 6', 'Dep. Meeting');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Maggie Boghossian', 'Wednesday', 'Period 6', 'Grade 4');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Maggie Boghossian', 'Wednesday', 'Period 7', 'Grade 4');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Maggie Boghossian', 'Thursday', 'Period 7', 'Grade 5');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Maggie Boghossian', 'Friday', 'Period 7', 'Grade 6');

-- Ms. Maral Avedissian (20 slots)
DELETE FROM schedules WHERE teacher = 'Ms. Maral Avedissian';
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Maral Avedissian', 'Monday', 'Period 1', 'Grade 6');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Maral Avedissian', 'Wednesday', 'Period 1', 'Grade 6');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Maral Avedissian', 'Thursday', 'Period 1', 'Grade 4');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Maral Avedissian', 'Friday', 'Period 1', 'Grade 5');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Maral Avedissian', 'Monday', 'Period 2', 'Grade 4');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Maral Avedissian', 'Tuesday', 'Period 2', 'Grade 4');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Maral Avedissian', 'Tuesday', 'Period 3', 'Grade 5');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Maral Avedissian', 'Wednesday', 'Period 3', 'Grade 4');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Maral Avedissian', 'Thursday', 'Period 3', 'Grade 6');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Maral Avedissian', 'Friday', 'Period 3', 'Grade 4');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Maral Avedissian', 'Tuesday', 'Period 4', 'Grade 7');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Maral Avedissian', 'Wednesday', 'Period 4', 'Grade 7');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Maral Avedissian', 'Friday', 'Period 4', 'Grade 7');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Maral Avedissian', 'Monday', 'Period 5', 'Grade 5');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Maral Avedissian', 'Thursday', 'Period 5', 'Grade 5');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Maral Avedissian', 'Monday', 'Period 6', 'Grade 7');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Maral Avedissian', 'Tuesday', 'Period 6', 'Grade 6');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Maral Avedissian', 'Wednesday', 'Period 6', 'Grade 5');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Maral Avedissian', 'Thursday', 'Period 6', 'Grade 7');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Maral Avedissian', 'Friday', 'Period 6', 'Grade 6');

-- Ms. Maral Haidostian (6 slots)
DELETE FROM schedules WHERE teacher = 'Ms. Maral Haidostian';
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Maral Haidostian', 'Thursday', 'Period 1', 'Grade 8');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Maral Haidostian', 'Tuesday', 'Period 2', 'Grade 9');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Maral Haidostian', 'Thursday', 'Period 3', 'Grade 7');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Maral Haidostian', 'Tuesday', 'Period 4', 'Grade 11');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Maral Haidostian', 'Tuesday', 'Period 5', 'Dep. Meeting');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Maral Haidostian', 'Thursday', 'Period 5', 'Grade 10');

-- Ms. Maral Manisalian (6 slots)
DELETE FROM schedules WHERE teacher = 'Ms. Maral Manisalian';
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Maral Manisalian', 'Monday', 'Period 1', 'Grade 5');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Maral Manisalian', 'Tuesday', 'Period 1', 'Grade 3');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Maral Manisalian', 'Monday', 'Period 2', 'Grade 1');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Maral Manisalian', 'Tuesday', 'Period 2', 'Grade 2');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Maral Manisalian', 'Monday', 'Period 3', 'Grade 4');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Maral Manisalian', 'Tuesday', 'Period 3', 'Grade 6');

-- Mrs. Maral Deyirmenjian (5 slots)
DELETE FROM schedules WHERE teacher = 'Mrs. Maral Deyirmenjian';
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mrs. Maral Deyirmenjian', 'Monday', 'Period 2', 'Briefing');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mrs. Maral Deyirmenjian', 'Wednesday', 'Period 3', 'Accreditation');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mrs. Maral Deyirmenjian', 'Tuesday', 'Period 6', 'Grade 10');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mrs. Maral Deyirmenjian', 'Thursday', 'Period 6', 'Grade 12 ©');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mrs. Maral Deyirmenjian', 'Wednesday', 'Period 7', 'Grade 11 ©');

-- Ms. Margo Kordahi (24 slots)
DELETE FROM schedules WHERE teacher = 'Ms. Margo Kordahi';
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Margo Kordahi', 'Monday', 'Period 1', 'Dep. Meeting');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Margo Kordahi', 'Wednesday', 'Period 1', 'Grade 1 Eng');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Margo Kordahi', 'Thursday', 'Period 1', 'Grade 1 Eng');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Margo Kordahi', 'Monday', 'Period 2', 'KG');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Margo Kordahi', 'Tuesday', 'Period 2', 'KG');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Margo Kordahi', 'Wednesday', 'Period 2', 'KG');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Margo Kordahi', 'Thursday', 'Period 2', 'KG');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Margo Kordahi', 'Friday', 'Period 2', 'KG');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Margo Kordahi', 'Monday', 'Period 3', 'KG');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Margo Kordahi', 'Tuesday', 'Period 3', 'KG');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Margo Kordahi', 'Wednesday', 'Period 3', 'KG');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Margo Kordahi', 'Friday', 'Period 3', 'KG');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Margo Kordahi', 'Monday', 'Period 4', 'Grade 1 Eng');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Margo Kordahi', 'Tuesday', 'Period 4', 'Grade 1 B');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Margo Kordahi', 'Friday', 'Period 4', 'Grade 2 B');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Margo Kordahi', 'Monday', 'Period 5', 'Grade 3 B');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Margo Kordahi', 'Thursday', 'Period 5', 'KG3 B');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Margo Kordahi', 'Tuesday', 'Period 6', 'Grade 1 Eng');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Margo Kordahi', 'Wednesday', 'Period 6', 'Grade 1 B');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Margo Kordahi', 'Thursday', 'Period 6', 'Grade 1 Eng');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Margo Kordahi', 'Monday', 'Period 7', 'Grade 2 B');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Margo Kordahi', 'Tuesday', 'Period 7', 'Assembly');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Margo Kordahi', 'Wednesday', 'Period 7', 'Grade 3 B');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Margo Kordahi', 'Friday', 'Period 7', 'Grade 1 Eng');

-- Ms. Maria Ounjian (8 slots)
DELETE FROM schedules WHERE teacher = 'Ms. Maria Ounjian';
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Maria Ounjian', 'Monday', 'Period 1', 'Grade 12 (LS)');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Maria Ounjian', 'Friday', 'Period 1', 'Grade 12 (LS)');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Maria Ounjian', 'Monday', 'Period 2', 'Grade 12 (LS)');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Maria Ounjian', 'Friday', 'Period 2', 'Grade 11 (S)');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Maria Ounjian', 'Wednesday', 'Period 4', 'Grade 12 (LS)');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Maria Ounjian', 'Wednesday', 'Period 5', 'Grade 12 (LS)');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Maria Ounjian', 'Wednesday', 'Period 6', 'Grade 11 (S)');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Maria Ounjian', 'Thursday', 'Period 6', 'Dep. Meeting');

-- Ms. Mariebelle Mansour (8 slots)
DELETE FROM schedules WHERE teacher = 'Ms. Mariebelle Mansour';
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Mariebelle Mansour', 'Tuesday', 'Period 2', 'Grade 7 Geo');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Mariebelle Mansour', 'Wednesday', 'Period 4', 'Grade 5');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Mariebelle Mansour', 'Monday', 'Period 5', 'Grade 7 Civics');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Mariebelle Mansour', 'Tuesday', 'Period 5', 'Grade 6');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Mariebelle Mansour', 'Wednesday', 'Period 6', 'Grade 7 History');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Mariebelle Mansour', 'Monday', 'Period 7', 'Grade 8 History');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Mariebelle Mansour', 'Wednesday', 'Period 7', 'Grade 8 Geo');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Mariebelle Mansour', 'Thursday', 'Period 7', 'Grade 8 Civics');

-- Ms. Marina Hamamjian (15 slots)
DELETE FROM schedules WHERE teacher = 'Ms. Marina Hamamjian';
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Marina Hamamjian', 'Monday', 'Period 1', 'Grade 7');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Marina Hamamjian', 'Tuesday', 'Period 1', 'Grade 5');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Marina Hamamjian', 'Wednesday', 'Period 1', 'Grade 5');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Marina Hamamjian', 'Thursday', 'Period 1', 'Grade 6');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Marina Hamamjian', 'Friday', 'Period 1', 'Grade 7');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Marina Hamamjian', 'Monday', 'Period 2', 'Grade 5');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Marina Hamamjian', 'Tuesday', 'Period 2', 'Grade 5');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Marina Hamamjian', 'Wednesday', 'Period 2', 'Grade 6');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Marina Hamamjian', 'Thursday', 'Period 2', 'Grade 6');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Marina Hamamjian', 'Friday', 'Period 2', 'Grade 6');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Marina Hamamjian', 'Monday', 'Period 3', 'Grade 6');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Marina Hamamjian', 'Tuesday', 'Period 3', 'Grade 7');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Marina Hamamjian', 'Wednesday', 'Period 3', 'Grade 7');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Marina Hamamjian', 'Thursday', 'Period 3', 'Grade 5');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Marina Hamamjian', 'Friday', 'Period 3', 'Dep. Meeting');

-- Mrs. Markrid Margossian (20 slots)
DELETE FROM schedules WHERE teacher = 'Mrs. Markrid Margossian';
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mrs. Markrid Margossian', 'Monday', 'Period 1', 'Dep. Meeting');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mrs. Markrid Margossian', 'Wednesday', 'Period 1', 'Grade 4');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mrs. Markrid Margossian', 'Wednesday', 'Period 2', 'Grade 3');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mrs. Markrid Margossian', 'Thursday', 'Period 2', 'Grade 3');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mrs. Markrid Margossian', 'Friday', 'Period 2', 'Grade 2');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mrs. Markrid Margossian', 'Monday', 'Period 3', 'Grade 2');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mrs. Markrid Margossian', 'Wednesday', 'Period 3', 'Grade 3');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mrs. Markrid Margossian', 'Friday', 'Period 3', 'Grade 3');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mrs. Markrid Margossian', 'Monday', 'Period 4', 'Grade 4');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mrs. Markrid Margossian', 'Tuesday', 'Period 4', 'Grade 3');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mrs. Markrid Margossian', 'Wednesday', 'Period 4', 'Grade 2');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mrs. Markrid Margossian', 'Thursday', 'Period 4', 'Grade 2');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mrs. Markrid Margossian', 'Tuesday', 'Period 5', 'Grade 2');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mrs. Markrid Margossian', 'Thursday', 'Period 5', 'Grade 4');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mrs. Markrid Margossian', 'Monday', 'Period 6', 'Grade 3');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mrs. Markrid Margossian', 'Tuesday', 'Period 6', 'Grade 4');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mrs. Markrid Margossian', 'Monday', 'Period 7', 'Grade 4');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mrs. Markrid Margossian', 'Tuesday', 'Period 7', 'Assembly');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mrs. Markrid Margossian', 'Wednesday', 'Period 7', 'Grade 2');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mrs. Markrid Margossian', 'Friday', 'Period 7', 'Grade 4');

-- Ms. Mireille Mardirossian (27 slots)
DELETE FROM schedules WHERE teacher = 'Ms. Mireille Mardirossian';
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Mireille Mardirossian', 'Monday', 'Period 1', 'Grade 1');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Mireille Mardirossian', 'Wednesday', 'Period 1', 'Grade 2');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Mireille Mardirossian', 'Thursday', 'Period 1', 'Grade 3');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Mireille Mardirossian', 'Friday', 'Period 1', 'Grade 1');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Mireille Mardirossian', 'Tuesday', 'Period 2', 'Grade 1');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Mireille Mardirossian', 'Wednesday', 'Period 2', 'Grade 1');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Mireille Mardirossian', 'Thursday', 'Period 2', 'Grade 1');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Mireille Mardirossian', 'Tuesday', 'Period 3', 'Grade 3');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Mireille Mardirossian', 'Friday', 'Period 3', 'Dep. Meeting');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Mireille Mardirossian', 'Monday', 'Period 4', 'KG');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Mireille Mardirossian', 'Tuesday', 'Period 4', 'KG');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Mireille Mardirossian', 'Wednesday', 'Period 4', 'KG');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Mireille Mardirossian', 'Thursday', 'Period 4', 'KG');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Mireille Mardirossian', 'Friday', 'Period 4', 'KG');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Mireille Mardirossian', 'Monday', 'Period 5', 'KG');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Mireille Mardirossian', 'Tuesday', 'Period 5', 'KG');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Mireille Mardirossian', 'Wednesday', 'Period 5', 'KG');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Mireille Mardirossian', 'Thursday', 'Period 5', 'KG');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Mireille Mardirossian', 'Friday', 'Period 5', 'KG');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Mireille Mardirossian', 'Monday', 'Period 6', 'Grade 2');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Mireille Mardirossian', 'Tuesday', 'Period 6', 'Grade 2');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Mireille Mardirossian', 'Wednesday', 'Period 6', 'Grade 3');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Mireille Mardirossian', 'Friday', 'Period 6', 'Grade 3');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Mireille Mardirossian', 'Monday', 'Period 7', 'Grade 3');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Mireille Mardirossian', 'Tuesday', 'Period 7', 'Assembly');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Mireille Mardirossian', 'Thursday', 'Period 7', 'Grade 2');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Mireille Mardirossian', 'Friday', 'Period 7', 'Grade 2');

-- Ms. Nora Terzian (8 slots)
DELETE FROM schedules WHERE teacher = 'Ms. Nora Terzian';
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Nora Terzian', 'Monday', 'Period 2', 'Briefing');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Nora Terzian', 'Thursday', 'Period 2', 'Grade 11 (H)');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Nora Terzian', 'Friday', 'Period 2', 'Grade 9');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Nora Terzian', 'Wednesday', 'Period 3', 'Accreditation');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Nora Terzian', 'Monday', 'Period 4', 'Grade 9');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Nora Terzian', 'Wednesday', 'Period 4', 'grade 9');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Nora Terzian', 'Friday', 'Period 5', 'Grade 12 (SE)');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Nora Terzian', 'Thursday', 'Period 6', 'Dep. Meeting');

-- Ms. Patil Balabanian (11 slots)
DELETE FROM schedules WHERE teacher = 'Ms. Patil Balabanian';
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Patil Balabanian', 'Thursday', 'Period 2', 'KG1');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Patil Balabanian', 'Thursday', 'Period 3', 'KG2');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Patil Balabanian', 'Friday', 'Period 3', 'Grade 6');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Patil Balabanian', 'Thursday', 'Period 4', 'KG3 B');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Patil Balabanian', 'Friday', 'Period 4', 'Grade 3');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Patil Balabanian', 'Thursday', 'Period 5', 'KG3 A');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Patil Balabanian', 'Friday', 'Period 5', 'Grade 5');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Patil Balabanian', 'Thursday', 'Period 6', 'Grade 2');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Patil Balabanian', 'Friday', 'Period 6', 'Grade 1');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Patil Balabanian', 'Thursday', 'Period 7', 'Grade 4');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Patil Balabanian', 'Friday', 'Period 7', 'Club');

-- Ms. Rima Cholakian (20 slots)
DELETE FROM schedules WHERE teacher = 'Ms. Rima Cholakian';
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Rima Cholakian', 'Monday', 'Period 1', 'Meeting');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Rima Cholakian', 'Tuesday', 'Period 1', 'Grade 6');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Rima Cholakian', 'Friday', 'Period 1', 'Grade 6');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Rima Cholakian', 'Monday', 'Period 2', 'Grade 6');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Rima Cholakian', 'Friday', 'Period 2', 'Grade 5');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Rima Cholakian', 'Tuesday', 'Period 3', 'Gr 8 Social Study');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Rima Cholakian', 'Monday', 'Period 4', 'Gr 11 Social Study');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Rima Cholakian', 'Tuesday', 'Period 4', 'Gr 10 Social Study');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Rima Cholakian', 'Wednesday', 'Period 4', 'Grade 6');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Rima Cholakian', 'Monday', 'Period 5', 'Gr 7 Social Study');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Rima Cholakian', 'Wednesday', 'Period 5', 'Grade 5');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Rima Cholakian', 'Thursday', 'Period 5', 'Gr 9 Social Study');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Rima Cholakian', 'Monday', 'Period 6', 'Grade 5');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Rima Cholakian', 'Tuesday', 'Period 6', 'Gr 12 Social Study');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Rima Cholakian', 'Wednesday', 'Period 6', 'Grade 6');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Rima Cholakian', 'Thursday', 'Period 6', 'Grade 5');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Rima Cholakian', 'Monday', 'Period 7', 'Grade 5');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Rima Cholakian', 'Tuesday', 'Period 7', 'Assembly');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Rima Cholakian', 'Wednesday', 'Period 7', 'Grade 5');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Rima Cholakian', 'Thursday', 'Period 7', 'Grade 6');

-- Ms. Rita Avedanian (20 slots)
DELETE FROM schedules WHERE teacher = 'Ms. Rita Avedanian';
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Rita Avedanian', 'Monday', 'Period 1', 'Grade 8 Physicvs');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Rita Avedanian', 'Tuesday', 'Period 1', 'Grade 7 Biology');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Rita Avedanian', 'Wednesday', 'Period 1', 'Grade 7 Chemistry');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Rita Avedanian', 'Monday', 'Period 2', 'Grade 8 Biology');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Rita Avedanian', 'Wednesday', 'Period 2', 'Grade 7 Biology');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Rita Avedanian', 'Thursday', 'Period 2', 'Grade 8 Biology');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Rita Avedanian', 'Tuesday', 'Period 3', 'Grade 11 (H) chem');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Rita Avedanian', 'Wednesday', 'Period 3', 'Grade 10 Biology');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Rita Avedanian', 'Monday', 'Period 4', 'Grade 7 Physics');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Rita Avedanian', 'Wednesday', 'Period 4', 'Grade 8 Physics');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Rita Avedanian', 'Thursday', 'Period 4', 'Grade 7 Physics');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Rita Avedanian', 'Friday', 'Period 4', 'Grade 8 Chemistry');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Rita Avedanian', 'Tuesday', 'Period 5', 'Grade 11 (H) Physics');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Rita Avedanian', 'Wednesday', 'Period 5', 'Grade 12 (SE) Chem');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Rita Avedanian', 'Friday', 'Period 5', 'Grade 10 Biology');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Rita Avedanian', 'Tuesday', 'Period 6', 'Grade 8 Chem');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Rita Avedanian', 'Thursday', 'Period 6', 'Dep. Meeting');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Rita Avedanian', 'Friday', 'Period 6', 'Grade 12 (SE) Chem');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Rita Avedanian', 'Tuesday', 'Period 7', 'Grade 10 Biology');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Rita Avedanian', 'Thursday', 'Period 7', 'Grade 7 Chemistry');

-- Ms. Sella Moughalian (26 slots)
DELETE FROM schedules WHERE teacher = 'Ms. Sella Moughalian';
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Sella Moughalian', 'Monday', 'Period 1', 'Grade 2');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Sella Moughalian', 'Tuesday', 'Period 1', 'Grade 2');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Sella Moughalian', 'Wednesday', 'Period 1', 'Grade 3');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Sella Moughalian', 'Thursday', 'Period 1', 'Grade 2');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Sella Moughalian', 'Friday', 'Period 1', 'Grade 3');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Sella Moughalian', 'Monday', 'Period 2', 'Grade 3 Math');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Sella Moughalian', 'Wednesday', 'Period 2', 'Grade 4');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Sella Moughalian', 'Tuesday', 'Period 3', 'Grade 1');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Sella Moughalian', 'Wednesday', 'Period 3', 'Accreditation');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Sella Moughalian', 'Monday', 'Period 4', 'Grade 5');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Sella Moughalian', 'Tuesday', 'Period 4', 'Grade 5');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Sella Moughalian', 'Wednesday', 'Period 4', 'Grade 1');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Sella Moughalian', 'Thursday', 'Period 4', 'Grade 1');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Sella Moughalian', 'Friday', 'Period 4', 'Grade 4');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Sella Moughalian', 'Tuesday', 'Period 5', 'Grade 3 Math');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Sella Moughalian', 'Wednesday', 'Period 5', 'Grade 2');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Sella Moughalian', 'Thursday', 'Period 5', 'Grade 3 Math');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Sella Moughalian', 'Friday', 'Period 5', 'Grade 1');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Sella Moughalian', 'Monday', 'Period 6', 'Grade 6');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Sella Moughalian', 'Tuesday', 'Period 6', 'Grade 3 science');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Sella Moughalian', 'Thursday', 'Period 6', 'Dep. Meeting');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Sella Moughalian', 'Friday', 'Period 6', 'Grade 2');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Sella Moughalian', 'Monday', 'Period 7', 'Grade 1');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Sella Moughalian', 'Tuesday', 'Period 7', 'Assembly');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Sella Moughalian', 'Wednesday', 'Period 7', 'Grade 6');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Sella Moughalian', 'Thursday', 'Period 7', 'grade 3 Science');

-- Ms. Tania El Khoury (21 slots)
DELETE FROM schedules WHERE teacher = 'Ms. Tania El Khoury';
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Tania El Khoury', 'Tuesday', 'Period 1', 'Grade 12 (SE)');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Tania El Khoury', 'Wednesday', 'Period 1', 'Grade 11 (H)');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Tania El Khoury', 'Thursday', 'Period 1', 'Grade 12 (SE)');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Tania El Khoury', 'Friday', 'Period 1', 'Grade 11 (H)');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Tania El Khoury', 'Wednesday', 'Period 2', 'Grade 11 (H)');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Tania El Khoury', 'Thursday', 'Period 2', 'Grade 10');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Tania El Khoury', 'Monday', 'Period 3', 'Grade 10');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Tania El Khoury', 'Tuesday', 'Period 3', 'Grade 12 (LS)');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Tania El Khoury', 'Wednesday', 'Period 3', 'Grade 11 (S)');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Tania El Khoury', 'Thursday', 'Period 3', 'Grade 11 (H)');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Tania El Khoury', 'Tuesday', 'Period 4', 'Grade 12 (SE)');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Tania El Khoury', 'Wednesday', 'Period 4', 'Grade 10');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Tania El Khoury', 'Thursday', 'Period 4', 'Grade 12 (SE)');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Tania El Khoury', 'Friday', 'Period 4', 'Grade 10');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Tania El Khoury', 'Monday', 'Period 5', 'Grade 11 (S)');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Tania El Khoury', 'Tuesday', 'Period 5', 'Grade 11 (S)');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Tania El Khoury', 'Wednesday', 'Period 5', 'Grade 10');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Tania El Khoury', 'Thursday', 'Period 5', 'Grade 12 (LS)');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Tania El Khoury', 'Friday', 'Period 5', 'Grade 12 (LS)');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Tania El Khoury', 'Monday', 'Period 6', 'Grade 10');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Tania El Khoury', 'Tuesday', 'Period 6', 'Dep meeting');

-- Ms. Varty Salkhanian (19 slots)
DELETE FROM schedules WHERE teacher = 'Ms. Varty Salkhanian';
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Varty Salkhanian', 'Monday', 'Period 1', 'Dep. Meeting');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Varty Salkhanian', 'Tuesday', 'Period 1', 'Grade 8');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Varty Salkhanian', 'Tuesday', 'Period 2', 'Grade 8');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Varty Salkhanian', 'Wednesday', 'Period 2', 'Grade 8');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Varty Salkhanian', 'Wednesday', 'Period 3', 'Grade 9');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Varty Salkhanian', 'Friday', 'Period 3', 'Grade 7');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Varty Salkhanian', 'Tuesday', 'Period 4', 'Grade 9');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Varty Salkhanian', 'Thursday', 'Period 4', 'Grade 8');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Varty Salkhanian', 'Monday', 'Period 5', 'Grade 9');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Varty Salkhanian', 'Tuesday', 'Period 5', 'Grade 9');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Varty Salkhanian', 'Wednesday', 'Period 5', 'Grade 7');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Varty Salkhanian', 'Thursday', 'Period 5', 'Grade 7');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Varty Salkhanian', 'Monday', 'Period 6', 'Grade 8');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Varty Salkhanian', 'Tuesday', 'Period 6', 'Grade 7');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Varty Salkhanian', 'Wednesday', 'Period 6', 'Grade 9');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Varty Salkhanian', 'Thursday', 'Period 6', 'Grade 9');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Varty Salkhanian', 'Friday', 'Period 6', 'Grade 8');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Varty Salkhanian', 'Monday', 'Period 7', 'grade 7');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Varty Salkhanian', 'Tuesday', 'Period 7', 'grade 7');

-- Ms. Tamar Gumushian (13 slots)
DELETE FROM schedules WHERE teacher = 'Ms. Tamar Gumushian';
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Tamar Gumushian', 'Monday', 'Period 2', 'Grade 2');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Tamar Gumushian', 'Monday', 'Period 3', 'Grade 1');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Tamar Gumushian', 'Wednesday', 'Period 3', 'Grade 2');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Tamar Gumushian', 'Tuesday', 'Period 4', 'grade 6');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Tamar Gumushian', 'Thursday', 'Period 4', 'Grade 4');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Tamar Gumushian', 'Tuesday', 'Period 5', 'Bible Dep. Meeting');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Tamar Gumushian', 'Monday', 'Period 6', 'Grade 4');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Tamar Gumushian', 'Tuesday', 'Period 6', 'Grade 5');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Tamar Gumushian', 'Thursday', 'Period 6', 'Sc Dep. Meeting');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Tamar Gumushian', 'Monday', 'Period 7', 'Grade 6');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Tamar Gumushian', 'Tuesday', 'Period 7', 'Assembly');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Tamar Gumushian', 'Wednesday', 'Period 7', 'Grade 1');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Tamar Gumushian', 'Friday', 'Period 7', 'Grade 5');

-- Ms. Vana Zeitounian (10 slots)
DELETE FROM schedules WHERE teacher = 'Ms. Vana Zeitounian';
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Vana Zeitounian', 'Friday', 'Period 2', 'Grade 1 Arm. Hist.');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Vana Zeitounian', 'Monday', 'Period 3', 'Grade 3 french');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Vana Zeitounian', 'Wednesday', 'Period 3', 'Grade 6 French');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Vana Zeitounian', 'Friday', 'Period 3', 'Grade 2 Arm Hist');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Vana Zeitounian', 'Monday', 'Period 4', 'Grade 2 French');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Vana Zeitounian', 'Wednesday', 'Period 4', 'Grade 4 french');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Vana Zeitounian', 'Friday', 'Period 4', 'Grade 5 French');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Vana Zeitounian', 'Monday', 'Period 5', 'grade 1 french');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Vana Zeitounian', 'Wednesday', 'Period 5', 'Grade 3 Arm Hist.');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Vana Zeitounian', 'Friday', 'Period 5', 'Grade 4 Arm Hist');

-- ═══ ELEMENTARY + INTERMEDIATE ═══
-- Ms. Christine Torossian (24 slots)
DELETE FROM schedules WHERE teacher = 'Ms. Christine Torossian';
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Christine Torossian', 'Tuesday', 'Period 1', 'Support English 6');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Christine Torossian', 'Wednesday', 'Period 1', 'Support English 4');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Christine Torossian', 'Thursday', 'Period 1', 'Pull out English 6');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Christine Torossian', 'Friday', 'Period 1', 'Support English 6');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Christine Torossian', 'Monday', 'Period 2', 'Pull out English 5');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Christine Torossian', 'Tuesday', 'Period 2', 'Pull out English 5');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Christine Torossian', 'Wednesday', 'Period 2', 'Support English 3');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Christine Torossian', 'Thursday', 'Period 2', 'Support English 3');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Christine Torossian', 'Friday', 'Period 2', 'Support English 5');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Christine Torossian', 'Monday', 'Period 3', 'Pull out English 6');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Christine Torossian', 'Monday', 'Period 4', 'Support English 4');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Christine Torossian', 'Tuesday', 'Period 4', 'Support English 3');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Christine Torossian', 'Wednesday', 'Period 4', 'Support English 2');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Christine Torossian', 'Thursday', 'Period 4', 'Support English 2');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Christine Torossian', 'Monday', 'Period 5', 'Pull out English 4');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Christine Torossian', 'Tuesday', 'Period 5', 'Support English 2');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Christine Torossian', 'Wednesday', 'Period 5', 'Support English 5');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Christine Torossian', 'Thursday', 'Period 5', 'Support English 4');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Christine Torossian', 'Monday', 'Period 6', 'Support English 5');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Christine Torossian', 'Tuesday', 'Period 6', 'Pull out English 2');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Christine Torossian', 'Wednesday', 'Period 6', 'Support English 6');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Christine Torossian', 'Thursday', 'Period 6', 'Support English 5');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Christine Torossian', 'Friday', 'Period 6', 'coordination with Hamesd');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Christine Torossian', 'Friday', 'Period 7', 'Pull out English 2');

-- Ms. Nayiri Lousinian (25 slots)
DELETE FROM schedules WHERE teacher = 'Ms. Nayiri Lousinian';
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Nayiri Lousinian', 'Monday', 'Period 1', 'Pull out English 1');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Nayiri Lousinian', 'Wednesday', 'Period 1', 'Support English 1');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Nayiri Lousinian', 'Thursday', 'Period 1', 'Support Arabic 7');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Nayiri Lousinian', 'Monday', 'Period 2', 'Support Arabic 7');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Nayiri Lousinian', 'Tuesday', 'Period 2', 'Pull out English 1');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Nayiri Lousinian', 'Wednesday', 'Period 2', 'Pull out Arabic 5');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Nayiri Lousinian', 'Thursday', 'Period 2', 'Pull out Arabic 5');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Nayiri Lousinian', 'Friday', 'Period 2', 'Pull out Arabic 6');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Nayiri Lousinian', 'Monday', 'Period 3', 'Pull out Arabic 5');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Nayiri Lousinian', 'Tuesday', 'Period 3', 'Pull out Arabic 7');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Nayiri Lousinian', 'Wednesday', 'Period 3', 'Pull out Arabic 5');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Nayiri Lousinian', 'Friday', 'Period 3', 'Pull out Arabic 5');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Nayiri Lousinian', 'Monday', 'Period 4', 'Support Arabic 6');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Nayiri Lousinian', 'Tuesday', 'Period 4', 'Support English 1/ Science 5');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Nayiri Lousinian', 'Wednesday', 'Period 4', 'coordination with Hamesd');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Nayiri Lousinian', 'Thursday', 'Period 4', 'Pull out Arabic 6');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Nayiri Lousinian', 'Friday', 'Period 4', 'Science 4');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Nayiri Lousinian', 'Tuesday', 'Period 5', 'Pull out Arabic 5');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Nayiri Lousinian', 'Wednesday', 'Period 5', 'Support Arabic 6');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Nayiri Lousinian', 'Thursday', 'Period 5', 'Science 3');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Nayiri Lousinian', 'Friday', 'Period 5', 'Support Arabic 6');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Nayiri Lousinian', 'Monday', 'Period 6', 'Science 6');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Nayiri Lousinian', 'Thursday', 'Period 6', 'Support English 1');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Nayiri Lousinian', 'Friday', 'Period 6', 'Support Arabic 7');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Nayiri Lousinian', 'Wednesday', 'Period 7', 'Science 1');

-- Ms. Carine Abaklian (24 slots)
DELETE FROM schedules WHERE teacher = 'Ms. Carine Abaklian';
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Carine Abaklian', 'Monday', 'Period 1', 'Support Arabic 4');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Carine Abaklian', 'Tuesday', 'Period 1', 'Support Arabic 4');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Carine Abaklian', 'Thursday', 'Period 1', 'Pull out Arabic 3');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Carine Abaklian', 'Friday', 'Period 1', 'Pull out Arabic 1');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Carine Abaklian', 'Tuesday', 'Period 2', 'Support Arabic 3');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Carine Abaklian', 'Wednesday', 'Period 2', 'Support Arabic 2');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Carine Abaklian', 'Thursday', 'Period 2', 'Pull out Arabic 1');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Carine Abaklian', 'Friday', 'Period 2', 'Support Arabic 3');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Carine Abaklian', 'Monday', 'Period 3', 'Pull out Arabic 3');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Carine Abaklian', 'Tuesday', 'Period 3', 'Support Arabic 2');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Carine Abaklian', 'Wednesday', 'Period 3', 'Support Arabic 1');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Carine Abaklian', 'Thursday', 'Period 3', 'Support Arabic 1');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Carine Abaklian', 'Friday', 'Period 3', 'Pull out Arabic 2');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Carine Abaklian', 'Monday', 'Period 4', 'Pull out Arabic 2');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Carine Abaklian', 'Wednesday', 'Period 4', 'Support Arabic 3');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Carine Abaklian', 'Friday', 'Period 4', 'coordination with Hamesd');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Carine Abaklian', 'Monday', 'Period 5', 'Support Arabic 2');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Carine Abaklian', 'Tuesday', 'Period 5', 'Support Arabic 1');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Carine Abaklian', 'Friday', 'Period 5', 'Support Arabic 2');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Carine Abaklian', 'Monday', 'Period 6', 'Support Arabic 1');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Carine Abaklian', 'Wednesday', 'Period 6', 'Support Arabic 4');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Carine Abaklian', 'Thursday', 'Period 6', 'Pull out Arabic 4');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Carine Abaklian', 'Friday', 'Period 6', 'Pull out Arabic 4');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Carine Abaklian', 'Wednesday', 'Period 7', 'Support Arabic 4');

-- Ms. Patil Kazanjian (15 slots)
DELETE FROM schedules WHERE teacher = 'Ms. Patil Kazanjian';
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Patil Kazanjian', 'Wednesday', 'Period 1', 'Pull out Math 5');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Patil Kazanjian', 'Thursday', 'Period 1', 'Support Math 4');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Patil Kazanjian', 'Friday', 'Period 1', 'Support Math 5');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Patil Kazanjian', 'Tuesday', 'Period 2', 'Support Math 4');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Patil Kazanjian', 'Thursday', 'Period 2', 'Pull out Math 6');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Patil Kazanjian', 'Tuesday', 'Period 3', 'Support Math 5');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Patil Kazanjian', 'Wednesday', 'Period 3', 'Pull out Math 6');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Patil Kazanjian', 'Thursday', 'Period 3', 'Support Math 6');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Patil Kazanjian', 'Friday', 'Period 3', 'Support Math 4');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Patil Kazanjian', 'Friday', 'Period 4', 'Pull out Math 5');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Patil Kazanjian', 'Thursday', 'Period 5', 'Support Math 5');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Patil Kazanjian', 'Friday', 'Period 5', 'Pull out Math 4');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Patil Kazanjian', 'Tuesday', 'Period 6', 'Support Math 6');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Patil Kazanjian', 'Friday', 'Period 6', 'Support Math 6');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Patil Kazanjian', 'Thursday', 'Period 7', 'coordination with Hamesd');

-- Ms. Melissa Mardikian (18 slots)
DELETE FROM schedules WHERE teacher = 'Ms. Melissa Mardikian';
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Melissa Mardikian', 'Monday', 'Period 1', 'Support Math 2');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Melissa Mardikian', 'Tuesday', 'Period 1', 'Support Math 2');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Melissa Mardikian', 'Wednesday', 'Period 1', 'Pull out Math 2');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Melissa Mardikian', 'Thursday', 'Period 1', 'Support Math 2');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Melissa Mardikian', 'Friday', 'Period 1', 'Support Math 3');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Melissa Mardikian', 'Monday', 'Period 2', 'Support Math 3');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Melissa Mardikian', 'Thursday', 'Period 2', 'coordination with Hamesd');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Melissa Mardikian', 'Friday', 'Period 2', 'Pull out Math 1');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Melissa Mardikian', 'Tuesday', 'Period 3', 'Pull out English 3');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Melissa Mardikian', 'Wednesday', 'Period 4', 'Support Math 1');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Melissa Mardikian', 'Thursday', 'Period 4', 'Support Math 1');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Melissa Mardikian', 'Monday', 'Period 5', 'Pull out Math 1');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Melissa Mardikian', 'Friday', 'Period 5', 'Support Math 1');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Melissa Mardikian', 'Monday', 'Period 6', 'Pull out Math 2');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Melissa Mardikian', 'Tuesday', 'Period 6', 'Support Math 3');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Melissa Mardikian', 'Wednesday', 'Period 6', 'Pull out Math 3');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Melissa Mardikian', 'Friday', 'Period 6', 'Pull out English 3');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Melissa Mardikian', 'Monday', 'Period 7', 'Pull out Math 3');

-- Ms. Hamesd Boyadjian (28 slots)
DELETE FROM schedules WHERE teacher = 'Ms. Hamesd Boyadjian';
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Hamesd Boyadjian', 'Monday', 'Period 1', 'Maria');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Hamesd Boyadjian', 'Tuesday', 'Period 1', 'Geography 9');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Hamesd Boyadjian', 'Thursday', 'Period 1', 'Varty');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Hamesd Boyadjian', 'Friday', 'Period 1', 'Grade 8
Support Arabic');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Hamesd Boyadjian', 'Monday', 'Period 2', 'History 9');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Hamesd Boyadjian', 'Wednesday', 'Period 2', 'Grade 5
Support Arabic');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Hamesd Boyadjian', 'Thursday', 'Period 2', 'Maria (Dzila)');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Hamesd Boyadjian', 'Friday', 'Period 2', 'TEST');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Hamesd Boyadjian', 'Monday', 'Period 3', 'Grade 5
Support Arabic');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Hamesd Boyadjian', 'Tuesday', 'Period 3', 'Civics 9');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Hamesd Boyadjian', 'Wednesday', 'Period 3', 'Marie-belle');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Hamesd Boyadjian', 'Thursday', 'Period 3', 'Pull out Arabic 5');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Hamesd Boyadjian', 'Friday', 'Period 3', 'Grades 5 or 9
Support Arabic');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Hamesd Boyadjian', 'Monday', 'Period 4', 'Grade 8
Support Arabic');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Hamesd Boyadjian', 'Tuesday', 'Period 4', 'Pull out Arabic 8');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Hamesd Boyadjian', 'Wednesday', 'Period 4', 'Nairie');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Hamesd Boyadjian', 'Thursday', 'Period 4', 'Grade 9
Support Arabic');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Hamesd Boyadjian', 'Friday', 'Period 4', 'Carine');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Hamesd Boyadjian', 'Wednesday', 'Period 5', 'Grade 9
Support Arabic');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Hamesd Boyadjian', 'Thursday', 'Period 5', 'TEST');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Hamesd Boyadjian', 'Monday', 'Period 6', 'Grade 9
Support Arabic');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Hamesd Boyadjian', 'Tuesday', 'Period 6', 'Pull out Arabic 5');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Hamesd Boyadjian', 'Wednesday', 'Period 6', 'Hagop');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Hamesd Boyadjian', 'Thursday', 'Period 6', 'Grade 8
Support Arabic');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Hamesd Boyadjian', 'Friday', 'Period 6', 'Christine');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Hamesd Boyadjian', 'Monday', 'Period 7', 'Grade 9
Support Arabic');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Hamesd Boyadjian', 'Thursday', 'Period 7', 'Patil');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Hamesd Boyadjian', 'Friday', 'Period 7', 'Melissa');

-- Mr. Hagop Chakmakian (20 slots)
DELETE FROM schedules WHERE teacher = 'Mr. Hagop Chakmakian';
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mr. Hagop Chakmakian', 'Monday', 'Period 1', 'Support Physics 9');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mr. Hagop Chakmakian', 'Wednesday', 'Period 1', 'Support Math 9');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mr. Hagop Chakmakian', 'Thursday', 'Period 1', 'Pull out Physics 8');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mr. Hagop Chakmakian', 'Friday', 'Period 1', 'Support Math 9');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mr. Hagop Chakmakian', 'Wednesday', 'Period 2', 'Support Math 9');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mr. Hagop Chakmakian', 'Thursday', 'Period 2', 'Support Math 9');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mr. Hagop Chakmakian', 'Monday', 'Period 3', 'Support Math 8');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mr. Hagop Chakmakian', 'Tuesday', 'Period 3', 'Pull out Math 9');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mr. Hagop Chakmakian', 'Wednesday', 'Period 3', 'Pull out Math 7');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mr. Hagop Chakmakian', 'Thursday', 'Period 3', 'Pull out Physics 7');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mr. Hagop Chakmakian', 'Friday', 'Period 3', 'Support Math 8');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mr. Hagop Chakmakian', 'Monday', 'Period 4', 'Support Physics 7');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mr. Hagop Chakmakian', 'Tuesday', 'Period 4', 'Support Math 7');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mr. Hagop Chakmakian', 'Wednesday', 'Period 4', 'Support Physics 8');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mr. Hagop Chakmakian', 'Friday', 'Period 4', 'Support Math 7');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mr. Hagop Chakmakian', 'Tuesday', 'Period 5', 'Support Math 8');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mr. Hagop Chakmakian', 'Wednesday', 'Period 5', 'Support Math 8');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mr. Hagop Chakmakian', 'Monday', 'Period 6', 'Support Math 7');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mr. Hagop Chakmakian', 'Wednesday', 'Period 6', 'Coordination with Hamesd');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Mr. Hagop Chakmakian', 'Thursday', 'Period 7', 'Pull out Physics 9');

-- ═══ KINDERGARTEN ═══
-- Ms. Rita Rizk (22 slots)
DELETE FROM schedules WHERE teacher = 'Ms. Rita Rizk';
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Rita Rizk', 'Tuesday', 'Period 2', 'KG 1 + assist Dzovag');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Rita Rizk', 'Friday', 'Period 2', 'KG 1 + assist Dzovag');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Rita Rizk', 'Monday', 'Period 3', 'KG3 (A)');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Rita Rizk', 'Tuesday', 'Period 3', 'KG 2');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Rita Rizk', 'Wednesday', 'Period 3', 'KG3 (A)');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Rita Rizk', 'Thursday', 'Period 3', 'KG 1 + assist Dzovag');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Rita Rizk', 'Friday', 'Period 3', 'KG3 (A)');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Rita Rizk', 'Monday', 'Period 4', 'KG3 (B)');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Rita Rizk', 'Tuesday', 'Period 4', 'KG3 (B)');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Rita Rizk', 'Wednesday', 'Period 4', 'KG3 (B)');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Rita Rizk', 'Thursday', 'Period 4', 'KG3 (B)');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Rita Rizk', 'Friday', 'Period 4', 'KG3 (A)');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Rita Rizk', 'Monday', 'Period 5', 'KG 2');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Rita Rizk', 'Wednesday', 'Period 5', 'KG 2');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Rita Rizk', 'Thursday', 'Period 5', 'Dance');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Rita Rizk', 'Friday', 'Period 5', 'KG3 (B)');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Rita Rizk', 'Tuesday', 'Period 6', 'KG 2');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Rita Rizk', 'Wednesday', 'Period 6', 'KG 2');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Rita Rizk', 'Friday', 'Period 6', 'KG3 (B)');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Rita Rizk', 'Monday', 'Period 7', 'KG 1 + assist Dzovag');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Rita Rizk', 'Tuesday', 'Period 7', 'KG3 (A)');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Rita Rizk', 'Thursday', 'Period 7', 'KG3 (A)');

-- Ms. Talar Kademian (21 slots)
DELETE FROM schedules WHERE teacher = 'Ms. Talar Kademian';
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Talar Kademian', 'Monday', 'Period 2', 'KG3 (B)');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Talar Kademian', 'Wednesday', 'Period 2', 'KG3 (B)');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Talar Kademian', 'Friday', 'Period 2', 'KG3 (B)');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Talar Kademian', 'Monday', 'Period 3', 'KG 2');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Talar Kademian', 'Tuesday', 'Period 3', 'KG 1');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Talar Kademian', 'Wednesday', 'Period 3', 'KG 2');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Talar Kademian', 'Friday', 'Period 3', 'KG 2');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Talar Kademian', 'Tuesday', 'Period 4', 'KG 2');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Talar Kademian', 'Thursday', 'Period 4', 'KG 2');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Talar Kademian', 'Friday', 'Period 4', 'KG 1 + assist Dzovag');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Talar Kademian', 'Monday', 'Period 5', 'KG3 (A)');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Talar Kademian', 'Wednesday', 'Period 5', 'KG 3(A)');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Talar Kademian', 'Thursday', 'Period 5', 'Dance');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Talar Kademian', 'Friday', 'Period 5', 'KG3 (A)');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Talar Kademian', 'Monday', 'Period 6', 'KG 1 + assist Dzovag');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Talar Kademian', 'Tuesday', 'Period 6', 'KG3 (B)');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Talar Kademian', 'Wednesday', 'Period 6', 'KG 1 + assist Dzovag');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Talar Kademian', 'Thursday', 'Period 6', 'KG3 (A)');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Talar Kademian', 'Friday', 'Period 6', 'KG 1');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Talar Kademian', 'Monday', 'Period 7', 'KG3 (A)');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Talar Kademian', 'Wednesday', 'Period 7', 'KG3 (B)');

-- Ms. Annie Boghossian (7 slots)
DELETE FROM schedules WHERE teacher = 'Ms. Annie Boghossian';
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Annie Boghossian', 'Monday', 'Period 2', 'KG 1 Ch Ed');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Annie Boghossian', 'Thursday', 'Period 2', 'KG 2 Ch. Ed');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Annie Boghossian', 'Tuesday', 'Period 4', 'PreKG');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Annie Boghossian', 'Tuesday', 'Period 5', 'KG 1 Playtime');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Annie Boghossian', 'Monday', 'Period 6', 'KG3 (A) Ch Ed');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Annie Boghossian', 'Monday', 'Period 7', 'KG3 (B) Ch. Ed');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Annie Boghossian', 'Tuesday', 'Period 7', 'KG 1 Storytelling');

-- Ms. Lena Nader (14 slots)
DELETE FROM schedules WHERE teacher = 'Ms. Lena Nader';
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Lena Nader', 'Monday', 'Period 2', 'KG 2');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Lena Nader', 'Tuesday', 'Period 2', 'KG 2');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Lena Nader', 'Friday', 'Period 2', 'KG 2');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Lena Nader', 'Monday', 'Period 4', 'KG 1');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Lena Nader', 'Wednesday', 'Period 4', 'PreKG');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Lena Nader', 'Thursday', 'Period 4', 'KG 1');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Lena Nader', 'Wednesday', 'Period 5', 'KG 1');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Lena Nader', 'Friday', 'Period 5', 'KG 1');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Lena Nader', 'Monday', 'Period 6', 'KG3 (B) Science');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Lena Nader', 'Tuesday', 'Period 6', 'KG3 (A) Science');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Lena Nader', 'Wednesday', 'Period 6', 'KG3 (A) Drama');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Lena Nader', 'Thursday', 'Period 6', 'KG 2');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Lena Nader', 'Friday', 'Period 6', 'KG2 Science + assist Jenni');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Lena Nader', 'Friday', 'Period 7', 'KG3 (B) Drama');

-- Ms. Caroline Oughourlian (17 slots)
DELETE FROM schedules WHERE teacher = 'Ms. Caroline Oughourlian';
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Caroline Oughourlian', 'Wednesday', 'Period 2', 'KG 1 Arm');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Caroline Oughourlian', 'Thursday', 'Period 3', 'Dance');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Caroline Oughourlian', 'Monday', 'Period 4', 'KG 2 Arm');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Caroline Oughourlian', 'Wednesday', 'Period 4', 'KG 1 Arm');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Caroline Oughourlian', 'Friday', 'Period 4', 'PreKG');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Caroline Oughourlian', 'Monday', 'Period 5', 'KG 1 Arm');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Caroline Oughourlian', 'Tuesday', 'Period 5', 'KG 2 Arm');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Caroline Oughourlian', 'Thursday', 'Period 5', 'KG 1 Arm');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Caroline Oughourlian', 'Friday', 'Period 5', 'KG 2 Arm');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Caroline Oughourlian', 'Tuesday', 'Period 6', 'KG 1 Sports');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Caroline Oughourlian', 'Wednesday', 'Period 6', 'KG3 (B) Sports');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Caroline Oughourlian', 'Thursday', 'Period 6', 'KG 1 Arm');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Caroline Oughourlian', 'Monday', 'Period 7', 'KG 2 Arm. Storytelling');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Caroline Oughourlian', 'Tuesday', 'Period 7', 'KG 2 Sports');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Caroline Oughourlian', 'Wednesday', 'Period 7', 'KG3 (A) Sports');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Caroline Oughourlian', 'Thursday', 'Period 7', 'KG 2 Arm');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Caroline Oughourlian', 'Friday', 'Period 7', 'KG 2 Arm');

-- Ms. Dzovag Aynilian (18 slots)
DELETE FROM schedules WHERE teacher = 'Ms. Dzovag Aynilian';
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Dzovag Aynilian', 'Tuesday', 'Period 2', 'KG 1 assist Arabic');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Dzovag Aynilian', 'Wednesday', 'Period 2', 'KG 2 Robotics');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Dzovag Aynilian', 'Thursday', 'Period 2', 'Dance + assist Jenny');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Dzovag Aynilian', 'Friday', 'Period 2', 'KG 1 assist Arabic');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Dzovag Aynilian', 'Wednesday', 'Period 3', 'KG 1 Bible');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Dzovag Aynilian', 'Thursday', 'Period 3', 'KG 1 assist Arabic');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Dzovag Aynilian', 'Wednesday', 'Period 4', 'KG 2 Bible');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Dzovag Aynilian', 'Friday', 'Period 4', 'KG 1 assist Math');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Dzovag Aynilian', 'Tuesday', 'Period 5', 'KG3 (A) Bible');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Dzovag Aynilian', 'Monday', 'Period 6', 'KG 1 assist Math');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Dzovag Aynilian', 'Wednesday', 'Period 6', 'KG 1 assist Math');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Dzovag Aynilian', 'Thursday', 'Period 6', 'KG3 (B) Bible');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Dzovag Aynilian', 'Friday', 'Period 6', 'KG3 (A) Robotics');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Dzovag Aynilian', 'Monday', 'Period 7', 'KG 1 assist Arabic');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Dzovag Aynilian', 'Tuesday', 'Period 7', 'KG3(B) Robotics');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Dzovag Aynilian', 'Wednesday', 'Period 7', 'KG 1 Playtime');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Dzovag Aynilian', 'Thursday', 'Period 7', 'KG 1 Science');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Dzovag Aynilian', 'Friday', 'Period 7', 'KG 1 Robotics');

-- Ms. Jennifer Degermenjian (10 slots)
DELETE FROM schedules WHERE teacher = 'Ms. Jennifer Degermenjian';
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Jennifer Degermenjian', 'Thursday', 'Period 2', 'Assist KG 1 dance');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Jennifer Degermenjian', 'Monday', 'Period 3', 'KG 1 Craft');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Jennifer Degermenjian', 'Friday', 'Period 3', 'KG 1 Mov''t');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Jennifer Degermenjian', 'Monday', 'Period 4', 'PreKG');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Jennifer Degermenjian', 'Thursday', 'Period 4', 'PreKG');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Jennifer Degermenjian', 'Friday', 'Period 5', 'KG 2 Craft');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Jennifer Degermenjian', 'Monday', 'Period 6', 'KG 2 Mov''t');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Jennifer Degermenjian', 'Friday', 'Period 6', 'Assist KG 2 Eng');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Jennifer Degermenjian', 'Thursday', 'Period 7', 'KG3 (A) Craft');
INSERT INTO schedules (teacher, day, period, class) VALUES ('Ms. Jennifer Degermenjian', 'Friday', 'Period 7', 'KG3 (B) Craft');

-- Ms. Caroline Oughourlian additional slots from Carole singing
INSERT OR IGNORE INTO schedules (teacher, day, period, class) VALUES ('Ms. Caroline Oughourlian', 'Tuesday', 'Period 2', 'KG3 (B)');
INSERT OR IGNORE INTO schedules (teacher, day, period, class) VALUES ('Ms. Caroline Oughourlian', 'Thursday', 'Period 2', 'KG3 (B)');
INSERT OR IGNORE INTO schedules (teacher, day, period, class) VALUES ('Ms. Caroline Oughourlian', 'Tuesday', 'Period 3', 'KG3 (A)');
INSERT OR IGNORE INTO schedules (teacher, day, period, class) VALUES ('Ms. Caroline Oughourlian', 'Thursday', 'Period 3', 'KG3 (A)');
INSERT OR IGNORE INTO schedules (teacher, day, period, class) VALUES ('Ms. Caroline Oughourlian', 'Tuesday', 'Period 4', 'KG 1');
INSERT OR IGNORE INTO schedules (teacher, day, period, class) VALUES ('Ms. Caroline Oughourlian', 'Thursday', 'Period 5', 'KG 2');

COMMIT;