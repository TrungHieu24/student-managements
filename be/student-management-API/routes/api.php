<?php
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\StudentController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\AdminController;
use App\Http\Controllers\ScoreController;
use App\Http\Controllers\SubjectController;
use App\Http\Controllers\ClassController;
use App\Http\Controllers\TeacherController;
use App\Http\Controllers\LoginHistoryController;
use App\Http\Controllers\AuditLogController;



// 🔐 Route dành cho ADMIN
Route::middleware(['auth:api', 'role:ADMIN'])->group(function () {
    Route::get('/admin/data', [AdminController::class, 'index']);
});

// 👤 Route dành cho USER
Route::middleware(['auth:api', 'role:USER'])->group(function () {
    Route::get('/user/data', [UserController::class, 'index']);
});

// 👨‍🏫 Route dành cho TEACHER
Route::middleware(['auth:api', 'role:TEACHER'])->group(function () {
    Route::get('/teacher/info', [TeacherController::class, 'getTeacherInfo']);
});

// 📝 Đăng ký & Đăng nhập
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

// 🔐 Các API yêu cầu đăng nhập
Route::middleware('auth:sanctum')->group(function () {

    // 👤 Profile cá nhân
    Route::get('/profile', [ProfileController::class, 'show']);
    Route::put('/profile', [ProfileController::class, 'update']);
    Route::post('/profile/avatar', [ProfileController::class, 'uploadAvatar']);

    // 🎓 Quản lý sinh viên
    Route::resource('students', StudentController::class);

    // Quản lý môn học
    Route::get('/subjects', [SubjectController::class, 'index']);
    Route::get('/subjects/{id}', [SubjectController::class, 'show']);
    Route::post('/subjects', [SubjectController::class, 'store']);
    Route::put('/subjects/{id}', [SubjectController::class, 'update']);
    Route::delete('/subjects/{id}', [SubjectController::class, 'destroy']);
    

    // 📝 Điểm
    Route::get('/scores', [ScoreController::class, 'index']);
    Route::get('/scores/{id}', [ScoreController::class, 'getScoresByStudent']);
    Route::get('/average-score', [ScoreController::class, 'getAverageScore']);
    Route::get('/student-ranking', [ScoreController::class, 'getStudentRanking']);
    Route::get('/average-score-by-subject', [ScoreController::class, 'getAverageScoreBySubject']);
    Route::post('/scores', [ScoreController::class, 'store']);
    Route::put('/scores/{id}', [ScoreController::class, 'update']);
    Route::delete('/scores/{id}', [ScoreController::class, 'destroy']);

    // Lớp
    Route::get('/classes', [ClassController::class, 'index']);
    Route::get('/my-class', [ClassController::class, 'getStudentClass']);
    Route::get('/classes/{id}/students', [ClassController::class, 'showStudents']); 
    Route::get('/classes/{id}/average-subject-scores', [ClassController::class, 'getAverageScorePerSubject']);
    Route::get('/classes/{id}/performance-summary', [ClassController::class, 'getPerformanceSummary']);
    Route::post('/classes', [ClassController::class, 'store']); 
    Route::put('/classes/{id}', [ClassController::class, 'update']); 
    Route::delete('/classes/{id}', [ClassController::class, 'destroy']); 

    // Giáo viên
    Route::get('/teachers', [TeacherController::class, 'index']);
    Route::get('/teachers/{id}', [TeacherController::class, 'show']);
    Route::get('/teacher/classes/homeroom', [TeacherController::class, 'getHomeroomClasses']); 
    Route::get('/teacher/classes/teaching', [TeacherController::class, 'getTeachingClasses']); 
    Route::get('/teachers/{id}/subjects', [\App\Http\Controllers\TeacherController::class, 'getTeacherSubjects']);
    Route::get('/teacher/classes/{classId}/students', [TeacherController::class, 'getStudentsInClass']); 
    Route::get('/teacher/students/{studentId}/subjects/{subjectId}/scores', [TeacherController::class, 'getStudentScoresInSubject']);
    Route::post('/teacher/students/{studentId}/subjects/{subjectId}/scores', [TeacherController::class, 'updateStudentScore']);
    Route::post('/teachers', [TeacherController::class, 'store']);
    Route::put('/teachers/{id}', [TeacherController::class, 'update']);
    Route::delete('/teachers/{id}', [TeacherController::class, 'destroy']);

    //Lịch sử đăng nhập/all
    Route::get('/login-history', [LoginHistoryController::class, 'index'])->name('login-history.index');
    Route::get('/login-history/{loginHistory}', [LoginHistoryController::class, 'show'])->name('login-history.show'); 
    Route::delete('/admin/login-history/{loginHistory}', [LoginHistoryController::class, 'destroy'])->name('admin.login-history.destroy');
    Route::post('/admin/login-history/export', [LoginHistoryController::class, 'export'])->name('admin.login-history.export');
    Route::post('/admin/login-history/bulk-delete', [LoginHistoryController::class, 'bulkDelete'])->name('admin.login-history.bulk-delete');

    Route::get('/audit-logs', [AuditLogController::class, 'index'])->name('audit_logs.index');
    Route::get('/teacher-history', [AuditLogController::class, 'getTeacherHistory']);
    Route::get('/user-history', [AuditLogController::class, 'getUserHistory']);
    Route::get('/subject-history', [AuditLogController::class, 'getSubjectHistory']);
    Route::get('/class-history', [ClassController::class, 'history']);


    // 🔓 Đăng xuất
    Route::post('/logout', [AuthController::class, 'logout']);

    // Thay đổi mật khẩu
    Route::post('/change-password', [AuthController::class, 'changePassword']);

    // 👀 Thông tin người dùng
    Route::resource('users', UserController::class); 
    Route::get('/user', function (Request $request) {
        return $request->user();
    });
});