<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use App\Models\AuditLog;
use App\Models\Student;
use App\Models\Teacher;
use App\Models\ClassModel;
use App\Models\Subject;
use App\Models\Score;
use App\Models\TeachingAssignment;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Request;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        Student::created(function (Student $student) {
            AuditLog::create([
                'table_name' => $student->getTable(),
                'record_id' => $student->id,
                'action_type' => 'CREATE',
                'user_id' => Auth::id(),
                'new_values' => json_encode($student->toArray(), JSON_UNESCAPED_UNICODE), // Sửa ở đây
                'ip_address' => Request::ip(),
                'user_agent' => Request::header('User-Agent'),
            ]);
        });

        Student::updated(function (Student $student) {
            AuditLog::create([
                'table_name' => $student->getTable(),
                'record_id' => $student->id,
                'action_type' => 'UPDATE',
                'user_id' => Auth::id(),
                'old_values' => json_encode($student->getOriginal(), JSON_UNESCAPED_UNICODE), // Sửa ở đây
                'new_values' => json_encode($student->getAttributes(), JSON_UNESCAPED_UNICODE), // Sửa ở đây
                'ip_address' => Request::ip(),
                'user_agent' => Request::header('User-Agent'),
            ]);
        });

        Student::deleted(function (Student $student) {
            AuditLog::create([
                'table_name' => $student->getTable(),
                'record_id' => $student->id,
                'action_type' => 'DELETE',
                'user_id' => Auth::id(),
                'old_values' => json_encode($student->getOriginal(), JSON_UNESCAPED_UNICODE), // Sửa ở đây
                'new_values' => null,
                'ip_address' => Request::ip(),
                'user_agent' => Request::header('User-Agent'),
            ]);
        });

        Teacher::created(function (Teacher $teacher) {
            AuditLog::create([
                'table_name' => $teacher->getTable(),
                'record_id' => $teacher->id,
                'action_type' => 'CREATE',
                'user_id' => Auth::id(),
                'new_values' => json_encode($teacher->toArray(), JSON_UNESCAPED_UNICODE), // Sửa ở đây
                'ip_address' => Request::ip(),
                'user_agent' => Request::header('User-Agent'),
            ]);
        });

        Teacher::updated(function (Teacher $teacher) {
            AuditLog::create([
                'table_name' => $teacher->getTable(),
                'record_id' => $teacher->id,
                'action_type' => 'UPDATE',
                'user_id' => Auth::id(),
                'old_values' => json_encode($teacher->getOriginal(), JSON_UNESCAPED_UNICODE), // Sửa ở đây
                'new_values' => json_encode($teacher->getAttributes(), JSON_UNESCAPED_UNICODE), // Sửa ở đây
                'ip_address' => Request::ip(),
                'user_agent' => Request::header('User-Agent'),
            ]);
        });

        Teacher::deleted(function (Teacher $teacher) {
            AuditLog::create([
                'table_name' => $teacher->getTable(),
                'record_id' => $teacher->id,
                'action_type' => 'DELETE',
                'user_id' => Auth::id(),
                'old_values' => json_encode($teacher->getOriginal(), JSON_UNESCAPED_UNICODE), // Sửa ở đây
                'new_values' => null,
                'ip_address' => Request::ip(),
                'user_agent' => Request::header('User-Agent'),
            ]);
        });

        ClassModel::created(function (ClassModel $class) {
            AuditLog::create([
                'table_name' => $class->getTable(),
                'record_id' => $class->id,
                'action_type' => 'CREATE',
                'user_id' => Auth::id(),
                'new_values' => json_encode($class->toArray(), JSON_UNESCAPED_UNICODE), // Sửa ở đây
                'ip_address' => Request::ip(),
                'user_agent' => Request::header('User-Agent'),
            ]);
        });

        ClassModel::updated(function (ClassModel $class) {
            AuditLog::create([
                'table_name' => $class->getTable(),
                'record_id' => $class->id,
                'action_type' => 'UPDATE',
                'user_id' => Auth::id(),
                'old_values' => json_encode($class->getOriginal(), JSON_UNESCAPED_UNICODE), // Sửa ở đây
                'new_values' => json_encode($class->getAttributes(), JSON_UNESCAPED_UNICODE), // Sửa ở đây
                'ip_address' => Request::ip(),
                'user_agent' => Request::header('User-Agent'),
            ]);
        });

        ClassModel::deleted(function (ClassModel $class) {
            AuditLog::create([
                'table_name' => $class->getTable(),
                'record_id' => $class->id,
                'action_type' => 'DELETE',
                'user_id' => Auth::id(),
                'old_values' => json_encode($class->getOriginal(), JSON_UNESCAPED_UNICODE), // Sửa ở đây
                'new_values' => null,
                'ip_address' => Request::ip(),
                'user_agent' => Request::header('User-Agent'),
            ]);
        });

        Subject::created(function (Subject $subject) {
            AuditLog::create([
                'table_name' => $subject->getTable(),
                'record_id' => $subject->id,
                'action_type' => 'CREATE',
                'user_id' => Auth::id(),
                'new_values' => json_encode($subject->toArray(), JSON_UNESCAPED_UNICODE), // Sửa ở đây
                'ip_address' => Request::ip(),
                'user_agent' => Request::header('User-Agent'),
            ]);
        });

        Subject::updated(function (Subject $subject) {
            AuditLog::create([
                'table_name' => $subject->getTable(),
                'record_id' => $subject->id,
                'action_type' => 'UPDATE',
                'user_id' => Auth::id(),
                'old_values' => json_encode($subject->getOriginal(), JSON_UNESCAPED_UNICODE), // Sửa ở đây
                'new_values' => json_encode($subject->getAttributes(), JSON_UNESCAPED_UNICODE), // Sửa ở đây
                'ip_address' => Request::ip(),
                'user_agent' => Request::header('User-Agent'),
            ]);
        });

        Subject::deleted(function (Subject $subject) {
            AuditLog::create([
                'table_name' => $subject->getTable(),
                'record_id' => $subject->id,
                'action_type' => 'DELETE',
                'user_id' => Auth::id(),
                'old_values' => json_encode($subject->getOriginal(), JSON_UNESCAPED_UNICODE), // Sửa ở đây
                'new_values' => null,
                'ip_address' => Request::ip(),
                'user_agent' => Request::header('User-Agent'),
            ]);
        });

        Score::created(function (Score $score) {
            AuditLog::create([
                'table_name' => $score->getTable(),
                'record_id' => $score->id,
                'action_type' => 'CREATE',
                'user_id' => Auth::id(),
                'new_values' => json_encode($score->toArray(), JSON_UNESCAPED_UNICODE), // Sửa ở đây
                'ip_address' => Request::ip(),
                'user_agent' => Request::header('User-Agent'),
            ]);
        });

        Score::updated(function (Score $score) {
            AuditLog::create([
                'table_name' => $score->getTable(),
                'record_id' => $score->id,
                'action_type' => 'UPDATE',
                'user_id' => Auth::id(),
                'old_values' => json_encode($score->getOriginal(), JSON_UNESCAPED_UNICODE), // Sửa ở đây
                'new_values' => json_encode($score->getAttributes(), JSON_UNESCAPED_UNICODE), // Sửa ở đây
                'ip_address' => Request::ip(),
                'user_agent' => Request::header('User-Agent'),
            ]);
        });

        Score::deleted(function (Score $score) {
            AuditLog::create([
                'table_name' => $score->getTable(),
                'record_id' => $score->id,
                'action_type' => 'DELETE',
                'user_id' => Auth::id(),
                'old_values' => json_encode($score->getOriginal(), JSON_UNESCAPED_UNICODE), // Sửa ở đây
                'new_values' => null,
                'ip_address' => Request::ip(),
                'user_agent' => Request::header('User-Agent'),
            ]);
        });

        TeachingAssignment::created(function (TeachingAssignment $assignment) {
            AuditLog::create([
                'table_name' => $assignment->getTable(),
                'record_id' => $assignment->id,
                'action_type' => 'CREATE',
                'user_id' => Auth::id(),
                'new_values' => json_encode($assignment->toArray(), JSON_UNESCAPED_UNICODE), // Sửa ở đây
                'ip_address' => Request::ip(),
                'user_agent' => Request::header('User-Agent'),
            ]);
        });

        TeachingAssignment::updated(function (TeachingAssignment $assignment) {
            AuditLog::create([
                'table_name' => $assignment->getTable(),
                'record_id' => $assignment->id,
                'action_type' => 'UPDATE',
                'user_id' => Auth::id(),
                'old_values' => json_encode($assignment->getOriginal(), JSON_UNESCAPED_UNICODE), // Sửa ở đây
                'new_values' => json_encode($assignment->getAttributes(), JSON_UNESCAPED_UNICODE), // Sửa ở đây
                'ip_address' => Request::ip(),
                'user_agent' => Request::header('User-Agent'),
            ]);
        });

        TeachingAssignment::deleted(function (TeachingAssignment $assignment) {
            AuditLog::create([
                'table_name' => $assignment->getTable(),
                'record_id' => $assignment->id,
                'action_type' => 'DELETE',
                'user_id' => Auth::id(),
                'old_values' => json_encode($assignment->getOriginal(), JSON_UNESCAPED_UNICODE), // Sửa ở đây
                'new_values' => null,
                'ip_address' => Request::ip(),
                'user_agent' => Request::header('User-Agent'),
            ]);
        });
    }
}