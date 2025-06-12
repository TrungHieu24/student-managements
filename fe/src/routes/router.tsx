import { lazy, Suspense, ReactElement, PropsWithChildren } from 'react';
import {
  Outlet,
  RouteObject,
  RouterProps,
  createBrowserRouter,
} from 'react-router-dom';

import PageLoader from '../components/loading/PageLoader';
import Splash from '../components/loading/Splash';
import { rootPaths } from './paths';
import paths from './paths';
import RequireAuth from '../components/auth/RequireAuth'; 

const App = lazy<() => ReactElement>(() => import('../App'));
const MainLayout = lazy<({ children }: PropsWithChildren) => ReactElement>(
  () => import('../layouts/main-layout')
);
const AuthLayout = lazy<({ children }: PropsWithChildren) => ReactElement>(
  () => import('../layouts/auth-layout')
);
const Dashboard = lazy(() => import('../pages/dashboard/Dashboard'));
const Login = lazy<() => ReactElement>(() => import( '../pages/authentication/Login'));
const ErrorPage = lazy<() => ReactElement>(() => import('../pages/error/ErrorPage'));
const Profile = lazy<() => ReactElement>(() => import('../pages/profile/Profile')); 
const Settings = lazy<() => ReactElement>(() => import('../pages/setting/SystemSettings'));
const Subject = lazy(() => import('../pages/subject/Subject'));
const Teacher = lazy(() => import('../pages/teacher/Teacher'));
const Class = lazy(() => import('../pages/class/Class'));
const ListClass = lazy(() => import('../pages/listclass/ListClass'));
const Homeroom = lazy<() => ReactElement>(() => import('../pages/homeroom/Homeroom'));
const ClassesTeaching = lazy(() => import('../pages/classes-teaching/ClassesTeaching'));
const Teaching = lazy<() => ReactElement>(() => import('../pages/teaching-assignment/Teaching'));
const LoginHistory = lazy(() =>  import('../pages/history/LoginHistory'));
const TeacherHistory = lazy(() =>  import('../pages/history/TeacherHistory'));
const UserHistory = lazy(() =>  import('../pages/history/UserHistory'));
const ClassHistory = lazy(() =>  import('../pages/history/ClassHistory'));
const SubjectHistory = lazy(() =>  import('../pages/history/SubjectHistory'));
const HomeroomHistory = lazy(() =>  import('../pages/history/HomeroomHistory'));
const UserManagement = lazy(() =>  import('../pages/user-management/UserManagement'));
const FirstTimePasswordChange = lazy(() => import('../pages/authentication/FirstTimePasswordChange'));
export const FIRST_TIME_PASSWORD_CHANGE_PATH = 'first-time-password-change';


const routes: RouteObject[] = [
  {
    element: (
      <Suspense fallback={<Splash />}>
        <App />
      </Suspense>
    ),
    children: [
            {
        path: FIRST_TIME_PASSWORD_CHANGE_PATH,
        element: (
          <AuthLayout>
            <Suspense fallback={<PageLoader />}>
              <FirstTimePasswordChange />
            </Suspense>
          </AuthLayout>
        ),
      },
      {
        path: paths.home,
        element: (
          <RequireAuth>
            <MainLayout>
              <Suspense fallback={<PageLoader />}>
                <Outlet />
              </Suspense>
            </MainLayout>
          </RequireAuth>
        ),
        children: [
          { index: true, element: <Dashboard /> },
          { path: 'profile', element: <Profile /> },
          { path: 'setting', element: <Settings /> },
          { path: 'subject', element: <Subject /> },
          { path: 'teacher', element: <Teacher /> },
          { path: 'class', element: <Class /> },
          { path: 'listclass', element: <ListClass /> },
          { path: 'classesteaching', element: <ClassesTeaching /> },
          { path: 'homeroom', element: <Homeroom /> },
          { path: 'teaching', element: <Teaching /> },
          { path: 'loginhistory', element: <LoginHistory/>},
          { path: 'users', element: <UserManagement/>},
          { path: 'teacherhistory', element: <TeacherHistory/>},
          { path: 'userhistory', element: <UserHistory/>},
          { path: 'classhistory', element: <ClassHistory/>},
          { path: 'subjecthistory', element: <SubjectHistory/>},
          { path: 'homeroomhistory', element: <HomeroomHistory/>},
        ],
      },
      {
        path: rootPaths.authRoot,
        element: (
          <AuthLayout>
            <Suspense fallback={<PageLoader />}>
              <Outlet />
            </Suspense>
          </AuthLayout>
        ),
        children: [
          {
            path: paths.login,
            element: <Login />,
          },
        ],
      },
    ],
  },
  {
    path: '*',
    element: <ErrorPage />,
  },
];

const router: Partial<RouterProps> = createBrowserRouter(routes);

export default router;
