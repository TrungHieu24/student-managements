// StudentManagement.tsx
import React, { useState, useEffect, useMemo } from 'react';
import axios, { isAxiosError, AxiosError } from 'axios';
import dayjs from 'dayjs';
import {
  Box, Typography, CircularProgress, Alert, Paper, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Stack,
  Tooltip, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Button
} from '@mui/material';

import AssessmentIcon from '@mui/icons-material/Assessment';
import 'dayjs/locale/vi';
dayjs.locale('vi');

interface User {
  id: number;
  name: string;
  email: string;
  email_verified_at?: string | null;
  password?: string;
  is_first_login: boolean;
  remember_token?: string | null;
  created_at: string | null;
  updated_at: string | null;
  avatar?: string | null;
  role: 'USER';
}

interface Student extends User {
  gender: string;
  birthday: string | null;
  phone: string | null;
  address: string | null;
  class_id?: number;
  class_name?: string;
    class?: {
    id: number;
    name: string;
    grade?: number;
  } | null;
}

interface Score {
  id: number;
  student_id: number;
  subject_id?: number;
  subject?: {
    id: number;
    name: string;
  } | null;
  subject_name?: string;
  type: string;
  score: number | string;
  semester?: string;
  year?: string;
}

interface ScoreType {
  value: string;
  label: string;
}


// API Service
const API_URL = 'http://localhost:8000/api';

const debugApiCall = (method: string, url: string, data?: any) => {
  console.log(`🔄 API ${method} request to: ${url}`);
  if (data) console.log('📦 Data:', data);
};

class StudentService {
  static async getToken(): Promise<string> {
    // In a real app without a login component, you might get the token differently
    // or handle authentication upstream. Keeping localStorage for demonstration.
    const token = localStorage.getItem('token') || '';
    console.log('🔑 Current token:', token ? `${token.substring(0, 15)}...` : 'No token');
    return token;
  }

  static getHeaders = async () => {
    const token = await this.getToken();
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
  }

  static async getAllStudents(): Promise<Student[]> {
    try {
      debugApiCall('GET', `${API_URL}/students`);
      const headers = await this.getHeaders();
      const response = await axios.get(`${API_URL}/students`, { headers });
      console.log('📊 Students data received:', response.data);

      if (response.data.data && Array.isArray(response.data.data)) {
        return response.data.data as Student[];
      } else if (Array.isArray(response.data)) {
        return response.data as Student[];
      } else {
        console.warn('⚠️ Unexpected response format:', response.data);
        return [];
      }
    } catch (error) {
      console.error('❌ Error fetching students:', error);
      throw error;
    }
  }

    static async getStudentScores(studentId: number): Promise<Score[]> {
        try {
            debugApiCall('GET', `${API_URL}/scores/${studentId}`);
            const headers = await this.getHeaders();
            const response = await axios.get(`${API_URL}/scores/${studentId}`, { headers });
            console.log(`📊 Scores data received for student ${studentId}:`, response.data);

            if (response.data.data && Array.isArray(response.data.data)) {
                return response.data.data as Score[];
            } else if (Array.isArray(response.data)) {
                 return response.data as Score[];
            } else {
                 console.warn('⚠️ Unexpected score response format:', response.data);
                 return [];
            }

        } catch (error) {
            console.error(`❌ Error fetching scores for student ${studentId}:`, error);
            if (isAxiosError(error) && error.response?.status === 404) {
                console.log(`No scores found for student ${studentId}.`);
                return [];
            }
            throw error;
        }
    }
}

const formatBirthday = (birthday: string | null | undefined) => {
  if (!birthday) return 'N/A';
  try {
    const date = dayjs(birthday);
    if (date.isValid()) {
      return date.format('DD/MM/YYYY');
    } else {
      return birthday;
    }
  } catch (e) {
    console.error("Error formatting birthday:", e);
    return birthday;
  }
};

const calculateAverageAndCategory = (scores: Score[]): { average: number | null; category: string } => {
  if (!scores || scores.length === 0) {
    return { average: null, category: 'Chưa có điểm' };
  }

  const validScores = scores.filter(score =>
        score.score !== null && score.score !== undefined && !isNaN(parseFloat(score.score as any)) && isFinite(parseFloat(score.score as any))
  );

  if (validScores.length === 0) {
        return { average: null, category: 'Không có điểm hợp lệ' };
  }

  const scoresAsNumbers = validScores.map(score => parseFloat(score.score as any));

  const totalScore = scoresAsNumbers.reduce((sum, score) => sum + score, 0);
  const average = totalScore / validScores.length;

  let category = '';
  if (average >= 8.0) {
    category = 'Giỏi';
  } else if (average >= 6.5) {
    category = 'Khá';
  } else if (average >= 5.0) {
    category = 'Trung bình';
  } else if (average >= 3.5) {
    category = 'Yếu';
  } else {
    category = 'Kém';
  }

  const roundedAverage = parseFloat(average.toFixed(2));

  return { average: roundedAverage, category };
};

const scoreTypes: ScoreType[] = [
    { value: 'mid1', label: 'Giữa kỳ 1' },
    { value: 'final1', label: 'Cuối kỳ 1' },
    { value: 'mid2', label: 'Giữa kỳ 2' },
    { value: 'final2', label: 'Cuối kỳ 2' },
];


// Main Component (formerly StudentList)
const StudentManagement: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  // States for Score Dialog
  const [openScoreDialog, setOpenScoreDialog] = useState(false);
  const [currentStudentForScores, setCurrentStudentForScores] = useState<Student | null>(null);
  const [scores, setScores] = useState<Score[]>([]);
  const [loadingScores, setLoadingScores] = useState<boolean>(false);
  const [scoreError, setScoreError] = useState<string | null>(null);
  const [studentAverageScore, setStudentAverageScore] = useState<number | null>(null);
  const [studentPerformanceCategory, setStudentPerformanceCategory] = useState<string>('Đang tính...');


  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      // Ensure token is set in headers before fetching students
      const token = localStorage.getItem('token');
      if (token) {
         axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      } else {
          // Handle case where token is missing if needed
          setError('Authentication token is missing. Cannot fetch students.');
          setLoading(false);
          return;
      }

      const data = await StudentService.getAllStudents();
      setStudents(data);
      setError('');
    } catch (err) {
      setError('Failed to fetch students. Please try again later.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentScores = async (studentId: number) => {
    if (!studentId) return;
    setLoadingScores(true);
    setScoreError(null);
    setStudentAverageScore(null);
    setStudentPerformanceCategory('Đang tính...');
    try {
      // Ensure token is set in headers before fetching scores
       const token = localStorage.getItem('token');
      if (token) {
         axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      } else {
          // Handle case where token is missing if needed
           setScoreError('Authentication token is missing. Cannot fetch scores.');
           setLoadingScores(false);
           return;
      }

      const scoresData = await StudentService.getStudentScores(studentId);
      setScores(scoresData);

      const { average, category } = calculateAverageAndCategory(scoresData);
      setStudentAverageScore(average);
      setStudentPerformanceCategory(category);
    } catch (err: any) {
      console.error("Error fetching student scores:", err.response?.data || err.message || err);
      if (isAxiosError(err) && err.response) {
        const axiosError = err as AxiosError<any>;
        if (axiosError.response?.status === 404) {
          setScores([]);
          setScoreError('Không tìm thấy điểm số cho học sinh này.');
          setStudentAverageScore(null);
          setStudentPerformanceCategory('Chưa có điểm');
        } else {
          setScoreError(axiosError.response?.data?.message || 'Lỗi khi tải điểm số.');
          setStudentPerformanceCategory('Lỗi tải điểm');
        }
      } else {
        setScoreError('Lỗi không xác định khi tải điểm.');
        setStudentPerformanceCategory('Lỗi tải điểm');
      }
      setScores([]);
    } finally {
      setLoadingScores(false);
    }
  };

    const handleOpenScoreDialog = (student: Student) => {
        setCurrentStudentForScores(student);
        setScores([]);
        setScoreError(null);
        fetchStudentScores(student.id);
        setOpenScoreDialog(true);
    };

    const handleCloseScoreDialog = () => {
        setOpenScoreDialog(false);
        setCurrentStudentForScores(null);
        setScores([]);
        setScoreError(null);
        setStudentAverageScore(null);
        setStudentPerformanceCategory('Chưa có điểm');
    };

    const scoresBySubjectForDisplay = useMemo(() => {
         const organized: { [subjectName: string]: { [scoreType: string]: Score } } = {};

         scores.forEach(score => {
             const subjectName = score.subject?.name || score.subject_name || (typeof score.subject === 'string' ? score.subject : 'Không rõ môn');
             if (!organized[subjectName]) {
                 organized[subjectName] = {};
             }
             organized[subjectName][score.type] = score;
         });

         const sortedSubjectNames = Object.keys(organized).sort((a, b) => a.localeCompare(b, 'vi', { sensitivity: 'base' }));
         const sortedOrganized: { [subjectName: string]: { [scoreType: string]: Score } } = {};
         sortedSubjectNames.forEach(name => {
             sortedOrganized[name] = organized[name];
         });

         return sortedOrganized;

    }, [scores]);


  return (
      // Sử dụng Box làm container chính, đảm bảo width: '100%' và maxWidth: 'none'
    <Box sx={{ width: '100%', maxWidth: 'none', paddingY: 3, paddingX: 3, bgcolor: '#f4f4f4', minHeight: 'calc(100vh - 640px)' }}>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Paper elevation={2} sx={{ borderRadius: '8px', overflow: 'hidden', width: '100%', maxWidth: 'none' }}> {/* Đảm bảo Paper cũng lấy hết chiều rộng và không bị giới hạn */}
          <TableContainer> {/* TableContainer sẽ mở rộng trong Paper */}
            <Table size="small">
              <TableHead sx={{ bgcolor: '#e0e0e0' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>ID</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Họ và Tên</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Ngày Sinh</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Giới tính</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Email</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Số Điện Thoại</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Địa Chỉ</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}>Thao Tác</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {students.length > 0 ? (
                  students.map((student) => (
                    <TableRow key={student.id} hover>
                      <TableCell>{student.id}</TableCell>
                      <TableCell>{student.name}</TableCell>
                      <TableCell>{formatBirthday(student.birthday)}</TableCell>
                      <TableCell>{student.gender || '-'}</TableCell>
                      <TableCell>{student.email}</TableCell>
                      <TableCell>{student.phone || '-'}</TableCell>
                      <TableCell>{student.address || '-'}</TableCell>

                      <TableCell align="center">
                        <Stack direction="row" spacing={0.5} justifyContent="center">
                          <Tooltip title="Xem điểm">
                            <IconButton
                                size="small"
                                onClick={() => handleOpenScoreDialog(student)}
                                color="info"
                            >
                              <AssessmentIcon fontSize="small" />
                                {/* Hoặc icon mắt: <RemoveRedEyeIcon fontSize="small" /> */}
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      Không có học sinh nào trong hệ thống
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* Dialog để xem điểm của học sinh */}
      <Dialog open={openScoreDialog} onClose={handleCloseScoreDialog} maxWidth="md" fullWidth>
           <DialogTitle sx={{ bgcolor: '#1976d2', color: '#fff', pb: 2 }}>
                Điểm số của học sinh: {currentStudentForScores?.name || ''}
           </DialogTitle>
           <DialogContent dividers>
               {loadingScores ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                      <CircularProgress size={24} />
                  </Box>
               ) : scoreError ? (
                  <Alert severity="error">{scoreError}</Alert>
               ) : scores.length === 0 && !loadingScores && !scoreError ? ( // Explicitly check conditions for no scores found
                   <Typography>Không tìm thấy điểm số chi tiết cho học sinh này.</Typography>
               ) : (
                   <>
                       <Box sx={{ mb: 2 }}>
                           <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                               Điểm trung bình: {studentAverageScore !== null ? studentAverageScore.toFixed(2) : 'N/A'}
                           </Typography>
                            <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                                Học lực: {studentPerformanceCategory || 'N/A'}
                           </Typography>
                       </Box>

                       {Object.keys(scoresBySubjectForDisplay).length > 0 ? (
                           <TableContainer component={Paper} elevation={0}>
                                <Table size="small">
                                    <TableHead sx={{ bgcolor: '#e0e0e0' }}>
                                        <TableRow>
                                            <TableCell sx={{ fontWeight: 'bold' }}>Môn học</TableCell>
                                             {scoreTypes.map(type => (
                                                 <TableCell key={type.value} align="right" sx={{ fontWeight: 'bold' }}>{type.label}</TableCell>
                                            ))}
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                            {Object.entries(scoresBySubjectForDisplay).map(([subjectName, scoresOfType]) => (
                                                <TableRow key={subjectName}>
                                                    <TableCell>{subjectName}</TableCell>
                                                     {scoreTypes.map(type => {
                                                        const scoreEntry = scoresOfType[type.value];
                                                         return (
                                                             <TableCell key={type.value} align="right">
                                                                 {scoreEntry ? scoreEntry.score : '-'}
                                                             </TableCell>
                                                         );
                                                     })}
                                                </TableRow>
                                            ))}
                                    </TableBody>
                                </Table>
                           </TableContainer>
                       ) : (
                            <Typography variant="body2" color="textSecondary" sx={{ mt: 2, fontStyle: 'italic' }}>
                                Không tìm thấy điểm chi tiết theo môn.
                            </Typography>
                       )}
                   </>
               )}
           </DialogContent>
           <DialogActions>
               <Button onClick={handleCloseScoreDialog}>Đóng</Button>
           </DialogActions>
      </Dialog>

    </Box>
  );
};

export default StudentManagement;