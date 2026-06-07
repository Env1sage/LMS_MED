export const ACADEMIC_YEAR_OPTIONS = [
  { value: 'YEAR_1', label: 'Year 1' },
  { value: 'YEAR_2', label: 'Year 2' },
  { value: 'YEAR_3_PART1', label: 'Year 3 Part 1' },
  { value: 'YEAR_3_PART2', label: 'Year 3 Part 2' },
  { value: 'INTERNSHIP', label: 'Internship' },
] as const;

export type AcademicYearValue = typeof ACADEMIC_YEAR_OPTIONS[number]['value'];

// Legacy values from old data — map to canonical display labels
export const ACADEMIC_YEAR_LABELS: Record<string, string> = {
  YEAR_1: 'Year 1',
  YEAR_2: 'Year 2',
  YEAR_3_PART1: 'Year 3 Part 1',
  YEAR_3_PART2: 'Year 3 Part 2',
  INTERNSHIP: 'Internship',
  // Legacy mappings so existing DB data still displays correctly
  FIRST_YEAR: 'Year 1',
  SECOND_YEAR: 'Year 2',
  YEAR_3_MINOR: 'Year 3 Part 1',
  YEAR_3_MAJOR: 'Year 3 Part 2',
  THIRD_YEAR: 'Year 3 Part 1',
  FOURTH_YEAR: 'Year 3 Part 2',
  FIFTH_YEAR: 'Internship',
  PART_1: 'Year 3 Part 1',
  PART_2: 'Year 3 Part 2',
};

export const formatAcademicYear = (value: string | undefined | null): string => {
  if (!value) return '';
  return ACADEMIC_YEAR_LABELS[value] || value.replace(/_/g, ' ');
};
