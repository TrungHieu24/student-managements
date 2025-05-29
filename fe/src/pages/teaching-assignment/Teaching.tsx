import React, { useEffect, useState } from 'react';
import {
    Box,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
    Paper,
    CircularProgress,
    Alert,
    Stack
} from '@mui/material';
import axios, { isAxiosError, AxiosError } from 'axios';

interface Subject {
    id: number;
    name: string;
}

interface Class {
    id: number;
    name: string;
    grade: number;
}

interface TeachingAssignment {
    id: number;
    teacher_id: number;
    class_id: number;
    subject_id: number;
    school_year: string;
    semester: number;
    is_homeroom_teacher: boolean;
    weekly_periods: number | null;
    notes: string | null;
    class: Class;
    subject: Subject;
}


const Teaching = () => {
    const [assignments, setAssignments] = useState<TeachingAssignment[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
       const fetchTeachingAssignments = async () => {
            setLoading(true);
            setError(null);
            try {
               const token = localStorage.getItem('token');
               if (!token) {
                 throw new Error('Không tìm thấy token xác thực. Vui lòng đăng nhập lại.');
               }

                const response = await axios.get<any>('http://localhost:8000/api/teacher/info', {
                   headers: {
                      Authorization: `Bearer ${token}`,
                      'Content-Type': 'application/json'
                   }
                });

                const teacherData = response.data;
                const assignmentsData = teacherData?.teaching_assignments || [];

                const validAssignments = Array.isArray(assignmentsData) ? assignmentsData.filter(assignment => assignment != null && assignment.class && assignment.subject) : [];

                // Sort assignments by grade first, then by class name
                const sortedAssignments = validAssignments.sort((a, b) => {
                    // First compare by grade
                    if (a.class.grade !== b.class.grade) {
                        return a.class.grade - b.class.grade;
                    }
                    // If grades are equal, compare by class name
                    return a.class.name.localeCompare(b.class.name, 'vi', { sensitivity: 'base' });
                });

                setAssignments(sortedAssignments);
           } catch (err: any) {
              console.error("API Error fetching teaching assignments:", err.response?.data || err);
                if (isAxiosError(err) && err.response) {
                  const axiosError = err as AxiosError<any>;
                    const apiMessage = axiosError.response.data?.message;
                    const statusCode = axiosError.response.status;
                    if (statusCode === 401 || statusCode === 403) {
                  setError('Phiên đăng nhập hết hạn hoặc bạn không có quyền truy cập. Vui lòng đăng nhập lại.');
                  } else if (statusCode === 404) {
                  setError('Không tìm thấy thông tin giáo viên liên kết. Vui lòng liên hệ quản trị hệ thống.');
                  }
              else {
            setError(`Lỗi tải phân công giảng dạy: ${apiMessage || `Status ${statusCode}`}`);
              }
            } else {
              setError('Không thể kết nối đến máy chủ API hoặc có lỗi khi tải dữ liệu.');
            }
          setAssignments([]); 
          } finally {
            setLoading(false);
          }
        };

        fetchTeachingAssignments();
     }, []); 

    return (
        <Box sx={{ p: 3, bgcolor: '#1a1c23', minHeight: '100vh', color: '#e0e0e0' }}>
            <Typography variant="h4" gutterBottom sx={{ color: '#FFFFFF', mb: 4 }}>
                Phân công Giảng Dạy
            </Typography>

            {loading ? (
                <Box display="flex" justifyContent="center" mt={4}>
                    <CircularProgress sx={{ color: '#e0e0e0' }} />
                </Box>
            ) : error ? (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            ) : (
                <Paper elevation={3} sx={{ p: 3, borderRadius: '8px', border: '1px solid #3a3c4b', bgcolor: '#21222d', color: '#e0e0e0' }}>
                    {assignments.length > 0 ? (
                         <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #3a3c4b', borderRadius: '8px', overflow: 'hidden', bgcolor: '#21222d' }}>
                            <Table size="small" sx={{ '& .MuiTableCell-root': { borderBottom: '1px solid #4f5263', color: '#e0e0e0' } }}>
                                <TableHead>
                                    <TableRow sx={{ backgroundColor: '#31323d' }}>
                                        <TableCell sx={{ fontWeight: 'bold', color: '#FFFFFF' }}>Lớp</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold', color: '#FFFFFF' }}>Khối</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold', color: '#FFFFFF' }}>Môn học</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold', color: '#FFFFFF' }}>Năm học</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold', color: '#FFFFFF' }}>Học kỳ</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold', color: '#FFFFFF' }}>Số tiết/tuần</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold', color: '#FFFFFF' }}>Ghi chú</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {assignments.map((assignment) => (
                                         <TableRow key={assignment.id} hover sx={{ '&:hover': { backgroundColor: '#2a2b37' } }}>
                                            <TableCell sx={{ color: '#e0e0e0' }}>{assignment.class?.name || 'N/A'}</TableCell>
                                            <TableCell sx={{ color: '#e0e0e0' }}>{assignment.class?.grade || 'N/A'}</TableCell>
                                            <TableCell sx={{ color: '#e0e0e0' }}>{assignment.subject?.name || 'N/A'}</TableCell>
                                            <TableCell sx={{ color: '#e0e0e0' }}>{assignment.school_year}</TableCell>
                                            <TableCell sx={{ color: '#e0e0e0' }}>{assignment.semester}</TableCell>  
                                            <TableCell sx={{ color: '#e0e0e0' }}>{assignment.weekly_periods ?? 'N/A'}</TableCell>
                                            <TableCell sx={{ color: '#e0e0e0' }}>{assignment.notes || 'N/A'}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    ) : (
                         <Typography variant="body2" color="text.secondary" sx={{ ml: 2, fontStyle: 'italic', color: '#e0e0e0' }}>
                            Bạn chưa có phân công giảng dạy nào.
                        </Typography>
                    )}
                </Paper>
            )}
        </Box>
    );
};

export default Teaching;