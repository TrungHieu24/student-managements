import React, { useEffect, useState } from 'react';
import axios, { AxiosError } from 'axios'; 
import { useTranslation } from 'react-i18next';
import { SelectChangeEvent } from '@mui/material/Select';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';

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
  Stack,
  Chip,
  Alert,
  Snackbar,
  Button,
  IconButton,
  Tooltip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  OutlinedInput,
  Grid,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import VisibilityIcon from '@mui/icons-material/Visibility';
import dayjs from 'dayjs';

// Define interfaces for data structures
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

interface Teacher {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  gender: string | null;
  avatar?: string | null;
  subjects: Subject[];
  teaching_assignments: TeachingAssignment[];
  birthday: string | null;
  address: string | null;
}

interface NewTeachingAssignmentForm {
  id?: number;
  class_id: number | '';
  subject_id: number | '';
  school_year: string;
  semester: number | '';
  is_homeroom_teacher: boolean;
  weekly_periods?: number | '';
  notes?: string;
}

// Cập nhật interface cho form cơ bản
interface BasicTeacherForm {
  name: string;
  email: string;
  phone: string;
  gender: string;
  birthday: string;
  address: string;
}

interface AddTeacherForm extends BasicTeacherForm {
  subjects: number[];
  teaching_assignments: NewTeachingAssignmentForm[];
}

interface DetailsForm {
  subjects: number[];
  teaching_assignments: NewTeachingAssignmentForm[];
}

const TeacherManagement: React.FC = () => {
  const { t } = useTranslation();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [notification, setNotification] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({
    open: false,
    message: '',
    severity: 'success',
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);
  const [editBasicDialogOpen, setEditBasicDialogOpen] = useState<boolean>(false);
  const [addDialogOpen, setAddDialogOpen] = useState<boolean>(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState<boolean>(false);
  const [editDetailsDialogOpen, setEditDetailsDialogOpen] = useState<boolean>(false);

  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const emptyAddForm: AddTeacherForm = {
    name: '',
    email: '',
    phone: '',
    gender: '',
    birthday: '',
    address: '',
    subjects: [],
    teaching_assignments: [],
  };
  const [addForm, setAddForm] = useState<AddTeacherForm>({ ...emptyAddForm });
  const emptyEditBasicForm: BasicTeacherForm = {
    name: '',
    email: '',
    phone: '',
    gender: '',
    birthday: '',
    address: '',
  };
  const [editBasicForm, setEditBasicForm] = useState<BasicTeacherForm>({ ...emptyEditBasicForm });
  const emptyDetailsEditForm: DetailsForm = { subjects: [], teaching_assignments: [] };
  const [detailsEditForm, setDetailsEditForm] = useState<DetailsForm>({ ...emptyDetailsEditForm });
  const [addFormErrors, setAddFormErrors] = useState<{ [key: string]: any }>({});
  const [editBasicFormErrors, setEditBasicFormErrors] = useState<{ [key: string]: string }>({});
  const [detailsEditFormErrors, setDetailsEditFormErrors] = useState<{ [key: string]: any }>({});

  const closeNotification = () => {
    setNotification({ ...notification, open: false });
  };

  const fetchTeachers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:8000/api/teachers', {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      let teachersData: Teacher[] = [];
      if (Array.isArray(res.data)) {
        teachersData = res.data;
      } else if (res.data.data && Array.isArray(res.data.data)) {
        teachersData = res.data.data.map((teacher: any) => ({
          ...teacher,
          subjects: teacher.subjects || [],
          teaching_assignments: teacher.teaching_assignments || [],
        }));
      } else {
        console.error('Unexpected API response structure:', res.data);
        throw new Error('Định dạng dữ liệu trả về không đúng');
      }

      teachersData.sort((a, b) => {
        const aParts = a.name.trim().split(/\s+/).reverse();
        const bParts = b.name.trim().split(/\s+/).reverse();
        const lenA = aParts.length;
        const lenB = bParts.length;

        const minLen = Math.min(lenA, lenB);

        for (let i = 0; i < minLen; i++) {
          const partA = aParts[i];
          const partB = bParts[i];
          const comparison = partA.localeCompare(partB, 'vi');
          if (comparison !== 0) {
            return comparison;
          }
        }

        return lenA - lenB;
      });
      setTeachers(teachersData);
      setError('');
    } catch (err: any) {
      console.error('API Error:', err);
      setError(err.response?.data?.message || 'Lỗi khi tải danh sách giáo viên');
      setNotification({
        open: true,
        message: err.response?.data?.message || 'Lỗi khi tải danh sách giáo viên',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };
  const fetchSubjects = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:8000/api/subjects', {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (Array.isArray(res.data)) {
        setSubjects(res.data);
      } else if (res.data.data && Array.isArray(res.data.data)) {
        setSubjects(res.data.data);
      }
    } catch (err: any) {
      console.error('API Error fetching subjects:', err);
    }
  };

  const fetchClasses = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:8000/api/classes', {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (Array.isArray(res.data)) {
        setClasses(res.data);
      } else if (res.data.data && Array.isArray(res.data.data)) {
        setClasses(res.data.data);
      }
    } catch (err: any) {
      console.error('API Error fetching classes:', err);
    }
  };

  useEffect(() => {
    fetchTeachers();
    fetchSubjects();
    fetchClasses();
  }, []);
  const handleRefresh = () => {
    fetchTeachers();
  };
  const openDeleteDialog = (teacher: Teacher) => {
    setSelectedTeacher(teacher);
    setDeleteDialogOpen(true);
  };
  const closeDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setSelectedTeacher(null);
  };
const openEditBasicDialog = (teacher: Teacher) => {
    setSelectedTeacher(teacher);
    setEditBasicForm({
      name: teacher.name,
      email: teacher.email,
      phone: teacher.phone || '',
      gender: teacher.gender || '',
      birthday: teacher.birthday ? dayjs(teacher.birthday).format('YYYY-MM-DD') : '', 
      address: teacher.address || '',
    });
    setEditBasicFormErrors({}); 
    setEditBasicDialogOpen(true); 
};

  const closeEditBasicDialog = () => {
    setEditBasicDialogOpen(false);
    setSelectedTeacher(null);
    setEditBasicFormErrors({});
    setEditBasicForm({ ...emptyEditBasicForm });
  };

  const openAddDialog = () => {
    setAddForm({ ...emptyAddForm });
    setAddFormErrors({});
    setAddDialogOpen(true);
  };
  const closeAddDialog = () => {
    setAddDialogOpen(false);
    setAddFormErrors({});
    setAddForm({ ...emptyAddForm });
  };
  const openDetailsDialog = (teacher: Teacher) => {
    setSelectedTeacher(teacher);
    const mappedAssignments: NewTeachingAssignmentForm[] = (teacher.teaching_assignments || [])
      .filter((assignment) => assignment != null)
      .map((assignment) => ({
        id: assignment.id,
        class_id: assignment.class_id,
        subject_id: assignment.subject_id,

        school_year: assignment.school_year,
        semester: assignment.semester,
        is_homeroom_teacher: assignment.is_homeroom_teacher,
        weekly_periods: assignment.weekly_periods || '',
        notes: assignment.notes || '',
      }));
    setDetailsEditForm({
      subjects: (teacher.subjects || []).map((s) => s.id),
      teaching_assignments: mappedAssignments,
    });
    setDetailsEditFormErrors({});
    setDetailsDialogOpen(true);
  };

  const closeDetailsDialog = () => {
    setDetailsDialogOpen(false);
    setSelectedTeacher(null);
  };
  const openEditDetailsDialog = () => {
    setDetailsEditFormErrors({});
    setEditDetailsDialogOpen(true);
  };
  const closeEditDetailsDialog = () => {
    console.log('--- Attempting to close edit details dialog ---');
    setEditDetailsDialogOpen(false);
    setDetailsEditFormErrors({});
  };

  const handleDeleteTeacher = async () => {
    if (!selectedTeacher) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:8000/api/teachers/${selectedTeacher.id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      setNotification({
        open: true,
        message: t('teacher_delete_success'),
        severity: 'success',
      });
      fetchTeachers();
    } catch (err: any) {
      console.error('API Error:', err);
      setNotification({
        open: true,
        message: t('teacher_delete_error'),
        severity: 'error',
      });
    } finally {
      closeDeleteDialog();
    }
  };
  const handleAddFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent<string>,
  ) => {
    const { name, value } = e.target;
    if (!name) return;
    setAddForm({
      ...addForm,
      [name]: value,
    });
    if (addFormErrors[name]) {
      setAddFormErrors({
        ...addFormErrors,
        [name]: '',
      });
    }
  };

  const handleEditBasicFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent<string>,
  ) => {
    const { name, value } = e.target;
    if (!name) return;
    setEditBasicForm({
      ...editBasicForm,
      [name]: value,
    });
    if (editBasicFormErrors[name]) {
      setEditBasicFormErrors({
        ...editBasicFormErrors,
        [name]: '',
      });
    }
  };

  const handleAddSubjectsChange = (e: SelectChangeEvent<number[]>) => {
    const value = e.target.value;
    setAddForm({
      ...addForm,
      subjects: Array.isArray(value) ? value : [],
    });
    if (addFormErrors.subjects) {
      setAddFormErrors({
        ...addFormErrors,
        subjects: '',
      });
    }
  };

  const handleDetailsSubjectsChange = (e: SelectChangeEvent<number[]>) => {
    const value = e.target.value;
    setDetailsEditForm({
      ...detailsEditForm,
      subjects: Array.isArray(value) ? value : [],
    });
    if (detailsEditFormErrors.subjects) {
      const updatedErrors = { ...detailsEditFormErrors };
      delete updatedErrors.subjects;
      setDetailsEditFormErrors(updatedErrors);
    }
  };

  const handleAddAssignmentChange = (
    index: number,
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent<string | number>,
  ) => {
    const { name, value } = e.target;
    if (!name) return;

    const updatedAssignments = [...(addForm.teaching_assignments || [])];
    updatedAssignments[index] = {
      ...updatedAssignments[index],
      [name]: value,
    };
    setAddForm({
      ...addForm,
      teaching_assignments: updatedAssignments,
    });
    if (
      addFormErrors.assignments &&
      addFormErrors.assignments[index] &&
      addFormErrors.assignments[index][name]
    ) {
      const updatedAssignmentErrors = { ...addFormErrors.assignments };
      delete updatedAssignmentErrors[index][name];
      if (Object.keys(updatedAssignmentErrors[index]).length === 0) {
        delete updatedAssignmentErrors[index];
      }
      if (Object.keys(updatedAssignmentErrors).length === 0) {
        const newFormErrors = { ...addFormErrors };
        delete newFormErrors.assignments;
        setAddFormErrors(newFormErrors);
      } else {
        setAddFormErrors({
          ...addFormErrors,
          assignments: updatedAssignmentErrors,
        });
      }
    }
  };
  const handleDetailsAssignmentChange = (
    index: number,
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent<string | number>,
  ) => {
    const { name, value } = e.target;
    if (!name) return;

    const updatedAssignments = [...(detailsEditForm.teaching_assignments || [])];
    updatedAssignments[index] = {
      ...updatedAssignments[index],
      [name]: value,
    };
    setDetailsEditForm({
      ...detailsEditForm,
      teaching_assignments: updatedAssignments,
    });
    if (
      detailsEditFormErrors.assignments &&
      detailsEditFormErrors.assignments[index] &&
      detailsEditFormErrors.assignments[index][name]
    ) {
      const updatedAssignmentErrors = { ...detailsEditFormErrors.assignments };
      delete updatedAssignmentErrors[index][name];
      if (Object.keys(updatedAssignmentErrors[index]).length === 0) {
        delete updatedAssignmentErrors[index];
      }
      if (Object.keys(updatedAssignmentErrors).length === 0) {
        const newFormErrors = { ...detailsEditFormErrors };
        delete newFormErrors.assignments;
        setDetailsEditFormErrors(newFormErrors);
      } else {
        setDetailsEditFormErrors({
          ...detailsEditFormErrors,
          assignments: updatedAssignmentErrors,
        });
      }
    }
  };
  const handleAddAddNewAssignment = () => {
    const newAssignment: NewTeachingAssignmentForm = {
      class_id: '',
      subject_id: '',
      school_year: '',
      semester: '',
      is_homeroom_teacher: false,
      weekly_periods: '',

      notes: '',
    };
    setAddForm({
      ...addForm,
      teaching_assignments: [...(addForm.teaching_assignments || []), newAssignment],
    });
  };

  const handleDetailsAddAssignment = () => {
    const newAssignment: NewTeachingAssignmentForm = {
      class_id: '',
      subject_id: '',
      school_year: '',
      semester: '',
      is_homeroom_teacher: false,

      weekly_periods: '',
      notes: '',
    };
    setDetailsEditForm({
      ...detailsEditForm,
      teaching_assignments: [...(detailsEditForm.teaching_assignments || []), newAssignment],
    });
  };

  const handleAddRemoveAssignment = (index: number) => {
    const updatedAssignments = (addForm.teaching_assignments || []).filter((_, i) => i !== index);
    setAddForm({
      ...addForm,
      teaching_assignments: updatedAssignments,
    });
    if (addFormErrors.assignments && addFormErrors.assignments[index]) {
      const updatedAssignmentErrors = { ...addFormErrors.assignments };
      delete updatedAssignmentErrors[index];
      if (Object.keys(updatedAssignmentErrors).length === 0) {
        const newFormErrors = { ...addFormErrors };
        delete newFormErrors.assignments;
        setAddFormErrors(newFormErrors);
      } else {
        setAddFormErrors({
          ...addFormErrors,
          assignments: updatedAssignmentErrors,
        });
      }
    }
  };
  const handleDetailsRemoveAssignment = (index: number) => {
    const updatedAssignments = (detailsEditForm.teaching_assignments || []).filter(
      (_, i) => i !== index,
    );
    setDetailsEditForm({
      ...detailsEditForm,
      teaching_assignments: updatedAssignments,
    });
    if (detailsEditFormErrors.assignments && detailsEditFormErrors.assignments[index]) {
      const updatedAssignmentErrors = { ...detailsEditFormErrors.assignments };
      delete updatedAssignmentErrors[index];
      if (Object.keys(updatedAssignmentErrors[index]).length === 0) {
        delete updatedAssignmentErrors[index];
      }
      if (Object.keys(updatedAssignmentErrors).length === 0) {
        const newFormErrors = { ...detailsEditFormErrors };
        delete newFormErrors.assignments;
        setDetailsEditFormErrors(newFormErrors);
      } else {
        setDetailsEditFormErrors({
          ...detailsEditFormErrors,
          assignments: updatedAssignmentErrors,
        });
      }
    }
  };
  const validateAddForm = (form: AddTeacherForm): { [key: string]: any } => {
    const errors: { [key: string]: any } = {};
    if (!form.name.trim()) {
      errors.name = 'Họ tên không được để trống';
    }
    if (!form.email.trim()) {
      errors.email = 'Email không được để trống';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errors.email = 'Email không hợp lệ';
    }
    // Removed password validation

    if (form.phone && !/^[0-9]{10,11}$/.test(form.phone)) {
      errors.phone = 'Số điện thoại không hợp lệ';
    }
    if (!form.birthday.trim()) {
      errors.birthday = 'Ngày sinh không được để trống';
    }
    if (!form.address.trim()) {
      errors.address = 'Địa chỉ không được để trống';
    }
    const assignmentErrors: { [key: number]: { [field: string]: string } } = {};
    let hasAssignmentErrors = false;

    const assignmentsToValidate = form.teaching_assignments || [];
    assignmentsToValidate.forEach((assignment, index) => {
      const currentAssignmentErrors: { [field: string]: string } = {};
      if (!assignment || typeof assignment !== 'object') {
        assignmentErrors[index] = { general: 'Dữ liệu phân công không hợp lệ' };
        hasAssignmentErrors = true;

        return;
      }

      if (!assignment.class_id) {
        currentAssignmentErrors.class_id = 'Chưa chọn lớp';
      }
      if (!assignment.subject_id) {
        currentAssignmentErrors.subject_id = 'Chưa chọn môn';
      }
      if (!assignment.school_year.trim()) {
        currentAssignmentErrors.school_year = 'Chưa nhập năm học';
      } else if (!/^\d{4}-\d{4}$/.test(assignment.school_year.trim())) {
        currentAssignmentErrors.school_year = 'Định dạng năm học không hợp lệ (VD: 2024-2025)';
      }
      if (!assignment.semester) {
        currentAssignmentErrors.semester = 'Chưa chọn học kỳ';
      }

      if (Object.keys(currentAssignmentErrors).length > 0) {
        assignmentErrors[index] = currentAssignmentErrors;
        hasAssignmentErrors = true;
      }
    });
    if (hasAssignmentErrors) {
      errors.assignments = assignmentErrors;
    }

    return errors;
  };

  
  const validateEditBasicForm = (form: BasicTeacherForm): { [key: string]: string } => {
    const errors: { [key: string]: string } = {};
    if (!form.name.trim()) {
      errors.name = 'Họ tên không được để trống';
    }
    if (!form.email.trim()) {
      errors.email = 'Email không được để trống';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errors.email = 'Email không hợp lệ';
    }
    if (form.phone && !/^[0-9]{10,11}$/.test(form.phone)) {
      errors.phone = 'Số điện thoại không hợp lệ';
    }
    if (!form.birthday.trim()) {
      errors.birthday = 'Ngày sinh không được để trống';
    }
    if (!form.address.trim()) {
      errors.address = 'Địa chỉ không được để trống';
    }
    return errors;
  };


  const validateDetailsEditForm = (form: DetailsForm): { [key: string]: any } => {
    const errors: { [key: string]: any } = {};
    const assignmentErrors: { [key: number]: { [field: string]: string } } = {};
    let hasAssignmentErrors = false;

    const assignmentsToValidate = form.teaching_assignments || [];
    assignmentsToValidate.forEach((assignment, index) => {
      const currentAssignmentErrors: { [field: string]: string } = {};
      if (!assignment || typeof assignment !== 'object') {
        assignmentErrors[index] = { general: 'Dữ liệu phân công không hợp lệ' };
        hasAssignmentErrors = true;

        return;
      }

      if (!assignment.class_id) {
        currentAssignmentErrors.class_id = 'Chưa chọn lớp';
      }
      if (!assignment.subject_id) {
        currentAssignmentErrors.subject_id = 'Chưa chọn môn';
      }
      if (!assignment.school_year.trim()) {
        currentAssignmentErrors.school_year = 'Chưa nhập năm học';
      } else if (!/^\d{4}-\d{4}$/.test(assignment.school_year.trim())) {
        currentAssignmentErrors.school_year = 'Định dạng năm học không hợp lệ (VD: 2024-2025)';
      }
      if (!assignment.semester) {
        currentAssignmentErrors.semester = 'Chưa chọn học kỳ';
      }

      if (Object.keys(currentAssignmentErrors).length > 0) {
        assignmentErrors[index] = currentAssignmentErrors;
        hasAssignmentErrors = true;
      }
    });
    if (hasAssignmentErrors) {
      errors.assignments = assignmentErrors;
    }

    return errors;
  };
  const handleAddTeacher = async () => {
    const errors = validateAddForm(addForm);
    if (Object.keys(errors).length > 0) {
      setAddFormErrors(errors);
      console.log('Validation failed', errors);
      return;
    }
    setAddFormErrors({});
    try {
      const token = localStorage.getItem('token');
      const payload = {
        name: addForm.name,
        email: addForm.email,
        phone: addForm.phone || null,
        gender: addForm.gender || null,
        birthday: addForm.birthday ? dayjs(addForm.birthday).format('YYYY-MM-DD') : null,
        address: addForm.address || null,
        subject_ids: addForm.subjects,
        teaching_assignments: (addForm.teaching_assignments || [])
          .filter((assignment) => assignment != null)
          .map((assignment) => ({
            class_id: Number(assignment.class_id),
            subject_id: Number(assignment.subject_id),
            school_year: assignment.school_year,
            semester: Number(assignment.semester),
            is_homeroom_teacher: Boolean(assignment.is_homeroom_teacher),
            weekly_periods:
              assignment.weekly_periods === '' ? null : Number(assignment.weekly_periods),
            notes: assignment.notes || null,
          })),
      };

      const res = await axios.post('http://localhost:8000/api/teachers', payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const newTeacher = res.data;
      const generatedPassword = newTeacher.generated_password;

      setNotification({
        open: true,
        message: t('teacher_add_success', { password: generatedPassword }),
        severity: 'success',
      });
      fetchTeachers();
      closeAddDialog();
    } catch (err: any) {
      console.error('API Error:', err);
      if (err.response?.data?.errors) {
        const backendErrors = err.response.data.errors;
        const formattedErrors: { [key: string]: any } = {};

        Object.keys(backendErrors).forEach((key) => {
          if (key.startsWith('teaching_assignments.')) {
            const parts = key.split('.');
            const index = parseInt(parts[1], 10);
            const field = parts[2];

            if (!formattedErrors.assignments) {
              formattedErrors.assignments = {};
            }
            if (!formattedErrors.assignments[index]) {
              formattedErrors.assignments[index] = {};
            }

            formattedErrors.assignments[index][field] = backendErrors[key][0];
          } else {
            formattedErrors[key] = backendErrors[key][0];
          }
        });
        setAddFormErrors(formattedErrors);
        console.log('Backend Validation Errors (formatted):', formattedErrors);
      } else {
        setNotification({
          open: true,
          message: t('teacher_add_error'),
          severity: 'error',
        });
      }
    }
  };
  const handleUpdateBasicTeacher = async () => {
    if (!selectedTeacher) return;
    const errors = validateEditBasicForm(editBasicForm);
    if (Object.keys(errors).length > 0) {
      setEditBasicFormErrors(errors);
      console.log('Validation failed', errors);
      return;
    }
    setEditBasicFormErrors({});
    try {
      const token = localStorage.getItem('token');
      const payload = {
        name: editBasicForm.name,
        email: editBasicForm.email,
        phone: editBasicForm.phone || null,
        gender: editBasicForm.gender || null,
        birthday: editBasicForm.birthday ? dayjs(editBasicForm.birthday).format('YYYY-MM-DD') : null, 
        address: editBasicForm.address || null,
      };
      const res = await axios.put(
        `http://localhost:8000/api/teachers/${selectedTeacher.id}`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
      );
      const updatedTeacher = res.data;
      setTeachers((prevTeachers) => {
        return prevTeachers
          .map((teacher) => (teacher.id === updatedTeacher.id ? updatedTeacher : teacher))
          .sort((a, b) => {
            const aParts = a.name.trim().split(/\s+/).reverse();

            const bParts = b.name.trim().split(/\s+/).reverse();
            const lenA = aParts.length;
            const lenB = bParts.length;
            const minLen = Math.min(lenA, lenB);

            for (let i = 0; i < minLen; i++) {
              const partA = aParts[i];
              const partB = bParts[i];
              const comparison = partA.localeCompare(partB, 'vi');

              if (comparison !== 0) {
                return comparison;
              }
            }

            return lenA - lenB;
          });
      });
      setNotification({
        open: true,
        message: t('teacher_update_success'),
        severity: 'success',
      });
      closeEditBasicDialog();
    } catch (err: any) {
      console.error('API Error:', err);
      if (err.response?.data?.errors) {
        // Gán lỗi từ backend cho các trường mới nếu có
        const backendErrors = err.response.data.errors;
        const formattedErrors: { [key: string]: string } = {};
        if (backendErrors.name) formattedErrors.name = backendErrors.name[0];
        if (backendErrors.email) formattedErrors.email = backendErrors.email[0];
        if (backendErrors.phone) formattedErrors.phone = backendErrors.phone[0];
        if (backendErrors.gender) formattedErrors.gender = backendErrors.gender[0];
        if (backendErrors.birthday) formattedErrors.birthday = backendErrors.birthday[0]; 
        if (backendErrors.address) formattedErrors.address = backendErrors.address[0];
        setEditBasicFormErrors(formattedErrors);
      } else {
        setNotification({
          open: true,
          message: t('teacher_update_error'),
          severity: 'error',
        });
      }
    }
  };
  const handleUpdateDetails = async () => {
    if (!selectedTeacher) {
      setDetailsEditFormErrors({ general: 'Không tìm thấy giáo viên để cập nhật.' });
      return;
    }
    const errors = validateDetailsEditForm(detailsEditForm);
    if (Object.keys(errors).length > 0) {
      setDetailsEditFormErrors(errors);
      console.log('Validation failed', errors);
      return;
    }
    setDetailsEditFormErrors({});

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setDetailsEditFormErrors({ general: 'Phiên đăng nhập hết hạn.' });
        return;
      }

      const payload = {
        name: selectedTeacher.name,
        email: selectedTeacher.email,
        phone: selectedTeacher.phone,
        gender: selectedTeacher.gender,
        birthday: selectedTeacher.birthday ? dayjs(selectedTeacher.birthday).format('YYYY-MM-DD') : null, 
        address: selectedTeacher.address,

        subject_ids: detailsEditForm.subjects,
        teaching_assignments: (detailsEditForm.teaching_assignments || [])
          .filter((assignment) => assignment != null)
          .map((assignment) => ({
            id: assignment.id || undefined,
            class_id: Number(assignment.class_id),

            subject_id: Number(assignment.subject_id),
            school_year: assignment.school_year,
            semester: Number(assignment.semester),
            is_homeroom_teacher: Boolean(assignment.is_homeroom_teacher),
            weekly_periods:
              assignment.weekly_periods === '' ? null : Number(assignment.weekly_periods),
            notes: assignment.notes || null,
          })),
      };
      console.log('Sending update payload:', payload);

      const res = await axios.put(
        `http://localhost:8000/api/teachers/${selectedTeacher.id}`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
      );
      const updatedTeacher = res.data;

      // Cập nhật danh sách giáo viên và giáo viên được chọn
      setTeachers((prevTeachers) => {
        return prevTeachers
          .map((teacher) => (teacher.id === updatedTeacher.id ? updatedTeacher : teacher))
          .sort(/* ... */); // Giữ nguyên logic sort của bạn
      });
      setSelectedTeacher(updatedTeacher);

      // Bỏ hoặc comment dòng này nếu bạn muốn đóng dialog sau khi lưu
      // prepareDetailsEditForm(updatedTeacher);
      console.log('--- About to call closeEditDetailsDialog ---');

      // Đóng dialog và xóa lỗi form (đặt ở cuối luồng thành công)
      setEditDetailsDialogOpen(false);
      setDetailsEditFormErrors({});

      console.log('--- Finished setting dialog state to false ---');

      // Hiển thị thông báo thành công
      setNotification({
        open: true,
        message: t('teacher_update_success'),
        severity: 'success',
      });
    } catch (err: any) {
      console.error('API Error:', err);
      // ... (phần xử lý lỗi giữ nguyên) ...
      if (axios.isAxiosError(err) && err.response) {
        // Sử dụng axios.isAxiosError
        const axiosError = err as AxiosError<any>;
        if (axiosError.response?.data?.errors) {
          const backendErrors = axiosError.response.data.errors;
          const formattedErrors: { [key: string]: any } = {};

          Object.keys(backendErrors).forEach((key) => {
            if (key.startsWith('teaching_assignments.')) {
              const parts = key.split('.');

              const index = parseInt(parts[1], 10);
              const field = parts[2];

              if (!formattedErrors.assignments) {
                formattedErrors.assignments = {};
              }

              if (!formattedErrors.assignments[index]) {
                formattedErrors.assignments[index] = {};
              }
              formattedErrors.assignments[index][field] = backendErrors[key][0];
            } else {
              formattedErrors[key] = backendErrors[key][0];
            }
          });
          // Gán lỗi từ backend cho các trường mới nếu có (nếu bạn thêm trường mới vào detailsEditForm)
          // Hiện tại không thêm vào detailsEditForm nên không cần gán ở đây
          setDetailsEditFormErrors(formattedErrors);
          console.log('Backend Validation Errors (formatted):', formattedErrors);
        } else {
          setNotification({
            open: true,
            message: axiosError.response?.data?.message || 'Lỗi khi cập nhật chi tiết giáo viên',

            severity: 'error',
          });
        }
      } else {
        setNotification({
          open: true,
          message: 'Lỗi không xác định khi cập nhật chi tiết giáo viên.',

          severity: 'error',
        });
      }
    }
  };
  const renderAddFormFields = () => {
    const form = addForm;
    const handleChange = handleAddFormChange;
    const handleAssignmentChange = handleAddAssignmentChange;
    const handleAddAssignment = handleAddAddNewAssignment;
    const handleRemoveAssignment = handleAddRemoveAssignment;
    const assignmentFormErrors = addFormErrors.assignments || {};
    const subjectsErrors = addFormErrors.subjects;
    return (
      <Grid container spacing={2} sx={{ mt: 1 }}>
        <Grid item xs={12} sm={6}>
          <TextField
            name="name"
            label={t('fullName')}
            fullWidth
            value={form.name}
            onChange={handleChange}
            error={!!addFormErrors.name}
            helperText={addFormErrors.name}
            variant="outlined"
            margin="dense"
            required
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            name="email"
            label={t('email')}
            fullWidth
            value={form.email}
            onChange={handleChange}
            error={!!addFormErrors.email}
            helperText={addFormErrors.email}
            variant="outlined"
            margin="dense"
            required
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            name="phone"
            label={t('phone')}
            fullWidth
            value={form.phone}
            onChange={handleChange}
            error={!!addFormErrors.phone}
            helperText={addFormErrors.phone}
            variant="outlined"
            margin="dense"
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <FormControl fullWidth margin="dense">
            <InputLabel id="add-gender-select-label">{t('gender')}</InputLabel>
            <Select
              labelId="add-gender-select-label"
              name="gender"
              value={form.gender}
              onChange={handleChange}
              label={t('gender')}
            >
              <MenuItem value="">
                <em>{t('noSelect')}</em>
              </MenuItem>
              <MenuItem value="Nam">{t('genderType.male')}</MenuItem>
              <MenuItem value="Nữ">{t('genderType.female')}</MenuItem>
              <MenuItem value="Khác">{t('genderType.other')}</MenuItem>
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12} sm={6}>
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DatePicker
              label={t('birthday')}
              value={form.birthday ? dayjs(form.birthday) : null}
              onChange={(newValue) => {
                handleChange({
                  target: {
                    name: 'birthday',
                    value: newValue ? dayjs(newValue).format('YYYY-MM-DD') : ''
                  }
                } as any);
              }}
              maxDate={dayjs()}
              format="DD/MM/YYYY"
              slotProps={{
                textField: {
                  fullWidth: true,
                  margin: "dense",
                  error: !!addFormErrors.birthday,
                  helperText: addFormErrors.birthday
                }
              }}
            />
          </LocalizationProvider>
        </Grid>

        <Grid item xs={12} sm={6}>
          <TextField
            name="address"
            label={t('address')}
            fullWidth
            value={form.address}
            onChange={handleChange}
            error={!!addFormErrors.address}
            helperText={addFormErrors.address}
            variant="outlined"
            margin="dense"
          />
        </Grid>

        <Grid item xs={12}>
          <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>
            {t('specialized_subjects')}
          </Typography>
          <FormControl fullWidth margin="dense" error={!!subjectsErrors}>
            <Select
              labelId="add-subjects-select-label"
              name="subjects"
              multiple
              value={form.subjects || []}
              onChange={handleAddSubjectsChange}
              input={<OutlinedInput label={t('specialized_subjects')} />}
              renderValue={(selected) => {
                const selectedArray = Array.isArray(selected) ? selected : [];
                return (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selectedArray.map((value) => {
                      const subject = subjects.find((s) => s.id === value);
                      return subject ? (
                        <Chip key={value} label={subject.name} size="small" />
                      ) : null;
                    })}
                  </Box>
                );
              }}
            >
              {subjects.map((subject) => (
                <MenuItem key={subject.id} value={subject.id}>
                  {t(`subjectName.${subject.name}`)}
                </MenuItem>
              ))}
            </Select>
            {subjectsErrors && <FormHelperText>{subjectsErrors}</FormHelperText>}
          </FormControl>
        </Grid>

        <Grid item xs={12}>
          <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>
            {t('teaching_assignments')}
          </Typography>
          <Stack spacing={2}>
            {(form.teaching_assignments || []).map((assignment, index) =>
              assignment ? (
                <Paper
                  key={assignment.id || `new-${index}`}
                  elevation={1}
                  sx={{ p: 2, position: 'relative' }}
                >
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => handleAddRemoveAssignment(index)}
                    sx={{ position: 'absolute', top: 5, right: 5 }}
                  >
                    <RemoveCircleOutlineIcon fontSize="small" />
                  </IconButton>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <FormControl
                        fullWidth
                        margin="dense"
                        required
                        error={!!assignmentFormErrors[index]?.subject_id}
                      >
                        <InputLabel>{t('subject')}</InputLabel>
                        <Select
                          name="subject_id"
                          value={assignment.subject_id}
                          label={t('subject')}
                          onChange={(e) =>
                            handleAddAssignmentChange(
                              index,
                              e as React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
                            )
                          }
                        >
                          <MenuItem value="">
                            <em>{t('select_subject')}</em>
                          </MenuItem>
                          {subjects.map((subject) => (
                            <MenuItem key={subject.id} value={subject.id}>
                              {t(`subjectName.${subject.name}`)}
                            </MenuItem>
                          ))}
                        </Select>

                        {assignmentFormErrors[index]?.subject_id && (
                          <FormHelperText>{assignmentFormErrors[index]?.subject_id}</FormHelperText>
                        )}
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <FormControl
                        fullWidth
                        margin="dense"
                        required
                        error={!!assignmentFormErrors[index]?.class_id}
                      >
                        <InputLabel>{t('class')}</InputLabel>

                        <Select
                          name="class_id"
                          value={assignment.class_id}
                          label={t('class')}
                          onChange={(e) =>
                            handleAddAssignmentChange(
                              index,
                              e as React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
                            )
                          }
                        >
                          <MenuItem value="">
                            <em>{t('select_class')}</em>
                          </MenuItem>
                          {classes.map((cls) => (
                            <MenuItem key={cls.id} value={cls.id}>
                              {`${cls.name} (${t('grade')} ${cls.grade})`}
                            </MenuItem>
                          ))}
                        </Select>

                        {assignmentFormErrors[index]?.class_id && (
                          <FormHelperText>{assignmentFormErrors[index]?.class_id}</FormHelperText>
                        )}
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        name="school_year"
                        label={t('school_year')}
                        fullWidth
                        value={assignment.school_year}
                        onChange={(e) => handleAddAssignmentChange(index, e)}
                        error={!!assignmentFormErrors[index]?.school_year}
                        helperText={assignmentFormErrors[index]?.school_year}
                        variant="outlined"
                        margin="dense"
                        required
                        placeholder="YYYY-YYYY"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <FormControl
                        fullWidth
                        margin="dense"
                        required
                        error={!!assignmentFormErrors[index]?.semester}
                      >
                        <InputLabel>{t('semester')}</InputLabel>

                        <Select
                          name="semester"
                          value={assignment.semester}
                          label={t('semester')}
                          onChange={(e) =>
                            handleAddAssignmentChange(
                              index,
                              e as React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
                            )
                          }
                        >
                          <MenuItem value="">
                            <em>{t('select_semester')}</em>
                          </MenuItem>
                          <MenuItem value={1}>{t('semester_1')}</MenuItem>
                          <MenuItem value={2}>{t('semester_2')}</MenuItem>
                        </Select>

                        {assignmentFormErrors[index]?.semester && (
                          <FormHelperText>{assignmentFormErrors[index]?.semester}</FormHelperText>
                        )}
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        name="weekly_periods"
                        label={t('weekly_periods')}
                        fullWidth
                        type="number"
                        value={assignment.weekly_periods}
                        onChange={(e) => handleAddAssignmentChange(index, e)}
                        variant="outlined"
                        margin="dense"
                        inputProps={{ min: 0 }}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        name="notes"
                        label={t('notes')}
                        fullWidth
                        value={assignment.notes}
                        onChange={(e) => handleAddAssignmentChange(index, e)}
                        variant="outlined"
                        margin="dense"
                        multiline
                        rows={2}
                      />
                    </Grid>
                  </Grid>
                </Paper>
              ) : null,
            )}
            <Button
              startIcon={<AddIcon />}
              onClick={handleAddAssignment}
              variant="outlined"
              sx={{ width: 'fit-content' }}
            >
              {t('add_assignment')}
            </Button>
          </Stack>
        </Grid>
      </Grid>
    );
  };
  const renderEditBasicFormFields = () => {
    const form = editBasicForm;
    const handleChange = handleEditBasicFormChange;
    const errors = editBasicFormErrors;

    return (
      <Grid container spacing={2} sx={{ mt: 1 }}>
        <Grid item xs={12} sm={6}>
          <TextField
            name="name"
            label={t('fullName')}
            fullWidth
            value={form.name}
            onChange={handleChange}
            error={!!errors.name}
            helperText={errors.name}
            variant="outlined"
            margin="dense"
            required
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            name="email"
            label={t('email')}
            fullWidth
            value={form.email}
            onChange={handleChange}
            error={!!errors.email}
            helperText={errors.email}
            variant="outlined"
            margin="dense"
            required
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <TextField
            name="phone"
            label={t('phone')}
            fullWidth
            value={form.phone}
            onChange={handleChange}
            error={!!errors.phone}
            helperText={errors.phone}
            variant="outlined"
            margin="dense"
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <FormControl fullWidth margin="dense">
            <InputLabel id="edit-gender-select-label">{t('gender')}</InputLabel>
            <Select
              labelId="edit-gender-select-label"
              name="gender"
              value={form.gender}
              onChange={handleChange}
              label={t('gender')}
            >
              <MenuItem value="">
                <em>{t('noSelect')}</em>
              </MenuItem>
              <MenuItem value="Nam">{t('genderType.male')}</MenuItem>
              <MenuItem value="Nữ">{t('genderType.female')}</MenuItem>
              <MenuItem value="Khác">{t('genderType.other')}</MenuItem>
            </Select>
            {errors.gender && <FormHelperText>{errors.gender}</FormHelperText>}
          </FormControl>
        </Grid>

        <Grid item xs={12} sm={6}>
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DatePicker
              label={t('birthday')}
              value={form.birthday ? dayjs(form.birthday) : null}
              onChange={(newValue) => {
                handleChange({
                  target: {
                    name: 'birthday',
                    value: newValue ? dayjs(newValue).format('YYYY-MM-DD') : ''
                  }
                } as any);
              }}
              maxDate={dayjs()}
              format="DD/MM/YYYY"
              slotProps={{
                textField: {
                  fullWidth: true,
                  margin: "dense",
                  error: !!errors.birthday,
                  helperText: errors.birthday
                }
              }}
            />
          </LocalizationProvider>
        </Grid>

        <Grid item xs={12} sm={6}>
          <TextField
            name="address"
            label={t('address')}
            fullWidth
            value={form.address}
            onChange={handleChange}
            error={!!errors.address}
            helperText={errors.address}
            variant="outlined"
            margin="dense"
          />
        </Grid>
      </Grid>
    );
  };

  const renderDetailsEditFormFields = () => {
    const form = detailsEditForm;
    const handleSubjectsChange = handleDetailsSubjectsChange;
    const handleAssignmentChange = handleDetailsAssignmentChange;
    const handleAddAssignment = handleDetailsAddAssignment;
    const handleRemoveAssignment = handleDetailsRemoveAssignment;
    const assignmentFormErrors = detailsEditFormErrors.assignments || {};
    const subjectsErrors = detailsEditFormErrors.subjects;
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          {t('specialized_subjects')}
        </Typography>
        <FormControl fullWidth margin="dense" error={!!subjectsErrors} sx={{ mb: 3 }}>
          <Select
            labelId="details-subjects-select-label"
            name="subjects"
            multiple
            value={form.subjects || []}
            onChange={handleSubjectsChange}
            input={<OutlinedInput label={t('specialized_subjects')} />}
            renderValue={(selected) => {
              const selectedArray = Array.isArray(selected) ? selected : [];
              return (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selectedArray.map((value) => {
                    const subject = subjects.find((s) => s.id === value);
                    return subject ? <Chip key={value} label={t(`subjectName.${subject.name}`)} size="small" /> : null;
                  })}
                </Box>
              );
            }}
          >
            {subjects.map((subject) => (
              <MenuItem key={subject.id} value={subject.id}>
                {t(`subjectName.${subject.name}`)}
              </MenuItem>
            ))}
          </Select>

          {subjectsErrors && <FormHelperText>{subjectsErrors}</FormHelperText>}
        </FormControl>

        <Typography variant="h6" gutterBottom>
          {t('teaching_assignments')}
        </Typography>
        <Stack spacing={2}>
          {(form.teaching_assignments || []).map((assignment, index) =>
            assignment ? (
              <Paper
                key={assignment.id || `new-${index}`}
                elevation={1}
                sx={{ p: 2, position: 'relative' }}
              >
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => handleDetailsRemoveAssignment(index)}
                  sx={{ position: 'absolute', top: 5, right: 5 }}
                >
                  <RemoveCircleOutlineIcon fontSize="small" />
                </IconButton>

                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <FormControl
                      fullWidth
                      margin="dense"
                      required
                      error={!!assignmentFormErrors[index]?.subject_id}
                    >
                      <InputLabel>{t('subject')}</InputLabel>
                      <Select
                        name="subject_id"
                        value={assignment.subject_id}
                        label={t('subject')}
                        onChange={(e) =>
                          handleDetailsAssignmentChange(
                            index,
                            e as React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
                          )
                        }
                      >
                        <MenuItem value="">
                          <em>{t('select_subject')}</em>
                        </MenuItem>
                        {subjects.map((subject) => (
                          <MenuItem key={subject.id} value={subject.id}>
                            {t(`subjectName.${subject.name}`)}
                          </MenuItem>
                        ))}
                      </Select>

                      {assignmentFormErrors[index]?.subject_id && (
                        <FormHelperText>{assignmentFormErrors[index]?.subject_id}</FormHelperText>
                      )}
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControl
                      fullWidth
                      margin="dense"
                      required
                      error={!!assignmentFormErrors[index]?.class_id}
                    >
                      <InputLabel>{t('class')}</InputLabel>

                      <Select
                        name="class_id"
                        value={assignment.class_id}
                        label={t('class')}
                        onChange={(e) =>
                          handleDetailsAssignmentChange(
                            index,
                            e as React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
                          )
                        }
                      >
                        <MenuItem value="">
                          <em>{t('select_class')}</em>
                        </MenuItem>
                        {classes.map((cls) => (
                          <MenuItem key={cls.id} value={cls.id}>
                            {`${cls.name} (${t('grade')} ${cls.grade})`}
                          </MenuItem>
                        ))}
                      </Select>

                      {assignmentFormErrors[index]?.class_id && (
                        <FormHelperText>{assignmentFormErrors[index]?.class_id}</FormHelperText>
                      )}
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      name="school_year"
                      label={t('school_year')}
                      fullWidth
                      value={assignment.school_year}
                      onChange={(e) => handleDetailsAssignmentChange(index, e)}
                      error={!!assignmentFormErrors[index]?.school_year}
                      helperText={assignmentFormErrors[index]?.school_year}
                      variant="outlined"
                      margin="dense"
                      required
                      placeholder="YYYY-YYYY"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControl
                      fullWidth
                      margin="dense"
                      required
                      error={!!assignmentFormErrors[index]?.semester}
                    >
                      <InputLabel>{t('semester')}</InputLabel>

                      <Select
                        name="semester"
                        value={assignment.semester}
                        label={t('semester')}
                        onChange={(e) =>
                          handleDetailsAssignmentChange(
                            index,
                            e as React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
                          )
                        }
                      >
                        <MenuItem value="">
                          <em>{t('select_semester')}</em>
                        </MenuItem>
                        <MenuItem value={1}>{t('semester_1')}</MenuItem>
                        <MenuItem value={2}>{t('semester_2')}</MenuItem>
                      </Select>

                      {assignmentFormErrors[index]?.semester && (
                        <FormHelperText>{assignmentFormErrors[index]?.semester}</FormHelperText>
                      )}
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      name="weekly_periods"
                      label={t('weekly_periods')}
                      fullWidth
                      type="number"
                      value={assignment.weekly_periods}
                      onChange={(e) => handleDetailsAssignmentChange(index, e)}
                      variant="outlined"
                      margin="dense"
                      inputProps={{ min: 0 }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      name="notes"
                      label={t('notes')}
                      fullWidth
                      value={assignment.notes}
                      onChange={(e) => handleDetailsAssignmentChange(index, e)}
                      variant="outlined"
                      margin="dense"
                      multiline
                      rows={2}
                    />
                  </Grid>
                </Grid>
              </Paper>
            ) : null,
          )}
          <Button
            startIcon={<AddIcon />}
            onClick={handleDetailsAddAssignment}
            variant="outlined"
            sx={{ width: 'fit-content' }}
          >
            {t('add_assignment')}
          </Button>
        </Stack>
      </Box>
    );
  };

  const renderTeacherDetails = (teacher: Teacher | null) => {
    if (!teacher) return null;
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          {t('specialized_subjects')}
        </Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 3 }}>
          {teacher.subjects && teacher.subjects.length > 0 ? (
            teacher.subjects.map((subject) => (
              <Chip
                key={subject.id}
                label={t(`subjectName.${subject.name}`)}
                size="small"
                color="primary"
                variant="outlined"
              />
            ))
          ) : (
            <Typography variant="body2" color="text.secondary">
              {t('no_specialized_subjects')}
            </Typography>
          )}
        </Stack>

        <Typography variant="h6" gutterBottom>
          {t('teaching_assignments')}
        </Typography>
        <Stack spacing={1}>
          {teacher.teaching_assignments && teacher.teaching_assignments.length > 0 ? (
            teacher.teaching_assignments
              .filter((assignment) => assignment != null)
              .map((assignment) =>
                assignment ? (
                  <Paper key={assignment.id} elevation={0} sx={{ p: 1, border: '1px solid #eee' }}>
                    <Typography variant="body2">
                      <strong>{t('class')}:</strong> {assignment.class?.name || 'N/A'} ({t('grade')}{' '}
                      {assignment.class?.grade || 'N/A'})
                    </Typography>
                    <Typography variant="body2">
                      <strong>{t('subject')}:</strong> {assignment.subject ? t(`subjectName.${assignment.subject.name}`) : 'N/A'}
                    </Typography>

                    <Typography variant="body2">
                      <strong>{t('school_year')}:</strong> {assignment.school_year}
                    </Typography>
                    <Typography variant="body2">
                      <strong>{t('semester')}:</strong> {assignment.semester}
                    </Typography>
                    {assignment.weekly_periods != null && (
                      <Typography variant="body2">
                        <strong>{t('weekly_periods')}:</strong> {assignment.weekly_periods}
                      </Typography>
                    )}

                    {assignment.notes && (
                      <Typography variant="body2">
                        <strong>{t('notes')}:</strong> {assignment.notes}
                      </Typography>
                    )}
                  </Paper>
                ) : null,
              )
          ) : (
            <Typography variant="body2" color="text.secondary">
              {t('no_assignments')}
            </Typography>
          )}
        </Stack>
      </Box>
    );
  };

  return (
    <Box p={2}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5">{t('teacher_management')}</Typography>
        <Box>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={openAddDialog}
            sx={{ mr: 2 }}
          >
            {t('add_teacher')}
          </Button>
          <Tooltip title={t('refresh')}>
            <IconButton onClick={handleRefresh} disabled={loading}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {loading ? (
        <Box display="flex" justifyContent="center" mt={4}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>{t('serialNumber')}</TableCell>
                <TableCell>{t('fullName')}</TableCell>
                <TableCell>{t('birthday')}</TableCell>
                <TableCell>{t('gender')}</TableCell>
                <TableCell>{t('email')}</TableCell>
                <TableCell>{t('phone')}</TableCell>
                <TableCell>{t('address')}</TableCell>
                <TableCell align="center">{t('actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {teachers.length > 0 ? (
                teachers.map((teacher, index) => (
                  <TableRow key={teacher.id}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>{teacher.name}</TableCell>
                    <TableCell>
                      {teacher.birthday ? dayjs(teacher.birthday).format('DD/MM/YYYY') : 'N/A'}
                    </TableCell>
                    <TableCell>
                      {teacher.gender === 'Nam' ? t('genderType.male') :
                       teacher.gender === 'Nữ' ? t('genderType.female') :
                       teacher.gender === 'Khác' ? t('genderType.other') : 'N/A'}
                    </TableCell>
                    <TableCell>{teacher.email}</TableCell>
                    <TableCell>{teacher.phone || 'N/A'}</TableCell>
                    <TableCell>{teacher.address || 'N/A'}</TableCell>
                    <TableCell align="center">
                      <Stack direction="row" spacing={1} justifyContent="center">
                        <Tooltip title={t('view_details')}>
                          <IconButton
                            size="small"
                            color="info"
                            onClick={() => openDetailsDialog(teacher)}
                          >
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>

                        <Tooltip title={t('edit_basic_info')}>
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => openEditBasicDialog(teacher)}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>

                        <Tooltip title={t('delete')}>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => openDeleteDialog(teacher)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    <Typography>{t('no_teacher_data')}</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog
        open={deleteDialogOpen}
        onClose={closeDeleteDialog}
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
      >
        <DialogTitle id="delete-dialog-title">{t('confirm_delete_teacher')}</DialogTitle>
        <DialogContent>
          <DialogContentText id="delete-dialog-description">
            {t('delete_teacher_confirmation', { teacherName: selectedTeacher?.name })}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDeleteDialog} color="primary">
            {t('cancel')}
          </Button>
          <Button onClick={handleDeleteTeacher} color="error" autoFocus>
            {t('delete')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={editBasicDialogOpen}
        onClose={closeEditBasicDialog}
        maxWidth="sm"
        fullWidth
        aria-labelledby="edit-basic-dialog-title"
      >
        <DialogTitle id="edit-basic-dialog-title">{t('edit_basic_info')}</DialogTitle>
        <DialogContent>{renderEditBasicFormFields()}</DialogContent>
        <DialogActions>
          <Button onClick={closeEditBasicDialog} color="inherit">
            {t('cancel')}
          </Button>
          <Button onClick={handleUpdateBasicTeacher} color="primary" variant="contained">
            {t('save')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={addDialogOpen}
        onClose={closeAddDialog}
        maxWidth="md"
        fullWidth
        aria-labelledby="add-dialog-title"
      >
        <DialogTitle id="add-dialog-title">{t('add_teacher')}</DialogTitle>
        <DialogContent>{renderAddFormFields()}</DialogContent>
        <DialogActions>
          <Button onClick={closeAddDialog} color="inherit">
            {t('cancel')}
          </Button>
          <Button onClick={handleAddTeacher} color="primary" variant="contained">
            {t('add_teacher')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={detailsDialogOpen}
        onClose={closeDetailsDialog}
        maxWidth="md"
        fullWidth
        aria-labelledby="details-dialog-title"
      >
        <DialogTitle id="details-dialog-title">
          {t('teacher_details')}: {selectedTeacher?.name}
        </DialogTitle>
        <DialogContent dividers>{renderTeacherDetails(selectedTeacher)}</DialogContent>
        <DialogActions>
          <Button onClick={openEditDetailsDialog} color="primary" variant="outlined">
            {t('edit_details')}
          </Button>
          <Button onClick={closeDetailsDialog} color="inherit">
            {t('close')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={editDetailsDialogOpen}
        onClose={closeEditDetailsDialog}
        maxWidth="md"
        fullWidth
        aria-labelledby="edit-details-dialog-title"
      >
        <DialogTitle id="edit-details-dialog-title">
          {t('edit_details')}: {selectedTeacher?.name}
        </DialogTitle>
        <DialogContent dividers>{renderDetailsEditFormFields()}</DialogContent>
        <DialogActions>
          <Button onClick={closeEditDetailsDialog} color="inherit">
            {t('cancel')}
          </Button>
          <Button onClick={handleUpdateDetails} color="primary" variant="contained">
            {t('save')}
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

export default TeacherManagement;
