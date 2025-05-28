import React, { useState, useEffect, useMemo } from 'react';
import axios, { isAxiosError, AxiosError } from 'axios';
import {
  Box, Typography, CircularProgress, Alert, Paper,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Grid, Avatar, Stack, IconButton, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogActions, Button
} from '@mui/material';
import {
  School,
  Person,
  Email,
  Phone,
  Groups,
  Assessment // Đảm bảo Assessment được import cho các phần mới
} from '@mui/icons-material';

// Interface cho thông tin lớp học
interface ClassInfo {
  id: number;
  name: string;
  grade: number;
  school_year: string;
  teacher_id: number | null;
  created_at: string;
  updated_at: string;
}

// Interface cho thông tin giáo viên
interface Teacher {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  gender?: string;
  subject?: string;
  created_at: string;
  updated_at: string;
}

// Interface cho thông tin học sinh
interface Student {
  id: number;
  name: string;
  email?: string;
  birthday?: string;
  phone?: string;
  gender?: string;
  address?: string;
  student_code?: string;
  class_id: number;
  user_id?: number;
  created_at: string;
  updated_at: string;
}

// Interface cho response từ API my-class
interface MyClassResponse {
  message: string;
  data: ClassInfo;
}

// Interface cho response từ API classes/{id}/students
interface ClassDetailsResponse {
  id: number;
  name: string;
  grade: number;
  school_year: string;
  teacher_id: number | null;
  updated_at: string;
  students: Student[];
  teacher: Teacher | null;
}

// Interface cho điểm số
interface Score {
  id: number;
  student_id: number;
  subject_id?: number;
  subject?: {
    id: number;
    name: string;
  } | null;
  subject_name?: string;
  // Fallback for subject name if subject object is null
  type: string;
  score: number | string;
  semester?: string;
  year?: string;
}

// Interface cho loại điểm
interface ScoreType {
  value: string;
  label: string;
}

const Dashboard: React.FC = () => {
  const [classInfo, setClassInfo] = useState<ClassInfo | null>(null);
  const [classDetails, setClassDetails] = useState<ClassDetailsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  // States cho Dialog xem điểm
  const [openScoreDialog, setOpenScoreDialog] = useState(false);
  const [currentStudentForScores, setCurrentStudentForScores] = useState<Student | null>(null);
  const [scores, setScores] = useState<Score[]>([]);
  const [loadingScores, setLoadingScores] = useState<boolean>(false);
  const [scoreError, setScoreError] = useState<string | null>(null);
  const [studentAverageScore, setStudentAverageScore] = useState<number | null>(null);
  const [studentPerformanceCategory, setStudentPerformanceCategory] = useState<string>('Đang tính...');
  // NEW STATES for Class Statistics
  const [classPerformanceSummary, setClassPerformanceSummary] = useState<Record<string, number> | null>(null);
  const [classSubjectAverageScores, setClassSubjectAverageScores] = useState<Record<string, number> | null>(null);
  const [allStudentsScores, setAllStudentsScores] = useState<Map<number, Score[]>>(new Map());
  // Map studentId to their scores
  const [loadingClassStats, setLoadingClassStats] = useState<boolean>(false);
  const [classStatsError, setClassStatsError] = useState<string | null>(null);
  // Danh sách cố định các môn học
  const allPossibleSubjects = useMemo(() => [
    'Toán',
    'Vật Lý',
    'Hóa học',
    'Ngữ Văn',
    'Lịch Sử',
    'Địa Lí',
    'Tiếng Anh',
    'Giáo dục công dân',
    'Công nghệ',
    'Giáo dục quốc phòng',
    'Giáo dục thể chất',
    'Tin học'
  ], []);
  // Định nghĩa các loại điểm
  const scoreTypes: ScoreType[] = useMemo(() => [
    { value: 'oral', label: 'Điểm miệng' },
    { value: '15min', label: 'Điểm 15 phút' },
    { value: '45min', label: 'Điểm 45 phút' },
    { value: 'mid1', label: 'Giữa kỳ 1' },
    { value: 'final1', label: 'Cuối kỳ 1' },
    { value: 'mid2', label: 'Giữa kỳ 2' },
    { value: 'final2', label: 'Cuối kỳ 2' },
  ], []);
  // Thêm state chọn học kỳ cho Dialog xem điểm
  const [selectedSemester, setSelectedSemester] = useState<string>('1');
  // Hàm tính điểm trung bình và xếp loại cho MỘT HỌC SINH
  const calculateAverageAndCategory = (scores: Score[]): { average: number |
    null; category: string } => {
    if (!scores || scores.length === 0) {
      return { average: null, category: 'Chưa có điểm' };
    }

    const validScores = scores.filter(score =>
      score.score !== null && score.score !== undefined && !isNaN(parseFloat(score.score as any)) && isFinite(parseFloat(score.score as any))
    );
    if (validScores.length === 0) {
      return { average: null, category: 'Không có điểm hợp lệ' };
    }

    const totalScore = validScores.reduce((sum, score) => sum + (parseFloat(score.score as any) || 0), 0);
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

  // Hàm tính thống kê học lực và điểm trung bình từng môn của CẢ LỚP
  const calculateClassStatistics = (
    students: Student[],
    allScores: Map<number, Score[]>,
    allSubjects: string[] // Thêm tham số này để có danh sách tất cả các môn
  ) => {
    if (!students || students.length === 0) {
      setClassPerformanceSummary({});
      // Khởi tạo tất cả các môn với điểm NaN để biểu thị "chưa có dữ liệu"
      const initialSubjectAverages: Record<string, number> = {};
      allSubjects.forEach(subject => {
        initialSubjectAverages[subject] = NaN;
      });
      setClassSubjectAverageScores(initialSubjectAverages);
      return;
    }

    const performanceCounts: Record<string, number> = {
      'Giỏi': 0,
      'Khá': 0,
      'Trung bình': 0,
      'Yếu': 0,
      'Kém': 0,
      'Chưa có điểm': 0,
    };
    const subjectScores: Record<string, { total: number; count: number }> = {};
    // Khởi tạo subjectScores với tất cả các môn từ allSubjects
    allSubjects.forEach(subjectName => {
        subjectScores[subjectName] = { total: 0, count: 0 };
    });
    students.forEach(student => {
      const studentScores = allScores.get(student.id);
      if (studentScores && studentScores.length > 0) {
        const { category } = calculateAverageAndCategory(studentScores); // Use existing function for individual student
        performanceCounts[category]++;

        studentScores.forEach(score => {
          const subjectName = score.subject?.name || score.subject_name; // Prioritize subject.name, then subject_name
          if (subjectName && score.score !== null && score.score !==
            undefined && !isNaN(parseFloat(score.score as any)) && isFinite(parseFloat(score.score as any))) {
            const parsedScore = parseFloat(score.score as any);
            if (!subjectScores[subjectName]) { // Đảm bảo môn học đã được khởi tạo
              subjectScores[subjectName] = { total: 0, count: 0 };
            }
            subjectScores[subjectName].total += parsedScore;

            subjectScores[subjectName].count += 1;
          }
        });
      } else {
        performanceCounts['Chưa có điểm']++;
      }
    });
    const averageScoresBySubject: Record<string, number> = {};
    // Lặp qua tất cả các môn có thể có, không chỉ những môn có điểm
    allSubjects.forEach(subjectName => {
      const data = subjectScores[subjectName];
      if (data && data.count > 0) { // Kiểm tra data có tồn tại và có điểm
        averageScoresBySubject[subjectName] = parseFloat((data.total / data.count).toFixed(2));
      } else {
        averageScoresBySubject[subjectName] = NaN; // Đặt là NaN để biểu thị không có điểm

      }
    });
    setClassPerformanceSummary(performanceCounts);
    setClassSubjectAverageScores(averageScoresBySubject);
  };
  // Hàm lấy token từ localStorage
  const getToken = (): string |
    null => {
    return localStorage.getItem('token');
  };

  // Hàm tạo axios config với token
  const getAxiosConfig = () => {
    const token = getToken();
    return {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };
  };

  // Fetch scores for a single student (used by dialog)
  const fetchStudentScores = async (studentId: number) => {
    if (!studentId) return;
    setLoadingScores(true);
    setScoreError(null);
    setStudentAverageScore(null);
    setStudentPerformanceCategory('Đang tính...');

    try {
      const token = getToken();
      if (!token) {
        throw new Error('Không tìm thấy token xác thực.');
      }

      const response = await axios.get<Score[]>(`http://localhost:8000/api/scores/${studentId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const scoresData = Array.isArray(response.data) ? response.data : [];
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

  // Handlers cho Dialog xem điểm
  const handleOpenScoreDialog = (student: Student) => {
    setCurrentStudentForScores(student);
    setScores([]);
    setScoreError(null);
    // Use the already fetched scores from allStudentsScores if available,
    // otherwise fetch them (this might be redundant if allScores are always fetched initially)
    const studentScores = allStudentsScores.get(student.id);
    if (studentScores) {
      setScores(studentScores);
      const { average, category } = calculateAverageAndCategory(studentScores);
      setStudentAverageScore(average);
      setStudentPerformanceCategory(category);
      setOpenScoreDialog(true);
    } else {
      // Fallback: If for some reason scores aren't in allStudentsScores, fetch them
      fetchStudentScores(student.id);
      setOpenScoreDialog(true);
    }
  };

  const handleCloseScoreDialog = () => {
    setOpenScoreDialog(false);
    setCurrentStudentForScores(null);
    setScores([]);
    setScoreError(null);
    setStudentAverageScore(null);
    setStudentPerformanceCategory('Chưa có điểm');
  };

  // Sửa lại logic tổ chức điểm theo môn và loại điểm, có lọc theo học kỳ
  const scoresBySubjectForDisplay = useMemo(() => {
    const organized: { [subjectName: string]: { [scoreType: string]: Score } } = {};
    scores
      .filter(score => String(score.semester || '1') === selectedSemester)
      .forEach(score => {
        const subjectName = score.subject?.name || score.subject_name || 'Không rõ môn';
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
  }, [scores, selectedSemester]);
  useEffect(() => {
    const fetchClassInfoAndAllScores = async () => {
      setLoading(true);
      setError(null);
      setLoadingClassStats(true); // Set loading for class stats as well
      setClassStatsError(null);

      try {
        const token = getToken();
        if (!token) {
          setError('Bạn chưa đăng nhập hoặc không có token.');
          setLoading(false);

          setLoadingClassStats(false);
          return;
        }

        // Bước 1: Lấy thông tin lớp của học sinh đang đăng nhập
        const myClassResponse = await axios.get<MyClassResponse>(
          'http://localhost:8000/api/my-class',
          getAxiosConfig()
        );

        const myClass = myClassResponse.data.data;

        setClassInfo(myClass);

        // Bước 2: Lấy chi tiết lớp học bao gồm danh sách học sinh và giáo viên
        const classDetailsResponse = await axios.get<ClassDetailsResponse>(
          `http://localhost:8000/api/classes/${myClass.id}/students`,
          getAxiosConfig()
        );
        setClassDetails(classDetailsResponse.data);

        // Bước 3: Lấy điểm số cho TẤT CẢ học sinh trong lớp để tính toán thống kê
        const classStudents = classDetailsResponse.data.students;
        if (classStudents.length > 0) {
          const studentScoresMap = new Map<number, Score[]>();
          const fetchPromises = classStudents.map(async (student) => {
            try {
              const response = await axios.get<Score[]>(
                `http://localhost:8000/api/scores/${student.id}`,
                { headers: { Authorization: `Bearer ${token}` } }
              );

              studentScoresMap.set(student.id, Array.isArray(response.data) ? response.data : []);
            } catch (innerErr) {
              console.warn(`Could not fetch scores for student ${student.name} (ID: ${student.id}):`, innerErr);
              studentScoresMap.set(student.id, []); // Store empty array on error
            }
          });
          await Promise.all(fetchPromises);
          setAllStudentsScores(studentScoresMap);
          calculateClassStatistics(classStudents, studentScoresMap, allPossibleSubjects); // Truyền danh sách tất cả các môn
        } else {
          // No students, no stats to calculate
          setClassPerformanceSummary({});
          // Khởi tạo tất cả các môn với điểm NaN khi không có học sinh
          const initialSubjectAverages: Record<string, number> = {};
          allPossibleSubjects.forEach(subject => {
            initialSubjectAverages[subject] = NaN; // Dùng NaN để biểu thị "không có dữ liệu"
          });
          setClassSubjectAverageScores(initialSubjectAverages);
          setAllStudentsScores(new Map());
        }

        setError(null);
        setClassStatsError(null);
      } catch (err) {
        handleApiError(err);
        setClassPerformanceSummary(null);
        setClassSubjectAverageScores(null);
        setAllStudentsScores(new Map());
        setClassStatsError("Lỗi khi tải hoặc tính toán thống kê lớp học.");
      } finally {
        setLoading(false);
        setLoadingClassStats(false);
      }
    };

    fetchClassInfoAndAllScores();
  }, [allPossibleSubjects]);
  // Thêm allPossibleSubjects vào dependency array

  // Hàm xử lý lỗi API
  const handleApiError = (err: unknown) => {
    if (isAxiosError(err)) {
      const axiosError = err as AxiosError;
      if (axiosError.response) {
        const errorMessage = (axiosError.response.data as any)?.message ||
          'Có lỗi xảy ra khi tải thông tin.';
        setError(errorMessage);
      } else if (axiosError.request) {
        setError('Không có phản hồi từ server. Vui lòng kiểm tra kết nối mạng.');
      } else {
        setError('Lỗi request: ' + axiosError.message);
      }
    } else {
      setError('Lỗi không xác định: ' + (err as Error).message);
    }
  };

  // Component Loading (overall)
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh" sx={{ backgroundColor: '#21222D' }}>
        <CircularProgress sx={{ color: '#e0e0e0' }} />
        <Typography variant="h6" sx={{ ml: 2, color: '#e0e0e0' }}>
          Đang tải thông tin lớp học...
        </Typography>
      </Box>
    );
  }

  // Component Error (overall)
  if (error) {
    return (
      <Box sx={{ p: 3, backgroundColor: '#21222D', minHeight: '100vh' }}>
        <Alert severity="error">
          <Typography variant="h6">Lỗi tải dữ liệu</Typography>
          <Typography>{error}</Typography>
        </Alert>
      </Box>
    );
  }

  // Component No Data
  if (!classInfo || !classDetails) {
    return (
      <Box sx={{ p: 3, backgroundColor: '#21222D', minHeight: '100vh' }}>
        <Alert severity="info">
          <Typography variant="h6">Không có dữ liệu</Typography>
          <Typography>Không tìm thấy thông tin lớp học cho tài khoản của bạn.</Typography>
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, backgroundColor: '#21222D', minHeight: '100vh' }}>
      {/* Header */}
      <Typography variant="h4" component="h1" gutterBottom sx={{
        color: '#ffffff',
        mb: 4,
        fontWeight: 'bold',
        textAlign: 'center'
      }}>
        Dashboard - Lớp học của tôi
      </Typography>


      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Grid container spacing={4}>
            {/* Phần Thông tin lớp học */}
            <Grid item xs={12} md={12}>
              <Paper elevation={6} sx={{
                p: 3,

                borderRadius: '12px',
                backgroundColor: '#2d2e3a',
                boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                height: 'fit-content'
              }}>
                <Box sx={{

                  display: 'flex',
                  alignItems: 'center',
                  mb: 2,
                  pb: 1,
                  borderBottom: '1px solid #404155'

                }}>
                  <School color="primary" sx={{ mr: 1, fontSize: 30 }} />
                  <Typography variant="h5" component="h2" sx={{
                    fontWeight: 'bold',
                    color: 'primary.main'

                  }}>
                    Thông tin Lớp học
                  </Typography>
                </Box>

                <TableContainer>

                  <Table size="small">
                    <TableBody>
                      <TableRow>
                        <TableCell sx={{
                          fontWeight:
                            'bold',
                          color: '#b0b3c7',
                          borderBottom: 'none',
                          width: '40%'

                        }}>
                          Tên lớp:
                        </TableCell>
                        <TableCell sx={{ borderBottom: 'none', color: '#ffffff' }}>

                          {classDetails.name}
                        </TableCell>
                      </TableRow>
                      <TableRow>

                        <TableCell sx={{
                          fontWeight: 'bold',
                          color: '#b0b3c7',
                          borderBottom: 'none'

                        }}>
                          Khối:
                        </TableCell>
                        <TableCell sx={{ borderBottom: 'none', color: '#ffffff' }}>
                        {classDetails.grade}
                        </TableCell>
                      </TableRow>
                      <TableRow>

                        <TableCell sx={{
                          fontWeight: 'bold',
                          color: '#b0b3c7',
                          borderBottom: 'none'

                        }}>
                          Niên Khóa:
                        </TableCell>
                        <TableCell sx={{ borderBottom: 'none', color: '#ffffff' }}>

                          {classDetails.school_year}
                        </TableCell>
                      </TableRow>
                      <TableRow>

                        <TableCell sx={{
                          fontWeight: 'bold',
                          color: '#b0b3c7',
                          borderBottom: 'none'

                        }}>
                          Sĩ số:
                        </TableCell>
                        <TableCell sx={{ borderBottom: 'none', color:
                            '#ffffff' }}>
                          {classDetails.students.length} học sinh
                        </TableCell>
                      </TableRow>
                    </TableBody>

                  </Table>
                </TableContainer>
              </Paper>
            </Grid>

            {/* Phần Thông tin giáo viên chủ nhiệm */}
            <Grid item xs={12} md={12}>

              <Paper elevation={6} sx={{
                p: 3,
                borderRadius: '12px',
                backgroundColor: '#2d2e3a',
                boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                height: 'fit-content'

              }}>
                <Box sx={{
                  display: 'flex',
                  alignItems: 'center',
                  mb: 2,

                  pb: 1,
                  borderBottom: '1px solid #404155'
                }}>
                  <Person color="secondary" sx={{ mr: 1, fontSize: 30 }} />
                  <Typography variant="h5" component="h2" sx={{

                    fontWeight: 'bold',
                    color: 'secondary.main'
                  }}>
                    Giáo viên chủ nhiệm
                  </Typography>

                </Box>

                {classDetails.teacher ?
                  (
                    <Stack direction="row" spacing={3} alignItems="center">
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1, color: '#ffffff' }}>
                          {classDetails.teacher.name}
                        </Typography>

                        <Stack spacing={0.5}>
                          {classDetails.teacher.email && (
                            <Stack direction="row" alignItems="center" spacing={2}>
                              <Email sx={{ fontSize: 18, color: '#b0b3c7' }} />
                              <Typography variant="body2" color="#ffffff">{classDetails.teacher.email}</Typography>
                            </Stack>

                          )}
                          {classDetails.teacher.phone && (
                            <Stack sx={{marginTop:'3px'}} direction="row" alignItems="center" spacing={2}>
                              <Phone sx={{
                                fontSize: 18, color: '#b0b3c7' }} />
                              <Typography variant="body2" color="#ffffff">{classDetails.teacher.phone}</Typography>
                            </Stack>
                          )}

                        </Stack>
                      </Box>
                    </Stack>
                  ) : (
                    <Typography variant="body1" color="#ffffff">Lớp học hiện chưa có giáo viên chủ nhiệm.</Typography>
                  )}
              </Paper>
            </Grid>

            {/* Phần Thống kê học lực của lớp */}
            <Grid item xs={12} md={12}>
              <Paper elevation={6} sx={{

                p: 3,
                borderRadius: '12px',
                backgroundColor: '#2d2e3a',
                boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                height: 'fit-content'
              }}>

                <Box sx={{
                  display: 'flex',
                  alignItems: 'center',
                  mb: 2,
                  pb: 1,
                  borderBottom: '1px solid #404155'
                }}>
                  <Assessment color="info" sx={{ mr: 1, fontSize: 30 }} />
                  <Typography variant="h5" component="h2" sx={{
                    fontWeight: 'bold',

                    color: 'info.main'
                  }}>
                    Thống kê học lực của lớp
                  </Typography>
                </Box>
                {loadingClassStats
                  ? (
                    <Box display="flex" justifyContent="center" alignItems="center" py={2}>
                      <CircularProgress size={24} sx={{ color: '#e0e0e0' }} />
                      <Typography sx={{ ml: 1, color: '#e0e0e0' }}>Đang tính toán...</Typography>
                    </Box>

                  ) : classStatsError ?
                    (
                      <Alert severity="error">{classStatsError}</Alert>
                    ) : (
                      <TableContainer>
                        <Table size="small">
                          <TableBody>

                            {['Giỏi', 'Khá', 'Trung bình', 'Yếu', 'Kém', 'Chưa có điểm'].map((category) => {
                              const count = classPerformanceSummary?.[category] || 0;
                              const totalStudents = classDetails?.students?.length || 0;

                              const percentage = totalStudents > 0 ? ((count / totalStudents) * 100).toFixed(1) : (0).toFixed(1);

                              return (
                                <TableRow key={category}>

                                  <TableCell sx={{ fontWeight: 'bold', color: '#b0b3c7', borderBottom: 'none' }}>
                                    {category}:
                                  </TableCell>

                                  <TableCell sx={{ color: '#ffffff', borderBottom: 'none' }}>
                                    {count} học sinh ({percentage}%)
                                  </TableCell>

                                </TableRow>
                              );
                            })}
                            {classDetails.students.length === 0 && (
                              <TableRow>
                                <TableCell colSpan={2} sx={{ color: '#ffffff', borderBottom: 'none' }}>

                                  Lớp chưa có học sinh để thống kê.
                                </TableCell>
                              </TableRow>

                            )}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    )}
              </Paper>

            </Grid>
          </Grid>
        </Grid>

        <Grid sx={{marginTop: '15px'}} item xs={12} md={6}>
          <Paper elevation={6} sx={{
            p: 3,
            borderRadius: '12px',
            backgroundColor: '#2d2e3a',

            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
            height: 'fit-content'
          }}>
            <Box sx={{
              display: 'flex',
              alignItems: 'center',
              mb: 2,

              pb: 1,
              borderBottom: '1px solid #404155'
            }}>
              <Assessment color="warning" sx={{ mr: 1, fontSize: 30 }} />
              <Typography variant="h5" component="h2" sx={{
                fontWeight: 'bold',

                color: 'warning.main'
              }}>
                Điểm trung bình từng môn của lớp
              </Typography>
            </Box>
            {loadingClassStats ?
              (
                <Box display="flex" justifyContent="center" alignItems="center" py={2}>
                  <CircularProgress size={24} sx={{ color: '#e0e0e0' }} />
                  <Typography sx={{ ml: 1, color: '#e0e0e0' }}>Đang tính toán...</Typography>
                </Box>
              ) : classStatsError ?
                (
                  <Alert severity="error">{classStatsError}</Alert>
                ) : (
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{
                          backgroundColor: '#404155' }}>
                          <TableCell sx={{ fontWeight: 'bold', color: '#ffffff' }}>Môn học</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 'bold', color: '#ffffff' }}>Điểm TB</TableCell>
                        </TableRow>
                      </TableHead>

                      <TableBody>
                        {allPossibleSubjects
                          .sort((a, b) => a.localeCompare(b, 'vi', { sensitivity: 'base' }))
                          .map((subject) => {

                            const averageScore = classSubjectAverageScores?.[subject];
                            return (
                              <TableRow key={subject}>
                                <TableCell
                                  sx={{ color: '#ffffff' }}>{subject}</TableCell>
                                <TableCell align="right" sx={{ color: '#ffffff' }}>
                                  {averageScore !== undefined && !isNaN(averageScore) ?
                                    averageScore.toFixed(2) : "---"}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        {classDetails.students.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={2} sx={{ color: '#ffffff', borderBottom: 'none' }}>

                              Lớp chưa có học sinh để thống kê điểm môn học.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>

                    </Table>
                  </TableContainer>
                )}
          </Paper>
        </Grid>
      </Grid>

      {/* Danh sách học sinh */}
      <Box sx={{ mt: 4 }}>
        <Paper elevation={6} sx={{

          p: 3,
          borderRadius: '12px',
          backgroundColor: '#2d2e3a',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
        }}>
          <Box sx={{
            display: 'flex',
            alignItems: 'center',
            mb:
              2,
            pb: 1,
            borderBottom: '1px solid #404155'
          }}>
            <Groups color="success" sx={{ mr: 1, fontSize: 30 }} />
            <Typography variant="h5" component="h2" sx={{
              fontWeight: 'bold',

              color: 'success.main'
            }}>
              Danh sách học sinh trong lớp {classDetails.name}
            </Typography>
          </Box>

          {classDetails.students.length > 0 ?
            (
              <TableContainer>
                <Table aria-label="students table">
                  <TableHead sx={{ backgroundColor: '#404155' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold', color: '#ffffff' }}>STT</TableCell>

                      <TableCell sx={{ fontWeight: 'bold', color: '#ffffff' }}>ID</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', color: '#ffffff' }}>Họ và tên</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', color: '#ffffff' }}>Ngày sinh</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', color: '#ffffff' }}>Giới
                        Tính</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', color: '#ffffff' }}>Email</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', color: '#ffffff' }}>Số điện thoại</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', color: '#ffffff' }}>Địa chỉ</TableCell>

                      <TableCell sx={{ fontWeight: 'bold', color: '#ffffff' }}>Điểm</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {classDetails.students
                      .slice() // Create a shallow copy to avoid modifying the original array
                      .sort((a, b) => {
                        // Function to parse a Vietnamese name into components
                        const parseVietnameseName = (fullName: string) => {
                          const parts = fullName.split(' ').filter(p => p.length > 0);
                          if (parts.length === 0) return { lastName: '', middleName: '', firstName: '' };
                          if (parts.length === 1) return { lastName: '', middleName: '', firstName: parts[0] };

                          const firstName = parts[parts.length - 1];
                          const lastName = parts[0];
                          const middleName = parts.slice(1, parts.length - 1).join(' ');
                          return { lastName, middleName, firstName };
                        };

                        const nameA = parseVietnameseName(a.name);
                        const nameB = parseVietnameseName(b.name);

                        // Compare by last name
                        let comparison = nameA.lastName.localeCompare(nameB.lastName, 'vi', { sensitivity: 'base' });
                        if (comparison !== 0) return comparison;

                        // If last names are the same, compare by middle name
                        comparison = nameA.middleName.localeCompare(nameB.middleName, 'vi', { sensitivity: 'base' });
                        if (comparison !== 0) return comparison;

                        // If middle names are the same, compare by first name
                        return nameA.firstName.localeCompare(nameB.firstName, 'vi', { sensitivity: 'base' });
                      })
                      .map((student, index) => (
                        <TableRow

                          key={student.id}
                          sx={{ '&:nth-of-type(odd)': { backgroundColor: '#353648' } }}
                        >
                          <TableCell sx={{ color: '#ffffff' }}>{index + 1}</TableCell>

                          <TableCell sx={{ color: '#ffffff' }}>
                            {student.student_code ||
                              `${student.id.toString()}`}
                          </TableCell>
                          <TableCell>
                            <Stack direction="row" alignItems="center" spacing={2}>
                              <Typography fontWeight="medium" color="#ffffff">

                                {student.name}
                              </Typography>
                            </Stack>

                          </TableCell>

                          <TableCell sx={{ color: '#ffffff' }}>
                            {student.birthday
                              ?
                              new Date(student.birthday).toLocaleDateString('vi-VN')
                              : '-'
                            }
                          </TableCell>
                          <TableCell sx={{ color: '#ffffff'
                          }}>{student.gender || '-'}</TableCell>
                          <TableCell sx={{ color: '#ffffff' }}>{student.email ||
                            '-'}</TableCell>
                          <TableCell sx={{ color: '#ffffff' }}>{student.phone ||
                            '-'}</TableCell>
                          <TableCell sx={{ color: '#ffffff' }}>{student.address ||
                            '-'}</TableCell>
                          <TableCell>
                            <Tooltip title="Xem điểm">
                              <IconButton
                                color="info"
                                size="small"
                                onClick={() => handleOpenScoreDialog(student)}
                                sx={{ color: '#e0e0e0' }}
                              >
                                <Assessment fontSize="small" />
                              </IconButton>
                              </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </TableContainer>

            ) : (
              <Alert severity="info" sx={{ mt: 2 }}>
                <Typography>Chưa có học sinh nào trong lớp này.</Typography>
              </Alert>
            )}
          </Paper>
        </Box>

        {/* Dialog xem điểm */}
        <Dialog open={openScoreDialog} onClose={handleCloseScoreDialog} maxWidth="lg" fullWidth>
          <DialogTitle sx={{
            bgcolor: '#21222d',
            color: '#FFFFFF',
            borderBottom: '1px solid #3a3c4b',
            pb: 2,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',

          }}>
            <Box>Điểm số của học sinh: {currentStudentForScores?.name ||
              ''}</Box>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              {/* Nút chọn học kỳ */}
              <Box sx={{ ml: 2 }}>
                <Button
                  variant={selectedSemester === '1' ? 'contained' : 'outlined'}
                  size="small"
                  sx={{ mr: 1, minWidth: 90, bgcolor: selectedSemester === '1' ? '#7e57c2' : undefined, color: '#fff' }}
                  onClick={() => setSelectedSemester('1')}
                >
                  Học kỳ 1
                </Button>
                <Button
                  variant={selectedSemester === '2' ? 'contained' : 'outlined'}
                  size="small"
                  sx={{ minWidth: 90, bgcolor: selectedSemester === '2' ? '#7e57c2' : undefined, color: '#fff' }}
                  onClick={() => setSelectedSemester('2')}
                >
                  Học kỳ 2
                </Button>
              </Box>
              {loadingScores && <CircularProgress size={20} sx={{ ml: 2, color: '#e0e0e0' }} />}
            </Box>
          </DialogTitle>

          <DialogContent sx={{
            bgcolor: '#21222d',
            color: '#e0e0e0',
            pt: 2,

          }}>
            {scoreError ?
              (
                <Alert severity="error">{scoreError}</Alert>
              ) : scores.length === 0 && !loadingScores ?
                (
                  <Typography>Không tìm thấy điểm số chi tiết cho học sinh này.</Typography>
                ) : (
                  <>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: '#e0e0e0' }}>

                        Điểm trung bình: {studentAverageScore !== null ? studentAverageScore.toFixed(2) : '---'}
                      </Typography>
                      <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: '#e0e0e0' }}>
                        Học lực: {studentPerformanceCategory || '---'}
                      </Typography>

                    </Box>

                    <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #3a3c4b', borderRadius: '8px', overflow: 'hidden', bgcolor: '#21222d' }}>
                      <Table size="small" sx={{ '& .MuiTableCell-root': { borderBottom: '1px solid #4f5263', color: '#e0e0e0' } }}>
                        <TableHead>
                          <TableRow sx={{ backgroundColor: '#31323d' }}>
                            <TableCell sx={{ fontWeight: 'bold', color: '#FFFFFF' }}>Môn học</TableCell>
                            {scoreTypes.filter(st =>
                              (selectedSemester === '1' && ['oral', '15min', '45min', 'mid1', 'final1'].includes(st.value)) ||
                              (selectedSemester === '2' && ['oral', '15min', '45min', 'mid2', 'final2'].includes(st.value))
                            ).map(type => (
                              <TableCell key={type.value} align="center" sx={{ fontWeight: 'bold', color: '#FFFFFF' }}>{type.label}</TableCell>
                            ))}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {allPossibleSubjects
                            .sort((a, b) => a.localeCompare(b, 'vi', { sensitivity: 'base' }))
                            .map((subjectName) => {
                              return (
                                <TableRow key={subjectName} hover sx={{ '&:hover': { backgroundColor: '#2a2b37' } }}>
                                  <TableCell sx={{ color: '#e0e0e0' }}>{subjectName}</TableCell>
                                  {scoreTypes.filter(st =>
                                    (selectedSemester === '1' && ['oral', '15min', '45min', 'mid1', 'final1'].includes(st.value)) ||
                                    (selectedSemester === '2' && ['oral', '15min', '45min', 'mid2', 'final2'].includes(st.value))
                                  ).map(type => {
                                    const allScores = scores.filter(score =>
                                      (score.subject?.name || score.subject_name || 'Không rõ môn') === subjectName &&
                                      score.type === type.value &&
                                      String(score.semester || '1') === selectedSemester
                                    );
                                    return (
                                      <TableCell key={type.value} align="center" sx={{ color: '#e0e0e0' }}>
                                        {allScores.length > 0 ? (
                                          <Stack direction="column" spacing={0.5} justifyContent="center" alignItems="center">
                                            {allScores.map((scoreEntry, idx) => (
                                              <Typography key={scoreEntry.id || idx} variant="body2" sx={{ color: '#e0e0e0', textAlign: 'center' }}>{scoreEntry.score}</Typography>
                                            ))}
                                          </Stack>
                                        ) : (
                                          <Typography variant="body2" sx={{ color: '#bdbdbd', textAlign: 'center' }}>---</Typography>
                                        )}
                                      </TableCell>
                                    );
                                  })}
                                </TableRow>
                              );
                            })}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </>
                )}
          </DialogContent>

          <DialogActions sx={{
            bgcolor: '#21222d',

            borderTop: '1px solid #3a3c4b',
            pt: 2,
          }}>
            <Button onClick={handleCloseScoreDialog}>Đóng</Button>
          </DialogActions>
        </Dialog>
      </Box>
    );
  };

export default Dashboard;