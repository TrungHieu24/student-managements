import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
    Typography, Box, CircularProgress, Alert, Paper, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow, Stack,
    Tooltip, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Button, Grid,
    TextField, Select, MenuItem, FormControl, InputLabel
} from '@mui/material';
import AssessmentIcon from '@mui/icons-material/Assessment';
import { Edit, Delete, Add as AddIcon, Refresh } from '@mui/icons-material';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import axios, { isAxiosError, AxiosError } from 'axios';
import dayjs, { Dayjs } from 'dayjs';
import Snackbar from '@mui/material/Snackbar';
import 'dayjs/locale/vi';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import type { SelectChangeEvent } from '@mui/material/Select';

interface TeacherNested {
    id: number;
    name: string;
}

interface Student {
    id: number;
    name: string;
    gender: string;
    birthday: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
     class_id: number | null; 
     class?: { 
         id: number;
         name: string;
         grade?: number;
     } | null;
}

interface ClassSubjectAverage {
    subject_name: string;
    average_score: string;
}

interface ClassPerformanceSummaryData {
    "Giỏi"?: number;
    "Khá"?: number;
    "Trung bình"?: number;
    "Yếu"?: number;
    "Kém"?: number;
    "Chưa xếp loại"?: number;
}

interface ClassOption {
    id: number;
    name: string;
    grade: number;
}

interface HomeroomClass {
    id: number;
    name: string;
    grade: number;
    school_year: string;
    students: Student[];
    teacher_id: number | null;
    teacher: TeacherNested | null;
    average_subject_scores?: ClassSubjectAverage[];
    performance_summary?: ClassPerformanceSummaryData;
    loadingStatistics?: boolean;
    statisticsError?: string | null;
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

interface SubjectData {
    id: number;
    name: string;
}

const sortVietnameseNames = (a: Student, b: Student): number => {
    const nameA = a.name.trim().toLowerCase();
    const nameB = b.name.trim().toLowerCase();

    if (!nameA && !nameB) return 0;
    if (!nameA) return -1;
    if (!nameB) return 1;

    const originalPartsA = a.name.trim().toLowerCase().split(' ');
    const originalPartsB = b.name.trim().toLowerCase().split(' ');

    const lastA = originalPartsA.length > 0 ? originalPartsA[originalPartsA.length - 1] : '';
    const lastB = originalPartsB.length > 0 ? originalPartsB[originalPartsB.length - 1] : '';

    const lastCompare = lastA.localeCompare(lastB, 'vi', { sensitivity: 'base' });
    if (lastCompare !== 0) {
        return lastCompare;
    }

    const firstA = originalPartsA.length > 0 ? originalPartsA[0] : '';
    const firstB = originalPartsB.length > 0 ? originalPartsB[0] : '';

    const firstCompare = firstA.localeCompare(firstB, 'vi', { sensitivity: 'base' });
     if (firstCompare !== 0) {
        return firstCompare;
    }

    const middleA = originalPartsA.slice(1, -1).join(' ');
    const middleB = originalPartsB.slice(1, -1).join(' ');

    return middleA.localeCompare(middleB, 'vi', { sensitivity: 'base' });
};

const Homeroom = () => {
    const API_BASE_URL = import.meta.env.VITE_APP_API_URL;
    const [homeroomClasses, setHomeroomClasses] = useState<HomeroomClass[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const [loadingAllStatistics, setLoadingAllStatistics] = useState(false);
    const [allStatisticsError, setAllStatisticsError] = useState<string | null>(null);

    const fetchHomeroomClassesWithStats = useCallback(async () => {
        setLoading(true);
        setError(null);
        setLoadingAllStatistics(true);
        setAllStatisticsError(null);

        try {
            const token = localStorage.getItem('token');
            if (!token) {
                setError('Không tìm thấy token xác thực. Vui lòng đăng nhập lại.');
                setLoading(false);
                setLoadingAllStatistics(false);
                return;
            }

            const classesResponse = await axios.get<HomeroomClass[]>(`${API_BASE_URL}/api/teacher/classes/homeroom`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                     "ngrok-skip-browser-warning": "true",
                }
            });

            const classesData = Array.isArray(classesResponse.data) ? classesResponse.data : [];

            if (classesData.length === 0) {
                setHomeroomClasses([]);
                setLoading(false);
                setLoadingAllStatistics(false);
                return;
            }

            const classesWithStats = await Promise.all(classesData.map(async (classItem) => {
                try {
                    const [averagesRes, performanceRes] = await Promise.all([
                        axios.get<{ average_subject_scores: ClassSubjectAverage[] }>(`${API_BASE_URL}/api/classes/${classItem.id}/average-subject-scores`, {
                            headers: {
                              Authorization: `Bearer ${token}`, 
                              "ngrok-skip-browser-warning": "true",
                              'Content-Type': 'application/json' 
                            },
                        }),
                         axios.get<{ performance_summary: ClassPerformanceSummaryData }>(`${API_BASE_URL}/api/classes/${classItem.id}/performance-summary`, {
                            headers: {
                              Authorization: `Bearer ${token}`, 
                              "ngrok-skip-browser-warning": "true",
                              'Content-Type': 'application/json' 
                            },
                         }),
                    ]);

                    const studentsWithClass = classItem.students ? classItem.students.map(student => ({
                         ...student,
                         class: { id: classItem.id, name: classItem.name, grade: classItem.grade }
                     })) : [];


                    const sortedStudents = studentsWithClass.sort(sortVietnameseNames);


                    return {
                        ...classItem,
                        students: sortedStudents,
                        average_subject_scores: Array.isArray(averagesRes.data?.average_subject_scores) ? averagesRes.data.average_subject_scores : [],
                        performance_summary: performanceRes.data?.performance_summary || {},
                        loadingStatistics: false,
                        statisticsError: null,
                    };
                } catch (statsErr: any) {
                    console.error(`Error fetching stats for class ${classItem.name}:`, statsErr.response?.data || statsErr);
                    let errorMsg = 'Lỗi tải thống kê.';
                     if (isAxiosError(statsErr) && statsErr.response) {
                         errorMsg = statsErr.response.data?.message || `Lỗi tải thống kê (Status: ${statsErr.response.status})`;
                     }
                     const studentsWithClass = classItem.students ? classItem.students.map(student => ({
                          ...student,
                          class: { id: classItem.id, name: classItem.name, grade: classItem.grade }
                      })) : [];

                    return {
                        ...classItem,
                        students: studentsWithClass.sort(sortVietnameseNames),
                        average_subject_scores: [],
                        performance_summary: {},
                        loadingStatistics: false,
                        statisticsError: errorMsg,
                    };
                }
            }));

            setHomeroomClasses(classesWithStats);


        } catch (err: any) {
            console.error("Error fetching homeroom classes:", err.response?.data || err);
            if (axios.isAxiosError(err) && err.response) {
                const axiosError = err as AxiosError<any>;
                const apiMessage = axiosError.response?.data?.message;
                const statusCode = axiosError.response?.status;
                if (statusCode === 401 || statusCode === 403) {
                    setError('Phiên đăng nhập hết hạn hoặc bạn không có quyền truy cập. Vui lòng đăng nhập lại.');
                } else if (statusCode === 404) {
                    setError('Bạn chưa được phân công làm giáo viên chủ nhiệm lớp nào.');
                }
                else {
                    setError(`Lỗi tải danh sách lớp chủ nhiệm: ${apiMessage || `Status ${statusCode}`}`);
                }
            } else {
                setError('Không thể kết nối đến máy chủ API hoặc có lỗi khi tải dữ liệu.');
            }
            setHomeroomClasses([]);
             setAllStatisticsError(error);
        } finally {
            setLoading(false);
            setLoadingAllStatistics(false);
        }
    }, [API_BASE_URL]);

    useEffect(() => {
        fetchHomeroomClassesWithStats();
    }, [fetchHomeroomClassesWithStats]);

      const [notification, setNotification] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({
    open: false,
    message: '',
    severity: 'success',
  });
    const [openScoreDialog, setOpenScoreDialog] = useState(false);
    const [currentStudentForScores, setCurrentStudentForScores] = useState<Student | null>(null);
    const [scores, setScores] = useState<Score[]>([]);
    const [loadingScores, setLoadingScores] = useState<boolean>(false);
    const [scoreError, setScoreError] = useState<string | null>(null);

    const [studentAverageScore, setStudentAverageScore] = useState<number | null>(null);
    const [studentPerformanceCategory, setStudentPerformanceCategory] = useState<string>('Đang tính...');

    const [openAddStudentDialog, setOpenAddStudentDialog] = useState(false);
    const [newStudentData, setNewStudentData] = useState({
        name: '',
        gender: '',
        birthday: null as Dayjs | null,
        email: '',
        phone: '',
        address: '',
    });
    const [addingStudent, setAddingStudent] = useState(false);
    const [addStudentError, setAddStudentError] = useState<string | null>(null);

    const [openDeleteStudentConfirm, setOpenDeleteStudentConfirm] = useState(false);
    const [studentToDeleteId, setStudentToDeleteId] = useState<number | null>(null);
    const [studentToDeleteName, setStudentToDeleteName] = useState<string | null>(null);
    const [deletingStudent, setDeletingStudent] = useState(false);
    const [deleteStudentError, setDeleteStudentError] = useState<string | null>(null);

    const [openEditStudentDialog, setOpenEditStudentDialog] = useState(false);
    const [studentToEdit, setStudentToEdit] = useState<Student | null>(null);
    const [editingStudent, setEditingStudent] = useState(false);
    const [editStudentError, setEditStudentError] = useState<string | null>(null);

    const [classes, setClasses] = useState<ClassOption[]>([]);
    const [loadingClasses, setLoadingClasses] = useState(false);
    const [classesError, setClassesError] = useState<string | null>(null);
    const [selectedGrade, setSelectedGrade] = useState<string>('');

    const [selectedSemester, setSelectedSemester] = useState<string>('1');

    const [addScoreContext, setAddScoreContext] = useState<{ subject_id: string, type: string } | null>(null);

    const [subjects, setSubjects] = useState<SubjectData[]>([]);
    const [loadingSubjects, setLoadingSubjects] = useState(false);
    const [subjectError, setSubjectError] = useState<string | null>(null);

    const scoreTypes: ScoreType[] = useMemo(() => [
        { value: 'oral', label: 'Điểm miệng' },
        { value: '15min', label: 'Điểm 15 phút' },
        { value: '45min', label: 'Điểm 45 phút' },
        { value: 'mid1', label: 'Giữa kỳ 1' },
        { value: 'final1', label: 'Cuối kỳ 1' },
        { value: 'mid2', label: 'Giữa kỳ 2' },
        { value: 'final2', label: 'Cuối kỳ 2' },
    ], []);

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
        }
        else {
            category = 'Kém';
        }

        const roundedAverage = parseFloat(average.toFixed(2));

        return { average: roundedAverage, category };
    };


    const fetchStudentScores = async (studentId: number) => {
        if (!studentId) return;
        setLoadingScores(true);
        setScoreError(null);
        setStudentAverageScore(null);
        setStudentPerformanceCategory('Đang tính...');
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('Không tìm thấy token xác thực.');
            }
            const response = await axios.get<Score[]>(`${API_BASE_URL}/api/scores/${studentId}`, {
                headers: {
                  Authorization: `Bearer ${token}`, 
                  "ngrok-skip-browser-warning": "true",
                  'Content-Type': 'application/json' 
                },
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
          const response = await axios.get<SubjectData[]>(`${API_BASE_URL}/api/subjects`, {
            headers: {
              Authorization: `Bearer ${token}`, 
              "ngrok-skip-browser-warning": "true",
              'Content-Type': 'application/json' 
            },
          });
          setSubjects(response.data);
        } catch (err: any) {
          console.error("Error fetching subjects:", err);
          if (isAxiosError(err) && err.response) {
              const axiosError = err as AxiosError<any>;
              if (axiosError.response?.data && axiosError.response.data.message) {
                  setSubjectError(axiosError.response.data.message);
              } else {
                  setSubjectError('Không thể tải danh sách môn học.');
              }
          } else {
              setSubjectError('Không thể tải danh sách môn học.');
          }
        } finally {
          setLoadingSubjects(false);
        }
      };


    const handleOpenScoreDialog = (student: Student) => {
        setCurrentStudentForScores(student);
        setScores([]);
        setScoreError(null);
        fetchStudentScores(student.id);
        fetchSubjects();
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

    const handleOpenAddStudentDialog = () => {
        setNewStudentData({
            name: '',
            gender: '',
            birthday: null,
            email: '',
            phone: '',
            address: '',
        });
        setAddStudentError(null);
        setOpenAddStudentDialog(true);
    };

    const handleCloseAddStudentDialog = () => {
        setOpenAddStudentDialog(false);
        setNewStudentData({
            name: '',
            gender: '',
            birthday: null,
            email: '',
            phone: '',
            address: '',
        });
        setAddStudentError(null);
    };

    const handleNewStudentInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent<string | number>) => {
        const { name, value } = e.target;
         setNewStudentData(prev => ({ ...prev, [name as string]: value }));
    };

     const handleNewStudentDateChange = (date: Dayjs | null) => {
         setNewStudentData(prev => ({ ...prev, birthday: date }));
     };


    const handleSaveNewStudent = async () => {
        if (!homeroomClasses || homeroomClasses.length === 0) {
            setAddStudentError('Không tìm thấy lớp chủ nhiệm để thêm học sinh.');
            setNotification({
                open: true,
                message: 'Không tìm thấy lớp chủ nhiệm để thêm học sinh.',
                severity: 'error',
            });
            return;
        }

        const homeroomClassId = homeroomClasses[0].id;

        if (!newStudentData.name || !newStudentData.gender) {
            setAddStudentError('Vui lòng điền đủ Họ và tên và Giới tính.');
            setNotification({
                open: true,
                message: 'Vui lòng điền đủ Họ và tên và Giới tính.',
                severity: 'error',
            });
            return;
        }

        setAddingStudent(true);
        setAddStudentError(null);

        try {
            const token = localStorage.getItem('token');
            if (!token) {
                setAddStudentError('Phiên đăng nhập hết hạn.');
                setNotification({
                    open: true,
                    message: 'Phiên đăng nhập hết hạn.',
                    severity: 'error',
                });
                setAddingStudent(false);
                return;
            }

            const dataToSend = {
                name: newStudentData.name,
                gender: newStudentData.gender,
                birthday: newStudentData.birthday ? newStudentData.birthday.format('YYYY-MM-DD') : null,
                email: newStudentData.email || null,
                phone: newStudentData.phone || null,
                address: newStudentData.address || null,
                class_id: homeroomClassId,
            };

            const res = await axios.post(`${API_BASE_URL}/api/students`, dataToSend, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
            });


      const newUser = res.data;
      const generatedPassword = newUser.generated_password;

      setNotification({
        open: true,
        message: `Thêm học sinh mới thành công. Mật khẩu: ${generatedPassword}`,

        severity: 'success',
      });

            handleCloseAddStudentDialog();
            fetchHomeroomClassesWithStats();

        } catch (err: any) {
             console.error("Error adding student:", err.response || err);
             if (axios.isAxiosError(err) && err.response) {
                 const axiosError = err as AxiosError<any>;
                 const responseData = axiosError.response.data;
                 let errorMessage = 'Lỗi khi thêm học sinh.';
                 if (responseData && responseData.errors) {
                   errorMessage = "Lỗi nhập liệu: " + Object.values(responseData.errors).flat().join(', ');
                 } else if (responseData && responseData.message) {
                   errorMessage = "Lỗi: " + responseData.message;
                 }
                 setAddStudentError(errorMessage);
                 setNotification({
                    open: true,
                    message: errorMessage,
                    severity: 'error',
                });
             } else {
               const genericErrorMessage = "Lỗi không xác định khi thêm học sinh.";
               setAddStudentError(genericErrorMessage);
               setNotification({
                  open: true,
                  message: genericErrorMessage,
                  severity: 'error',
              });
             }
        } finally {
            setAddingStudent(false);
        }
    };
    

     const grades = ['10', '11', '12']; 

     const fetchClasses = async () => {
         setLoadingClasses(true);
         setClassesError(null);
         try {
           const token = localStorage.getItem('token');
           if (!token) {
             setClassesError('Lỗi xác thực khi tải danh sách lớp.');
             setLoadingClasses(false);
             return;
           }
           const response = await axios.get<ClassOption[]>(`${API_BASE_URL}/api/classes`, {
                headers: {
                  Authorization: `Bearer ${token}`,
                  "ngrok-skip-browser-warning": "true",
                  'Content-Type': 'application/json' 
                },
           });
            const filteredClasses = Array.isArray(response.data) ? response.data.filter(cls => grades.includes(String(cls.grade))) : [];
           setClasses(filteredClasses);
         } catch (err: any) {
           console.error("Error fetching classes:", err);
           if (axios.isAxiosError(err) && err.response) {
               const axiosError = err as AxiosError<any>;
               setClassesError(axiosError.response?.data?.message || 'Không thể tải danh sách lớp.');
           } else {
               setClassesError('Không thể tải danh sách lớp.');
           }
         } finally {
           setLoadingClasses(false);
         }
     };


     const handleOpenDeleteStudentConfirm = (student: Student) => {
         setStudentToDeleteId(student.id);
         setStudentToDeleteName(student.name);
         setDeleteStudentError(null);
         setOpenDeleteStudentConfirm(true);
     };

     const handleCloseDeleteStudentConfirm = () => {
         setOpenDeleteStudentConfirm(false);
         setStudentToDeleteId(null);
         setStudentToDeleteName(null);
         setDeleteStudentError(null);
     };

     const handleConfirmDeleteStudent = async () => {
         if (!studentToDeleteId) return;
         setDeletingStudent(true);
         setDeleteStudentError(null);
         try {
             const token = localStorage.getItem('token');
             if (!token) {
                 const authErrorMessage = 'Phiên đăng nhập hết hạn.';
                 setDeleteStudentError(authErrorMessage);
                 setNotification({
                    open: true,
                    message: authErrorMessage,
                    severity: 'error',
                });
                 setDeletingStudent(false);
                 return;
             }
             await axios.delete(`${API_BASE_URL}/api/students/${studentToDeleteId}`, {
                 headers: { Authorization: `Bearer ${token}` },
             });
             handleCloseDeleteStudentConfirm();
             fetchHomeroomClassesWithStats();
             setNotification({
                open: true,
                message: `Xóa học sinh ${studentToDeleteName} thành công.`,
                severity: 'success',
            });
         } catch (err: any) {
              console.error("Error deleting student:", err.response || err);
              if (axios.isAxiosError(err) && err.response) {
                  const axiosError = err as AxiosError<any>;
                  const responseData = axiosError.response.data;
                  let errorMessage = 'Lỗi khi xóa học sinh.';
                  if (responseData && responseData.message) {
                    errorMessage = "Lỗi: " + responseData.message;
                  }
                  setDeleteStudentError(errorMessage);
                  setNotification({
                    open: true,
                    message: errorMessage,
                    severity: 'error',
                });
              } else {
                const genericErrorMessage = "Lỗi không xác định khi xóa học sinh.";
                setDeleteStudentError(genericErrorMessage);
                setNotification({
                    open: true,
                    message: genericErrorMessage,
                    severity: 'error',
                });
              }
         } finally {
             setDeletingStudent(false);
         }
     };

     const handleOpenEditStudentDialog = (student: Student) => {
         setStudentToEdit(student);
          setSelectedGrade(String(student.class?.grade || '')); 
         fetchClasses(); 
         setEditStudentError(null);
         setOpenEditStudentDialog(true);
     };

     const handleCloseEditStudentDialog = () => {
         setOpenEditStudentDialog(false);
         setStudentToEdit(null);
         setSelectedGrade(''); 
         setEditStudentError(null);
     };

     const handleEditStudentInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent<string | number>) => {
         const { name, value } = e.target;
         setStudentToEdit(prev => {
             if (!prev) return null;
             if (name === 'class_id') {
                 const newClassId = value === '' ? null : Number(value);
                 return { ...prev, [name]: newClassId, class: null } as Student;
             }
             return { ...prev, [name]: value } as Student;
         });
     };

    const handleEditStudentDateChange = (date: Dayjs | null) => {
        setStudentToEdit(prev => prev ? { ...prev, birthday: date ? date.format('YYYY-MM-DD') : null } : null);
    };


     const handleSaveEditedStudent = async () => {
         if (!studentToEdit?.id || !studentToEdit.name || !studentToEdit.gender || studentToEdit.class_id === null || studentToEdit.class_id === undefined) {
             const validationErrorMessage = 'Vui lòng điền đủ Họ và tên, Giới tính và Lớp.';
             setEditStudentError(validationErrorMessage);
             setNotification({
                open: true,
                message: validationErrorMessage,
                severity: 'error',
            });
             return;
         }
         setEditingStudent(true);
         setEditStudentError(null);
         try {
             const token = localStorage.getItem('token');
             if (!token) {
                 const authErrorMessage = 'Phiên đăng nhập hết hạn.';
                 setEditStudentError(authErrorMessage);
                 setNotification({
                    open: true,
                    message: authErrorMessage,
                    severity: 'error',
                });
                 setEditingStudent(false);
                 return;
             }

             const dataToSend = {
                 name: studentToEdit.name,
                 gender: studentToEdit.gender,
                 birthday: studentToEdit.birthday, 
                 email: studentToEdit.email || null,
                 phone: studentToEdit.phone || null,
                 address: studentToEdit.address || null,
                 class_id: studentToEdit.class_id,
             };

             await axios.put(`${API_BASE_URL}/api/students/${studentToEdit.id}`, dataToSend, {
                 headers: {
                     Authorization: `Bearer ${token}`,
                     'Content-Type': 'application/json'
                 },
             });
             handleCloseEditStudentDialog();
             fetchHomeroomClassesWithStats();
             setNotification({
                open: true,
                message: `Cập nhật thông tin học sinh ${studentToEdit.name} thành công.`,
                severity: 'success',
            });
         } catch (err: any) {
             console.error("Error updating student:", err.response || err);
              if (axios.isAxiosError(err) && err.response) {
                  const axiosError = err as AxiosError<any>;
                  const responseData = axiosError.response.data;
                  let errorMessage = 'Lỗi khi cập nhật học sinh.';
                  if (responseData && responseData.errors) {
                    errorMessage = "Lỗi nhập liệu: " + Object.values(responseData.errors).flat().join(', ');
                  } else if (responseData && responseData.message) {
                    errorMessage = "Lỗi: " + responseData.message;
                  }
                  setEditStudentError(errorMessage);
                  setNotification({
                    open: true,
                    message: errorMessage,
                    severity: 'error',
                });
              } else {
                const genericErrorMessage = "Lỗi không xác định khi cập nhật học sinh.";
                setEditStudentError(genericErrorMessage);
                setNotification({
                    open: true,
                    message: genericErrorMessage,
                    severity: 'error',
                });
              }
         } finally {
             setEditingStudent(false);
         }
     };

    const getGradeFromClassName = (className: string | undefined | null): string => {
         if (!className) return '';
         const match = className.match(/^(\d+)/);
         return match ? match[1] : '';
     };

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

    const performanceCategories: (keyof ClassPerformanceSummaryData)[] = ["Giỏi", "Khá", "Trung bình", "Yếu", "Kém", "Chưa xếp loại"];

    const scoresBySubjectAndSemester = useMemo(() => {
        const organized: { [semester: string]: { [subjectName: string]: { [scoreType: string]: Score[] } } } = {};
        scores.forEach(score => {
            const semester = score.semester ? String(score.semester) : '1';
            const subjectName = score.subject?.name || score.subject_name || (typeof score.subject === 'string' ? score.subject : '') || 'Không rõ môn';
            if (!organized[semester]) organized[semester] = {};
            if (!organized[semester][subjectName]) organized[semester][subjectName] = {};
            if (!organized[semester][subjectName][score.type]) organized[semester][subjectName][score.type] = [];
            organized[semester][subjectName][score.type].push(score);
        });
        Object.keys(organized).forEach(sem => {
            const sorted: { [subjectName: string]: { [scoreType: string]: Score[] } } = {};
            Object.keys(organized[sem]).sort((a, b) => a.localeCompare(b, 'vi', { sensitivity: 'base' })).forEach(name => {
                sorted[name] = organized[sem][name];
            });
            organized[sem] = sorted;
        });
        return organized;
    }, [scores]);

    const handleCloseNotification = () => {
        setNotification(prev => ({ ...prev, open: false }));
    };

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs}>
            <Box sx={{ p: 3, bgcolor: '#1a1c23', minHeight: '100vh', color: '#e0e0e0' }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 4 }}>
                    <Typography variant="h4" gutterBottom sx={{ color: '#FFFFFF', mb: 0 }}>
                        Lớp Chủ Nhiệm
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        {!loading && homeroomClasses.length > 0 && (
                             <Button
                                variant="contained"
                                startIcon={<AddIcon />}
                                onClick={handleOpenAddStudentDialog}
                                sx={{ bgcolor: '#7e57c2', '&:hover': { bgcolor: '#673ab7' } }}
                            >
                                Thêm Học sinh
                            </Button>
                        )}
                        <Button
                            variant="outlined"
                            startIcon={<Refresh />}
                            onClick={fetchHomeroomClassesWithStats}
                            disabled={loading}
                            sx={{
                              color: '#e0e0e0',
                              borderColor: '#e0e0e0',
                            }}
                        >
                            Làm mới
                        </Button>
                    </Box>
                </Stack>

                {(loading || loadingAllStatistics) && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
                        <CircularProgress sx={{ color: '#e0e0e0' }} />
                    </Box>
                )}

                {(error || allStatisticsError) && (
                    <Alert severity="error" sx={{ mb: 3 }}>
                        {error || allStatisticsError}
                    </Alert>
                )}

                {!loading && !error && homeroomClasses.length === 0 && !loadingAllStatistics && !allStatisticsError && (
                     <Typography variant="h6" textAlign="center" color="text.secondary" sx={{ color: '#e0e0e0' }}>
                         Bạn không chủ nhiệm lớp nào.
                     </Typography>
                )}


                {!loading && !error && homeroomClasses.length > 0 && (
                    <Stack spacing={4}>
                        {homeroomClasses.map((classItem) => (
                            <Paper key={classItem.id} elevation={3} sx={{ p: 3, borderRadius: '8px', border: '1px solid #3a3c4b', bgcolor: '#21222d', color: '#e0e0e0' }}>
                                <Stack spacing={3}>
                                    <Box>
                                        <Typography variant="h6" gutterBottom sx={{ borderBottom: '1px solid #4f5263', pb: 1, mb: 2, fontWeight: 'bold', color: '#FFFFFF', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                                            <Box>
                                                Thông tin lớp {classItem.name} (Khối {classItem.grade})
                                            </Box>
                                            <Box>{classItem.school_year}</Box>
                                        </Typography>
                                        <Grid container spacing={2}>
                                            <Grid item xs={12} sm={6}>
                                                <Typography variant="body1" sx={{ color: '#e0e0e0' }}>
                                                    <strong>ID Lớp:</strong> {classItem.id}
                                                </Typography>
                                            </Grid>
                                            <Grid item xs={12} sm={6}>
                                                <Typography variant="body1" sx={{ color: '#e0e0e0' }}>
                                                    <strong>Khối:</strong> {classItem.grade}
                                                </Typography>
                                            </Grid>
                                        </Grid>
                                    </Box>

                                    <Box>
                                        <Typography variant="h6" gutterBottom sx={{ borderBottom: '1px solid #4f5263', pb: 1, mb: 2, fontWeight: 'bold', color: '#FFFFFF' }}>
                                            Thống kê học lực của lớp {classItem.name}
                                        </Typography>
                                         {classItem.loadingStatistics ? (
                                             <Box display="flex" justifyContent="center"><CircularProgress size={20} sx={{ color: '#e0e0e0' }} /></Box>
                                         ) : classItem.statisticsError ? (
                                             <Alert severity="error">{classItem.statisticsError}</Alert>
                                         ) : classItem.performance_summary && Object.keys(classItem.performance_summary).length > 0 ? (
                                            <Grid container spacing={2}>
                                                 {performanceCategories.map((category) => {
                                                     const count = classItem.performance_summary ? classItem.performance_summary[category] : undefined;
                                                     if (count === undefined || count === null) return null;

                                                     return (
                                                        <Grid item xs={6} sm={2.4} key={category}>
                                                            <Paper elevation={1} sx={{ p: 1.5, textAlign: 'center', bgcolor: '#31323d', color: '#e0e0e0', border: '1px solid #4f5263' }}>
                                                                <EmojiEventsIcon sx={{ fontSize: 24, color: '#ffeb3b' }} />
                                                                <Typography variant="h6" component="div" sx={{ color: '#e0e0e0' }}>
                                                                    {count}
                                                                </Typography>
                                                                <Typography variant="body2" color="text.secondary" sx={{ color: '#bdbdbd' }}>
                                                                    {category}
                                                                </Typography>
                                                            </Paper>
                                                        </Grid>
                                                     );
                                                 })}
                                                 {classItem.performance_summary && Object.keys(classItem.performance_summary).length === 0 && (
                                                    <Typography variant="body2" color="text.secondary" sx={{ ml: 2, fontStyle: 'italic', color: '#e0e0e0' }}>
                                                        Không có dữ liệu thống kê học lực cho lớp này.
                                                    </Typography>
                                                 )}
                                            </Grid>
                                         ) : (
                                            <Typography variant="body2" color="text.secondary" sx={{ ml: 2, fontStyle: 'italic', color: '#e0e0e0' }}>
                                                Không có dữ liệu thống kê học lực cho lớp này.
                                            </Typography>
                                         )}
                                    </Box>

                                    <Box>
                                         <Typography variant="h6" gutterBottom sx={{ borderBottom: '1px solid #4f5263', pb: 1, mb: 2, fontWeight: 'bold', color: '#FFFFFF' }}>
                                             Điểm trung bình từng môn của lớp {classItem.name}
                                         </Typography>
                                         {classItem.loadingStatistics ? (
                                              <Box display="flex" justifyContent="center"><CircularProgress size={20} sx={{ color: '#e0e0e0' }} /></Box>
                                         ) : classItem.statisticsError ? (
                                              <Alert severity="error">{classItem.statisticsError}</Alert>
                                         ) : classItem.average_subject_scores && classItem.average_subject_scores.length > 0 ? (
                                             <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #3a3c4b', borderRadius: '8px', overflow: 'hidden', bgcolor: '#21222d' }}>
                                                 <Table size="small" sx={{ '& .MuiTableCell-root': { borderBottom: '1px solid #4f5263', color: '#e0e0e0' } }}>
                                                     <TableHead>
                                                         <TableRow sx={{ backgroundColor: '#31323d' }}>
                                                               <TableCell sx={{ fontWeight: 'bold', color: '#FFFFFF' }}>Môn học</TableCell>
                                                             <TableCell align="right" sx={{ fontWeight: 'bold', color: '#FFFFFF' }}>Điểm trung bình</TableCell>
                                                         </TableRow>
                                                     </TableHead>
                                                     <TableBody>
                                                         {classItem.average_subject_scores.map((item, index) => (
                                                            <TableRow key={index} hover sx={{ '&:hover': { backgroundColor: '#2a2b37' } }}>
                                                                 <TableCell sx={{ color: '#e0e0e0' }}>{item.subject_name}</TableCell>
                                                                <TableCell align="right" sx={{ color: '#e0e0e0' }}>{parseFloat(item.average_score).toFixed(2)}</TableCell>
                                                             </TableRow>
                                                         ))}
                                                     </TableBody>
                                                 </Table>
                                             </TableContainer>
                                         ) : (
                                             <Typography variant="body2" color="text.secondary" sx={{ ml: 2, fontStyle: 'italic', color: '#e0e0e0' }}>
                                                 Không có dữ liệu điểm trung bình môn cho lớp này.
                                             </Typography>
                                         )}
                                    </Box>

                                    <Box>
                                        <Typography variant="h6" gutterBottom sx={{ borderBottom: '1px solid #4f5263', pb: 1, mb: 2, fontWeight: 'bold', color: '#FFFFFF' }}>
                                            Danh sách học sinh lớp {classItem.name} ({classItem.students ? classItem.students.length : 0})
                                        </Typography>

                                        {classItem.students && classItem.students.length > 0 ? (
                                            <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #3a3c4b', borderRadius: '8px', overflow: 'hidden', bgcolor: '#21222d' }}>
                                                <Table size="small" sx={{ '& .MuiTableCell-root': { borderBottom: '1px solid #4f5263', color: '#e0e0e0' } }}>
                                                    <TableHead>
                                                        <TableRow sx={{ backgroundColor: '#31323d' }}>
                                                            <TableCell sx={{ fontWeight: 'bold', color: '#FFFFFF' }}>Mã học sinh</TableCell>
                                                            <TableCell sx={{ fontWeight: 'bold', color: '#FFFFFF' }}>Họ và tên</TableCell>
                                                            <TableCell sx={{ fontWeight: 'bold', color: '#FFFFFF' }}>Ngày sinh</TableCell>
                                                            <TableCell sx={{ fontWeight: 'bold', color: '#FFFFFF' }}>Giới tính</TableCell>
                                                            <TableCell sx={{ fontWeight: 'bold', color: '#FFFFFF' }}>Email</TableCell>
                                                            <TableCell sx={{ fontWeight: 'bold', color: '#FFFFFF' }}>Số điện thoại</TableCell>
                                                            <TableCell sx={{ fontWeight: 'bold', color: '#FFFFFF' }}>Địa chỉ</TableCell>
                                                            <TableCell sx={{ fontWeight: 'bold', color: '#FFFFFF' }}>Thao tác</TableCell>
                                                        </TableRow>
                                                    </TableHead>
                                                    <TableBody>
                                                        {classItem.students.map((student) => (
                                                            <TableRow key={student.id} hover sx={{ '&:hover': { backgroundColor: '#2a2b37' } }}>
                                                                <TableCell sx={{ color: '#e0e0e0' }}>{student.id}</TableCell>
                                                                <TableCell sx={{ color: '#e0e0e0' }}>{student.name}</TableCell>
                                                                <TableCell sx={{ color: '#e0e0e0' }}>{formatBirthday(student.birthday)}</TableCell>
                                                                <TableCell sx={{ color: '#e0e0e0' }}>{student.gender || 'N/A'}</TableCell>
                                                                <TableCell sx={{ color: '#e0e0e0' }}>{student.email || 'N/A'}</TableCell>
                                                                <TableCell sx={{ color: '#e0e0e0' }}>{student.phone || 'N/A'}</TableCell>
                                                                <TableCell sx={{ color: '#e0e0e0' }}>{student.address || 'N/A'}</TableCell>
                                                                {/* Added Stack with action icons */}
                                                                <TableCell sx={{ color: '#e0e0e0' }}>
                                                                    <Stack direction="row" spacing={0.5}>
                                                                        <Tooltip title="Xem điểm">
                                                                             <IconButton
                                                                                color="info"
                                                                                size="small"
                                                                                onClick={() => handleOpenScoreDialog(student)}
                                                                                sx={{ color: '#e0e0e0' }}
                                                                             >
                                                                                 <AssessmentIcon fontSize="small" />
                                                                             </IconButton>
                                                                        </Tooltip>
                                                                         <Tooltip title="Sửa">
                                                                            <IconButton
                                                                                color="primary"
                                                                                size="small"
                                                                                onClick={() => handleOpenEditStudentDialog(student)}
                                                                                sx={{ color: '#e0e0e0' }}
                                                                            >
                                                                                <Edit fontSize="small" />
                                                                            </IconButton>
                                                                         </Tooltip>
                                                                          <Tooltip title="Xóa">
                                                                             <IconButton
                                                                                color="error"
                                                                                size="small"
                                                                                onClick={() => handleOpenDeleteStudentConfirm(student)}
                                                                             >
                                                                                 <Delete fontSize="small" />
                                                                             </IconButton>
                                                                          </Tooltip>
                                                                    </Stack>
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </TableContainer>
                                        ) : (
                                            <Typography variant="body2" color="text.secondary" sx={{ ml: 2, fontStyle: 'italic', color: '#e0e0e0' }}>
                                                Lớp này chưa có học sinh nào.
                                            </Typography>
                                        )}
                                    </Box>
                                </Stack>
                            </Paper>
                        ))}
                    </Stack>
                )}

                {/* Dialog xem điểm (existing) */}
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
                        <Box>Điểm số của học sinh: {currentStudentForScores?.name || ''}</Box>
                         <Box sx={{ display: 'flex', alignItems: 'center' }}>
                             {/* Bỏ nút thêm điểm ở đây, chỉ giữ lại các nút chuyển học kỳ và loading/subjectError nếu có */}
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
                             {(loadingScores || loadingSubjects) && <CircularProgress size={20} sx={{ ml: 2, color: '#e0e0e0' }} />}
                             {subjectError && <Typography variant="caption" color="error" sx={{ ml: 2 }}>{subjectError}</Typography>}
                         </Box>
                    </DialogTitle>

                    <DialogContent sx={{
                        bgcolor: '#21222d',
                        color: '#e0e0e0',
                        pt: 2,
                    }}>
                        {scoreError ? (
                            <Alert severity="error">{scoreError}</Alert>
                        ) : scores.length === 0 && !loadingScores ? (
                            <Typography>Không tìm thấy điểm số chi tiết cho học sinh này.</Typography>
                        ) : (
                            <>
                                <Box sx={{ mb: 2 }}>
                                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: '#e0e0e0' }}>
                                        Điểm trung bình: {studentAverageScore !== null ? studentAverageScore.toFixed(2) : 'N/A'}
                                    </Typography>
                                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: '#e0e0e0' }}>
                                        Học lực: {studentPerformanceCategory || 'N/A'}
                                    </Typography>
                                </Box>
                                {/* Bảng điểm: cột là môn, dòng là loại điểm */}
                                {subjects.length > 0 ? (
                                    <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #3a3c4b', borderRadius: '8px', overflow: 'auto', bgcolor: '#21222d', mb: 2 }}>
                                        <Table size="small" sx={{ minWidth: 700, '& .MuiTableCell-root': { borderBottom: '1px solid #4f5263', color: '#e0e0e0' } }}>
                                            <TableHead>
                                                <TableRow sx={{ backgroundColor: '#31323d' }}>
                                                    <TableCell sx={{ fontWeight: 'bold', color: '#FFFFFF', minWidth: 120 }}>Môn học</TableCell>
                                                    {scoreTypes.filter(st =>
                                                        (selectedSemester === '1' && ['oral', '15min', '45min', 'mid1', 'final1'].includes(st.value)) ||
                                                        (selectedSemester === '2' && ['oral', '15min', '45min', 'mid2', 'final2'].includes(st.value))
                                                    ).map(type => (
                                                        <TableCell key={type.value} align="center" sx={{ fontWeight: 'bold', color: '#FFFFFF', minWidth: 120 }}>{type.label}</TableCell>
                                                    ))}
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {subjects.map(subject => (
                                                    <TableRow key={subject.id} hover sx={{ '&:hover': { backgroundColor: '#2a2b37' } }}>
                                                        <TableCell sx={{ fontWeight: 'bold', color: '#e0e0e0' }}>{subject.name}</TableCell>
                                                        {scoreTypes.filter(st =>
                                                            (selectedSemester === '1' && ['oral', '15min', '45min', 'mid1', 'final1'].includes(st.value)) ||
                                                            (selectedSemester === '2' && ['oral', '15min', '45min', 'mid2', 'final2'].includes(st.value))
                                                        ).map(type => {
                                                            const scoresArr = scoresBySubjectAndSemester[selectedSemester]?.[subject.name]?.[type.value] || [];
                                                            return (
                                                                <TableCell key={type.value} align="center">
                                                                    {scoresArr.length > 0 ? (
                                                                        <Stack direction="column" spacing={0.5} justifyContent="center" alignItems="center">
                                                                            {scoresArr.map((scoreEntry, idx) => (
                                                                                <Typography key={scoreEntry.id || idx} variant="body2" sx={{ color: '#e0e0e0' }}>{scoreEntry.score}</Typography>
                                                                            ))}
                                                                        </Stack>
                                                                    ) : (
                                                                        <Typography variant="body2" sx={{ color: '#bdbdbd' }}>-</Typography>
                                                                    )}
                                                                </TableCell>
                                                            );
                                                        })}
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                ) : (
                                    <Typography variant="body2" color="text.secondary" sx={{ ml: 2, fontStyle: 'italic', color: '#e0e0e0' }}>
                                        Không có điểm nào cho học kỳ này.
                                    </Typography>
                                )}
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

                {/* Add Student Dialog (existing) */}
                <Dialog open={openAddStudentDialog} onClose={handleCloseAddStudentDialog} maxWidth="sm" fullWidth>
                    <DialogTitle sx={{ bgcolor: '#21222d', color: '#FFFFFF', borderBottom: '1px solid #3a3c4b' }}>Thêm Học sinh Mới</DialogTitle>
                    <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1, bgcolor: '#21222d', color: '#e0e0e0' }}>
                        {addStudentError && <Alert severity="error">{addStudentError}</Alert>}

                         <TextField
                             label="Họ và tên"
                             name="name"
                             value={newStudentData.name}
                             onChange={handleNewStudentInputChange}
                             fullWidth
                             required
                             sx={{
                                 '.MuiInputBase-input': { color: '#e0e0e0' },
                                 '.MuiOutlinedInput-notchedOutline': { borderColor: '#4f5263' },
                                 '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#6a6d80' },
                                 '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#7e57c2' },
                                 '.MuiInputLabel-root': { color: '#e0e0e0', '&.Mui-focused': { color: '#7e57c2' } }
                             }}
                         />

                         {/* Displaying Homeroom Class and Grade directly */}
                         {homeroomClasses.length > 0 && (
                              <Box sx={{ mt: 1 }}>
                                  <Typography variant="body1" sx={{ color: '#e0e0e0' }}>
                                      Thêm vào Lớp: <strong>{homeroomClasses[0].name}</strong> (Khối: <strong>{homeroomClasses[0].grade}</strong>)
                                  </Typography>
                              </Box>
                         )}

                        <FormControl fullWidth required>
                            <InputLabel sx={{ color: '#e0e0e0' }}>Giới tính</InputLabel>
                            <Select
                                name="gender"
                                value={newStudentData.gender}
                                label="Giới tính"
                                onChange={handleNewStudentInputChange}
                                sx={{
                                     color: '#e0e0e0',
                                     '.MuiOutlinedInput-notchedOutline': { borderColor: '#4f5263' },
                                     '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#6a6d80' },
                                     '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#7e57c2' },
                                     '.MuiSvgIcon-root': { color: '#e0e0e0' },
                                 }}
                                MenuProps={{ PaperProps: { sx: { bgcolor: '#21222d', '.MuiMenuItem-root': { color: '#e0e0e0', '&:hover': { bgcolor: '#31323d' }, '&.Mui-selected': { bgcolor: '#4f5263' } } } } }}
                            >
                                <MenuItem value="Nam">Nam</MenuItem>
                                <MenuItem value="Nữ">Nữ</MenuItem>
                                <MenuItem value="Khác">Khác</MenuItem>
                            </Select>
                        </FormControl>

                        <DatePicker
                           label="Ngày sinh"
                           value={newStudentData.birthday}
                           onChange={handleNewStudentDateChange}
                           maxDate={dayjs()}
                           slotProps={{
                               textField: {
                                   fullWidth: true,
                                    sx: {
                                        '.MuiInputBase-input': { color: '#e0e0e0' },
                                        '.MuiOutlinedInput-notchedOutline': { borderColor: '#4f5263' },
                                        '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#6a6d80' },
                                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#7e57c2' },
                                        '.MuiInputLabel-root': { color: '#e0e0e0', '&.Mui-focused': { color: '#7e57c2' } },
                                        '.MuiSvgIcon-root': { color: '#e0e0e0' },
                                    },
                               },
                           }}
                           format="DD/MM/YYYY"
                         />

                         <TextField
                             label="Email"
                             name="email"
                             value={newStudentData.email}
                             onChange={handleNewStudentInputChange}
                             fullWidth
                             sx={{
                                 '.MuiInputBase-input': { color: '#e0e0e0' },
                                 '.MuiOutlinedInput-notchedOutline': { borderColor: '#4f5263' },
                                 '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#6a6d80' },
                                 '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#7e57c2' },
                                 '.MuiInputLabel-root': { color: '#e0e0e0', '&.Mui-focused': { color: '#7e57c2' } }
                             }}
                         />
                         <TextField
                             label="Số điện thoại"
                             name="phone"
                             value={newStudentData.phone}
                             onChange={handleNewStudentInputChange}
                             fullWidth
                             sx={{
                                 '.MuiInputBase-input': { color: '#e0e0e0' },
                                 '.MuiOutlinedInput-notchedOutline': { borderColor: '#4f5263' },
                                 '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#6a6d80' },
                                 '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#7e57c2' },
                                 '.MuiInputLabel-root': { color: '#e0e0e0', '&.Mui-focused': { color: '#7e57c2' } }
                             }}
                         />
                         <TextField
                             label="Địa chỉ"
                             name="address"
                             value={newStudentData.address}
                             onChange={handleNewStudentInputChange}
                             fullWidth
                             sx={{
                                 '.MuiInputBase-input': { color: '#e0e0e0' },
                                 '.MuiOutlinedInput-notchedOutline': { borderColor: '#4f5263' },
                                 '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#6a6d80' },
                                 '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#7e57c2' },
                                 '.MuiInputLabel-root': { color: '#e0e0e0', '&.Mui-focused': { color: '#7e57c2' } }
                             }}
                         />

                    </DialogContent>
                    <DialogActions sx={{ bgcolor: '#21222d', borderTop: '1px solid #3a3c4b' }}>
                        <Button onClick={handleCloseAddStudentDialog} disabled={addingStudent}>Hủy</Button>
                        <Button onClick={handleSaveNewStudent} disabled={addingStudent || !newStudentData.name || !newStudentData.gender}>
                            {addingStudent ? <CircularProgress size={24} sx={{ color: '#e0e0e0' }} /> : 'Lưu'}
                        </Button>
                    </DialogActions>
                </Dialog>

                {/* Edit Student Dialog (New) */}
                 {studentToEdit && (
                      <Dialog open={openEditStudentDialog} onClose={handleCloseEditStudentDialog} maxWidth="sm" fullWidth>
                        <DialogTitle sx={{ bgcolor: '#21222d', color: '#FFFFFF', borderBottom: '1px solid #3a3c4b' }}>Sửa thông tin học sinh</DialogTitle>
                        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1, bgcolor: '#21222d', color: '#e0e0e0' }}>
                           {editStudentError && <Alert severity="error">{editStudentError}</Alert>}

                            <TextField
                              label="Họ và tên"
                              name="name"
                              value={studentToEdit.name}
                              onChange={handleEditStudentInputChange}
                              fullWidth
                              required
                               sx={{
                                   '.MuiInputBase-input': { color: '#e0e0e0' },
                                   '.MuiOutlinedInput-notchedOutline': { borderColor: '#4f5263' },
                                   '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#6a6d80' },
                                   '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#7e57c2' },
                                   '.MuiInputLabel-root': { color: '#e0e0e0', '&.Mui-focused': { color: '#7e57c2' } }
                               }}
                            />

                           <FormControl fullWidth required>
                               <InputLabel sx={{ color: '#e0e0e0' }}>Khối</InputLabel>
                               <Select
                                 value={selectedGrade}
                                 label="Khối"
                                 onChange={(e: SelectChangeEvent<string>) => {
                                     const grade = e.target.value as string;
                                     setSelectedGrade(grade);
                                     setStudentToEdit(prev => prev ? { ...prev, class_id: null, class: null } : null);
                                 }}
                                 sx={{
                                      color: '#e0e0e0',
                                      '.MuiOutlinedInput-notchedOutline': { borderColor: '#4f5263' },
                                      '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#6a6d80' },
                                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#7e57c2' },
                                      '.MuiSvgIcon-root': { color: '#e0e0e0' },
                                  }}
                                MenuProps={{ PaperProps: { sx: { bgcolor: '#21222d', '.MuiMenuItem-root': { color: '#e0e0e0', '&:hover': { bgcolor: '#31323d' }, '&.Mui-selected': { bgcolor: '#4f5263' } } } } }}
                               >
                                 {grades.map((grade) => (
                                     <MenuItem key={grade} value={grade}>{grade}</MenuItem>
                                 ))}
                               </Select>
                           </FormControl>

                           <FormControl fullWidth required disabled={loadingClasses || selectedGrade === ''}>
                               <InputLabel sx={{ color: '#e0e0e0' }}>Lớp</InputLabel>
                               <Select
                                 name="class_id"
                                 value={studentToEdit.class_id || ''}
                                 label="Lớp"
                                 onChange={handleEditStudentInputChange}
                                 disabled={loadingClasses || selectedGrade === ''}
                                  sx={{
                                       color: '#e0e0e0',
                                       '.MuiOutlinedInput-notchedOutline': { borderColor: '#4f5263' },
                                       '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#6a6d80' },
                                       '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#7e57c2' },
                                       '.MuiSvgIcon-root': { color: '#e0e0e0' },
                                   }}
                                 MenuProps={{ PaperProps: { sx: { bgcolor: '#21222d', '.MuiMenuItem-root': { color: '#e0e0e0', '&:hover': { bgcolor: '#31323d' }, '&.Mui-selected': { bgcolor: '#4f5263' } } } } }}
                               >
                                 {loadingClasses ? (
                                      <MenuItem disabled>Đang tải lớp...</MenuItem>
                                 ) : classesError ? (
                                      <MenuItem disabled>{classesError}</MenuItem>
                                 ) : (
                                      classes
                                          .filter(cls => String(cls.grade) === selectedGrade)
                                          .map((cls) => (
                                              <MenuItem key={cls.id} value={cls.id}>
                                                  {cls.name}
                                              </MenuItem>
                                          ))
                                 )}
                                 {!loadingClasses && !classesError && classes.filter(cls => String(cls.grade) === selectedGrade).length === 0 && selectedGrade !== '' && (
                                      <MenuItem disabled>Không có lớp nào cho khối này</MenuItem>
                                 )}
                               </Select>
                               {loadingClasses && <CircularProgress size={20} sx={{ color: '#e0e0e0', mt: 1 }} />}
                               {classesError && selectedGrade !== '' && <Typography variant="caption" color="error">{classesError}</Typography>}
                           </FormControl>


                           <FormControl fullWidth required>
                               <InputLabel sx={{ color: '#e0e0e0' }}>Giới tính</InputLabel>
                               <Select
                                 name="gender"
                                 value={studentToEdit.gender}
                                 label="Giới tính"
                                 onChange={handleEditStudentInputChange}
                                 sx={{
                                      color: '#e0e0e0',
                                      '.MuiOutlinedInput-notchedOutline': { borderColor: '#4f5263' },
                                      '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#6a6d80' },
                                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#7e57c2' },
                                      '.MuiSvgIcon-root': { color: '#e0e0e0' },
                                  }}
                                 MenuProps={{ PaperProps: { sx: { bgcolor: '#21222d', '.MuiMenuItem-root': { color: '#e0e0e0', '&:hover': { bgcolor: '#31323d' }, '&.Mui-selected': { bgcolor: '#4f5263' } } } } }}
                               >
                                 <MenuItem value="Nam">Nam</MenuItem>
                                 <MenuItem value="Nữ">Nữ</MenuItem>
                                 <MenuItem value="Khác">Khác</MenuItem>
                               </Select>
                           </FormControl>

                           <DatePicker
                              label="Ngày sinh"
                              value={studentToEdit.birthday ? dayjs(studentToEdit.birthday) : null}
                              onChange={handleEditStudentDateChange}
                              maxDate={dayjs()}
                              slotProps={{
                                  textField: {
                                      fullWidth: true,
                                       sx: {
                                           '.MuiInputBase-input': { color: '#e0e0e0' },
                                           '.MuiOutlinedInput-notchedOutline': { borderColor: '#4f5263' },
                                           '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#6a6d80' },
                                           '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#7e57c2' },
                                           '.MuiInputLabel-root': { color: '#e0e0e0', '&.Mui-focused': { color: '#7e57c2' } },
                                           '.MuiSvgIcon-root': { color: '#e0e0e0' },
                                       },
                                  },
                              }}
                              format="DD/MM/YYYY"
                            />

                            <TextField
                                label="Email"
                                name="email"
                                value={studentToEdit.email || ''}
                                onChange={handleEditStudentInputChange}
                                fullWidth
                                sx={{
                                    '.MuiInputBase-input': { color: '#e0e0e0' },
                                    '.MuiOutlinedInput-notchedOutline': { borderColor: '#4f5263' },
                                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#6a6d80' },
                                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#7e57c2' },
                                    '.MuiInputLabel-root': { color: '#e0e0e0', '&.Mui-focused': { color: '#7e57c2' } }
                                }}
                            />
                            <TextField
                                label="Số điện thoại"
                                name="phone"
                                value={studentToEdit.phone || ''}
                                onChange={handleEditStudentInputChange}
                                fullWidth
                                sx={{
                                    '.MuiInputBase-input': { color: '#e0e0e0' },
                                    '.MuiOutlinedInput-notchedOutline': { borderColor: '#4f5263' },
                                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#6a6d80' },
                                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#7e57c2' },
                                    '.MuiInputLabel-root': { color: '#e0e0e0', '&.Mui-focused': { color: '#7e57c2' } }
                                }}
                            />
                            <TextField
                                label="Địa chỉ"
                                name="address"
                                value={studentToEdit.address || ''}
                                onChange={handleEditStudentInputChange}
                                fullWidth
                                sx={{
                                    '.MuiInputBase-input': { color: '#e0e0e0' },
                                    '.MuiOutlinedInput-notchedOutline': { borderColor: '#4f5263' },
                                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#6a6d80' },
                                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#7e57c2' },
                                    '.MuiInputLabel-root': { color: '#e0e0e0', '&.Mui-focused': { color: '#7e57c2' } }
                                }}
                            />

                        </DialogContent>
                        <DialogActions sx={{ bgcolor: '#21222d', borderTop: '1px solid #3a3c4b' }}>
                           <Button onClick={handleCloseEditStudentDialog} disabled={editingStudent}>Hủy</Button>
                           <Button onClick={handleSaveEditedStudent} disabled={editingStudent || !studentToEdit.name || !studentToEdit.gender || !studentToEdit.class_id}>
                             {editingStudent ? <CircularProgress size={24} sx={{ color: '#e0e0e0' }} /> : 'Lưu'}
                           </Button>
                         </DialogActions>
                      </Dialog>
                 )}

                 <Dialog open={openDeleteStudentConfirm} onClose={handleCloseDeleteStudentConfirm}>
                      <DialogTitle sx={{ bgcolor: '#21222d', color: '#FFFFFF', borderBottom: '1px solid #3a3c4b' }}>Xác nhận xóa học sinh</DialogTitle>
                      <DialogContent sx={{ bgcolor: '#21222d', color: '#e0e0e0' }}>
                         {deleteStudentError && <Alert severity="error">{deleteStudentError}</Alert>}
                         <Typography sx={{ color: '#e0e0e0' }}>Bạn có chắc chắn muốn xóa học sinh <strong>{studentToDeleteName}</strong> này không?</Typography>
                      </DialogContent>
                      <DialogActions sx={{ bgcolor: '#21222d', borderTop: '1px solid #3a3c4b' }}>
                         <Button onClick={handleCloseDeleteStudentConfirm} disabled={deletingStudent}>Hủy</Button>
                         <Button onClick={handleConfirmDeleteStudent} color="error" disabled={deletingStudent}>
                            {deletingStudent ? <CircularProgress size={24} sx={{ color: '#e0e0e0' }} /> : 'Xóa'}
                         </Button>
                      </DialogActions>
                 </Dialog>
                             <Snackbar
                open={notification.open} 
                autoHideDuration={8000} 
                onClose={handleCloseNotification} 
                anchorOrigin={{ vertical: 'top', horizontal: 'center' }} 
            >
                <Alert
                    onClose={handleCloseNotification}
                    severity={notification.severity}
                    sx={{ width: '100%' }}
                >
                    {notification.message}
                </Alert>
            </Snackbar>
            </Box>
        </LocalizationProvider>
    );
};

export default Homeroom;