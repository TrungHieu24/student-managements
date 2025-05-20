// src/pages/dashboard/Dashboard.tsx
import React from 'react';
import { useAuth } from '../../components/auth/useAuth'; 

// Import các phần riêng biệt của dashboard
import AdminDashboardContent from '../../../student-management-ADMIN/src/pages/dashboard/Dashboard'; 
import TeacherDashboardContent from '../../../student-management-TEACHER/src/pages/dashboard/Dashboard'; 

const Dashboard = () => {
  const { role } = useAuth(); 

  if (role === 'ADMIN') {
    return <AdminDashboardContent />;
  } else if (role === 'TEACHER') {
    return <TeacherDashboardContent />;
  } else {
    return <div>Đang tải Dashboard...</div>;
  }
};

export default Dashboard;