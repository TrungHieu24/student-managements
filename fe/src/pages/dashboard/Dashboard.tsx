// src/pages/dashboard/Dashboard.tsx

import { useAuth } from '../../components/auth/useAuth'; 

import AdminDashboardContent from '../../../student-management-ADMIN/src/pages/dashboard/Dashboard'; 
import TeacherDashboardContent from '../../../student-management-TEACHER/src/pages/dashboard/Dashboard'; 
import UserDashboardContent from '../../../student-management-USER/src/components/Dashboard/Dashboard'; 

const Dashboard = () => {
  const { role } = useAuth(); 

  if (role === 'ADMIN') {
    return <AdminDashboardContent />;
  } else if (role === 'TEACHER') {
    return <TeacherDashboardContent />;
  } else if(role === 'USER'){
    return <UserDashboardContent/>
  } else{
    return <div>Đang tải Dashboard...</div>;
  }
};

export default Dashboard;