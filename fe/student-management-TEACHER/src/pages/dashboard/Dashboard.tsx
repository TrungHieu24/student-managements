import React, { useEffect, useState } from 'react';
import { styled } from '@mui/material/styles';
import {
    Box,
    Typography,
    CircularProgress,
    Alert,
    Grid,
    Chip,
    Stack,
} from '@mui/material';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import CakeIcon from '@mui/icons-material/Cake';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import WcIcon from '@mui/icons-material/Wc';
import axios from 'axios';
import dayjs from 'dayjs';

interface Subject {
    id: number;
    name: string;
}

interface TeachingAssignment {
    id: number;
    school_year: string;
    semester: number;
    weekly_periods: number | null;
    notes: string | null;
    class: {
        id: number;
        name: string;
        grade: number;
    } | null;
    subject: {
        id: number;
        name: string;
    } | null;
}

interface TeacherDetails {
    id: number;
    user_id: number;
    name: string;
    email: string;
    phone: string | null;
    gender: string | null;
    avatar?: string | null;
    birthday: string | null;
    address: string | null;
    department: string | null;
    status: string | null;
    subjects: Subject[];
    teaching_assignments: TeachingAssignment[];
}


const InfoTitle = styled(Typography)(({ theme }) => ({
    fontWeight: 'bold',
    color: '#87888C',
    marginBottom: theme.spacing(2),
    display: 'flex',
    alignItems: 'center',
    fontSize: '1.2rem'
}));

const InfoLabel = styled(Typography)(({ theme }) => ({
    fontWeight: 'bold',
    color: '#87888C',
    display: 'flex',
    alignItems: 'center',
    fontSize: '1rem',
    flexShrink: 0,
}));

const AvatarContainer = styled(Box)(({ theme }) => ({
    width: 120,
    height: 120,
    borderRadius: '50%',
    overflow: 'hidden',
    border: '2px solid #e0e0e0',
    margin: theme.spacing(0, 'auto', 3, 'auto'), 
    [theme.breakpoints.up('sm')]: {
         margin: theme.spacing(0, 0, 3, 13),
    },
    boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.1)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center'
}));

const RoundedAvatar = styled('img')({
    width: '100%',
    height: '100%',
    objectFit: 'cover',
});


const TeacherProfileDisplay = () => {
    const API_BASE_URL = import.meta.env.VITE_APP_API_URL;
    const [teacherDetails, setTeacherDetails] = useState<TeacherDetails | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchLoggedInTeacherDetails = async () => {
            setLoading(true);
            setError(null);
            try {
                const token = localStorage.getItem('token');
                if (!token) {
                    setError('Không tìm thấy token xác thực. Vui lòng đăng nhập lại.');
                    setLoading(false);
                    return;
                }

                const response = await axios.get(`${API_BASE_URL}/api/teacher/info`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json',
                        "ngrok-skip-browser-warning": "true",
                    }
                });

                const data: TeacherDetails = response.data;

                if (!data.subjects) {
                     console.warn("API /api/teacher/info did not return subjects eager-loaded.");
                }

                setTeacherDetails(data);

            } catch (err: any) {
                 console.error("Error fetching logged-in teacher details:", err.response?.data || err);
                 if (err.response) {
                     const apiMessage = err.response.data?.message;
                     const statusCode = err.response.status;
                     if (statusCode === 401 || statusCode === 403) {
                          setError('Phiên đăng nhập hết hạn hoặc bạn không có quyền truy cập. Vui lòng đăng nhập lại.');
                     } else {
                         setError(`Lỗi tải thông tin giáo viên: ${apiMessage || `Status ${statusCode}`}`);
                     }
                 } else {
                      setError('Không thể kết nối đến máy chủ API hoặc có lỗi khi tải dữ liệu.');
                 }
                 setTeacherDetails(null);

            } finally {
                setLoading(false);
            }
        };

        fetchLoggedInTeacherDetails();
    }, []);

    const getAvatarUrl = () => {
        if (teacherDetails?.avatar) {
            return teacherDetails.avatar;
        } else {
            const initials = teacherDetails?.name
                ? teacherDetails.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
                : 'GV';
            return `https://ui-avatars.com/api/?name=${initials}&background=374151&color=f3f4f6&size=128`;
        }
    };

    const formatBirthday = (birthday: string | null | undefined) => {
        if (!birthday) return null;
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

    return (
        <div className="bg-gray-100 min-h-screen py-8">
            <div className="max-w-lg mx-auto bg-white shadow-lg rounded-lg overflow-hidden p-8">
                <header className="mb-8">
                    <Typography variant="h5" component="h1" gutterBottom textAlign="center">Thông tin Giáo viên</Typography>
                </header>

                {loading && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
                        <CircularProgress />
                    </Box>
                )}

                {error && (
                    <Alert severity="error" sx={{ mb: 4 }}>
                        {error}
                    </Alert>
                )}

                {teacherDetails && !loading && (
                    <section>
                        {/* alignItems="center" for vertical alignment */}
                        <Grid container spacing={6} alignItems="center">
                            <Grid item xs={12} sm={4}>
                                {/* AvatarContainer styles handle margin adjustment */}
                                <AvatarContainer>
                                    <RoundedAvatar
                                        src={getAvatarUrl()}
                                        alt={`${teacherDetails.name} avatar`}
                                    />
                                </AvatarContainer>
                                <Typography variant="h5" fontWeight="bold" gutterBottom textAlign={{ xs: 'center', sm: 'left' }} sx={{ mb: 1 }}>{teacherDetails.name}</Typography>
                            </Grid>
                            <Grid item xs={12} sm={8}>
                                <Box sx={{ mb: 4 }}>
                                    <Grid container spacing={3}>
                                         <Grid item xs={12} sm={4}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', minHeight: '1.5rem' }}>
                                                <InfoLabel sx={{ mr: 1 }}>
                                                    <EmailIcon sx={{ mr: 0.5, fontSize: '1rem' }} />
                                                    ID:
                                                </InfoLabel>
                                                <Typography variant="body1" sx={{ color: '#87888C', fontSize: '1rem', flexGrow: 1, wordBreak: 'break-word' }}>
                                                    {teacherDetails.id}
                                                </Typography>
                                            </Box>
                                        </Grid>
                                        {/* Email */}
                                        <Grid item xs={12} sm={4}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', minHeight: '1.5rem' }}>
                                                <InfoLabel sx={{ mr: 1 }}>
                                                    <EmailIcon sx={{ mr: 0.5, fontSize: '1rem' }} />
                                                    Email:
                                                </InfoLabel>
                                                <Typography variant="body1" sx={{ color: '#87888C', fontSize: '1rem', flexGrow: 1, wordBreak: 'break-word' }}>
                                                    {teacherDetails.email}
                                                </Typography>
                                            </Box>
                                        </Grid>
                                        {/* Phone */}
                                        {teacherDetails.phone && (
                                            <Grid item xs={12} sm={4}>
                                                 <Box sx={{ display: 'flex', alignItems: 'center', minHeight: '1.5rem' }}>
                                                     <InfoLabel sx={{ mr: 1 }}>
                                                          <PhoneIcon sx={{ mr: 0.5, fontSize: '1rem' }} />
                                                          Điện thoại:
                                                     </InfoLabel>
                                                     <Typography variant="body1" sx={{ color: '#87888C', fontSize: '1rem', flexGrow: 1, wordBreak: 'break-word' }}>
                                                          {teacherDetails.phone}
                                                     </Typography>
                                                 </Box>
                                            </Grid>
                                        )}
                                        {/* Gender */}
                                        {teacherDetails.gender && (
                                            <Grid item xs={12} sm={4}>
                                                 <Box sx={{ display: 'flex', alignItems: 'center', minHeight: '1.5rem' }}>
                                                     <InfoLabel sx={{ mr: 1 }}>
                                                          <WcIcon sx={{ mr: 0.5, fontSize: '1rem' }} />
                                                          Giới tính:
                                                     </InfoLabel>
                                                     <Typography variant="body1" sx={{ color: '#87888C', fontSize: '1rem', flexGrow: 1, wordBreak: 'break-word' }}>
                                                          {teacherDetails.gender || 'Không xác định'}
                                                     </Typography>
                                                 </Box>
                                            </Grid>
                                        )}
                                        {/* Birthday */}
                                        {teacherDetails.birthday && (
                                            <Grid item xs={12} sm={4}>
                                                 <Box sx={{ display: 'flex', alignItems: 'center', minHeight: '1.5rem' }}>
                                                     <InfoLabel sx={{ mr: 1 }}>
                                                          <CakeIcon sx={{ mr: 0.5, fontSize: '1rem' }} />
                                                          Ngày sinh:
                                                     </InfoLabel>
                                                     <Typography variant="body1" sx={{ color: '#87888C', fontSize: '1rem', flexGrow: 1, wordBreak: 'break-word' }}>
                                                          {formatBirthday(teacherDetails.birthday) || 'Không xác định'}
                                                     </Typography>
                                                 </Box>
                                            </Grid>
                                        )}
                                        {/* Address */}
                                        {teacherDetails.birthday && (
                                            <Grid item xs={12} sm={4}>
                                                 <Box sx={{ display: 'flex', alignItems: 'center', minHeight: '1.5rem' }}>
                                                     <InfoLabel sx={{ mr: 1 }}>
                                                          <LocationOnIcon  sx={{ mr: 0.5, fontSize: '1rem' }} />
                                                          Địa chỉ:
                                                     </InfoLabel>
                                                     <Typography variant="body1" sx={{ color: '#87888C', fontSize: '1rem', flexGrow: 1, wordBreak: 'break-word' }}>
                                                          {formatBirthday(teacherDetails.address) || 'Không xác định'}
                                                     </Typography>
                                                 </Box>
                                            </Grid>
                                        )}
                                        {/* Department */}
                                        {teacherDetails.department && (
                                            <Grid item xs={12} sm={4}>
                                                 <Box sx={{ display: 'flex', alignItems: 'center', minHeight: '1.5rem' }}>
                                                     <InfoLabel sx={{ mr: 1 }}>
                                                          Khoa:
                                                     </InfoLabel>
                                                      <Typography variant="body1" sx={{ color: '#87888C', fontSize: '1rem', flexGrow: 1, wordBreak: 'break-word' }}>
                                                          {teacherDetails.department}
                                                     </Typography>
                                                 </Box>
                                            </Grid>
                                        )}
                                    </Grid>
                                </Box>

                                {/* Môn dạy chuyên ngành (Subject Expertise) */}
                                <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>Môn dạy chuyên ngành</Typography>
                                <Stack direction="row" spacing={2} flexWrap="wrap">
                                    {teacherDetails.subjects && teacherDetails.subjects.length > 0 ? (
                                        teacherDetails.subjects.map((subject) => (
                                            <Chip
                                                key={subject.id}
                                                label={subject.name}
                                                size="medium"
                                                color="primary"
                                                variant="outlined"
                                                sx={{ mb: 1 }}
                                            />
                                        ))
                                    ) : (
                                        <Typography variant="body2" color="text.secondary">
                                            Không có môn chuyên ngành được liệt kê.
                                        </Typography>
                                    )}
                                </Stack>
                            </Grid>
                        </Grid>
                    </section>
                )}
            </div>
        </div>
    );
};

export default TeacherProfileDisplay;