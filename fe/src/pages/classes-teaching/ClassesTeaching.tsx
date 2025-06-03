import React, { useEffect, useState, useMemo } from 'react';
import {
    Typography, Box, CircularProgress, Alert, Paper, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow,
    Tooltip, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Button, Grid,
    TextField, Select, MenuItem, FormControl, InputLabel, Snackbar,
    Container,
    Accordion, AccordionSummary, AccordionDetails,
    ToggleButton, ToggleButtonGroup
} from '@mui/material';
import AssessmentIcon from '@mui/icons-material/Assessment';
import { Edit, Delete, Add as AddIcon, ExpandMore as ExpandMoreIcon, Lock as LockIcon } from '@mui/icons-material';
import axios, { isAxiosError, AxiosError } from 'axios';
import dayjs from 'dayjs';
import 'dayjs/locale/vi';
import { SelectChangeEvent } from '@mui/material/Select';

interface TeachingAssignment {
    assignment_id: number;
    class_id: number;
    class_name: string;
    grade: number;
    school_year: string;
    subject_id: number;
    subject_name: string;
    semester: number;
    school_year_assignment: string;
}

interface StudentData {
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

interface ClassStudentsResponse {
    class_id: number;
    class_name: string;
    grade: number;
    school_year: string;
    students: StudentData[];
}

function parseVietnameseName(fullName: string) {
    const parts = fullName.trim().split(/\s+/);

    let ho = '';
    let tenDem = '';
    let tenGoi = '';

    if (parts.length === 0) {
        return { ho: '', tenDem: '', tenGoi: '' };
    }
    else if (parts.length === 1) {
        tenGoi = parts[0];
    } else if (parts.length === 2) {
        ho = parts[0];
        tenGoi = parts[1];
    } else {
        ho = parts[0];
        tenGoi = parts[parts.length - 1];
        tenDem = parts.slice(1, parts.length - 1).join(' ');
    }

    return { ho, tenDem, tenGoi };
}

function sortStudentsByName(a: StudentData, b: StudentData): number {
    const nameA = parseVietnameseName(a.name);
    const nameB = parseVietnameseName(b.name);
    const compareTenGoi = nameA.tenGoi.localeCompare(nameB.tenGoi, 'vi', { sensitivity: 'base' });
    if (compareTenGoi !== 0) {
        return compareTenGoi;
    }

    const compareTenDem = nameA.tenDem.localeCompare(nameB.tenDem, 'vi', { sensitivity: 'base' });
    if (compareTenDem !== 0) {
        return compareTenDem;
    }

    const compareHo = nameA.ho.localeCompare(nameB.ho, 'vi', { sensitivity: 'base' });
    if (compareHo !== 0) {
        return compareHo;
    }

    return a.id - b.id;
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
    semester?: number; 
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

const getAuthToken = () => {
    return localStorage.getItem('token') || '';
};
const getAuthHeaders = () => {
    const token = getAuthToken();
    return {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
    };
};

const ClassesTeaching: React.FC = () => {
    const [teachingAssignments, setTeachingAssignments] = useState<TeachingAssignment[]>([]);
    const [studentsInClass, setStudentsInClass] = useState<{ [classId: number]: StudentData[] }>({});
    const [loadingClasses, setLoadingClasses] = useState<boolean>(true);
    const [loadingStudents, setLoadingStudents] = useState<{ [classId: number]: boolean }>({});
    const [error, setError] = useState<string | null>(null);
    const [expandedClassId, setExpandedClassId] = useState<number | null>(null);

    const API_BASE_URL = import.meta.env.VITE_APP_API_URL;
    const [notification, setNotification] = useState<{
        open: boolean;
        message: string;
        severity: 'success' | 'error';
        duration?: number;
    }>({
        open: false,
        message: '',
        severity: 'success',
    });
    const [openScoreDialog, setOpenScoreDialog] = useState(false);
    const [currentStudentForScores, setCurrentStudentForScores] = useState<StudentData | null>(null);
    const [scores, setScores] = useState<Score[]>([]);
    const [loadingScores, setLoadingScores] = useState<boolean>(false);
    const [scoreError, setScoreError] = useState<string | null>(null);
    const [selectedSemester, setSelectedSemester] = useState<'1' | '2'>('1');

    const [openAddScoreDialog, setOpenAddScoreDialog] = useState(false);
    const [newScoreData, setNewScoreData] = useState({
        subject_id: '',
        score: '',
        type: ''
    });
    const [addingScore, setAddingScore] = useState(false);
    const [addScoreError, setAddScoreError] = useState<string | null>(null);

    const [openEditScoreDialog, setOpenEditScoreDialog] = useState(false);
    const [scoreToEdit, setScoreToEdit] = useState<Score | null>(null);
    const [editingScore, setEditingScore] = useState(false);
    const [editScoreError, setEditScoreError] = useState<string | null>(null);
    const [openDeleteScoreConfirm, setOpenDeleteScoreConfirm] = useState(false);
    const [scoreToDeleteId, setScoreToDeleteId] = useState<number | null>(null);
    const [deletingScore, setDeletingScore] = useState(false);
    const [deleteScoreError, setDeleteScoreError] = useState<string | null>(null);

    const [subjects, setSubjects] = useState<SubjectData[]>([]);

    const formatBirthday = (birthday: string | null | undefined) => {
        if (!birthday) return '--';
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

    useEffect(() => {
        const fetchTeachingClasses = async () => {
            try {
                setLoadingClasses(true);
                const headers = getAuthHeaders();
                const token = headers.Authorization.split(' ')[1];

                console.log('Token xác thực khi tải lớp giảng dạy:', token);

                if (!token) {
                    setError('Không có token xác thực. Vui lòng đăng nhập.');
                    setLoadingClasses(false);
                    return;
                }

                const response = await axios.get<TeachingAssignment[]>(`${API_BASE_URL}/api/teacher/classes/teaching`, {
                    headers: headers,
                });

                console.log('Dữ liệu lớp giảng dạy:', response.data);

                setTeachingAssignments(response.data);
            } catch (err) {
                console.error('Lỗi khi tải các lớp giảng dạy:', err);
                if (axios.isAxiosError(err) && err.response) {
                    if (err.response.status === 401) {
                        setError('Phiên đăng nhập đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại.');
                    } else {
                        setError(`Không thể tải danh sách các lớp đang giảng dạy: ${err.response.status} - ${err.response.data.message || 'Lỗi không xác định'}`);
                    }
                } else {
                    setError('Không thể tải danh sách các lớp đang giảng dạy do lỗi mạng hoặc server.');
                }
            } finally {
                setLoadingClasses(false);
            }
        };

        fetchTeachingClasses();
    }, []);

    const fetchStudentsForClass = async (classId: number) => {
        if (studentsInClass[classId]) {
            return;
        }

        try {
            setLoadingStudents(prev => ({ ...prev, [classId]: true }));
            const headers = getAuthHeaders();
            const token = headers.Authorization.split(' ')[1];

            if (!token) {
                setError('Không có token xác thực. Vui lòng đăng nhập.');
                return;
            }

            console.log(`Đang tải học sinh cho lớp ${classId}...`);
            const response = await axios.get<ClassStudentsResponse>(`${API_BASE_URL}/api/teacher/classes/${classId}/students`, {
                headers: headers,
            });
            console.log(`Dữ liệu học sinh lớp ${classId}:`, response.data);

            const fetchedStudents = response.data.students || [];
            const sortedStudents = [...fetchedStudents].sort(sortStudentsByName);
            setStudentsInClass(prev => ({
                ...prev,
                [classId]: sortedStudents,
            }));
        } catch (err) {
            console.error(`Lỗi khi tải học sinh cho lớp ${classId}:`, err);
            if (axios.isAxiosError(err) && err.response) {
                if (err.response.status === 403) {
                    setStudentsInClass(prev => ({
                        ...prev,
                        [classId]: [],
                    }));
                    console.warn(`Không có quyền truy cập học sinh lớp ${classId}: ${err.response.data.message}`);
                } else if (err.response.status === 401) {
                    setError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
                } else {
                    console.error(`Lỗi ${err.response.status}: ${err.response.data.message || 'Lỗi không xác định'}`);
                }
            } else {
                console.error('Lỗi mạng hoặc server khi tải học sinh');
            }
        } finally {
            setLoadingStudents(prev => ({ ...prev, [classId]: false }));
        }
    };

    const handleAccordionChange = (classId: number) => (event: React.SyntheticEvent, isExpanded: boolean) => {
        setExpandedClassId(isExpanded ? classId : null);
        if (isExpanded) {
            fetchStudentsForClass(classId);
        }
    };

    const groupedByClass = teachingAssignments.reduce((acc, assignment) => {
        const classId = assignment.class_id;
        if (!acc[classId]) {
            acc[classId] = {
                class_id: classId,
                class_name: assignment.class_name,
                grade: assignment.grade,
                school_year: assignment.school_year,
                subjects: []
            };
        }
        acc[classId].subjects.push({
            subject_id: assignment.subject_id,
            subject_name: assignment.subject_name,
            semester: assignment.semester,
        });
        return acc;
    }, {} as Record<number, {
        class_id: number;
        class_name: string;
        grade: number;
        school_year: string;
        subjects: Array<{
            subject_id: number;
            subject_name: string;
            semester: number;
        }>;
    }>);

    const classesArray = Object.values(groupedByClass).sort((a, b) => a.grade - b.grade);

    const scoreTypes: ScoreType[] = useMemo(() => [
        { value: 'oral', label: 'Điểm miệng' },
        { value: '15min', label: 'Điểm 15 phút' },
        { value: '45min', label: 'Điểm 45 phút' },
        { value: 'mid1', label: 'Giữa kỳ 1' },
        { value: 'final1', label: 'Cuối kỳ 1' },
        { value: 'mid2', label: 'Giữa kỳ 2' },
        { value: 'final2', label: 'Cuối kỳ 2' },
    ], []);

    const fetchStudentScores = async (studentId: number) => {
        if (!studentId) return;
        setLoadingScores(true);
        setScoreError(null);
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('Không tìm thấy token xác thực.');
            }
            const response = await axios.get<Score[]>(`${API_BASE_URL}/api/scores/${studentId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const scoresData = Array.isArray(response.data) ? response.data : [];
            setScores(scoresData);
        } catch (err: any) {
            console.error("Error fetching student scores:", err.response?.data || err.message || err);
            if (isAxiosError(err) && err.response) {
                const axiosError = err as AxiosError<any>;
                if (axiosError.response?.status === 404) {
                    setScores([]);
                    setScoreError('Không tìm thấy điểm số cho học sinh này.');
                } else {
                    setScoreError(axiosError.response?.data?.message || 'Lỗi khi tải điểm số.');
                }
            } else {
                setScoreError('Lỗi không xác định khi tải điểm.');
            }
            setScores([]);
        } finally {
            setLoadingScores(false);
        }
    };

    const handleOpenScoreDialog = (student: StudentData) => {
        setCurrentStudentForScores(student);
        setScores([]);
        setScoreError(null);
        
        // Find available semesters for this student's class
        const studentClassId = student.class_id;
        const availableSemesters = new Set<number>();
        
        teachingAssignments
            .filter(assignment => assignment.class_id === studentClassId)
            .forEach(assignment => {
                availableSemesters.add(assignment.semester);
            });
        
        // Set initial semester to the first available one, or '1' if none available
        const initialSemester = availableSemesters.has(1) ? '1' : 
                              availableSemesters.has(2) ? '2' : '1';
        setSelectedSemester(initialSemester as '1' | '2');
        
        fetchStudentScores(student.id);
        const currentClassSubjects = teachingAssignments
            .filter(assignment => assignment.class_id === student.class_id)
            .map(assignment => ({ id: assignment.subject_id, name: assignment.subject_name }));
        const uniqueSubjects = Array.from(new Map(currentClassSubjects.map(item => [item.id, item])).values());
        setSubjects(uniqueSubjects);
        setOpenScoreDialog(true);
    };

    const handleCloseScoreDialog = () => {
        setOpenScoreDialog(false);
        setCurrentStudentForScores(null);
        setScores([]);
        setScoreError(null);
        setSubjects([]);
        setSelectedSemester('1');
    };

    const handleOpenAddScoreDialog = () => {
        setNewScoreData({ subject_id: '', score: '', type: '' });
        setAddScoreError(null);
        setOpenAddScoreDialog(true);
    };

    const handleCloseAddScoreDialog = () => {
        setOpenAddScoreDialog(false);
    };

    const handleNewScoreInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent<string>) => {
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
                type: newScoreData.type,
                semester: parseInt(selectedSemester) 
            };

            await axios.post(`${API_BASE_URL}/api/scores`, dataToSend, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setNotification({ 
                open: true, 
                message: `Thêm điểm thành công cho ${currentStudentForScores.name}.`, 
                severity: 'success',
                duration: 1500
            });
            handleCloseAddScoreDialog();
            fetchStudentScores(currentStudentForScores.id);
        } catch (err: any) {
            console.error("Error adding score:", err.response || err);
            if (isAxiosError(err) && err.response) {
                if (err.response.data && err.response.data.errors) {
                    setAddScoreError("Lỗi nhập liệu: " + Object.values(err.response.data.errors).join(', '));
                } else if (err.response.data && err.response.data.message) {
                    let errorMessage = err.response.data.message;
                    const scoreTypeMap: { [key: string]: string } = {
                        'oral': 'miệng',
                        '15min': '15 phút',
                        '45min': '45 phút',
                        'mid1': 'giữa kỳ 1',
                        'final1': 'cuối kỳ 1',
                        'mid2': 'giữa kỳ 2',
                        'final2': 'cuối kỳ 2'
                    };
                    
                    Object.entries(scoreTypeMap).forEach(([code, name]) => {
                        errorMessage = errorMessage.replace(code, name);
                    });
                    
                    // Bỏ chữ "loại" trong thông báo lỗi
                    errorMessage = errorMessage.replace('loại ', '');
                    
                    setAddScoreError("Lỗi: " + errorMessage);
                } else {
                    setAddScoreError("Lỗi khi thêm điểm.");
                }
            } else {
                setAddScoreError("Lỗi không xác định khi thêm điểm.");
            }
            setNotification({ 
                open: true, 
                message: `Thêm điểm thất bại: ${addScoreError}`, 
                severity: 'error',
                duration: 1500
            });
        } finally {
            setAddingScore(false);
        }
    };

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
                subject_id: scoreToEdit.subject_id,
                type: scoreToEdit.type,
                semester: scoreToEdit.semester 
            };
            await axios.put(`${API_BASE_URL}/api/scores/${scoreToEdit.id}`, dataToSend, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setNotification({ 
                open: true, 
                message: `Cập nhật điểm thành công cho ${currentStudentForScores?.name}.`, 
                severity: 'success',
                duration: 1500
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
            setNotification({ 
                open: true, 
                message: `Cập nhật điểm thất bại: ${editScoreError}`, 
                severity: 'error',
                duration: 8000
            });
        } finally {
            setEditingScore(false);
        }
    };

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
            await axios.delete(`${API_BASE_URL}/api/scores/${scoreToDeleteId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setNotification({ 
                open: true, 
                message: `Xóa điểm thành công cho ${currentStudentForScores?.name}.`, 
                severity: 'success',
                duration: 300
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
            setNotification({ open: true, message: `Xóa điểm thất bại: ${deleteScoreError}`, severity: 'error' });
        } finally {
            setDeletingScore(false);
        }
    };
    
    const scoresBySubjectForDisplay = useMemo(() => {
        const organized: { [subjectName: string]: { [scoreType: string]: Score[] } } = {};

        const taughtSubjectIds = new Set(subjects.map(s => s.id));

        const filteredScores = scores.filter(score =>
            score.subject_id !== undefined && 
            taughtSubjectIds.has(score.subject_id) &&
            (!selectedSemester || score.semester === parseInt(selectedSemester))
        );

        filteredScores.forEach(score => {
            const subjectName = 
            score.subject?.name || score.subject_name || 'Không rõ môn';
            if (!organized[subjectName]) {
                organized[subjectName] = {};
            }
            if (!organized[subjectName][score.type]) {
                organized[subjectName][score.type] = [];
            }
            organized[subjectName][score.type].push(score);
        });

        Object.keys(organized).forEach(subjectName => {
            Object.keys(organized[subjectName]).forEach(scoreType => {
                organized[subjectName][scoreType].sort((a, b) => a.id - b.id);
            });
        });

        const sortedSubjectNames = Object.keys(organized).sort((a, b) => a.localeCompare(b, 'vi', { sensitivity: 'base' }));
        const sortedOrganized: { [subjectName: string]: { [scoreType: string]: Score[] } } = {};
        sortedSubjectNames.forEach(name => {
            sortedOrganized[name] = organized[name];
        });
        return sortedOrganized;

    }, [scores, subjects, selectedSemester]); 

    const filteredAddScoreTypes = useMemo(() => {
        if (selectedSemester === '1') {
            return scoreTypes.filter(st => ['oral', '15min', '45min', 'mid1', 'final1'].includes(st.value));
        } else if (selectedSemester === '2') {
            return scoreTypes.filter(st => ['oral', '15min', '45min', 'mid2', 'final2'].includes(st.value));
        }
        return []; 
    }, [selectedSemester, scoreTypes]);

    const isSemesterAvailable = useMemo(() => {
        if (!currentStudentForScores) return { '1': false, '2': false };
        
        const studentClassId = currentStudentForScores.class_id;
        const availableSemesters = new Set<number>();
        
        teachingAssignments
            .filter(assignment => assignment.class_id === studentClassId)
            .forEach(assignment => {
                availableSemesters.add(assignment.semester);
            });
        
        return {
            '1': availableSemesters.has(1),
            '2': availableSemesters.has(2)
        } as const;
    }, [currentStudentForScores, teachingAssignments]);

    if (loadingClasses) {
        return (
            <Container maxWidth="xl" sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
                <CircularProgress />
                <Typography variant="h6" sx={{ mt: 2 }}>Đang tải dữ liệu...</Typography>
            </Container>
        );
    }

    if (error) {
        return (
            <Container maxWidth="xl" sx={{ mt: 4 }}>
                <Alert severity="error">{error}</Alert>
            </Container>
        );
    }

    return (
        <Container maxWidth="xl" sx={{ pt: 4, pb: 4, minHeight: 'calc(100vh - 64px)' }}>
            <Typography variant="h4" component="h1" gutterBottom>
                Các Lớp Đang Giảng Dạy
            </Typography>

            {classesArray.length === 0 ? (
                <Alert severity="info">Bạn hiện không giảng dạy lớp nào.</Alert>
            ) : (
                <Box sx={{ width: '100%' }}>
                    {classesArray.map((classItem) => (
                        <Accordion
                            key={classItem.class_id}
                            expanded={expandedClassId === classItem.class_id}
                            onChange={handleAccordionChange(classItem.class_id)}
                            sx={{ mb: 2 }}
                        >
                            <AccordionSummary
                                expandIcon={<ExpandMoreIcon />}
                                aria-controls={`panel${classItem.class_id}-content`}
                                id={`panel${classItem.class_id}-header`}
                            >
                                <Box>
                                    <Typography variant="h6">
                                        Lớp: {classItem.class_name} (Khối {classItem.grade}) - Năm học: 
                                        {classItem.school_year}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Môn học: {classItem.subjects.map(s => `${s.subject_name} (HK${s.semester})`).join(', ')}
                                    </Typography>
                                </Box>
                            </AccordionSummary>
                            <AccordionDetails>
                                <Typography variant="h6" component="h3" sx={{ mb: 2 }}>
                                    Danh sách Học sinh:
                                </Typography>

                                {loadingStudents[classItem.class_id] ?
                                (
                                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                                        <CircularProgress size={24} />
                                        <Typography sx={{ ml: 1 }}>Đang tải học sinh...</Typography>
                                    </Box>
                                ) : studentsInClass[classItem.class_id] ? (
                                    studentsInClass[classItem.class_id].length > 0 ? (
                                        <TableContainer component={Paper}>
                                            <Table>
                                                <TableHead>
                                                    <TableRow>
                                                        <TableCell>Mã HS</TableCell>
                                                        <TableCell>Họ và Tên</TableCell>
                                                        <TableCell>Ngày sinh</TableCell>
                                                        <TableCell>Giới tính</TableCell>
                                                        <TableCell>Email</TableCell>
                                                        <TableCell>Số điện thoại</TableCell>
                                                        <TableCell>Địa chỉ</TableCell>
                                                        <TableCell align="center">Hành động</TableCell>
                                                    </TableRow>
                                                </TableHead>
                                                <TableBody>
                                                    {studentsInClass[classItem.class_id].map((student) => (
                                                        <TableRow key={student.id}>
                                                            <TableCell sx={{ color: '#e0e0e0' }}>{student.id}</TableCell>
                                                            <TableCell sx={{ color: '#e0e0e0' }}>{student.name}</TableCell>
                                                            <TableCell sx={{ color: '#e0e0e0' }}>{formatBirthday(student.birthday)}</TableCell>
                                                            <TableCell sx={{ color: '#e0e0e0' }}>{student.gender || '--'}</TableCell>
                                                            <TableCell sx={{ color: '#e0e0e0' }}>{student.email || '--'}</TableCell>
                                                            <TableCell sx={{ color: '#e0e0e0' }}>{student.phone || '--'}</TableCell>
                                                            <TableCell sx={{ color: '#e0e0e0' }}>{student.address || '--'}</TableCell>
                                                            <TableCell align="center">
                                                                <Tooltip title="Xem và Chỉnh sửa Điểm">
                                                                    <IconButton onClick={() => handleOpenScoreDialog(student)}>
                                                                        <AssessmentIcon color="primary" />
                                                                    </IconButton>
                                                                </Tooltip>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </TableContainer>
                                    ) : (
                                        <Alert severity="warning">
                                            Không thể tải danh sách học sinh. Bạn có thể chỉ được phép xem học sinh của các lớp mà bạn là chủ nhiệm.
                                        </Alert>
                                    )
                                ) : null}
                            </AccordionDetails>
                        </Accordion>
                    ))}
                </Box>
            )}

            <Dialog open={openScoreDialog} onClose={handleCloseScoreDialog} maxWidth="md" fullWidth>
                <DialogTitle>Điểm số của {currentStudentForScores?.name}</DialogTitle>
                <DialogContent dividers>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={handleOpenAddScoreDialog}
                            disabled={currentStudentForScores === null || !isSemesterAvailable[selectedSemester as '1' | '2']}
                        >
                            Thêm Điểm
                        </Button>
                        <ToggleButtonGroup
                            value={selectedSemester}
                            exclusive
                            onChange={(event, newSemester) => {
                                if (newSemester !== null && isSemesterAvailable[newSemester as '1' | '2']) {
                                    setSelectedSemester(newSemester as '1' | '2');
                                }
                            }}
                            aria-label="chọn học kỳ"
                            sx={{
                                '& .MuiToggleButton-root': {
                                    margin: '0 4px',
                                    borderRadius: '8px !important',
                                    border: '1px solid rgba(255, 255, 255, 0.12)',
                                    '&:first-of-type': {
                                        marginLeft: 0
                                    },
                                    '&:last-of-type': {
                                        marginRight: 0
                                    }
                                } as any
                            }}
                        >
                            <ToggleButton 
                                value="1" 
                                aria-label="học kỳ 1"
                                disabled={!isSemesterAvailable['1']}
                                sx={{ 
                                    color: isSemesterAvailable['1'] ? "#ffff" : "rgba(255, 255, 255, 0.5)",
                                    minWidth: '120px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1,
                                    padding: '8px 16px',
                                    '&.Mui-selected': {
                                        backgroundColor: 'rgba(255, 255, 255, 0.08)',
                                        color: '#ffff',
                                        '&:hover': {
                                            backgroundColor: 'rgba(255, 255, 255, 0.12)',
                                        }
                                    },
                                    '&.Mui-disabled': {
                                        color: 'rgba(255, 255, 255, 0.5)',
                                        backgroundColor: 'rgba(255, 255, 255, 0.04)',
                                        borderColor: 'rgba(255, 255, 255, 0.12)'
                                    }
                                }}
                            >
                                {!isSemesterAvailable['1'] && <LockIcon fontSize="small" />}
                                Học kỳ 1
                            </ToggleButton>
                            <ToggleButton 
                                value="2" 
                                aria-label="học kỳ 2"
                                disabled={!isSemesterAvailable['2']}
                                sx={{ 
                                    color: isSemesterAvailable['2'] ? "#ffff" : "rgba(255, 255, 255, 0.5)",
                                    minWidth: '120px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1,
                                    padding: '8px 16px',
                                    '&.Mui-selected': {
                                        backgroundColor: 'rgba(255, 255, 255, 0.08)',
                                        color: '#ffff',
                                        '&:hover': {
                                            backgroundColor: 'rgba(255, 255, 255, 0.12)',
                                        }
                                    },
                                    '&.Mui-disabled': {
                                        color: 'rgba(255, 255, 255, 0.5)',
                                        backgroundColor: 'rgba(255, 255, 255, 0.04)',
                                        borderColor: 'rgba(255, 255, 255, 0.12)'
                                    }
                                }}
                            >
                                {!isSemesterAvailable['2'] && <LockIcon fontSize="small" />}
                                Học kỳ 2
                            </ToggleButton>
                        </ToggleButtonGroup>
                    </Box>

                    {loadingScores ?
                    (
                        <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                            <CircularProgress size={24} />
                            <Typography sx={{ ml: 1 }}>Đang tải điểm số...</Typography>
                        </Box>
                    ) : scoreError ?
                    (
                        <Alert severity="error">{scoreError}</Alert>
                    ) : (
                        Object.keys(scoresBySubjectForDisplay).length > 0 ? (
                            Object.entries(scoresBySubjectForDisplay).map(([subjectName, types]) => (
                                <Box key={subjectName} sx={{ mb: 3 }}>
                                    <Typography variant="h6" gutterBottom>
                                        Môn: {subjectName}
                                    </Typography>
                                    <TableContainer component={Paper}>
                                        <Table size="small">
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell>Loại điểm</TableCell>
                                                    <TableCell>Điểm số</TableCell>
                                                    <TableCell align="right">Hành động</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {scoreTypes
                                                    .filter(st => {
                                                        if (selectedSemester === '1') {
                                                            return ['oral', '15min', '45min', 'mid1', 'final1'].includes(st.value);
                                                        } else if (selectedSemester === '2') {
                                                            return ['oral', '15min', '45min', 'mid2', 'final2'].includes(st.value);
                                                        }
                                                        return false; 
                                                    })
                                                    .map(st => (
                                                        types[st.value]?.map((score) => (
                                                            <TableRow key={`${subjectName}-${st.value}-${score.id}`}>
                                                                <TableCell>{st.label}</TableCell>
                                                                <TableCell>{score.score}</TableCell>
                                                                <TableCell align="right">
                                                                    <>
                                                                        <Tooltip title="Chỉnh sửa điểm">
                                                                            <IconButton onClick={() => handleOpenEditScoreDialog(score)}>
                                                                                <Edit color="info" />
                                                                            </IconButton>
                                                                        </Tooltip>
                                                                        <Tooltip title="Xóa điểm">
                                                                            <IconButton onClick={() => handleOpenDeleteScoreConfirm(score.id)}>
                                                                                <Delete color="error" />
                                                                            </IconButton>
                                                                        </Tooltip>
                                                                    </>
                                                                </TableCell>
                                                            </TableRow>
                                                        )) ||
                                                        (
                                                            <TableRow key={`${subjectName}-${st.value}---`}>
                                                                <TableCell>{st.label}</TableCell>
                                                                <TableCell>Chưa có</TableCell>
                                                                <TableCell align="right">
                                                                    <Typography variant="body2" color="text.secondary">Chưa có</Typography>
                                                                </TableCell>
                                                            </TableRow>
                                                        )
                                                    ))}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                </Box>
                            ))
                        ) : (
                            <Alert severity="info">Học sinh này chưa có điểm nào được nhập cho các môn bạn đang giảng dạy trong học kỳ {selectedSemester}.</Alert>
                        )
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseScoreDialog}>Đóng</Button>
                </DialogActions>
            </Dialog>

            <Dialog open={openAddScoreDialog} onClose={handleCloseAddScoreDialog}>
                <DialogTitle>Thêm Điểm Mới cho {currentStudentForScores?.name}</DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid item xs={12}>
                            <FormControl fullWidth margin="dense" required>
                                <InputLabel>Môn học</InputLabel>
                                <Select
                                    name="subject_id"
                                    value={newScoreData.subject_id}
                                    label="Môn học"
                                    onChange={handleNewScoreInputChange}
                                >
                                    {subjects.length > 0 ?
                                    (
                                        subjects.map((subject) => (
                                            <MenuItem key={subject.id} value={subject.id}>
                                                {subject.name}
                                            </MenuItem>
                                        ))
                                    ) : (
                                        <MenuItem disabled>Không 
                                            có môn học nào bạn đang giảng dạy cho lớp này.</MenuItem>
                                    )}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12}>
                            <FormControl fullWidth margin="dense" required>
                                <InputLabel>Loại điểm</InputLabel>
                                <Select
                                    name="type"
                                    value={newScoreData.type}
                                    label="Loại điểm"
                                    onChange={handleNewScoreInputChange}
                                >
                                    {filteredAddScoreTypes.map((type) => ( 
                                        <MenuItem key={type.value} value={type.value}>
                                            {type.label}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                autoFocus
                                margin="dense"
                                name="score"
                                label="Điểm số"
                                type="number"
                                fullWidth
                                variant="outlined"
                                value={newScoreData.score}
                                onChange={handleNewScoreInputChange}
                                inputProps={{ min: 0, max: 10, step: 0.1 }}
                                required
                            />
                        </Grid>
                    </Grid>
                    {addScoreError && (
                        <Alert severity="error" sx={{ mt: 2 }}>
                            {addScoreError}
                        </Alert>
                    )}
                </DialogContent>
                <DialogActions sx={{ borderTop: '1px solid #3a3c4b' }}>
                    <Button onClick={handleCloseAddScoreDialog} disabled={addingScore}>Hủy</Button>
                    <Button onClick={handleSaveNewScore} disabled={addingScore}>
                        {addingScore ?
                        <CircularProgress size={24} sx={{ color: '#e0e0e0' }} /> : 'Lưu điểm'}
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog open={openEditScoreDialog} onClose={handleCloseEditScoreDialog}>
                <DialogTitle>Chỉnh Sửa Điểm</DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid item xs={12}>
                            <TextField
                                autoFocus
                                margin="dense"
                                name="score"
                                label="Điểm số"
                                type="number"
                                fullWidth
                                variant="outlined"
                                value={scoreToEdit?.score ||
                                ''}
                                onChange={handleEditScoreInputChange}
                                inputProps={{ min: 0, max: 10, step: 0.1 }}
                                required
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                Môn học: {scoreToEdit?.subject?.name ||
                                scoreToEdit?.subject_name || '--'}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Loại điểm: {scoreTypes.find(type => type.value === scoreToEdit?.type)?.label ||
                                scoreToEdit?.type || '--'}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Học kỳ: {scoreToEdit?.semester || '--'}
                            </Typography>
                        </Grid>
                    </Grid>
                    {editScoreError && (
                        <Alert severity="error" sx={{ mt: 2 }}>
                            {editScoreError}
                        </Alert>
                    )}
                </DialogContent>
                <DialogActions sx={{ borderTop: '1px solid #3a3c4b' }}>
                    <Button onClick={handleCloseEditScoreDialog} disabled={editingScore}>Hủy</Button>
                    <Button onClick={handleSaveEditedScore} disabled={editingScore}>
                        {editingScore ? <CircularProgress size={24} sx={{ color: '#e0e0e0' }} /> : 'Lưu thay đổi'}
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog
                open={openDeleteScoreConfirm}
                onClose={handleCloseDeleteScoreConfirm}
                aria-labelledby="delete-score-dialog-title"
                aria-describedby="delete-score-dialog-description"
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle 
                    id="delete-score-dialog-title">Xác nhận xóa điểm</DialogTitle>
                <DialogContent>
                    <Typography id="delete-score-dialog-description">
                        Bạn có chắc chắn muốn xóa điểm này không?
                        Hành động này không thể hoàn tác.
                    </Typography>
                    {deleteScoreError && (
                        <Alert severity="error" sx={{ mt: 2 }}>
                            {deleteScoreError}
                        </Alert>
                    )}
                </DialogContent>
                <DialogActions sx={{ borderTop: '1px solid #3a3c4b' }}>
                    <Button onClick={handleCloseDeleteScoreConfirm} disabled={deletingScore}>Hủy</Button>
                    <Button onClick={handleConfirmDeleteScore} color="error" disabled={deletingScore}>
                        {deletingScore ?
                        <CircularProgress size={24} sx={{ color: '#e0e0e0' }} /> : 'Xóa'}
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
        </Container>
    );
};

export default ClassesTeaching;