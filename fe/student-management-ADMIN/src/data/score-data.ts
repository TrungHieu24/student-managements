interface ScoreData {
  id: number;
  subject_name: string;
  semester: string;
  year: string;
  type: 'mid1' | 'final1' | 'mid2' | 'final2';
  score: number;
}
