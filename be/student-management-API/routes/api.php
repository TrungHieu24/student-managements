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


// 🔐 Route dành cho ADMIN
Route::middleware(['auth:api', 'role:ADMIN'])->group(function () {
    Route::get('/admin/data', [AdminController::class, 'index']);
});

// 👤 Route dành cho USER
Route::middleware(['auth:api', 'role:USER'])->group(function () {
    Route::get('/user/data', [UserController::class, 'index']);
});

// 👨‍🏫 Route dành cho TEACHER
Route::middleware(['auth:api', 'role:TEACHER', 'check.first.login'])->group(function () {
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

    // 🔓 Đăng xuất
    Route::post('/logout', [AuthController::class, 'logout']);

    // Thay đổi mật khẩu
    Route::post('/change-password', [AuthController::class, 'changePassword']);

    // 👀 Thông tin người dùng
    Route::get('/user', function (Request $request) {
        return $request->user();
    });
});