# AECHS Source vs Live Schedule Audit

- Audit date: 2026-04-09T07:37:15.972Z
- Academic year: 2025-2026
- Source workbook: knowledge\staff_schedules.xlsx
- Exact source names tracked: 70

## Summary

- Exact-match teachers/staff with timed source rows missing in live DB: 0
- Exact-match source presence-note profiles missing operational mapping: 2
- Source names not found in live people table: 8
- Current live review-queue profiles checked against source: 1

## Exact Teaching Rows Missing In Live DB

- None

## Presence-Only Source Profiles Missing Operational Mapping

- Mr. Gregoire Toranian | role=psychologist | live_schedule_rows=0 | live_presence=Mon,Tue,Wed,Thu,Fri 08:00-14:00 | source_note=KG Special Dept Coordinator / Psychologist
- Ms. Rozette Al Haddad | role=coordinator | live_schedule_rows=0 | live_presence=Mon,Tue,Wed,Thu,Fri 08:00-14:00 | source_note=Arabic Subject Coordinator — presence days unconfirmed

## Source Names Missing From Live People Table

- Miss Alik Stanboulian | teaching_rows=8 | candidates=Alik Stanboulian | contacts=Miss Alik Stanboulian | Nurse + Teacher | 79/121772 | American Program Health Education | Health Education (AP) Grades 7-12 | 232379323023423@lid | Also school nurse | Part-time | Also school nurse — not always in class
- Miss Barig Barsoumian | teaching_rows=0 | candidates=Barig Barsoumian | contacts=Miss Barig Barsoumian | Accountant | 70/606774 / 04/411784 | Office |  |  | Accountant | Full-time | Full-time office staff — present all week
- Ms. Ani Boghossian | teaching_rows=7 | candidates=Ms. Ani Manougian | contacts=Ms. Ani Boghossian | Teacher | 79/314188 | KG Special Department | Child Education Pre-KG KG1 KG2 KG3 | Story Telling KG1 | Playtime KG1 | 157397800722677@lid |  | Part-time | On campus: Mon 08:00–14:00 | Tue 08:00–14:00 | Thu 08:00–14:00. NOT present Wed or Fri.
- Ms. Caroline Missisian | teaching_rows=17 | candidates=Mrs. Caroline Mississian; Ms. Caroline Oughourlian | contacts=Ms. Caroline Missisian | Teacher | 70/591319 | KG | Armenian Pre-KG KG1 KG2 | Sports KG1 KG2 KG3 | 229626299338981@lid |  | Full-time | 
- Ms. Haverj Kojaoghlanian | teaching_rows=10 | candidates=Ms. Haverj Shekherdemian | contacts=Ms. Haverj Kojaoghlanian | Psychologist | 03/817251 | American Program + Counsellor + Elementary | Armenian Grade 4 | Psychology (AP) Grades 7-10 12SE |  | Also known as Haverj Shekherdemian | Part-time | Comes specific days — verify schedule
- Ms. Heghnar | teaching_rows=0 | candidates=none | contacts=Ms. Heghnar | Teacher |  | Elementary | Robotics Grades 1-6 |  | Elementary Robotics teacher | Part-time | On campus: Thu only, all day 08:00–14:00
- Ms. Houry Ohanian | teaching_rows=0 | candidates=Mrs. Houry Ohanian; Ms. Houry Kevorkian | contacts=Ms. Houry Ohanian | Head of Department | 03/635479 / 01/878790 | KG |  | 61933529088184@lid | KG Department Head | Full-time | KG HoD — administrative role
- Ms. Nayiri Kazdjian | teaching_rows=5 | candidates=Ms. Nayiri Israbian; Ms. Nayiri Lousinian | contacts=Ms. Nayiri Kazdjian | Teacher | 03/372569 | KG | PRE-KG Homeroom | 221852274307227@lid | Also listed as Nayiri Israbian in KG schedule files | Full-time | 

## Review Queue Classification

- Ms. Rozette Al Haddad | source-backed presence/admin note | note=Arabic Subject Coordinator — presence days unconfirmed | live_presence=Mon,Tue,Wed,Thu,Fri 08:00-14:00

## Recommendations

- Import timed rows from `staff_schedules.xlsx` for exact-match gaps before editing people manually.
- Add an alias map for names that changed between source files and live people records, especially `Ms. Nayiri Kazdjian` -> `Ms. Nayiri Israbian` if confirmed.
- Convert source presence notes into explicit campus-period mappings for office/admin/coordinator profiles that do not teach periods.
- Do not infer classroom availability for profiles with only note-based presence. They need explicit operational treatment.
