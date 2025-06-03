import React, { useEffect, useState } from 'react';
import axios, { isAxiosError, AxiosError } from 'axios';
import { useTranslation } from 'react-i18next';
import {
    Box,
    Typography,
    CircularProgress,
    Alert,
    Grid,
    Paper,
    Stack,
} from '@mui/material';
import GroupIcon from '@mui/icons-material/Group';
import PersonIcon from '@mui/icons-material/Person';
import SchoolIcon from '@mui/icons-material/School';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import StarHalfIcon from '@mui/icons-material/StarHalf';

import {
    BarChart,
    Bar,
    PieChart,
    Pie,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    Cell,
    ResponsiveContainer,
} from 'recharts';

interface StatsData {
    students: number;
    teachers: number;
    classes: number;
    subjects: number;
    overallAverageScore: number | null;
}

interface ApiResponse<T> {
    data?: T[];
    meta?: {
        current_page: number;
        last_page: number;
        total: number;
        [key: string]: any;
    };
    success?: boolean;
    message?: string;
}

interface StudentsByClassData {
    className: string;
    studentCount: number;
}

interface PerformanceData {
    category: string;
    studentCount: number;
}

interface GenderData {
    name: string;
    value: number;
}

interface AverageScoreData {
    subjectName: string;
    averageScore: number;
}


interface OverallAverageScoreResponse {
    average_score: number | null;
}

interface StudentRankingResponse {
    Giỏi?: number;
    Khá?: number;
    'Trung bình'?: number;
    Yếu?: number;
    [key: string]: number | undefined;
}

interface AverageScoreBySubjectResponse {
    subject_name: string;
    average_score: number | string | null;
}

const COLORS_BAR = [
    '#4e79a7', '#f28e2b', '#e15759', '#76b7b2', '#59a14f', '#edc948', '#b07aa1', '#ff9da7', '#9c755f', '#bab0ac',
    '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'
];
const COLORS_PIE = ['#0088FE', '#FF8042', '#8884d8'];

const CustomAverageScoreLegend: React.FC<any> = ({ payload }) => {
    const itemsPerColumn = 4;
    const numColumns = 3;
    const items = payload || [];
    const numItems = items.length;
    const itemsPerActualColumn = Math.ceil(numItems / numColumns);

    const columns: any[][] = [];
    for (let i = 0; i < numColumns; i++) {
        columns.push(items.slice(i * itemsPerActualColumn, (i + 1) * itemsPerActualColumn));
    }

    return (
        <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', marginTop: '10px' }}>
            {columns.map((column, colIndex) => (
                <div key={`col-${colIndex}`} style={{ marginRight: '20px' }}>
                    {column.map((entry, index) => (
                        <div key={`legend-${colIndex}-${index}`} style={{ display: 'flex', alignItems: 'center', marginBottom: '5px' }}>
                            <div style={{
                                width: '10px',
                                height: '10px',
                                backgroundColor: entry.color,
                                marginRight: '5px',
                                borderRadius: '2px'
                            }}></div>
                            <Typography variant="caption" sx={{ color: '#e0e0e0' }}>
                                {entry.value}
                            </Typography>
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );
};


const Dashboard: React.FC = () => {
    const API_BASE_URL = import.meta.env.VITE_APP_API_URL;
    const { t } = useTranslation();
    const [stats, setStats] = useState<StatsData>({
        students: 0,
        teachers: 0,
        classes: 0,
        subjects: 0,
        overallAverageScore: null,
    });
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const [studentsByClassData, setStudentsByClassData] = useState<StudentsByClassData[]>([]);
    const [performanceData, setPerformanceData] = useState<PerformanceData[]>([]);
    const [genderData, setGenderData] = useState<GenderData[]>([]);
    const [averageScoresData, setAverageScoresData] = useState<AverageScoreData[]>([]);

    const getAuthToken = () => {
        return localStorage.getItem('token') || sessionStorage.getItem('token');
    };

    const fetchStatsAndChartsData = async () => {
        setLoading(true);
        setError(null);
        const token = getAuthToken();

        if (!token) {
            setError('Bạn cần đăng nhập để xem Dashboard.');
            setLoading(false);
            return;
        }

        const headers = {
            Authorization: `Bearer ${token}`,
            'Accept': 'application/json',
        };

        try {
const [studentsRes, teachersRes, classesRes, subjectsRes, overallAverageRes, performanceRes, averageScoresRes] = await Promise.all([
                axios.get<ApiResponse<any> | any[]>(`${API_BASE_URL}/api/students`, { 
                    headers: { 
                        ...headers,
                        "ngrok-skip-browser-warning": "true",
                    }
                }),
                axios.get<ApiResponse<any> | any[]>(`${API_BASE_URL}/api/teachers`, { 
                    headers: {
                        ...headers,
                        "ngrok-skip-browser-warning": "true",
                    }
                }),
                axios.get<ApiResponse<any> | any[]>(`${API_BASE_URL}/api/classes`, { 
                    headers: {
                        ...headers,
                        "ngrok-skip-browser-warning": "true",
                    }
                }),
                axios.get<ApiResponse<any> | any[]>(`${API_BASE_URL}/api/subjects`, { 
                    headers: {
                        ...headers,
                        "ngrok-skip-browser-warning": "true",
                    }
                }),
                axios.get<OverallAverageScoreResponse>(`${API_BASE_URL}/api/average-score`, { 
                    headers: {
                        ...headers,
                        "ngrok-skip-browser-warning": "true",
                    }
                }),
                axios.get<StudentRankingResponse>(`${API_BASE_URL}/api/student-ranking`, { 
                    headers: {
                        ...headers,
                        "ngrok-skip-browser-warning": "true",
                    }
                }),
                axios.get<AverageScoreBySubjectResponse[]>(`${API_BASE_URL}/api/average-score-by-subject`, { 
                    headers: {
                        ...headers,
                        "ngrok-skip-browser-warning": "true",
                    }
                }),
            ]);

            const getCount = (response: any): number => {
                if (typeof response.data === 'object' && response.data !== null && response.data.meta?.total !== undefined) {
                    return response.data.meta.total;
                } else if (typeof response.data === 'object' && response.data !== null && Array.isArray(response.data.data)) {
                    return response.data.data.length;
                } else if (Array.isArray(response.data)) {
                    return response.data.length;
                }
                return 0;
            };

            const studentsCount = getCount(studentsRes);
            const teachersCount = getCount(teachersRes);
            const classesCount = getCount(classesRes);
            const subjectsCount = getCount(subjectsRes);
            const overallAverageScore = overallAverageRes.data?.average_score !== undefined ? overallAverageRes.data.average_score : null;


            setStats({
                students: studentsCount,
                teachers: teachersCount,
                classes: classesCount,
                subjects: subjectsCount,
                overallAverageScore: overallAverageScore,
            });

            const allStudents = Array.isArray(studentsRes.data) ? studentsRes.data : (studentsRes.data as ApiResponse<any>).data || [];
            if (allStudents.length > 0 && Array.isArray(classesRes.data)) {
                 const classesList = Array.isArray(classesRes.data) ? classesRes.data : (classesRes.data as ApiResponse<any>).data || [];
                 const studentsByClassMap = allStudents.reduce((acc, student) => {
                    const className = classesList.find((cls: any) => cls.id === student.class_id)?.name || `Lớp ${student.class_id}`;
                    acc[className] = (acc[className] || 0) + 1;
                    return acc;
                 }, {});
                 let studentsByClassChartData = Object.entries(studentsByClassMap).map(([className, studentCount]) => ({
                    className,
                    studentCount: studentCount as number,
                 }));

                 studentsByClassChartData.sort((a, b) => {
                    const nameA = a.className;
                    const nameB = b.className;

                    const gradeA = parseInt(nameA.match(/\d+/)?.[0] || '0');
                    const gradeB = parseInt(nameB.match(/\d+/)?.[0] || '0');

                    if (gradeA !== gradeB) {
                        return gradeA - gradeB;
                    }

                    return nameA.localeCompare(nameB, 'vi');
                 });

                 setStudentsByClassData(studentsByClassChartData);
            }

            if (allStudents.length > 0) {
                const genderMap = allStudents.reduce((acc, student) => {
                    const gender = student.gender ? String(student.gender).toLowerCase() : 'không xác định';
                    if (gender === 'male' || gender === 'nam') {
                        acc['Nam'] = (acc['Nam'] || 0) + 1;
                    } else if (gender === 'female' || gender === 'nữ') {
                        acc['Nữ'] = (acc['Nữ'] || 0) + 1;
                    } else {
                        acc['Khác'] = (acc['Khác'] || 0) + 1;
                    }
                    return acc;
                }, {});
                const genderChartData = Object.entries(genderMap).map(([name, count]) => ({
                    name: t(`genderType.${name === 'Nam' ? 'male' : name === 'Nữ' ? 'female' : 'other'}`),
                    value: count as number,
                }));
                setGenderData(genderChartData);
            }

            if (performanceRes.data) {
                const performanceBarData: PerformanceData[] = Object.entries(performanceRes.data).map(([category, count]) => ({
                    category: t(`performanceCategory.${category}`),
                    studentCount: count as number,
                }));
                const order = ['Giỏi', 'Khá', 'Trung bình', 'Yếu'];
                performanceBarData.sort((a, b) => {
                    const indexA = order.findIndex(cat => t(`performanceCategory.${cat}`) === a.category);
                    const indexB = order.findIndex(cat => t(`performanceCategory.${cat}`) === b.category);
                    return indexA - indexB;
                });

                setPerformanceData(performanceBarData);
            }

            if (Array.isArray(averageScoresRes.data)) {
                const averageScoresBarData: AverageScoreData[] = averageScoresRes.data.map((item: AverageScoreBySubjectResponse) => {
                    const avgScore = parseFloat(item.average_score as any);
                    return {
                        subjectName: t(`subjectName.${item.subject_name}`),
                        averageScore: !isNaN(avgScore) ? parseFloat(avgScore.toFixed(2)) : 0,
                    };
                });
                setAverageScoresData(averageScoresBarData);
            }

        } catch (err: any) {
            console.error('Error fetching dashboard stats:', err);
            if (isAxiosError(err)) {
                const axiosError = err as AxiosError<any>;
                 if (axiosError.response && axiosError.response.status === 401) {
                    setError('Phiên đăng nhập hết hạn hoặc bạn không có quyền truy cập. Vui lòng đăng nhập lại.');
                 } else {
                    setError(`Không thể tải dữ liệu thống kê. Lỗi: ${axiosError.response?.data?.message ? axiosError.response.data.message : axiosError.message}`);
                 }
            } else {
                setError(`Không thể tải dữ liệu thống kê. Lỗi: ${err.message}`);
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStatsAndChartsData();
    }, []);

    const getSubjectColor = (subjectName: string, index: number): string => {
        return COLORS_BAR[index % COLORS_BAR.length];
    };


    return (
        <Box p={4} sx={{ bgcolor: '#21222d', color: '#ffffff', minHeight: '100vh' }}>
            <Typography variant="h4" gutterBottom sx={{ mb: 4, color: '#ffffff' }}>
                {t('dashboard.title')}
            </Typography>

            {loading ? (
                <Box display="flex" justifyContent="center" mt={4}>
                    <CircularProgress sx={{ color: '#ffffff' }} />
                </Box>
            ) : error ? (
                <Alert severity="error">{error}</Alert>
            ) : (
                <Grid container spacing={4}>
                     <Grid item xs={2.4}>
                         <Paper elevation={3} sx={{ p: 3, textAlign: 'center', borderRadius: '8px', bgcolor: '#F0FAFF', color: '#212121' }}>
                             <GroupIcon sx={{ fontSize: 48, mb: 1 }} />
                             <Typography variant="h6" component="div">
                                 {stats.students}
                             </Typography>
                             <Typography variant="subtitle1" sx={{ color: '#424242' }}>
                                 {t('dashboard.total_students')}
                             </Typography>
                         </Paper>
                     </Grid>

                    <Grid item xs={2.4}>
                        <Paper elevation={3} sx={{ p: 3, textAlign: 'center', borderRadius: '8px', bgcolor: '#F1FBF2', color: '#212121' }}>
                            <PersonIcon sx={{ fontSize: 48, mb: 1 }} />
                            <Typography variant="h6" component="div">
                                {stats.teachers}
                            </Typography>
                            <Typography variant="subtitle1" sx={{ color: '#424242' }}>
                                {t('dashboard.total_teachers')}
                            </Typography>
                        </Paper>
                    </Grid>

                    <Grid item xs={2.4} >
                        <Paper elevation={3} sx={{ p: 3, textAlign: 'center', borderRadius: '8px', bgcolor: '#FFFEF0', color: '#212121' }}>
                            <SchoolIcon sx={{ fontSize: 48, mb: 1 }} />
                            <Typography variant="h6" component="div">
                                {stats.classes}
                            </Typography>
                            <Typography variant="subtitle1" sx={{ color: '#424242' }}>
                                {t('dashboard.total_classes')}
                            </Typography>
                        </Paper>
                    </Grid>

                    <Grid item xs={2.4}>
                        <Paper elevation={3} sx={{ p: 3, textAlign: 'center', borderRadius: '8px', bgcolor: '#FBF4FD', color: '#212121' }}>
                            <MenuBookIcon sx={{ fontSize: 48, mb: 1 }} />
                            <Typography variant="h6" component="div">
                                {stats.subjects}
                            </Typography>
                            <Typography variant="subtitle1" sx={{ color: '#424242' }}>
                                {t('dashboard.total_subjects')}
                            </Typography>
                        </Paper>
                    </Grid>

                    <Grid item xs={2.4}>
                        <Paper 
                            elevation={3} 
                            sx={{ 
                                p: 2, 
                                textAlign: 'center', 
                                borderRadius: '8px', 
                                bgcolor: '#E1F5FE', 
                                color: '#212121',
                                height: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'center',
                                minHeight: '140px'
                            }}
                        >
                            <StarHalfIcon sx={{ fontSize: 40, mb: 1 }} />
                            <Typography variant="h6" component="div" sx={{ mb: 1 }}>
                                {stats.overallAverageScore !== null ? stats.overallAverageScore.toFixed(2) : 'N/A'}
                            </Typography>
                            <Typography 
                                variant="subtitle2" 
                                sx={{ 
                                    color: '#424242',
                                    lineHeight: 1.2,
                                    px: 1
                                }}
                            >
                                {t('dashboard.school_average')}
                            </Typography>
                        </Paper>
                    </Grid>


                    <Grid item xs={12} md={6}>
                        <Paper elevation={3} sx={{ p: 3, borderRadius: '8px', bgcolor: '#21222d', color: '#ffffff' }}>
                            <Typography variant="h6" gutterBottom sx={{ color: '#ffffff' }}>
                                {t('dashboard.students_by_class')}
                            </Typography>
                            {studentsByClassData.length > 0 ? (
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={studentsByClassData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                         <CartesianGrid strokeDasharray="3 3" stroke="#4f5263" />
                                         <XAxis dataKey="className" stroke="#e0e0e0" />
                                         <YAxis stroke="#e0e0e0" domain={[0, 50]} />
                                         <Tooltip cursor={{ fill: 'rgba(255,255,255,0.1)' }} contentStyle={{ backgroundColor: '#31323d', border: 'none', color: '#ffffff' }} />
                                         <Legend wrapperStyle={{ color: '#e0e0e0' }} />
                                         <Bar dataKey="studentCount" fill="#8884d8" name={t('dashboard.chart_labels.student_count')} />
                                     </BarChart>
                                 </ResponsiveContainer>
                             ) : (
                                 !loading && <Typography variant="body2" color="text.secondary" sx={{ color: '#e0e0e0' }}>{t('dashboard.no_data.students_by_class')}</Typography>
                             )}
                         </Paper>
                    </Grid>

                    <Grid item xs={12} md={6}>
                        <Paper elevation={3} sx={{ p: 3, borderRadius: '8px', bgcolor: '#21222d', color: '#ffffff' }}>
                            <Typography variant="h6" gutterBottom sx={{ color: '#ffffff' }}>
                                {t('dashboard.gender_distribution')}
                            </Typography>
                            {genderData.length > 0 ? (
                                <ResponsiveContainer width="100%" height={300}>
                                    <PieChart>
                                        <Pie
                                            data={genderData}
                                            cx="50%"
                                            cy="50%"
                                            outerRadius={100}
                                            fill="#8884d8"
                                            dataKey="value"
                                            labelLine={false}
                                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                        >
                                            {genderData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS_PIE[index % COLORS_PIE.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip contentStyle={{ backgroundColor: '#31323d', border: 'none', color: '#ffffff' }} />
                                        <Legend wrapperStyle={{ color: '#e0e0e0' }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                !loading && <Typography variant="body2" color="text.secondary" sx={{ color: '#e0e0e0' }}>{t('dashboard.no_data.gender')}</Typography>
                            )}
                        </Paper>
                    </Grid>

                    <Grid item xs={12} md={6}>
                         <Paper elevation={3} sx={{ p: 3, borderRadius: '8px', bgcolor: '#21222d', color: '#ffffff' }}>
                             <Typography variant="h6" gutterBottom sx={{ color: '#ffffff' }}>
                                 {t('dashboard.academic_performance')}
                             </Typography>
                             {performanceData.length > 0 ? (
                                 <ResponsiveContainer width="100%" height={300}>
                                     <BarChart data={performanceData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                         <CartesianGrid strokeDasharray="3 3" stroke="#4f5263" />
                                         <XAxis dataKey="category" stroke="#e0e0e0" />
                                         <YAxis stroke="#e0e0e0" domain={[0, 300]} />
                                         <Tooltip cursor={{ fill: 'rgba(255,255,255,0.1)' }} contentStyle={{ backgroundColor: '#31323d', border: 'none', color: '#ffffff' }} />
                                         <Legend wrapperStyle={{ color: '#e0e0e0' }} />
                                         <Bar dataKey="studentCount" fill="#ffc658" name={t('dashboard.chart_labels.student_count')} />
                                     </BarChart>
                                 </ResponsiveContainer>
                             ) : (
                                 !loading && <Typography variant="body2" color="text.secondary" sx={{ color: '#e0e0e0' }}>{t('dashboard.no_data.performance')}</Typography>
                             )}
                         </Paper>
                    </Grid>

                    <Grid item xs={12} md={6}>
                         <Paper elevation={3} sx={{ p: 3, borderRadius: '8px', bgcolor: '#21222d', color: '#ffffff' }}>
                             <Typography variant="h6" gutterBottom sx={{ color: '#ffffff' }}>
                                 {t('dashboard.subject_averages')}
                             </Typography>
                             {averageScoresData.length > 0 ? (
                                 <ResponsiveContainer width="100%" height={300}>
                                     <BarChart data={averageScoresData} margin={{ top: 5, right: 30, left: 20, bottom: 30 }}>
                                         <CartesianGrid strokeDasharray="3 3" stroke="#4f5263" />
                                         <XAxis dataKey="subjectName" stroke="#e0e0e0" hide={true} />
                                         <YAxis stroke="#e0e0e0" domain={[0, 10]} />
                                         <Tooltip cursor={{ fill: 'rgba(255,255,255,0.1)' }} contentStyle={{ backgroundColor: '#31323d', border: 'none', color: '#ffffff' }} />
                                         <Legend content={<CustomAverageScoreLegend />} wrapperStyle={{ paddingTop: '10px' }} />
                                         <Bar dataKey="averageScore" fill="#fffff" name={t('dashboard.chart_labels.average_score')}>
                                             {averageScoresData.map((entry, index) => (
                                                 <Cell key={`cell-${index}`} fill={getSubjectColor(entry.subjectName, index)} />
                                             ))}
                                         </Bar>
                                     </BarChart>
                                 </ResponsiveContainer>
                             ) : (
                                 !loading && <Typography variant="body2" color="text.secondary" sx={{ color: '#e0e0e0' }}>{t('dashboard.no_data.subject_averages')}</Typography>
                             )}
                         </Paper>
                    </Grid>

                </Grid>
            )}
        </Box>
    );
};

export default Dashboard;
