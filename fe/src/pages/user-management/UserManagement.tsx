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
    Stack,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    TextField,
    Snackbar,
    Select,
    MenuItem,
    FormControl,
    InputLabel
} from '@mui/material';
import axios, { isAxiosError, AxiosError } from 'axios';

interface User {
    id: number;
    name: string;
    email: string;
    role: string;
    generated_password?: string;
}

const UserManagement = () => {
    const API_BASE_URL = import.meta.env.VITE_APP_API_URL;
    const [users, setUsers] = useState<User[]>([]);
    const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
    const [selectedRole, setSelectedRole] = useState<string>('ALL');
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [openDialog, setOpenDialog] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        role: 'ADMIN'
    });
    const [notification, setNotification] = useState<{
        open: boolean;
        message: string;
        severity: 'success' | 'error';
    }>({
        open: false,
        message: '',
        severity: 'success',
    });

    const closeNotification = () => {
        setNotification({ ...notification, open: false });
    };

    const fetchUsers = async () => {
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('Không tìm thấy token xác thực. Vui lòng đăng nhập lại.');
            }

            const response = await axios.get(`${API_BASE_URL}/api/users`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    "ngrok-skip-browser-warning": "true",
                }
            });

            setUsers(response.data.data);
        } catch (err: any) {
            console.error("API Error fetching users:", err.response?.data || err);
            if (isAxiosError(err) && err.response) {
                const axiosError = err as AxiosError<any>;
                const apiMessage = axiosError.response?.data?.message;
                const statusCode = axiosError.response?.status;
                if (statusCode === 401 || statusCode === 403) {
                    setError('Phiên đăng nhập hết hạn hoặc bạn không có quyền truy cập. Vui lòng đăng nhập lại.');
                } else {
                    setError(`Lỗi tải danh sách người dùng: ${apiMessage || `Status ${statusCode}`}`);
                }
            } else {
                setError('Không thể kết nối đến máy chủ API hoặc có lỗi khi tải dữ liệu.');
            }
            setUsers([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    useEffect(() => {
        if (selectedRole === 'ALL') {
            setFilteredUsers(users);
        } else {
            setFilteredUsers(users.filter(user => user.role === selectedRole));
        }
    }, [selectedRole, users]);

    const handleRoleFilterChange = (event: any) => {
        setSelectedRole(event.target.value);
    };

    const handleOpenDialog = (user?: User) => {
        if (user) {
            setEditingUser(user);
            setFormData({
                name: user.name,
                email: user.email,
                role: user.role
            });
        } else {
            setEditingUser(null);
            setFormData({
                name: '',
                email: '',
                role: 'ADMIN'
            });
        }
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setEditingUser(null);
        setFormData({
            name: '',
            email: '',
            role: 'ADMIN'
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('Không tìm thấy token xác thực');
            }

            const headers = {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
                "ngrok-skip-browser-warning": "true",
            };

            if (editingUser) {
                await axios.put(`${API_BASE_URL}/api/users/${editingUser.id}`, formData, { headers });
                setNotification({
                    open: true,
                    message: 'Cập nhật người dùng thành công',
                    severity: 'success'
                });
            } else {
                const response = await axios.post(`${API_BASE_URL}/api/users`, {
                    name: formData.name,
                    email: formData.email,
                    role: formData.role
                }, { headers });
                
                setNotification({
                    open: true,
                    message: `Tạo người dùng thành công. Mật khẩu: ${response.data.user.generated_password}`,
                    severity: 'success'
                });
            }

            handleCloseDialog();
            fetchUsers();
        } catch (err: any) {
            console.error("API Error:", err.response?.data || err);
            setNotification({
                open: true,
                message: 'Có lỗi xảy ra khi lưu thông tin người dùng',
                severity: 'error'
            });
        }
    };

    const handleDelete = async (id: number) => {
        const userToDelete = users.find(user => user.id === id);
        if (userToDelete) {
            setSelectedUser(userToDelete);
            setDeleteDialogOpen(true);
        }
    };

    const handleConfirmDelete = async () => {
        if (!selectedUser) return;
        
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('Không tìm thấy token xác thực');
            }

            await axios.delete(`${API_BASE_URL}/api/users/${selectedUser.id}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    "ngrok-skip-browser-warning": "true",
                }
            });

            setNotification({
                open: true,
                message: 'Xóa người dùng thành công',
                severity: 'success'
            });
            fetchUsers();
        } catch (err: any) {
            console.error("API Error:", err.response?.data || err);
            setNotification({
                open: true,
                message: 'Có lỗi xảy ra khi xóa người dùng',
                severity: 'error'
            });
        } finally {
            setDeleteDialogOpen(false);
            setSelectedUser(null);
        }
    };

    const handleCloseDeleteDialog = () => {
        setDeleteDialogOpen(false);
        setSelectedUser(null);
    };

    return (
        <Box sx={{ p: 3, bgcolor: '#1a1c23', minHeight: '100vh', color: '#e0e0e0' }}>
            <Typography variant="h4" gutterBottom sx={{ color: '#FFFFFF', mb: 4 }}>
                Quản lý người dùng
            </Typography>

            <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                mb: 3,
                gap: 2
            }}>
                <Button 
                    variant="contained" 
                    onClick={() => handleOpenDialog()}
                >
                    Thêm Admin mới
                </Button>

                <FormControl sx={{ 
                    minWidth: 200,
                    '& .MuiInputLabel-root': {
                        color: '#e0e0e0',
                    },
                    '& .MuiOutlinedInput-root': {
                        backgroundColor: '#2a2b37',
                        '& fieldset': {
                            borderColor: '#3a3c4b',
                        },
                        '&:hover fieldset': {
                            borderColor: '#4f5263',
                        },
                        '&.Mui-focused fieldset': {
                            borderColor: '#4f5263',
                        },
                    },
                    '& .MuiSelect-icon': {
                        color: '#e0e0e0',
                    }
                }}>
                    <InputLabel id="role-filter-label">Lọc theo vai trò</InputLabel>
                    <Select
                        labelId="role-filter-label"
                        value={selectedRole}
                        label="Lọc theo vai trò"
                        onChange={handleRoleFilterChange}
                        sx={{ 
                            color: '#e0e0e0',
                        }}
                    >
                        <MenuItem value="ALL">Tất cả</MenuItem>
                        <MenuItem value="ADMIN">Admin</MenuItem>
                        <MenuItem value="TEACHER">Giáo viên</MenuItem>
                        <MenuItem value="USER">User</MenuItem>
                    </Select>
                </FormControl>
            </Box>

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
                    {filteredUsers.length > 0 ? (
                        <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #3a3c4b', borderRadius: '8px', overflow: 'hidden', bgcolor: '#21222d' }}>
                            <Table size="small" sx={{ '& .MuiTableCell-root': { borderBottom: '1px solid #4f5263', color: '#e0e0e0' } }}>
                                <TableHead>
                                    <TableRow sx={{ backgroundColor: '#31323d' }}>
                                        <TableCell sx={{ fontWeight: 'bold', color: '#FFFFFF' }}>ID</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold', color: '#FFFFFF' }}>Tên</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold', color: '#FFFFFF' }}>Email</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold', color: '#FFFFFF' }}>Vai trò</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold', color: '#FFFFFF' }}>Thao tác</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {filteredUsers.map((user) => (
                                        <TableRow key={user.id} hover sx={{ '&:hover': { backgroundColor: '#2a2b37' } }}>
                                            <TableCell sx={{ color: '#e0e0e0' }}>{user.id}</TableCell>
                                            <TableCell sx={{ color: '#e0e0e0' }}>{user.name}</TableCell>
                                            <TableCell sx={{ color: '#e0e0e0' }}>{user.email}</TableCell>
                                            <TableCell sx={{ color: '#e0e0e0' }}>{user.role}</TableCell>
                                            <TableCell>
                                                <Stack direction="row" spacing={1}>
                                                    <Button
                                                        variant="contained"
                                                        size="small"
                                                        onClick={() => handleOpenDialog(user)}
                                                    >
                                                        Sửa
                                                    </Button>
                                                    <Button
                                                        variant="contained"
                                                        color="error"
                                                        size="small"
                                                        onClick={() => handleDelete(user.id)}
                                                    >
                                                        Xóa
                                                    </Button>
                                                </Stack>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    ) : (
                        <Typography variant="body2" color="text.secondary" sx={{ ml: 2, fontStyle: 'italic', color: '#e0e0e0' }}>
                            Không có người dùng nào.
                        </Typography>
                    )}
                </Paper>
            )}

            <Dialog open={openDialog} onClose={handleCloseDialog}>
                <DialogTitle>{editingUser ? 'Sửa người dùng' : 'Thêm Admin mới'}</DialogTitle>
                <form onSubmit={handleSubmit}>
                    <DialogContent>
                        <Stack spacing={2}>
                            <TextField
                                label="Tên"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                                fullWidth
                            />
                            <TextField
                                label="Email"
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                required
                                fullWidth
                            />
                        </Stack>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleCloseDialog}>Hủy</Button>
                        <Button type="submit" variant="contained">Lưu</Button>
                    </DialogActions>
                </form>
            </Dialog>

            <Dialog
                open={deleteDialogOpen}
                onClose={handleCloseDeleteDialog}
                aria-labelledby="delete-dialog-title"
                aria-describedby="delete-dialog-description"
            >
                <DialogTitle id="delete-dialog-title">
                    Xác nhận xóa người dùng
                </DialogTitle>
                <DialogContent>
                    <DialogContentText id="delete-dialog-description">
                        Bạn có chắc chắn muốn xóa người dùng {selectedUser?.name} ({selectedUser?.email}) không?
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDeleteDialog} color="primary">
                        Hủy
                    </Button>
                    <Button onClick={handleConfirmDelete} color="error" autoFocus>
                        Xóa
                    </Button>
                </DialogActions>
            </Dialog>

            <Snackbar
                open={notification.open}
                autoHideDuration={6000}
                onClose={closeNotification}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <Alert onClose={closeNotification} severity={notification.severity} sx={{ width: '100%' }}>
                    {notification.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default UserManagement;