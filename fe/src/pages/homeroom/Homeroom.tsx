import React, { useEffect, useState, useMemo } from 'react';
import {
    Typography, Box, CircularProgress, Alert, Paper, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow, Divider, Stack,
    Tooltip, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Button, Grid,
    TextField, Select, MenuItem, FormControl, InputLabel
} from '@mui/material';
import AssessmentIcon from '@mui/icons-material/Assessment';
import { Edit, Delete, Add as AddIcon } from '@mui/icons-material';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import axios, { isAxiosError, AxiosError } from 'axios';
import dayjs from 'dayjs';
import Snackbar from '@mui/material/Snackbar';
import 'dayjs/locale/vi';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';


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
     class_id: number; 
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
    const [homeroomClasses, setHomeroomClasses] = useState<HomeroomClass[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const [loadingAllStatistics, setLoadingAllStatistics] = useState(false);
    const [allStatisticsError, setAllStatisticsError] = useState<string | null>(null);


      const [notification, setNotification] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({
    open: false,
    message: '',
    severity: 'success',
  });
    // States cho Dialog xem điểm
    const [openScoreDialog, setOpenScoreDialog] = useState(false);
    const [currentStudentForScores, setCurrentStudentForScores] = useState<Student | null>(null);
    const [scores, setScores] = useState<Score[]>([]);
    const [loadingScores, setLoadingScores] = useState<boolean>(false);
    const [scoreError, setScoreError] = useState<string | null>(null);

    const [studentAverageScore, setStudentAverageScore] = useState<number | null>(null);
    const [studentPerformanceCategory, setStudentPerformanceCategory] = useState<string>('Đang tính...');

    // States and handlers for Add Score Dialog
    const [openAddScoreDialog, setOpenAddScoreDialog] = useState(false);
    const [newScoreData, setNewScoreData] = useState({
        subject_id: '',
        score: '',
        type: ''
    });
    const [addingScore, setAddingScore] = useState(false);
    const [addScoreError, setAddScoreError] = useState<string | null>(null);

    // States and handlers for Edit Score Dialog
    const [openEditScoreDialog, setOpenEditScoreDialog] = useState(false);
    const [scoreToEdit, setScoreToEdit] = useState<Score | null>(null);
    const [editingScore, setEditingScore] = useState(false);
    const [editScoreError, setEditScoreError] = useState<string | null>(null);

    // States and handlers for Delete Score Confirmation Dialog
    const [openDeleteScoreConfirm, setOpenDeleteScoreConfirm] = useState(false);
    const [scoreToDeleteId, setScoreToDeleteId] = useState<number | null>(null);
    const [deletingScore, setDeletingScore] = useState(false);
    const [deleteScoreError, setDeleteScoreError] = useState<string | null>(null);

    // States for Subjects list (for add/edit score forms)
    const [subjects, setSubjects] = useState<SubjectData[]>([]);
    const [loadingSubjects, setLoadingSubjects] = useState(false);
    const [subjectError, setSubjectError] = useState<string | null>(null);

    // States and handlers for Add Student Dialog
    const [openAddStudentDialog, setOpenAddStudentDialog] = useState(false);
    const [newStudentData, setNewStudentData] = useState({
        name: '',
        gender: '',
        birthday: null as Date | null,
        email: '',
        phone: '',
        address: '',
    });
    const [addingStudent, setAddingStudent] = useState(false);
    const [addStudentError, setAddStudentError] = useState<string | null>(null);

     // States and handlers for Delete Student Confirmation Dialog (New)
    const [openDeleteStudentConfirm, setOpenDeleteStudentConfirm] = useState(false);
    const [studentToDeleteId, setStudentToDeleteId] = useState<number | null>(null);
    const [studentToDeleteName, setStudentToDeleteName] = useState<string | null>(null);
    const [deletingStudent, setDeletingStudent] = useState(false);
    const [deleteStudentError, setDeleteStudentError] = useState<string | null>(null);

    // States and handlers for Edit Student Dialog (New)
    const [openEditStudentDialog, setOpenEditStudentDialog] = useState(false);
    const [studentToEdit, setStudentToEdit] = useState<Student | null>(null);
    const [editingStudent, setEditingStudent] = useState(false);
    const [editStudentError, setEditStudentError] = useState<string | null>(null);
    // Re-introduced states for class/grade selection for Edit Dialog
    const [classes, setClasses] = useState<ClassOption[]>([]);
    const [loadingClasses, setLoadingClasses] = useState(false);
    const [classesError, setClassesError] = useState<string | null>(null);
    const [selectedGrade, setSelectedGrade] = useState<string>('');


    const scoreTypes: ScoreType[] = useMemo(() => [
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


    // Fetch scores for a student
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

    // Fetch subjects for the forms
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
          if (isAxiosError(err) && err.response) {
              const axiosError = err as AxiosError<any>;
              setSubjectError(axiosError.response?.data?.message || 'Không thể tải danh sách môn học.');
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

    // Handlers for Add Score Dialog
    const handleOpenAddScoreDialog = () => {
        setNewScoreData({ subject_id: '', score: '', type: '' });
        setAddScoreError(null);
        setOpenAddScoreDialog(true);
    };

    const handleCloseAddScoreDialog = () => {
        setOpenAddScoreDialog(false);
    };

    const handleNewScoreInputChange = (e: React.ChangeEvent<{ name?: string; value: unknown }>) => {
        const { name, value } = e.target;
        setNewScoreData(prev => ({ ...prev, [name as string]: value }));
      };

    const handleCloseNotification = (event?: React.SyntheticEvent | Event, reason?: string) => {
      if (reason === 'clickaway') { 
        return;
      }
      setNotification({ ...notification, open: false }); 
    };
    const handleSaveNewScore = async () => {
        if (!currentStudentForScores?.id || !newScoreData.subject_id || !newScoreData.type || newScoreData.score === '') {
          setAddScoreError('Vui lòng điền đầy đủ thông tin.');
          return;
        }
        setAddingScore(true);
        setAddScoreError(null);
        try {
          const token = localStorage.getItem('token');
          if (!token) {
            setAddScoreError('Phiên đăng nhập hết hạn.');
            setAddingScore(false);
            return;
          }
          const dataToSend = {
            student_id: currentStudentForScores.id,
            subject_id: parseInt(newScoreData.subject_id as string),
            score: parseFloat(newScoreData.score as string),
            type: newScoreData.type
          };
          await axios.post('http://localhost:8000/api/scores', dataToSend, {
            headers: { Authorization: `Bearer ${token}` },
          });
          handleCloseAddScoreDialog();
          fetchStudentScores(currentStudentForScores.id);
        } catch (err: any) {
          console.error("Error adding score:", err.response || err);
          if (isAxiosError(err) && err.response) {
            if (err.response.data && err.response.data.errors) {
              setAddScoreError("Lỗi nhập liệu: " + Object.values(err.response.data.errors).join(', '));
            } else if (err.response.data && err.response.data.message) {
              setAddScoreError("Lỗi: " + err.response.data.message);
            } else {
              setAddScoreError("Lỗi khi thêm điểm.");
            }
          } else {
            setAddScoreError("Lỗi không xác định khi thêm điểm.");
          }
        } finally {
          setAddingScore(false);
        }
    };


    // Handlers for Edit Score Dialog
    const handleOpenEditScoreDialog = (scoreData: Score) => {
        setScoreToEdit(scoreData);
        setEditScoreError(null);
        setOpenEditScoreDialog(true);
    };

    const handleCloseEditScoreDialog = () => {
        setOpenEditScoreDialog(false);
        setScoreToEdit(null);
    };

    const handleEditScoreInputChange = (e: React.ChangeEvent<{ name?: string; value: unknown }>) => {
        const { name, value } = e.target;
        setScoreToEdit(prev => prev ? { ...prev, [name as string]: value } : null);
    };

    const handleSaveEditedScore = async () => {
        if (!scoreToEdit?.id || scoreToEdit.score === '') {
          setEditScoreError('Điểm số không hợp lệ.');
          return;
        }
        setEditingScore(true);
        setEditScoreError(null);
        try {
          const token = localStorage.getItem('token');
          if (!token) {
            setEditScoreError('Phiên đăng nhập hết hạn.');
            setEditingScore(false);
            return;
          }
          const dataToSend = {
            score: parseFloat(scoreToEdit.score as string),
          }
          await axios.put(`http://localhost:8000/api/scores/${scoreToEdit.id}`, dataToSend, {
            headers: { Authorization: `Bearer ${token}` },
          });
          handleCloseEditScoreDialog();
          if (currentStudentForScores) {
              fetchStudentScores(currentStudentForScores.id);
          }
        } catch (err: any) {
          console.error("Error updating score:", err.response || err);
          if (isAxiosError(err) && err.response) {
            if (err.response.data && err.response.data.errors) {
              setEditScoreError("Lỗi nhập liệu: " + Object.values(err.response.data.errors).join(', '));
            } else if (err.response.data && err.response.data.message) {
              setEditScoreError("Lỗi: " + err.response.data.message);
            } else {
              setEditScoreError("Lỗi khi cập nhật điểm.");
            }
          } else {
            setEditScoreError("Lỗi không xác định khi cập nhật điểm.");
          }
        } finally {
          setEditingScore(false);
        }
    };

    // Handlers for Delete Score Confirmation Dialog
    const handleOpenDeleteScoreConfirm = (scoreId: number) => {
        setScoreToDeleteId(scoreId);
        setDeleteScoreError(null);
        setOpenDeleteScoreConfirm(true);
    };

    const handleCloseDeleteScoreConfirm = () => {
        setOpenDeleteScoreConfirm(false);
        setScoreToDeleteId(null);
    };

    const handleConfirmDeleteScore = async () => {
        if (!scoreToDeleteId || !currentStudentForScores?.id) return;
        setDeletingScore(true);
        setDeleteScoreError(null);
        try {
          const token = localStorage.getItem('token');
          if (!token) {
            setDeleteScoreError('Phiên đăng nhập hết hạn.');
            setDeletingScore(false);
            return;
          }
          await axios.delete(`http://localhost:8000/api/scores/${scoreToDeleteId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          handleCloseDeleteScoreConfirm();
          fetchStudentScores(currentStudentForScores.id);
        } catch (err: any) {
          console.error("Error deleting score:", err.response || err);
          if (isAxiosError(err) && err.response && err.response.data && err.response.data.message) {
            setDeleteScoreError("Lỗi: " + err.response.data.message);
          } else {
            setDeleteScoreError("Lỗi không xác định khi xóa điểm.");
          }
        } finally {
          setDeletingScore(false);
        }
    };


    // Logic để tổ chức điểm theo môn học cho hiển thị trong bảng Dialog
    const scoresBySubjectForDisplay = useMemo(() => {
        const organized: { [subjectName: string]: { [scoreType: string]: Score } } = {};

        scores.forEach(score => {
            const subjectName = score.subject?.name || score.subject_name || (score.subject as string) || 'Không rõ môn';
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

    // --- Add Student Functionality ---

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

    const handleNewStudentInputChange = (e: React.ChangeEvent<{ name?: string; value: unknown }>) => {
        const { name, value } = e.target;
         setNewStudentData(prev => ({ ...prev, [name as string]: value }));
    };

     const handleNewStudentDateChange = (date: Date | null) => {
         setNewStudentData(prev => ({ ...prev, birthday: date }));
     };


    const handleSaveNewStudent = async () => {
        if (!homeroomClasses || homeroomClasses.length === 0) {
            setAddStudentError('Không tìm thấy lớp chủ nhiệm để thêm học sinh.');
            return;
        }

        const homeroomClassId = homeroomClasses[0].id;

        if (!newStudentData.name || !newStudentData.gender) {
            setAddStudentError('Vui lòng điền đủ Họ và tên và Giới tính.');
            return;
        }

        setAddingStudent(true);
        setAddStudentError(null);

        try {
            const token = localStorage.getItem('token');
            if (!token) {
                setAddStudentError('Phiên đăng nhập hết hạn.');
                setAddingStudent(false);
                return;
            }

            const dataToSend = {
                name: newStudentData.name,
                gender: newStudentData.gender,
                birthday: newStudentData.birthday ? dayjs(newStudentData.birthday).format('YYYY-MM-DD') : null,
                email: newStudentData.email || null,
                phone: newStudentData.phone || null,
                address: newStudentData.address || null,
                class_id: homeroomClassId,
            };

            const res = await axios.post(`http://localhost:8000/api/students`, dataToSend, {
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
             if (isAxiosError(err) && err.response) {
                 const axiosError = err as AxiosError<any>;
                 if (axiosError.response.data && axiosError.response.data.errors) {
                   setAddStudentError("Lỗi nhập liệu: " + Object.values(axiosError.response.data.errors).flat().join(', '));
                 } else if (axiosError.response.data && axiosError.response.data.message) {
                   setAddStudentError("Lỗi: " + axiosError.response.data.message);
                 } else {
                   setAddStudentError("Lỗi khi thêm học sinh.");
                 }
             } else {
               setAddStudentError("Lỗi không xác định khi thêm học sinh.");
             }
        } finally {
            setAddingStudent(false);
        }
    };
    

     const grades = ['10', '11', '12']; // Assuming these are the relevant grades

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
           const response = await axios.get<ClassOption[]>(`http://localhost:8000/api/classes`, {
             headers: { Authorization: `Bearer ${token}` },
           });
            const filteredClasses = Array.isArray(response.data) ? response.data.filter(cls => grades.includes(String(cls.grade))) : [];
           setClasses(filteredClasses);
         } catch (err: any) {
           console.error("Error fetching classes:", err);
           if (isAxiosError(err) && err.response) {
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
                 setDeleteStudentError('Phiên đăng nhập hết hạn.');
                 setDeletingStudent(false);
                 return;
             }
             await axios.delete(`http://localhost:8000/api/students/${studentToDeleteId}`, {
                 headers: { Authorization: `Bearer ${token}` },
             });
             handleCloseDeleteStudentConfirm();
             fetchHomeroomClassesWithStats(); // Refresh data after deletion
         } catch (err: any) {
              console.error("Error deleting student:", err.response || err);
              if (isAxiosError(err) && err.response && err.response.data && err.response.data.message) {
                setDeleteStudentError("Lỗi: " + err.response.data.message);
              } else {
                setDeleteStudentError("Lỗi không xác định khi xóa học sinh.");
              }
         } finally {
             setDeletingStudent(false);
         }
     };

     const handleOpenEditStudentDialog = (student: Student) => {
         setStudentToEdit(student);
         // Set selected grade and fetch classes for the dropdown
          setSelectedGrade(String(student.class?.grade || '')); // Set grade based on student's class
         fetchClasses(); // Fetch classes for the dropdown
         setEditStudentError(null);
         setOpenEditStudentDialog(true);
     };

     const handleCloseEditStudentDialog = () => {
         setOpenEditStudentDialog(false);
         setStudentToEdit(null);
         setSelectedGrade(''); // Reset grade and class selection states
         // setClasses([]); // Optionally reset classes state
         setEditStudentError(null);
     };

     const handleEditStudentInputChange = (e: React.ChangeEvent<{ name?: string; value: unknown }>) => {
         const { name, value } = e.target;
          setStudentToEdit(prev => prev ? { ...prev, [name as string]: value } : null);
     };

    const handleEditStudentDateChange = (date: Date | null) => {
        setStudentToEdit(prev => prev ? { ...prev, birthday: date ? dayjs(date).format('YYYY-MM-DD') : null } : null);
    };


     const handleSaveEditedStudent = async () => {
         if (!studentToEdit?.id || !studentToEdit.name || !studentToEdit.gender || !studentToEdit.class_id) {
             setEditStudentError('Vui lòng điền đủ Họ và tên, Giới tính và Lớp.');
             return;
         }
         setEditingStudent(true);
         setEditStudentError(null);
         try {
             const token = localStorage.getItem('token');
             if (!token) {
                 setEditStudentError('Phiên đăng nhập hết hạn.');
                 setEditingStudent(false);
                 return;
             }

             const dataToSend = {
                 name: studentToEdit.name,
                 gender: studentToEdit.gender,
                 birthday: studentToEdit.birthday, // Already formatted in handleEditStudentDateChange
                 email: studentToEdit.email || null,
                 phone: studentToEdit.phone || null,
                 address: studentToEdit.address || null,
                 class_id: studentToEdit.class_id,
             };

             await axios.put(`http://localhost:8000/api/students/${studentToEdit.id}`, dataToSend, {
                 headers: {
                     Authorization: `Bearer ${token}`,
                     'Content-Type': 'application/json'
                 },
             });
             handleCloseEditStudentDialog();
             fetchHomeroomClassesWithStats(); // Refresh data after edit
         } catch (err: any) {
             console.error("Error updating student:", err.response || err);
              if (isAxiosError(err) && err.response) {
                  const axiosError = err as AxiosError<any>;
                  if (axiosError.response.data && axiosError.response.data.errors) {
                    setEditStudentError("Lỗi nhập liệu: " + Object.values(axiosError.response.data.errors).flat().join(', '));
                  } else if (axiosError.response.data && axiosError.response.data.message) {
                    setEditStudentError("Lỗi: " + axiosError.response.data.message);
                  } else {
                    setEditStudentError("Lỗi khi cập nhật học sinh.");
                  }
              } else {
                setEditStudentError("Lỗi không xác định khi cập nhật học sinh.");
              }
         } finally {
             setEditingStudent(false);
         }
     };

    // Helper to get grade from class name (assuming format like '10A1', '11B3', etc.)
    const getGradeFromClassName = (className: string | undefined | null): string => {
         if (!className) return '';
         const match = className.match(/^(\d+)/);
         return match ? match[1] : '';
     };


    // --- End Edit and Delete Student Functionality ---


    useEffect(() => {
        const fetchHomeroomClassesWithStats = async () => {
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

                const classesResponse = await axios.get<HomeroomClass[]>('http://localhost:8000/api/teacher/classes/homeroom', {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json'
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
                            axios.get<{ average_subject_scores: ClassSubjectAverage[] }>(`http://localhost:8000/api/classes/${classItem.id}/average-subject-scores`, {
                                headers: { Authorization: `Bearer ${token}` },
                            }),
                             axios.get<{ performance_summary: ClassPerformanceSummaryData }>(`http://localhost:8000/api/classes/${classItem.id}/performance-summary`, {
                                headers: { Authorization: `Bearer ${token}` },
                             }),
                        ]);

                        // Ensure students have a 'class' object for the edit dialog
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
                         // Ensure students are still included even if stats fail, with class info
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
                if (isAxiosError(err) && err.response) {
                    const axiosError = err as AxiosError<any>;
                    const apiMessage = axiosError.response.data?.message;
                    const statusCode = axiosError.response.status;
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
        };

        fetchHomeroomClassesWithStats();
    }, []);

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


    return (
        <LocalizationProvider dateAdapter={AdapterDayjs}>
            <Box sx={{ p: 3, bgcolor: '#1a1c23', minHeight: '100vh', color: '#e0e0e0' }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 4 }}>
                    <Typography variant="h4" gutterBottom sx={{ color: '#FFFFFF', mb: 0 }}>
                        Lớp Chủ Nhiệm
                    </Typography>
                    {/* Add Student Button */}
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
                                    {/* Thông tin lớp */}
                                    <Box>
                                        <Typography variant="h6" gutterBottom sx={{ borderBottom: '1px solid #4f5263', pb: 1, mb: 2, fontWeight: 'bold', color: '#FFFFFF', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                                            <Box>
                                                Thông tin lớp {classItem.name} (Khối {classItem.grade})
                                            </Box>
                                            <Box>{classItem.school_year}</Box>
                                        </Typography>
                                        {/* Các thông tin chi tiết của lớp */}
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

                                    {/* Thống kê học lực của lớp */}
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


                                    {/* Điểm trung bình từng môn của lớp */}
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


                                    {/* Tiêu đề danh sách học sinh */}
                                    <Box>
                                        <Typography variant="h6" gutterBottom sx={{ borderBottom: '1px solid #4f5263', pb: 1, mb: 2, fontWeight: 'bold', color: '#FFFFFF' }}>
                                            Danh sách học sinh lớp {classItem.name} ({classItem.students ? classItem.students.length : 0})
                                        </Typography>

                                        {/* Bảng hiển thị danh sách học sinh */}
                                        {classItem.students && classItem.students.length > 0 ? (
                                            <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #3a3c4b', borderRadius: '8px', overflow: 'hidden', bgcolor: '#21222d' }}>
                                                <Table size="small" sx={{ '& .MuiTableCell-root': { borderBottom: '1px solid #4f5263', color: '#e0e0e0' } }}>
                                                    <TableHead>
                                                        <TableRow sx={{ backgroundColor: '#31323d' }}>
                                                            <TableCell sx={{ fontWeight: 'bold', color: '#FFFFFF' }}>ID</TableCell>
                                                            <TableCell sx={{ fontWeight: 'bold', color: '#FFFFFF' }}>Họ và tên</TableCell>
                                                            <TableCell sx={{ fontWeight: 'bold', color: '#FFFFFF' }}>Ngày sinh</TableCell>
                                                            <TableCell sx={{ fontWeight: 'bold', color: '#FFFFFF' }}>Giới tính</TableCell>
                                                            <TableCell sx={{ fontWeight: 'bold', color: '#FFFFFF' }}>Email</TableCell>
                                                            <TableCell sx={{ fontWeight: 'bold', color: '#FFFFFF' }}>Số điện thoại</TableCell>
                                                            <TableCell sx={{ fontWeight: 'bold', color: '#FFFFFF' }}>Địa chỉ</TableCell>
                                                            {/* Changed header to Thao tác */}
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
                <Dialog open={openScoreDialog} onClose={handleCloseScoreDialog} maxWidth="md" fullWidth>
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
                             <Tooltip title="Thêm điểm mới">
                                 <IconButton
                                    color="primary"
                                    onClick={handleOpenAddScoreDialog}
                                    disabled={loadingSubjects}
                                    aria-label="Thêm điểm mới"
                                    sx={{ color: '#e0e0e0' }}
                                 >
                                    <AddIcon />
                                 </IconButton>
                              </Tooltip>
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

                                {Object.keys(scoresBySubjectForDisplay).length > 0 ? (
                                    <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #3a3c4b', borderRadius: '8px', overflow: 'hidden', bgcolor: '#21222d' }}>
                                        <Table size="small" sx={{ '& .MuiTableCell-root': { borderBottom: '1px solid #4f5263', color: '#e0e0e0' } }}>
                                            <TableHead>
                                                <TableRow sx={{ backgroundColor: '#31323d' }}>
                                                    <TableCell sx={{ fontWeight: 'bold', color: '#FFFFFF' }}>Môn học</TableCell>
                                                    {scoreTypes.map(type => (
                                                        <TableCell key={type.value} align="right" sx={{ fontWeight: 'bold', color: '#FFFFFF' }}>{type.label}</TableCell>
                                                    ))}
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {Object.entries(scoresBySubjectForDisplay).map(([subjectName, scoresOfType]) => (
                                                    <TableRow key={subjectName} hover sx={{ '&:hover': { backgroundColor: '#2a2b37' } }}>
                                                        <TableCell sx={{ color: '#e0e0e0' }}>{subjectName}</TableCell>
                                                        {scoreTypes.map(type => {
                                                            const scoreEntry = scoresOfType[type.value];
                                                            return (
                                                                <TableCell key={type.value} align="right" sx={{ color: '#e0e0e0' }}>
                                                                    {scoreEntry ? (
                                                                         <Stack direction="row" spacing={0.5} justifyContent="flex-end" alignItems="center">
                                                                             <Typography variant="body2" sx={{ color: '#e0e0e0' }}>{scoreEntry.score}</Typography>
                                                                             <Tooltip title="Sửa điểm">
                                                                                  <IconButton
                                                                                    size="small"
                                                                                    onClick={() => handleOpenEditScoreDialog(scoreEntry)}
                                                                                    aria-label="Sửa điểm"
                                                                                     sx={{ color: '#e0e0e0' }}
                                                                                  >
                                                                                     <Edit fontSize="small" />
                                                                                  </IconButton>
                                                                             </Tooltip>
                                                                              <Tooltip title="Xóa điểm">
                                                                                 <IconButton
                                                                                    size="small"
                                                                                    onClick={() => handleOpenDeleteScoreConfirm(scoreEntry.id)}
                                                                                    aria-label="Xóa điểm"
                                                                                    color="error"
                                                                                 >
                                                                                     <Delete fontSize="small" />
                                                                                 </IconButton>
                                                                              </Tooltip>
                                                                         </Stack>
                                                                    ) : (
                                                                         '-'
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
                                        Không tìm thấy điểm chi tiết theo môn.
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

                {/* Add Score Dialog (existing) */}
                <Dialog open={openAddScoreDialog} onClose={handleCloseAddScoreDialog} maxWidth="xs" fullWidth>
                    <DialogTitle sx={{ bgcolor: '#21222d', color: '#FFFFFF', borderBottom: '1px solid #3a3c4b' }}>Thêm Điểm Mới</DialogTitle>
                    <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1, bgcolor: '#21222d', color: '#e0e0e0' }}>
                      <Typography sx={{ color: '#e0e0e0' }}>Học sinh: {currentStudentForScores?.name || ''}</Typography>
                       {addScoreError && <Alert severity="error">{addScoreError}</Alert>}

                      <FormControl fullWidth required disabled={loadingSubjects}>
                        <InputLabel sx={{ color: '#e0e0e0' }}>Môn học</InputLabel>
                        <Select
                          name="subject_id"
                          value={newScoreData.subject_id}
                          label="Môn học"
                          onChange={handleNewScoreInputChange}
                          sx={{
                              color: '#e0e0e0',
                              '.MuiOutlinedInput-notchedOutline': {
                                borderColor: '#4f5263',
                              },
                              '&:hover .MuiOutlinedInput-notchedOutline': {
                                borderColor: '#6a6d80',
                              },
                              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                borderColor: '#7e57c2',
                              },
                              '.MuiSvgIcon-root': {
                                color: '#e0e0e0',
                              },
                          }}
                           MenuProps={{
                               PaperProps: {
                                    sx: {
                                         bgcolor: '#21222d',
                                         '.MuiMenuItem-root': {
                                             color: '#e0e0e0',
                                             '&:hover': {
                                                bgcolor: '#31323d',
                                             },
                                             '&.Mui-selected': {
                                                bgcolor: '#4f5263',
                                             }
                                         },
                                    },
                               },
                           }}
                        >
                          {loadingSubjects ? (
                             <MenuItem disabled>Đang tải môn học...</MenuItem>
                          ) : (
                             subjects.map(subject => (
                               <MenuItem key={subject.id} value={subject.id}>
                                 {subject.name}
                               </MenuItem>
                             ))
                          )}
                           {!loadingSubjects && subjects.length === 0 && (
                              <MenuItem disabled>Không có môn học</MenuItem>
                           )}
                        </Select>
                      </FormControl>

                       <FormControl fullWidth required>
                         <InputLabel sx={{ color: '#e0e0e0' }}>Loại điểm</InputLabel>
                          <Select
                            name="type"
                            value={newScoreData.type}
                            label="Loại điểm"
                            onChange={handleNewScoreInputChange}
                             sx={{
                                color: '#e0e0e0',
                                '.MuiOutlinedInput-notchedOutline': {
                                  borderColor: '#4f5263',
                                },
                                '&:hover .MuiOutlinedInput-notchedOutline': {
                                  borderColor: '#6a6d80',
                                },
                                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                  borderColor: '#7e57c2',
                                },
                                '.MuiSvgIcon-root': {
                                  color: '#e0e0e0',
                                },
                            }}
                            MenuProps={{
                               PaperProps: {
                                    sx: {
                                         bgcolor: '#21222d',
                                         '.MuiMenuItem-root': {
                                             color: '#e0e0e0',
                                             '&:hover': {
                                                bgcolor: '#31323d',
                                             },
                                             '&.Mui-selected': {
                                                bgcolor: '#4f5263',
                                             }
                                         },
                                    },
                               },
                           }}
                          >
                            {scoreTypes.map(type => (
                              <MenuItem key={type.value} value={type.value}>
                                {type.label}
                              </MenuItem>
                            ))}
                          </Select>
                       </FormControl>

                      <TextField
                        margin="normal"
                        required
                        fullWidth
                        label="Điểm số"
                        name="score"
                        type="number"
                        inputProps={{ step: "0.1", min: "0", max: "10" }}
                        value={newScoreData.score}
                        onChange={handleNewScoreInputChange}
                         sx={{
                            '.MuiInputBase-input': {
                              color: '#e0e0e0',
                            },
                            '.MuiOutlinedInput-notchedOutline': {
                              borderColor: '#4f5263',
                            },
                            '&:hover .MuiOutlinedInput-notchedOutline': {
                              borderColor: '#6a6d80',
                            },
                            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                              borderColor: '#7e57c2',
                            },
                            '.MuiInputLabel-root': {
                                color: '#e0e0e0',
                                '&.Mui-focused': {
                                    color: '#7e57c2',
                                }
                            }
                        }}
                      />
                    </DialogContent>
                   <DialogActions sx={{ bgcolor: '#21222d', borderTop: '1px solid #3a3c4b' }}>
                      <Button onClick={handleCloseAddScoreDialog} disabled={addingScore}>Hủy</Button>
                      <Button onClick={handleSaveNewScore} disabled={addingScore || !newScoreData.subject_id || !newScoreData.type || newScoreData.score === ''}>
                        {addingScore ? <CircularProgress size={24} sx={{ color: '#e0e0e0' }} /> : 'Lưu'}
                      </Button>
                    </DialogActions>
                </Dialog>

                {/* Edit Score Dialog (existing) */}
                {scoreToEdit && (
                     <Dialog open={openEditScoreDialog} onClose={handleCloseEditScoreDialog} maxWidth="xs" fullWidth>
                       <DialogTitle sx={{ bgcolor: '#21222d', color: '#FFFFFF', borderBottom: '1px solid #3a3c4b' }}>Sửa Điểm</DialogTitle>
                       <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1, bgcolor: '#21222d', color: '#e0e0e0' }}>
                         <Typography sx={{ color: '#e0e0e0' }}>Môn: {scoreToEdit.subject?.name || scoreToEdit.subject_name || (scoreToEdit.subject as string) || '---'}</Typography>
                         <Typography sx={{ color: '#e0e0e0' }}>Loại điểm: {scoreTypes.find(t => t.value === scoreToEdit.type)?.label || scoreToEdit.type || '---'}</Typography>

                         {editScoreError && <Alert severity="error">{editScoreError}</Alert>}

                         <TextField
                           margin="normal"
                           required
                           fullWidth
                           label="Điểm số"
                           name="score"
                           type="number"
                           inputProps={{ step: "0.1", min: "0", max: "10" }}
                           value={scoreToEdit.score}
                           onChange={handleEditScoreInputChange}
                            sx={{
                                '.MuiInputBase-input': {
                                  color: '#e0e0e0',
                                },
                                '.MuiOutlinedInput-notchedOutline': {
                                  borderColor: '#4f5263',
                                },
                                '&:hover .MuiOutlinedInput-notchedOutline': {
                                  borderColor: '#6a6d80',
                                },
                                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                  borderColor: '#7e57c2',
                                },
                                 '.MuiInputLabel-root': {
                                    color: '#e0e0e0',
                                    '&.Mui-focused': {
                                        color: '#7e57c2',
                                    }
                                }
                            }}
                         />
                       </DialogContent>
                       <DialogActions sx={{ bgcolor: '#21222d', borderTop: '1px solid #3a3c4b' }}>
                         <Button onClick={handleCloseEditScoreDialog} disabled={editingScore}>Hủy</Button>
                         <Button onClick={handleSaveEditedScore} disabled={editingScore || scoreToEdit.score === ''}>
                           {editingScore ? <CircularProgress size={24} sx={{ color: '#e0e0e0' }} /> : 'Lưu'}
                         </Button>
                       </DialogActions>
                     </Dialog>
                )}

                {/* Delete Score Confirmation Dialog (existing) */}
                <Dialog open={openDeleteScoreConfirm} onClose={handleCloseDeleteScoreConfirm}>
                     <DialogTitle sx={{ bgcolor: '#21222d', color: '#FFFFFF', borderBottom: '1px solid #3a3c4b' }}>Xác nhận xóa điểm</DialogTitle>
                     <DialogContent sx={{ bgcolor: '#21222d', color: '#e0e0e0' }}>
                        {deleteScoreError && <Alert severity="error">{deleteScoreError}</Alert>}
                        <Typography sx={{ color: '#e0e0e0' }}>Bạn có chắc chắn muốn xóa điểm này không?</Typography>
                     </DialogContent>
                     <DialogActions sx={{ bgcolor: '#21222d', borderTop: '1px solid #3a3c4b' }}>
                        <Button onClick={handleCloseDeleteScoreConfirm} disabled={deletingScore}>Hủy</Button>
                        <Button onClick={handleConfirmDeleteScore} color="error" disabled={deletingScore}>
                           {deletingScore ? <CircularProgress size={24} sx={{ color: '#e0e0e0' }} /> : 'Xóa'}
                        </Button>
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
                                 onChange={(e) => {
                                     const grade = e.target.value as string;
                                     setSelectedGrade(grade);
                                     setStudentToEdit(prev => prev ? { ...prev, class_id: '' } : null); // Reset class when grade changes
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
                                 value={studentToEdit.class_id}
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
                                          .filter(cls => String(cls.grade) === selectedGrade) // Filter by selected grade
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


                 {/* Delete Student Confirmation Dialog (New) */}
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
                open={notification.open} // Mở/đóng dựa trên state notification.open
                autoHideDuration={8000} // Thời gian tự động đóng (ví dụ: 8 giây)
                onClose={handleCloseNotification} // Gọi hàm này khi thông báo đóng
                anchorOrigin={{ vertical: 'top', horizontal: 'center' }} // Vị trí hiển thị (ví dụ: trên cùng, giữa)
            >
                {/* Sử dụng Alert bên trong Snackbar để có màu sắc và icon */}
                <Alert
                    onClose={handleCloseNotification}
                    severity={notification.severity} // Màu sắc dựa trên state notification.severity ('success' hoặc 'error')
                    sx={{ width: '100%' }}
                >
                    {notification.message} {/* Nội dung thông báo từ state notification.message */}
                </Alert>
            </Snackbar>
            </Box>
        </LocalizationProvider>
    );
};

export default Homeroom;