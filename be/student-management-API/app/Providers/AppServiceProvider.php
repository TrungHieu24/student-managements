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
use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Request;
use Illuminate\Support\Facades\Log;

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

        Subject::created(function (Subject $subject) {
            AuditLog::create([
                'table_name' => 'subjects',
                'record_id' => $subject->id,
                'action_type' => 'CREATE',
                'user_id' => Auth::id(),
                'old_values' => null,
                'new_values' => json_encode([
                    'id' => $subject->id,
                    'name' => $subject->name,
                    'created_at' => $subject->created_at,
                    'updated_at' => $subject->updated_at,
                ], JSON_UNESCAPED_UNICODE),
                'ip_address' => Request::ip(),
                'user_agent' => Request::header('User-Agent'),
                'changed_at' => now(),
            ]);
        });

        Subject::updated(function (Subject $subject) {
            AuditLog::create([
                'table_name' => 'subjects',
                'record_id' => $subject->id,
                'action_type' => 'UPDATE',
                'user_id' => Auth::id(),
                'old_values' => json_encode([
                    'id' => $subject->getOriginal('id'),
                    'name' => $subject->getOriginal('name'),
                    'created_at' => $subject->getOriginal('created_at'),
                    'updated_at' => $subject->getOriginal('updated_at'),
                ], JSON_UNESCAPED_UNICODE),
                'new_values' => json_encode([
                    'id' => $subject->id,
                    'name' => $subject->name,
                    'created_at' => $subject->created_at,
                    'updated_at' => $subject->updated_at,
                ], JSON_UNESCAPED_UNICODE),
                'ip_address' => Request::ip(),
                'user_agent' => Request::header('User-Agent'),
                'changed_at' => now(),
            ]);
        });

        Subject::deleted(function (Subject $subject) {
            AuditLog::create([
                'table_name' => 'subjects',
                'record_id' => $subject->id,
                'action_type' => 'DELETE',
                'user_id' => Auth::id(),
                'old_values' => json_encode([
                    'id' => $subject->id,
                    'name' => $subject->name,
                    'created_at' => $subject->created_at,
                    'updated_at' => $subject->updated_at,
                ], JSON_UNESCAPED_UNICODE),
                'new_values' => null,
                'ip_address' => Request::ip(),
                'user_agent' => Request::header('User-Agent'),
                'changed_at' => now(),
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

        User::created(function (User $user) {
            AuditLog::create([
                'table_name' => $user->getTable(),
                'record_id' => $user->id,
                'action_type' => 'CREATE',
                'user_id' => Auth::id(),
                'old_values' => null,
                'new_values' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $user->role,
                    'created_at' => $user->created_at,
                    'updated_at' => $user->updated_at,
                ],
                'ip_address' => Request::ip(),
                'user_agent' => Request::header('User-Agent'),
            ]);
        });

        User::updated(function (User $user) {
            $changes = $user->getChanges();
            $oldValues = [];
            $newValues = [];

            foreach ($changes as $key => $newValue) {
                // Exclude 'updated_at' from logging as it's always changed and not relevant for user audit
                if ($key === 'updated_at') {
                    continue;
                }
                $oldValues[$key] = $user->getOriginal($key);
                $newValues[$key] = $newValue;
            }

            // Only log if there are actual changes (excluding 'updated_at')
            if (!empty($newValues)) {
                AuditLog::create([
                    'table_name' => $user->getTable(),
                    'record_id' => $user->id,
                    'action_type' => 'UPDATE',
                    'user_id' => Auth::id(),
                    'old_values' => json_encode($oldValues, JSON_UNESCAPED_UNICODE),
                    'new_values' => json_encode($newValues, JSON_UNESCAPED_UNICODE),
                    'ip_address' => Request::ip(),
                    'user_agent' => Request::header('User-Agent'),
                ]);
            }
        });

        User::deleted(function (User $user) {
            AuditLog::create([
                'table_name' => $user->getTable(),
                'record_id' => $user->id,
                'action_type' => 'DELETE',
                'user_id' => Auth::id(),
                'old_values' => $user->getOriginal(),
                'new_values' => null,
                'ip_address' => Request::ip(),
                'user_agent' => Request::header('User-Agent'),
            ]);
        });
    }
}