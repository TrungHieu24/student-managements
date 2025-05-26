import React, { useEffect, useState, useMemo } from 'react';
import {
    Typography, Box, CircularProgress, Alert, Paper, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow,
    Tooltip, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Button, Grid,
    TextField, Select, MenuItem, FormControl, InputLabel, Snackbar,
    Container,
    Accordion, AccordionSummary, AccordionDetails
} from '@mui/material';
import AssessmentIcon from '@mui/icons-material/Assessment';
import { Edit, Delete, Add as AddIcon, ExpandMore as ExpandMoreIcon } from '@mui/icons-material';
import axios, { isAxiosError, AxiosError } from 'axios';
import dayjs from 'dayjs';
import 'dayjs/locale/vi';

// Define interfaces for data structures received from the API
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
    name: string; // Tên đầy đủ của học sinh
    gender: string;
    birthday: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
    class_id: number;
    class?: { // Optional nested class info
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

// --- START: HÀM HỖ TRỢ SẮP XẾP TÊN NGƯỜI VIỆT (KEEP AS IS) ---

/**
 * Phân tích một chuỗi tên đầy đủ của người Việt thành các phần: Họ, Tên đệm, Tên gọi.
 * Hàm này cố gắng xử lý các trường hợp tên có 1, 2, 3 hoặc nhiều hơn các phần.
 *
 * @param fullName Chuỗi tên đầy đủ cần phân tích (ví dụ: "Nguyễn Văn An", "Trần Thị Thu")
 * @returns Một đối tượng chứa ho (họ), tenDem (tên đệm), tenGoi (tên gọi).
 * Nếu không thể phân tích, các trường sẽ là chuỗi rỗng.
 */
function parseVietnameseName(fullName: string) {
    const parts = fullName.trim().split(/\s+/); // Tách chuỗi thành các phần dựa trên khoảng trắng

    let ho = '';
    let tenDem = '';
    let tenGoi = '';

    if (parts.length === 0) {
        return { ho: '', tenDem: '', tenGoi: '' };
    }
    else if (parts.length === 1) {
        tenGoi = parts[0]; // Chỉ có một từ, coi như tên gọi
    } else if (parts.length === 2) {
        ho = parts[0];
        tenGoi = parts[1];
    } else {
        ho = parts[0];
        tenGoi = parts[parts.length - 1];
        tenDem = parts.slice(1, parts.length - 1).join(' '); // Các từ ở giữa là tên đệm
    }

    return { ho, tenDem, tenGoi };
}

/**
 * Hàm so sánh tùy chỉnh để sắp xếp mảng các đối tượng StudentData theo tên người Việt.
 * Ưu tiên: Tên gọi > Tên đệm > Họ
 * @param a Đối tượng StudentData đầu tiên.
 * @param b Đối tượng StudentData thứ hai.
 * @returns -1 nếu a đứng trước b, 1 nếu a đứng sau b, 0 nếu bằng nhau.
 */
function sortStudentsByName(a: StudentData, b: StudentData): number {
    const nameA = parseVietnameseName(a.name);
    const nameB = parseVietnameseName(b.name);

    // 1. So sánh theo Tên gọi (tên cuối cùng)
    // 'vi' là ngôn ngữ tiếng Việt, 'base' sensitivity bỏ qua dấu và chữ hoa/thường
    const compareTenGoi = nameA.tenGoi.localeCompare(nameB.tenGoi, 'vi', { sensitivity: 'base' });
    if (compareTenGoi !== 0) {
        return compareTenGoi;
    }

    // 2. Nếu Tên gọi giống nhau, so sánh theo Tên đệm
    const compareTenDem = nameA.tenDem.localeCompare(nameB.tenDem, 'vi', { sensitivity: 'base' });
    if (compareTenDem !== 0) {
        return compareTenDem;
    }

    // 3. Nếu Tên gọi và Tên đệm giống nhau, so sánh theo Họ
    const compareHo = nameA.ho.localeCompare(nameB.ho, 'vi', { sensitivity: 'base' });
    if (compareHo !== 0) {
        return compareHo;
    }

    // 4. Nếu tất cả đều giống nhau, coi như bằng nhau (sắp xếp ổn định theo ID)
    return a.id - b.id;
}

// --- END: HÀM HỖ TRỢ SẮP XẾP TÊN NGƯỜI VIỆT ---

// --- START: NEW INTERFACES FROM moi 4.txt ---
interface Score {
    id: number;
    student_id: number;
    subject_id?: number;
    subject?: {
        id: number;
        name: string;
    } | null;
    subject_name?: string; // Sometimes API returns subject_name directly
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
// --- END: NEW INTERFACES FROM moi 4.txt ---


// Helper function to retrieve authentication token from localStorage
const getAuthToken = () => {
    return localStorage.getItem('token') || '';
};

// Helper function to create authentication headers
const getAuthHeaders = () => {
    const token = getAuthToken();
    return {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
    };
};

const ClassesTeaching: React.FC = () => {
    // State variables
    const [teachingAssignments, setTeachingAssignments] = useState<TeachingAssignment[]>([]);
    const [studentsInClass, setStudentsInClass] = useState<{ [classId: number]: StudentData[] }>({});
    const [loadingClasses, setLoadingClasses] = useState<boolean>(true);
    const [loadingStudents, setLoadingStudents] = useState<{ [classId: number]: boolean }>({});
    const [error, setError] = useState<string | null>(null);
    const [expandedClassId, setExpandedClassId] = useState<number | null>(null); // To manage which accordion is open

    const API_BASE_URL = 'http://localhost:8000/api'; // Base URL for your API

    // --- START: NEW STATE VARIABLES FROM moi 4.txt FOR SCORE MANAGEMENT ---
    const [notification, setNotification] = useState<{
        open: boolean;
        message: string;
        severity: 'success' | 'error';
    }>({
        open: false,
        message: '',
        severity: 'success',
    });

    // States for Score View Dialog
    const [openScoreDialog, setOpenScoreDialog] = useState(false);
    const [currentStudentForScores, setCurrentStudentForScores] = useState<StudentData | null>(null);
    const [scores, setScores] = useState<Score[]>([]);
    const [loadingScores, setLoadingScores] = useState<boolean>(false);
    const [scoreError, setScoreError] = useState<string | null>(null);
    // REMOVED: studentAverageScore, studentPerformanceCategory states

    // States for Add Score Dialog
    const [openAddScoreDialog, setOpenAddScoreDialog] = useState(false);
    const [newScoreData, setNewScoreData] = useState({
        subject_id: '',
        score: '',
        type: ''
    });
    const [addingScore, setAddingScore] = useState(false);
    const [addScoreError, setAddScoreError] = useState<string | null>(null);

    // States for Edit Score Dialog
    const [openEditScoreDialog, setOpenEditScoreDialog] = useState(false);
    const [scoreToEdit, setScoreToEdit] = useState<Score | null>(null);
    const [editingScore, setEditingScore] = useState(false);
    const [editScoreError, setEditScoreError] = useState<string | null>(null);

    // States for Delete Score Confirmation Dialog
    const [openDeleteScoreConfirm, setOpenDeleteScoreConfirm] = useState(false);
    const [scoreToDeleteId, setScoreToDeleteId] = useState<number | null>(null);
    const [deletingScore, setDeletingScore] = useState(false);
    const [deleteScoreError, setDeleteScoreError] = useState<string | null>(null);

    // States for Subjects list (for add/edit score forms) - now populated based on current class
    const [subjects, setSubjects] = useState<SubjectData[]>([]);
    // REMOVED: loadingSubjects, subjectError states
    // --- END: NEW STATE VARIABLES FROM moi 4.txt ---


    // Function to format birthday for display (KEEP AS IS)
    const formatBirthday = (birthday: string | null | undefined) => {
        if (!birthday) return 'N/A';
        try {
            const date = dayjs(birthday);
            if (date.isValid()) {
                return date.format('DD/MM/YYYY');
            } else {
                return birthday; // Return original if not a valid date string
            }
        } catch (e) {
            console.error("Error formatting birthday:", e);
            return birthday; // Return original on error
        }
    };

    // useEffect hook to fetch teaching assignments when the component mounts (KEEP AS IS)
    useEffect(() => {
        const fetchTeachingClasses = async () => {
            try {
                setLoadingClasses(true); // Start loading state for classes
                const headers = getAuthHeaders();
                const token = headers.Authorization.split(' ')[1]; // Extract token for logging

                console.log('Token xác thực khi tải lớp giảng dạy:', token);

                if (!token) {
                    setError('Không có token xác thực. Vui lòng đăng nhập.');
                    setLoadingClasses(false);
                    return;
                }

                const response = await axios.get<TeachingAssignment[]>(`${API_BASE_URL}/teacher/classes/teaching`, {
                    headers: headers,
                });

                console.log('Dữ liệu lớp giảng dạy:', response.data);
                setTeachingAssignments(response.data); // Update state with fetched data
            } catch (err) {
                console.error('Lỗi khi tải các lớp giảng dạy:', err);
                if (axios.isAxiosError(err) && err.response) {
                    // Handle specific HTTP errors
                    if (err.response.status === 401) {
                        setError('Phiên đăng nhập đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại.');
                    } else {
                        setError(`Không thể tải danh sách các lớp đang giảng dạy: ${err.response.status} - ${err.response.data.message || 'Lỗi không xác định'}`);
                    }
                } else {
                    setError('Không thể tải danh sách các lớp đang giảng dạy do lỗi mạng hoặc server.');
                }
            } finally {
                setLoadingClasses(false); // End loading state
            }
        };

        fetchTeachingClasses(); // Call the fetch function
    }, []); // Empty dependency array means this runs once on mount

    // Function to fetch students for a specific class (KEEP AS IS, except for student sorting)
    const fetchStudentsForClass = async (classId: number) => {
        // Only fetch if data for this class isn't already loaded
        if (studentsInClass[classId]) {
            return;
        }

        try {
            setLoadingStudents(prev => ({ ...prev, [classId]: true })); // Start loading for this specific class
            const headers = getAuthHeaders();
            const token = headers.Authorization.split(' ')[1];

            if (!token) {
                setError('Không có token xác thực. Vui lòng đăng nhập.');
                return;
            }

            console.log(`Đang tải học sinh cho lớp ${classId}...`);

            const response = await axios.get<ClassStudentsResponse>(`${API_BASE_URL}/teacher/classes/${classId}/students`, {
                headers: headers,
            });

            console.log(`Dữ liệu học sinh lớp ${classId}:`, response.data);

            // --- SẮP XẾP HỌC SINH TẠI ĐÂY ---
            // Lấy danh sách học sinh, đảm bảo là mảng rỗng nếu không có dữ liệu
            const fetchedStudents = response.data.students || [];
            // Sắp xếp danh sách học sinh theo tên người Việt
            const sortedStudents = [...fetchedStudents].sort(sortStudentsByName); // Sử dụng spread operator để tạo bản sao và sort

            setStudentsInClass(prev => ({
                ...prev,
                [classId]: sortedStudents, // Lưu danh sách đã sắp xếp vào state
            }));
        } catch (err) {
            console.error(`Lỗi khi tải học sinh cho lớp ${classId}:`, err);
            if (axios.isAxiosError(err) && err.response) {
                if (err.response.status === 403) {
                    // Handle 403 (Forbidden) specifically, indicating permission issues
                    setStudentsInClass(prev => ({
                        ...prev,
                        [classId]: [], // Set empty to display permission warning
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
            setLoadingStudents(prev => ({ ...prev, [classId]: false })); // End loading for this class
        }
    };

    // Handler for accordion expansion/collapse (KEEP AS IS)
    const handleAccordionChange = (classId: number) => (event: React.SyntheticEvent, isExpanded: boolean) => {
        setExpandedClassId(isExpanded ? classId : null); // Set the currently expanded accordion
        if (isExpanded) {
            fetchStudentsForClass(classId); // Fetch students only when expanded
        }
    };

    // Group teaching assignments by class_id (KEEP AS IS)
    const groupedByClass = teachingAssignments.reduce((acc, assignment) => {
        const classId = assignment.class_id;
        if (!acc[classId]) {
            acc[classId] = {
                class_id: classId,
                class_name: assignment.class_name,
                grade: assignment.grade,
                school_year: assignment.school_year,
                subjects: [] // Initialize subjects array
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

    const classesArray = Object.values(groupedByClass); // Convert the grouped object to an array for rendering

    // --- START: NEW FUNCTIONS AND MEMOIZED VALUES FOR SCORE MANAGEMENT FROM moi 4.txt ---
    const scoreTypes: ScoreType[] = useMemo(() => [
        { value: 'mid1', label: 'Giữa kỳ 1' },
        { value: 'final1', label: 'Cuối kỳ 1' },
        { value: 'mid2', label: 'Giữa kỳ 2' },
        { value: 'final2', label: 'Cuối kỳ 2' },
    ], []);

    // REMOVED: calculateAverageAndCategory function

    // Fetch scores for a student
    const fetchStudentScores = async (studentId: number) => {
        if (!studentId) return;
        setLoadingScores(true);
        setScoreError(null);
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('Không tìm thấy token xác thực.');
            }
            const response = await axios.get<Score[]>(`${API_BASE_URL}/scores/${studentId}`, {
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

    // NO LONGER NEEDED: fetchSubjects function - subjects are now derived

    const handleOpenScoreDialog = (student: StudentData) => {
        setCurrentStudentForScores(student);
        setScores([]);
        setScoreError(null);
        fetchStudentScores(student.id);

        // Filter subjects based on the selected student's class
        const currentClassSubjects = teachingAssignments
            .filter(assignment => assignment.class_id === student.class_id)
            .map(assignment => ({ id: assignment.subject_id, name: assignment.subject_name }));

        // Remove duplicates if a subject is taught in multiple semesters for the same class
        const uniqueSubjects = Array.from(new Map(currentClassSubjects.map(item => [item.id, item])).values());
        setSubjects(uniqueSubjects);

        setOpenScoreDialog(true);
    };

    const handleCloseScoreDialog = () => {
        setOpenScoreDialog(false);
        setCurrentStudentForScores(null);
        setScores([]);
        setScoreError(null);
        setSubjects([]); // Clear subjects when closing dialog
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
            await axios.post(`${API_BASE_URL}/scores`, dataToSend, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setNotification({ open: true, message: `Thêm điểm thành công cho ${currentStudentForScores.name}.`, severity: 'success' });
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
            setNotification({ open: true, message: `Thêm điểm thất bại: ${addScoreError}`, severity: 'error' }); // Added notification on error
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
                subject_id: scoreToEdit.subject_id, // Add this
                type: scoreToEdit.type, // Add this
            };
            await axios.put(`${API_BASE_URL}/scores/${scoreToEdit.id}`, dataToSend, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setNotification({ open: true, message: `Cập nhật điểm thành công cho ${currentStudentForScores?.name}.`, severity: 'success' });
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
            setNotification({ open: true, message: `Cập nhật điểm thất bại: ${editScoreError}`, severity: 'error' }); // Added notification on error
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
            await axios.delete(`${API_BASE_URL}/scores/${scoreToDeleteId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setNotification({ open: true, message: `Xóa điểm thành công cho ${currentStudentForScores?.name}.`, severity: 'success' });
            handleCloseDeleteScoreConfirm();
            fetchStudentScores(currentStudentForScores.id);
        } catch (err: any) {
            console.error("Error deleting score:", err.response || err);
            if (isAxiosError(err) && err.response && err.response.data && err.response.data.message) {
                setDeleteScoreError("Lỗi: " + err.response.data.message);
            } else {
                setDeleteScoreError("Lỗi không xác định khi xóa điểm.");
            }
            setNotification({ open: true, message: `Xóa điểm thất bại: ${deleteScoreError}`, severity: 'error' }); // Added notification on error
        } finally {
            setDeletingScore(false);
        }
    };

    // Logic to organize scores by subject for display in the Dialog table
    const scoresBySubjectForDisplay = useMemo(() => {
        const organized: { [subjectName: string]: { [scoreType: string]: Score } } = {};

        // Get the IDs of the subjects the teacher is teaching in this class
        const taughtSubjectIds = new Set(subjects.map(s => s.id));

        // Filter scores to only include those for subjects the teacher teaches in this class
        const filteredScores = scores.filter(score =>
            score.subject_id !== undefined && taughtSubjectIds.has(score.subject_id)
        );

        filteredScores.forEach(score => {
            // Prefer score.subject.name, then score.subject_name, then a fallback
            const subjectName = score.subject?.name || score.subject_name || 'Không rõ môn';
            if (!organized[subjectName]) {
                organized[subjectName] = {};
            }
            organized[subjectName][score.type] = score;
        });

        // Sort subject names alphabetically for consistent display
        const sortedSubjectNames = Object.keys(organized).sort((a, b) => a.localeCompare(b, 'vi', { sensitivity: 'base' }));
        const sortedOrganized: { [subjectName: string]: { [scoreType: string]: Score } } = {};
        sortedSubjectNames.forEach(name => {
            sortedOrganized[name] = organized[name];
        });

        return sortedOrganized;

    }, [scores, subjects]); // Add 'subjects' to the dependency array
    // --- END: NEW FUNCTIONS AND MEMOIZED VALUES ---


    // Render loading state for initial class data fetch (KEEP AS IS)
    if (loadingClasses) {
        return (
            <Container maxWidth="xl" sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
                <CircularProgress />
                <Typography variant="h6" sx={{ mt: 2 }}>Đang tải dữ liệu...</Typography>
            </Container>
        );
    }

    // Render error state for initial class data fetch (KEEP AS IS)
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
                                        Lớp: {classItem.class_name} (Khối {classItem.grade}) - Năm học: {classItem.school_year}
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

                                {loadingStudents[classItem.class_id] ? (
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
                                                        <TableCell>Họ và Tên</TableCell> {/* Dữ liệu ở đây đã được sắp xếp */}
                                                        <TableCell>Ngày sinh</TableCell>
                                                        <TableCell>Giới tính</TableCell>
                                                        <TableCell>Email</TableCell>
                                                        <TableCell>Số điện thoại</TableCell>
                                                        <TableCell>Địa chỉ</TableCell>
                                                        <TableCell align="center">Hành động</TableCell> {/* New Actions Column */}
                                                    </TableRow>
                                                </TableHead>
                                                <TableBody>
                                                    {studentsInClass[classItem.class_id].map((student) => (
                                                        <TableRow key={student.id}>
                                                            <TableCell sx={{ color: '#e0e0e0' }}>{student.id}</TableCell>
                                                            <TableCell sx={{ color: '#e0e0e0' }}>{student.name}</TableCell>
                                                            <TableCell sx={{ color: '#e0e0e0' }}>{formatBirthday(student.birthday)}</TableCell>
                                                            <TableCell sx={{ color: '#e0e0e0' }}>{student.gender || 'N/A'}</TableCell>
                                                            <TableCell sx={{ color: '#e0e0e0' }}>{student.email || 'N/A'}</TableCell>
                                                            <TableCell sx={{ color: '#e0e0e0' }}>{student.phone || 'N/A'}</TableCell>
                                                            <TableCell sx={{ color: '#e0e0e0' }}>{student.address || 'N/A'}</TableCell>
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

            {/* --- START: SCORE MANAGEMENT DIALOGS FROM moi 4.txt --- */}
            <Dialog open={openScoreDialog} onClose={handleCloseScoreDialog} maxWidth="md" fullWidth>
                <DialogTitle>Điểm số của {currentStudentForScores?.name}</DialogTitle>
                <DialogContent dividers>
                    {/* Nút "Thêm Điểm" đã được di chuyển ra ngoài các điều kiện tải/lỗi */}
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={handleOpenAddScoreDialog}
                        sx={{ mb: 2 }}
                        // Đảm bảo nút không bị vô hiệu hóa nếu student chưa được chọn (mặc dù logic đảm bảo)
                        disabled={currentStudentForScores === null}
                    >
                        Thêm Điểm
                    </Button>

                    {loadingScores ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                            <CircularProgress size={24} />
                            <Typography sx={{ ml: 1 }}>Đang tải điểm số...</Typography>
                        </Box>
                    ) : scoreError ? (
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
                                                {scoreTypes.map(st => {
                                                    const score = types[st.value];
                                                    return (
                                                        <TableRow key={`${subjectName}-${st.value}`}>
                                                            <TableCell>{st.label}</TableCell>
                                                            <TableCell>{score ? score.score : 'N/A'}</TableCell>
                                                            <TableCell align="right">
                                                                {score ? (
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
                                                                ) : (
                                                                    <Typography variant="body2" color="text.secondary">Chưa có</Typography>
                                                                )}
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                </Box>
                            ))
                        ) : (
                            <Alert severity="info">Học sinh này chưa có điểm nào được nhập cho các môn bạn đang giảng dạy.</Alert>
                        )
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseScoreDialog}>Đóng</Button>
                </DialogActions>
            </Dialog>

            {/* Dialog to Add New Score */}
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
                                    {subjects.length > 0 ? (
                                        subjects.map((subject) => (
                                            <MenuItem key={subject.id} value={subject.id}>
                                                {subject.name}
                                            </MenuItem>
                                        ))
                                    ) : (
                                        <MenuItem disabled>Không có môn học nào bạn đang giảng dạy cho lớp này.</MenuItem>
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
                                    {scoreTypes.map((type) => (
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
                        {addingScore ? <CircularProgress size={24} sx={{ color: '#e0e0e0' }} /> : 'Lưu điểm'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Dialog to Edit Score */}
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
                                value={scoreToEdit?.score || ''}
                                onChange={handleEditScoreInputChange}
                                inputProps={{ min: 0, max: 10, step: 0.1 }}
                                required
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                Môn học: {scoreToEdit?.subject?.name || scoreToEdit?.subject_name || 'N/A'}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Loại điểm: {scoreTypes.find(type => type.value === scoreToEdit?.type)?.label || scoreToEdit?.type || 'N/A'}
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

            {/* Dialog Confirm Delete Score */}
            <Dialog
                open={openDeleteScoreConfirm}
                onClose={handleCloseDeleteScoreConfirm}
                aria-labelledby="delete-score-dialog-title"
                aria-describedby="delete-score-dialog-description"
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle id="delete-score-dialog-title">Xác nhận xóa điểm</DialogTitle>
                <DialogContent>
                    <Typography id="delete-score-dialog-description">
                        Bạn có chắc chắn muốn xóa điểm này không? Hành động này không thể hoàn tác.
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
                        {deletingScore ? <CircularProgress size={24} sx={{ color: '#e0e0e0' }} /> : 'Xóa'}
                    </Button>
                </DialogActions>
            </Dialog>
            {/* --- END: SCORE MANAGEMENT DIALOGS FROM moi 4.txt --- */}

            {/* Snackbar for Notifications */}
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