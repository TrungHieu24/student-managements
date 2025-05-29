import React, { useEffect, useState } from 'react';
import axios, { isAxiosError, AxiosError } from 'axios';
import {
    Box,
    Typography,
    CircularProgress,
    Alert,
    Grid,
    Paper,
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
    Divider,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Stack,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Tooltip,
    IconButton,
} from '@mui/material';
import SchoolIcon from '@mui/icons-material/School';
import AssessmentIcon from '@mui/icons-material/Assessment';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import { useTranslation } from 'react-i18next';

interface TeacherDataNested {
    id: number;
    name: string;
}

interface ClassData {
    id: number;
    name: string;
    grade: number;
    school_year?: string;
    created_at?: string;
    updated_at?: string;
    teacher_id?: number | null;
    teacher?: TeacherDataNested | null;
}

interface Student {
    id: number;
    name: string;
    gender: string;
    birthday: string;
    email: string;
    phone: string;
    address: string;
    class_id: number;
    created_at?: string;
    updated_at?: string;
}

interface ClassWithStudents extends ClassData {
    students: Student[];
}

interface ClassesByGrade {
    [key: number]: ClassData[];
}

interface PaginatedResponse {
    data: ClassData[];
    meta?: {
        current_page: number;
        last_page: number;
        total: number;
        [key: string]: any;
    };
}

interface ScoreData {
  id: number;
  student_id: number;
  subject_id?: number;
  subject?: string;
  subject_name?: string;
  score: number;
  type: string;
  semester?: string;
  year?: string;
}

interface SubjectData {
    id: number;
    name: string;
}

interface ClassSubjectAverageResponse {
    message: string;
    class_id: number;
    class_name: string;
    average_subject_scores: ClassSubjectAverage[];
}

interface ClassSubjectAverage {
    subject_name: string;
    average_score: string;
}

interface ClassPerformanceSummary {
    class_id: number;
    class_name: string;
    performance_summary: {
        "Giỏi": number;
        "Khá": number;
        "Trung bình": number;
        "Yếu": number;
        "Chưa xếp loại"?: number;
    };
}


const scoreTypes = [
  { value: 'oral', label: 'Điểm miệng' },
  { value: '15min', label: 'Điểm 15 phút' },
  { value: '45min', label: 'Điểm 45 phút' },
  { value: 'mid1', label: 'Giữa Kỳ 1' },
  { value: 'final1', label: 'Cuối Kỳ 1' },
  { value: 'mid2', label: 'Giữa Kỳ 2' },
  { value: 'final2', label: 'Cuối Kỳ 2' },
];

const calculateAverageAndCategory = (scores: ScoreData[]): { average: number | null; category: string } => {
    if (!scores || scores.length === 0) {
        return { average: null, category: 'Chưa có điểm' };
    }

    const validScores = scores.filter(score => !isNaN(parseFloat(score.score as any)));

    if (validScores.length === 0) {
         return { average: null, category: 'Không có điểm hợp lệ' };
    }

    const totalScore = validScores.reduce((sum, score) => sum + (parseFloat(score.score as any) || 0), 0);
    const average = totalScore / validScores.length;

    let category = '';
    if (average >= 8) {
        category = 'Giỏi';
    } else if (average >= 6.5) {
        category = 'Khá';
    } else if (average >= 5) {
        category = 'Trung bình';
    } else {
        category = 'Yếu';
    }

    const roundedAverage = parseFloat(average.toFixed(2));

    return { average: roundedAverage, category };
};

const sortVietnameseNames = (a: Student, b: Student): number => {
    const nameA = a.name.trim().toLowerCase();
    const nameB = b.name.trim().toLowerCase();

    const partsA = nameA.split(' ');
    const partsB = nameB.split(' ');

    const lastNameA = partsA.pop() || '';
    const lastNameB = partsB.pop() || '';

    const lastNameCompare = lastNameA.localeCompare(lastNameB, 'vi', { sensitivity: 'base' });

    if (lastNameCompare !== 0) {
        return lastNameCompare;
    }

    const middleNameA = partsA.join(' ');
    const middleNameB = partsB.join(' ');

    const middleNameCompare = middleNameA.localeCompare(middleNameB, 'vi', { sensitivity: 'base' });

    if (middleNameCompare !== 0) {
        return middleNameCompare;
    }

    const firstNameA = partsA.shift() || '';
    const firstNameB = partsB.shift() || '';

    return firstNameA.localeCompare(firstNameB, 'vi', { sensitivity: 'base' });
};

const getGenderKey = (gender: string | null): string => {
    if (!gender) return 'other';
    const genderMap: { [key: string]: string } = {
        'Nam': 'male',
        'Nữ': 'female',
        'Male': 'male',
        'Female': 'female',
        'Other': 'other',
        'Khác': 'other'
    };
    return genderMap[gender] || 'other';
};

const ListClass: React.FC = () => {
    const { t } = useTranslation();
    const [classesByGrade, setClassesByGrade] = useState<ClassesByGrade>({});
    const [selectedClass, setSelectedClass] = useState<ClassWithStudents | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [loadingStudents, setLoadingStudents] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [studentsError, setStudentsError] = useState<string | null>(null);

    const [openScoreDialog, setOpenScoreDialog] = useState(false);
    const [currentStudentForScores, setCurrentStudentForScores] = useState<Student | null>(null);
    const [scores, setScores] = useState<ScoreData[]>([]);
    const [loadingScores, setLoadingScores] = useState(false);
    const [scoreError, setScoreError] = useState<string | null>(null);
    const [subjects, setSubjects] = useState<SubjectData[]>([]);
    const [loadingSubjects, setLoadingSubjects] = useState(false);
    const [subjectError, setSubjectError] = useState<string | null>(null);

    const [studentAverageScore, setStudentAverageScore] = useState<number | null>(null);
    const [studentPerformanceCategory, setStudentPerformanceCategory] = useState<string>('Chưa có điểm');

    const [classSubjectAverages, setClassSubjectAverages] = useState<ClassSubjectAverage[]>([]);
    const [loadingClassAverages, setLoadingClassAverages] = useState<boolean>(false);
    const [classAveragesError, setClassAveragesError] = useState<string | null>(null);

    const [classPerformanceSummary, setClassPerformanceSummary] = useState<ClassPerformanceSummary | null>(null);
    const [loadingPerformanceSummary, setLoadingPerformanceSummary] = useState<boolean>(false);
    const [performanceSummaryError, setPerformanceSummaryError] = useState<string | null>(null);

    const [selectedSemester, setSelectedSemester] = useState<string>('1');

    const fetchClasses = async () => {
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get<ClassData[] | PaginatedResponse>('http://localhost:8000/api/classes', {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            let classesData: ClassData[] = [];
            if (Array.isArray(res.data)) {
                classesData = res.data;
            } else if ('data' in res.data && Array.isArray(res.data.data)) {
                classesData = res.data.data;
            } else {
                console.error('Unexpected API response structure:', res.data);
                throw new Error('Định dạng dữ liệu lớp trả về không đúng');
            }

            const groupedClasses: ClassesByGrade = {};
            classesData.forEach(cls => {
                if (!groupedClasses[cls.grade]) {
                    groupedClasses[cls.grade] = [];
                }
                groupedClasses[cls.grade].push(cls);
            });

            const sortedGrades = Object.keys(groupedClasses).sort((a, b) => Number(a) - Number(b));
            const sortedGroupedClasses: ClassesByGrade = {};
            sortedGrades.forEach(grade => {
                sortedGroupedClasses[Number(grade)] = groupedClasses[Number(grade)].sort((a, b) =>
                    a.name.localeCompare(b.name, 'vi', { numeric: true })
                );
            });

            setClassesByGrade(sortedGroupedClasses);
        } catch (err: any) {
            console.error('API Error fetching classes:', err);
            if (axios.isAxiosError(err)) {
                 const axiosError = err as AxiosError<any>;
                 setError(axiosError.response?.data?.message || 'Lỗi khi tải danh sách lớp học');
            } else {
                setError('Lỗi khi tải danh sách lớp học');
            }
        } finally {
            setLoading(false);
        }
    };

    const fetchClassDataAndAverages = async (classId: number) => {
        setLoadingStudents(true);
        setLoadingClassAverages(true);
        setLoadingPerformanceSummary(true);
        setStudentsError(null);
        setClassAveragesError(null);
        setPerformanceSummaryError(null);
        setSelectedClass(null);
        setClassSubjectAverages([]);
        setClassPerformanceSummary(null);


        try {
            const token = localStorage.getItem('token');
            if (!token) {
                const authError = 'Bạn cần đăng nhập để xem thông tin lớp và điểm.';
                setStudentsError(authError);
                setClassAveragesError(authError);
                setPerformanceSummaryError(authError);
                setLoadingStudents(false);
                setLoadingClassAverages(false);
                setLoadingPerformanceSummary(false);
                return;
            }

            const [classRes, classAveragesRes, performanceSummaryRes] = await Promise.all([
                axios.get<ClassWithStudents>(`http://localhost:8000/api/classes/${classId}/students`, {
                    headers: { Authorization: `Bearer ${token}` },
                }),
                axios.get<ClassSubjectAverageResponse>(`http://localhost:8000/api/classes/${classId}/average-subject-scores`, {
                    headers: { Authorization: `Bearer ${token}` },
                }),
                axios.get<ClassPerformanceSummary>(`http://localhost:8000/api/classes/${classId}/performance-summary`, {
                     headers: { Authorization: `Bearer ${token}` },
                }),
            ]);

            const sortedStudents = classRes.data.students.sort(sortVietnameseNames);
            setSelectedClass({...classRes.data, students: sortedStudents });
            setLoadingStudents(false);


            const averagesData = Array.isArray(classAveragesRes.data.average_subject_scores)
                                 ? classAveragesRes.data.average_subject_scores
                                 : [];
            setClassSubjectAverages(averagesData);
            setLoadingClassAverages(false);

            if (performanceSummaryRes.data && performanceSummaryRes.data.performance_summary) {
                 setClassPerformanceSummary(performanceSummaryRes.data);
            } else {
                 setPerformanceSummaryError('Không có dữ liệu thống kê học lực cho lớp này.');
                 setClassPerformanceSummary(null);
            }
            setLoadingPerformanceSummary(false);


        } catch (err: any) {
            console.error('API Error fetching class data, averages, or performance summary:', err);
            if (axios.isAxiosError(err)) {
                const axiosError = err as AxiosError<any>;
                const errorMessage = axiosError.response?.data?.message || axiosError.message;

                if (axiosError.config?.url?.includes(`/api/classes/${classId}/students`)) {
                     setStudentsError(`Lỗi khi tải thông tin lớp: ${errorMessage}`);
                }

                if (axiosError.config?.url?.includes('/average-subject-scores')) {
                     if (axiosError.response?.status !== 200) {
                         setClassAveragesError(`Lỗi khi tải điểm trung bình môn của lớp: ${errorMessage}`);
                     } else {
                         setClassSubjectAverages([]);
                         setClassAveragesError('Không có dữ liệu điểm trung bình môn cho lớp này.');
                     }
                }

                 if (axiosError.config?.url?.includes('/performance-summary')) {
                     if (axiosError.response?.status === 404) {
                        setPerformanceSummaryError('Không có dữ liệu thống kê học lực cho lớp này.');
                     } else {
                        setPerformanceSummaryError(`Lỗi khi tải thống kê học lực của lớp: ${errorMessage}`);
                     }
                 }


                 if (axiosError.response?.status === 401) {
                    const authError = 'Phiên đăng nhập hết hạn hoặc bạn không có quyền truy cập. Vui lòng đăng nhập lại.';
                    setStudentsError(authError);
                    setClassAveragesError(authError);
                    setPerformanceSummaryError(authError);
                 }

            } else {
                const unknownError = 'Lỗi không xác định khi tải dữ liệu lớp, điểm trung bình hoặc thống kê học lực.';
                setStudentsError(unknownError);
                setClassAveragesError(unknownError);
                setPerformanceSummaryError(unknownError);
            }
            setSelectedClass(null);
            setClassSubjectAverages([]);
            setClassPerformanceSummary(null);
            setLoadingStudents(false);
            setLoadingClassAverages(false);
            setLoadingPerformanceSummary(false);
        }
    };

    const fetchSubjects = async () => {
        if (subjects.length > 0) return;
        setLoadingSubjects(true);
        setSubjectError(null);
        try {
          const token = localStorage.getItem('token');
          if (!token) {
            setSubjectError('Lỗi xác thực khi tải môn học.');
            setLoadingSubjects(false);
            return;
          }
          const response = await axios.get<SubjectData[]>(`http://localhost:8000/api/subjects`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          setSubjects(response.data);
        } catch (err: any) {
          console.error("Error fetching subjects:", err);
          if (axios.isAxiosError(err)) {
              const axiosError = err as AxiosError<any>;
              setSubjectError(axiosError.response?.data?.message || 'Không thể tải danh sách môn học.');
          } else {
              setSubjectError('Không thể tải danh sách môn học.');
          }
        } finally {
          setLoadingSubjects(false);
        }
      };

    const fetchScores = async (studentId: number) => {
        if (!studentId) return;
        setLoadingScores(true);
        setScoreError(null);
        setStudentAverageScore(null);
        setStudentPerformanceCategory('Đang tính...');

        try {
          const token = localStorage.getItem('token');
          if (!token) {
            setScoreError('Phiên đăng nhập hết hạn, vui lòng đăng nhập lại.');
            setLoadingScores(false);
            setStudentPerformanceCategory('Lỗi tải điểm');
            return;
          }
          const response = await axios.get<ScoreData[]>(`http://localhost:8000/api/scores/${studentId}`, {
             headers: { Authorization: `Bearer ${token}` },
          });

          const scoresData = Array.isArray(response.data) ? response.data : [];
          setScores(scoresData);

          const { average, category } = calculateAverageAndCategory(scoresData);
          setStudentAverageScore(average);
          setStudentPerformanceCategory(category);


        } catch (err: any) {
          console.error("Error fetching scores for student:", err);
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
        } finally {
          setLoadingScores(false);
        }
      };

    const groupScoresBySubject = (scores: ScoreData[]) => {
        const grouped: Record<string, Record<string, ScoreData>> = {};
        scores.forEach(score => {
          const subject = subjects.find(s => s.id === score.subject_id);
          const subjectName = subject ? subject.name : (score.subject_name || score.subject || 'Môn không xác định');

          if (!grouped[subjectName]) {
            grouped[subjectName] = {};
          }
          grouped[subjectName][score.type] = score;
        });
        return grouped;
      };

    useEffect(() => {
        fetchClasses();
        fetchSubjects();
    }, []);

    const handleClassClick = (classId: number) => {
        fetchClassDataAndAverages(classId);
    };

    const handleOpenScoreDialog = (student: Student) => {
        setCurrentStudentForScores(student);
        setOpenScoreDialog(true);
        fetchScores(student.id);
      };

    const handleCloseScoreDialog = () => {
        setOpenScoreDialog(false);
        setCurrentStudentForScores(null);
        setScores([]);
        setScoreError(null);
        setStudentAverageScore(null);
        setStudentPerformanceCategory('Chưa có điểm');
      };


    const formatDate = (dateString: string | null | undefined): string => {
        if (!dateString) return 'N/A';
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) {
                console.error("Invalid date string:", dateString);
                return dateString;
            }
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            return `${day}/${month}/${year}`;
        } catch (e) {
            console.error("Error formatting date:", dateString, e);
            return dateString;
        }
    };

    const scoresBySubjectForDisplay = groupScoresBySubject(scores);


    return (
        <Box p={3}>
            <Typography variant="h5" gutterBottom>
                {t('listClass')}
            </Typography>

            {loading ? (
                <Box display="flex" justifyContent="center" mt={4}>
                    <CircularProgress />
                </Box>
            ) : error ? (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            ) : (
                <Grid container spacing={3}>
                    {Object.keys(classesByGrade).length > 0 ? (
                        Object.keys(classesByGrade).map(grade => {
                            const gradeNumber = Number(grade);
                            const classes = classesByGrade[gradeNumber];
                            return (
                                <Grid item xs={12} sm={6} md={4} key={gradeNumber}>
                                    <Paper
                                        elevation={1}
                                        sx={{
                                            p: 2,
                                            height: '100%',
                                            display: 'flex',
                                            flexDirection: 'column',
                                        }}
                                    >
                                        <Typography
                                            variant="h6"
                                            gutterBottom
                                            sx={{
                                                borderBottom: '1px solid #eee',
                                                pb: 1,
                                                mb: 1,
                                            }}
                                        >
                                            {t('gradeTab', { grade: gradeNumber })}
                                        </Typography>
                                        <List dense sx={{ flexGrow: 1, overflow: 'auto' }}>
                                            {classes.map(cls => (
                                                <React.Fragment key={cls.id}>
                                                    <ListItem
                                                        button
                                                        onClick={() => handleClassClick(cls.id)}
                                                        selected={selectedClass?.id === cls.id}
                                                        sx={{
                                                            py: 0.5,
                                                            '&.Mui-selected': {
                                                                backgroundColor: 'action.selected',
                                                                fontWeight: 'bold',
                                                            },
                                                        }}
                                                    >
                                                        <ListItemIcon sx={{ minWidth: 35 }}>
                                                            <SchoolIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                                                        </ListItemIcon>
                                                        <ListItemText
                                                            primary={cls.name}
                                                        />
                                                    </ListItem>
                                                    <Divider component="li" sx={{ ml: 4 }} />
                                                </React.Fragment>
                                            ))}
                                        </List>
                                    </Paper>
                                </Grid>
                            );
                        })
                    ) : (
                        <Grid item xs={12}>
                            <Typography variant="body1" color="text.secondary" align="center">
                                {t('noClassData')}
                            </Typography>
                        </Grid>
                    )}
                </Grid>
            )}

            {loadingStudents || loadingClassAverages || loadingPerformanceSummary ? (
                 <Box display="flex" justifyContent="center" mt={4} mb={3}>
                     <CircularProgress />
                 </Box>
            ) : selectedClass ? (
                <Paper elevation={3} sx={{ p: 3, mt: 4, borderRadius: '8px', border: '1px solid #3a3c4b', bgcolor: '#21222d' }}>
                    <Stack spacing={3}>
                        <Box>
                        <Typography variant="h6" gutterBottom sx={{ borderBottom: '1px solid #4f5263', pb: 1, mb: 2, fontWeight: 'bold', color: '#FFFFFF', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                            <Box>
                                {t('Class Info', { className: selectedClass.name, grade: selectedClass.grade })}
                            </Box>
                            <Box>{selectedClass.school_year}</Box>
                        </Typography>
                            <Grid container spacing={2}>
                                <Grid item xs={12} sm={6}>
                                     <Typography variant="body1" sx={{ color: '#e0e0e0' }}>
                                         <strong>{t('classId')}:</strong> {selectedClass.id}
                                     </Typography>
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                     <Typography variant="body1" sx={{ color: '#e0e0e0' }}>
                                         <strong>{t('grade')}:</strong> {selectedClass.grade}
                                     </Typography>
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                     <Typography variant="body1" sx={{ color: '#e0e0e0' }}>
                                         <strong>{t('homeroomTeacher')}:</strong> {selectedClass.teacher?.name || t('notAssigned')}
                                     </Typography>
                                </Grid>
                            </Grid>
                        </Box>

                        <Box>
                            <Typography variant="h6" gutterBottom sx={{ borderBottom: '1px solid #4f5263', pb: 1, mb: 2, fontWeight: 'bold', color: '#FFFFFF' }}>
                                {t('Class Performance Statistics')}
                            </Typography>
                            {loadingPerformanceSummary ? (
                                <Box display="flex" justifyContent="center"><CircularProgress size={20} /></Box>
                            ) : performanceSummaryError ? (
                                <Typography color="error">{performanceSummaryError}</Typography>
                            ) : classPerformanceSummary && classPerformanceSummary.performance_summary ? (
                                <Grid container spacing={2}>
                                    {Object.entries(classPerformanceSummary.performance_summary).map(([category, count]) => (
                                        <Grid item xs={6} sm={2.4} key={category}>
                                            <Paper elevation={1} sx={{ p: 1.5, textAlign: 'center', bgcolor: '#31323d', color: '#e0e0e0' }}>
                                                <EmojiEventsIcon sx={{ fontSize: 24, color: '#ffeb3b' }} />
                                                <Typography variant="h6" component="div">
                                                    {count}
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary" sx={{ color: '#bdbdbd' }}>
                                                    {t(`performanceCategory.${category}`)}
                                                </Typography>
                                            </Paper>
                                        </Grid>
                                    ))}
                                </Grid>
                            ) : (
                                <Typography variant="body2" color="text.secondary" sx={{ ml: 2, color: '#e0e0e0' }}>
                                    {t('noPerformanceStatistics')}
                                </Typography>
                            )}
                        </Box>


                        <Box>
                             <Typography variant="h6" gutterBottom sx={{ borderBottom: '1px solid #4f5263', pb: 1, mb: 2, fontWeight: 'bold', color: '#FFFFFF' }}>
                                 {t('Class Subject Averages')}
                             </Typography>
                             {loadingClassAverages ? (
                                 <Box display="flex" justifyContent="center"><CircularProgress size={20} /></Box>
                             ) : classAveragesError ? (
                                 <Typography color="error">{classAveragesError}</Typography>
                             ) : classSubjectAverages.length > 0 ? (
                                 <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #3a3c4b', borderRadius: '8px', overflow: 'hidden', bgcolor: '#21222d' }}>
                                     <Table size="small" sx={{ '& .MuiTableCell-root': { borderBottom: '1px solid #4f5263' } }}>
                                         <TableHead>
                                             <TableRow sx={{ backgroundColor: '#31323d' }}>
                                                 <TableCell sx={{ fontWeight: 'bold', color: '#FFFFFF' }}>{t('subject')}</TableCell>
                                                 <TableCell align="right" sx={{ fontWeight: 'bold', color: '#FFFFFF' }}>{t('averageScore')}</TableCell>
                                             </TableRow>
                                         </TableHead>
                                         <TableBody>
                                             {classSubjectAverages.map((item, index) => (
                                                 <TableRow key={index} hover sx={{ '&:hover': { backgroundColor: '#2a2b37' } }}>
                                                     <TableCell sx={{ color: '#e0e0e0' }}>{t(`subjectName.${item.subject_name}`)}</TableCell>
                                                     <TableCell align="right" sx={{ color: '#e0e0e0' }}>{parseFloat(item.average_score).toFixed(2)}</TableCell>
                                                 </TableRow>
                                             ))}
                                         </TableBody>
                                     </Table>
                                 </TableContainer>
                             ) : (
                                 <Typography variant="body2" color="text.secondary" sx={{ ml: 2, color: '#e0e0e0' }}>
                                     {t('noSubjectAverages')}
                                 </Typography>
                             )}
                        </Box>

                        <Box>
                            <Typography variant="h6" gutterBottom sx={{ borderBottom: '1px solid #4f5263', pb: 1, mb: 2, fontWeight: 'bold', color: '#FFFFFF' }}>
                                {t('Student List WithCount', { count: selectedClass.students.length })}
                            </Typography>

                             {selectedClass.students.length > 0 ? (
                                 <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #3a3c4b', borderRadius: '8px', overflow: 'hidden', bgcolor: '#21222d' }}>
                                    <Table size="small" sx={{ '& .MuiTableCell-root': { borderBottom: '1px solid #4f5263' } }}>
                                         <TableHead>
                                             <TableRow sx={{ backgroundColor: '#31323d' }}>
                                                 <TableCell sx={{ fontWeight: 'bold', color: '#FFFFFF' }}>{t('id')}</TableCell>
                                                 <TableCell sx={{ fontWeight: 'bold', color: '#FFFFFF' }}>{t('fullName')}</TableCell>
                                                 <TableCell sx={{ fontWeight: 'bold', color: '#FFFFFF' }}>{t('gender')}</TableCell>
                                                 <TableCell sx={{ fontWeight: 'bold', color: '#FFFFFF' }}>{t('birthday')}</TableCell>
                                                 <TableCell sx={{ fontWeight: 'bold', color: '#FFFFFF' }}>{t('email')}</TableCell>
                                                 <TableCell sx={{ fontWeight: 'bold', color: '#FFFFFF' }}>{t('phone')}</TableCell>
                                                 <TableCell sx={{ fontWeight: 'bold', color: '#FFFFFF' }}>{t('address')}</TableCell>
                                                 <TableCell sx={{ fontWeight: 'bold', color: '#FFFFFF' }}>{t('score')}</TableCell>
                                             </TableRow>
                                         </TableHead>
                                         <TableBody>
                                             {selectedClass.students.map((student, index) => (
                                                 <TableRow key={student.id} hover sx={{ '&:hover': { backgroundColor: '#2a2b37' } }}>
                                                     <TableCell sx={{ color: '#e0e0e0' }}>{student.id}</TableCell>
                                                     <TableCell sx={{ color: '#e0e0e0' }}>{student.name}</TableCell>
                                                     <TableCell sx={{ color: '#e0e0e0' }}>{student.gender ? t(`genderType.${getGenderKey(student.gender)}`) : 'N/A'}</TableCell>
                                                     <TableCell sx={{ color: '#e0e0e0' }}>{formatDate(student.birthday)}</TableCell>
                                                     <TableCell sx={{ color: '#e0e0e0' }}>{student.email || 'N/A'}</TableCell>
                                                     <TableCell sx={{ color: '#e0e0e0' }}>{student.phone || 'N/A'}</TableCell>
                                                     <TableCell sx={{ color: '#e0e0e0' }}>{student.address || 'N/A'}</TableCell>
                                                     <TableCell sx={{ color: '#e0e0e0' }}>
                                                         <Tooltip title="Xem điểm">
                                                             <IconButton
                                                                 color="info"
                                                                 onClick={() => handleOpenScoreDialog(student)}
                                                             >
                                                                 <AssessmentIcon fontSize="small" />
                                                             </IconButton>
                                                         </Tooltip>
                                                     </TableCell>
                                                 </TableRow>
                                             ))}
                                         </TableBody>
                                     </Table>
                                 </TableContainer>
                             ) : (
                                 <Typography variant="body2" color="text.secondary" sx={{ ml: 2, color: '#e0e0e0' }}>
                                     {t('noStudentInClass')}
                                 </Typography>
                             )}
                        </Box>
                    </Stack>
                </Paper>
            ) : studentsError || classAveragesError || performanceSummaryError ? (
                 <Alert severity="error" sx={{ mt: 4, mb: 3 }}>
                     {studentsError || classAveragesError || performanceSummaryError}
                 </Alert>
            ) : null}


            <Dialog open={openScoreDialog} onClose={handleCloseScoreDialog} maxWidth="lg" fullWidth>
                <DialogTitle>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box>
                            {t('studentScoresTitle', { name: currentStudentForScores?.name || '' })}
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Button
                                variant={selectedSemester === '1' ? 'contained' : 'outlined'}
                                size="small"
                                sx={{ mr: 1, minWidth: 90, bgcolor: selectedSemester === '1' ? '#7e57c2' : undefined, color: '#fff' }}
                                onClick={() => setSelectedSemester('1')}
                            >
                                {t('Semester 1')}
                            </Button>
                            <Button
                                variant={selectedSemester === '2' ? 'contained' : 'outlined'}
                                size="small"
                                sx={{ minWidth: 90, bgcolor: selectedSemester === '2' ? '#7e57c2' : undefined, color: '#fff' }}
                                onClick={() => setSelectedSemester('2')}
                            >
                                {t('Semester 2')}
                            </Button>
                            {(loadingScores || loadingSubjects) && <CircularProgress size={20} sx={{ ml: 2 }} />}
                            {subjectError && <Typography variant="caption" color="error" sx={{ ml: 2 }}>{subjectError}</Typography>}
                        </Box>
                    </Box>
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ mb: 2 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                            {t('averageScore')}: {studentAverageScore !== null ? studentAverageScore : 'N/A'}
                        </Typography>
                        <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                            {t('performance')}: {t(`performanceCategory.${studentPerformanceCategory}`)}
                        </Typography>
                    </Box>

                    {scoreError ? (
                        <Typography color="error">{scoreError}</Typography>
                    ) : scores.length === 0 && !loadingScores ? (
                        <Typography>{t('noDetailedScores')}</Typography>
                    ) : (
                        <TableContainer component={Paper}>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell align="center"><strong>Môn học</strong></TableCell>
                                        {scoreTypes.filter(st =>
                                            (selectedSemester === '1' && ['oral', '15min', '45min', 'mid1', 'final1'].includes(st.value)) ||
                                            (selectedSemester === '2' && ['oral', '15min', '45min', 'mid2', 'final2'].includes(st.value))
                                        ).map(type => (
                                            <TableCell key={type.value} align="center"><strong>{t(`scoreTypeLabel.${type.value}`)}</strong></TableCell>
                                        ))}
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {subjects.map(subject => {
                                        const subjectName = subject.name;
                                        return (
                                            <TableRow key={subjectName}>
                                                <TableCell align="center">{t(`subjectName.${subjectName}`)}</TableCell>
                                                {scoreTypes.filter(st =>
                                                    (selectedSemester === '1' && ['oral', '15min', '45min', 'mid1', 'final1'].includes(st.value)) ||
                                                    (selectedSemester === '2' && ['oral', '15min', '45min', 'mid2', 'final2'].includes(st.value))
                                                ).map(type => {
                                                    const allScores = scores.filter(score =>
                                                        (score.subject_id === subject.id || score.subject_name === subjectName || score.subject === subjectName) &&
                                                        score.type === type.value &&
                                                        String(score.semester || '1') === selectedSemester
                                                    );
                                                    return (
                                                        <TableCell key={type.value} align="center">
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
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseScoreDialog}>{t('close')}</Button>
                </DialogActions>
            </Dialog>

        </Box>
    );
};

export default ListClass;
