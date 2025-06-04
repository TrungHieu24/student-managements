<?php

namespace App\Http\Controllers;

use App\Models\Teacher;
use App\Models\TeachingAssignment;
use App\Models\User;
use App\Models\ClassModel;
use App\Models\Student;
use App\Models\Score;
use App\Models\Subject;
use App\Models\AuditLog;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str; 
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Facades\Auth;

class TeacherController extends Controller
{

 public function index()
    {
        $teachers = Teacher::with(['user', 'subjects', 'teachingAssignments.class', 'teachingAssignments.subject'])->get();
        return response()->json($teachers);
    }

    public function store(Request $request)
    {
        // Log incoming data for debugging
        Log::info('Teacher creation request data:', $request->all());
        
        $validatedData = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users,email',
            'phone' => 'nullable|string|max:20',
            'gender' => 'nullable|in:Nam,Nữ,Khác',
            'birthday' => 'nullable|date_format:Y-m-d', 
            'address' => 'required|string|max:255',
            'subject_ids' => 'nullable|array',
            'subject_ids.*' => 'exists:subjects,id',
            'teaching_assignments' => 'nullable|array',
            'teaching_assignments.*.class_id' => 'required|integer|exists:classes,id',
            'teaching_assignments.*.subject_id' => 'required|integer|exists:subjects,id',
            'teaching_assignments.*.school_year' => 'required|string|max:20|regex:/^\d{4}-\d{4}$/',
            'teaching_assignments.*.semester' => 'required|integer|in:1,2',
            'teaching_assignments.*.is_homeroom_teacher' => 'nullable|boolean',
            'teaching_assignments.*.weekly_periods' => 'nullable|integer|min:0',
            'teaching_assignments.*.notes' => 'nullable|string|max:1000',
        ]);

        DB::beginTransaction();

        try {
            $generatedPassword = Str::random(10);

            $user = User::create([
                'name' => $validatedData['name'],
                'email' => $validatedData['email'],
                'password' => Hash::make($generatedPassword), 
                'role' => 'TEACHER',
                'is_first_login' => true,
            ]);

            $teacher = Teacher::create([
                'user_id' => $user->id,
                'name' => $validatedData['name'],
                'email' => $validatedData['email'],
                'phone' => $validatedData['phone'] ?? null,
                'gender' => $validatedData['gender'] ?? null,
                'birthday' => $validatedData['birthday'] ?? null,
                'address' => $validatedData['address'],
            ]);

            if (isset($validatedData['subject_ids']) && is_array($validatedData['subject_ids'])) {
                $teacher->subjects()->sync($validatedData['subject_ids']);
            } else {
                $teacher->subjects()->sync([]);
            }

            if (isset($validatedData['teaching_assignments']) && is_array($validatedData['teaching_assignments'])) {
                foreach ($validatedData['teaching_assignments'] as $assignmentData) {
                    // Cast types explicitly to ensure consistent types
                    $classId = (int)$assignmentData['class_id'];
                    $subjectId = (int)$assignmentData['subject_id'];
                    $schoolYear = (string)$assignmentData['school_year'];
                    $semester = (int)$assignmentData['semester'];
                    
                    $existingAssignment = TeachingAssignment::where('teacher_id', $teacher->id)
                        ->where('class_id', $classId)
                        ->where('subject_id', $subjectId)
                        ->where('school_year', $schoolYear)
                        ->where('semester', $semester)
                        ->first();

                    if (!$existingAssignment) {
                        TeachingAssignment::create([
                            'teacher_id' => $teacher->id,
                            'class_id' => $classId,
                            'subject_id' => $subjectId,
                            'school_year' => $schoolYear,
                            'semester' => $semester,
                            'is_homeroom_teacher' => isset($assignmentData['is_homeroom_teacher']) ? (bool)$assignmentData['is_homeroom_teacher'] : false,
                            'weekly_periods' => isset($assignmentData['weekly_periods']) ? (int)$assignmentData['weekly_periods'] : null,
                            'notes' => $assignmentData['notes'] ?? null,
                        ]);
                    }
                }
            }

            // Create audit log entry with generated password
            $teacher->load(['subjects', 'teachingAssignments.class', 'teachingAssignments.subject']);

            AuditLog::create([
                'table_name' => 'teachers',
                'record_id' => $teacher->id,
                'action_type' => 'CREATE',
                'user_id' => auth()->id(),
                'old_values' => null,
                'new_values' => [
                    'id' => $teacher->id,
                    'name' => $teacher->name,
                    'email' => $teacher->email,
                    'phone' => $teacher->phone,
                    'gender' => $teacher->gender,
                    'birthday' => $teacher->birthday,
                    'address' => $teacher->address,
                    'subjects' => $teacher->subjects->toArray(),
                    'teaching_assignments' => $teacher->teachingAssignments->toArray(),
                    'generated_password' => $generatedPassword,
                    'created_at' => $teacher->created_at,
                    'updated_at' => $teacher->updated_at,
                ],
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
            ]);

            DB::commit();

            $teacher->generated_password = $generatedPassword; 

            return response()->json($teacher, 201);

        } catch (ValidationException $e) {
            DB::rollBack();
            Log::error('Validation error creating teacher and user: ' . $e->getMessage());
            return response()->json(['message' => 'Dữ liệu nhập không hợp lệ.', 'errors' => $e->errors()], 422);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error("Error creating teacher and user: " . $e->getMessage() . " at " . $e->getFile() . ":" . $e->getLine());
            Log::error("Stack trace: " . $e->getTraceAsString());
            return response()->json(['message' => 'Không thể thêm giáo viên và tài khoản.', 'error' => $e->getMessage()], 500);
        }
    }

    // Other methods remain unchanged
    public function show(Teacher $teacher)
    {
        $teacher->load(['user', 'subjects', 'teachingAssignments.class', 'teachingAssignments.subject']);
        return response()->json($teacher);
    }

    public function update(Request $request, $id)
    {
        $teacher = Teacher::with(['user', 'subjects', 'teachingAssignments'])->findOrFail($id);

        // Capture old values before update
        $oldValues = $teacher->toArray();
        $oldValues['subjects'] = $teacher->subjects->pluck('id')->toArray(); // Store subject IDs
        $oldValues['teaching_assignments'] = $teacher->teachingAssignments->toArray(); // Store teaching assignments

        $validatedData = $request->validate([
            'name' => 'required|string|max:255',
            'email' => ['required', 'string', 'email', 'max:255', Rule::unique('users', 'email')->ignore($teacher->user_id)],
            'password' => 'nullable|string|min:8',
            'phone' => 'nullable|string|max:20',
            'gender' => 'nullable|in:Nam,Nữ,Khác',
            'birthday' => 'nullable|date_format:Y-m-d',
            'address' => 'required|string|max:255',
            'subject_ids' => 'nullable|array',
            'subject_ids.*' => 'exists:subjects,id',
            'teaching_assignments' => 'nullable|array',
            'teaching_assignments.*.id' => 'nullable|exists:teaching_assignments,id',
            'teaching_assignments.*.class_id' => 'required|integer|exists:classes,id',
            'teaching_assignments.*.subject_id' => 'required|integer|exists:subjects,id',
            'teaching_assignments.*.school_year' => 'required|string|max:20|regex:/^\d{4}-\d{4}$/',
            'teaching_assignments.*.semester' => 'required|integer|in:1,2',
            'teaching_assignments.*.is_homeroom_teacher' => 'nullable|boolean',
            'teaching_assignments.*.weekly_periods' => 'nullable|integer|min:0',
            'teaching_assignments.*.notes' => 'nullable|string|max:1000',
        ]);

        DB::beginTransaction();

        try {
            // Update User first
            if ($teacher->user) {
                $teacher->user->name = $validatedData['name'];
                $teacher->user->email = $validatedData['email'];
                if (isset($validatedData['password'])) {
                    $teacher->user->password = Hash::make($validatedData['password']);
                }
                $teacher->user->save();
            } else {
                Log::warning("User not found for teacher ID: " . $id . " during update.");
            }

            // Update Teacher
            $teacher->name = $validatedData['name'];
            $teacher->email = $validatedData['email'];
            $teacher->phone = $validatedData['phone'] ?? null;
            $teacher->gender = $validatedData['gender'] ?? null;
            $teacher->birthday = $validatedData['birthday'] ?? null;
            $teacher->address = $validatedData['address'];
            $teacher->save(); // Audit log sẽ được tự động tạo bởi AppServiceProvider

            // Update subjects
            if ($request->has('subject_ids')) {
                $teacher->subjects()->sync($validatedData['subject_ids'] ?? []);
            }

            // Update teaching assignments
            if ($request->has('teaching_assignments')) {    
                $assignments = collect($validatedData['teaching_assignments']);

                $currentIds = $teacher->teachingAssignments()->pluck('id')->toArray();
                $incomingIds = $assignments->pluck('id')->filter()->toArray();
                $toDelete = array_diff($currentIds, $incomingIds);

                if (!empty($toDelete)) {
                    TeachingAssignment::whereIn('id', $toDelete)->delete();
                }

                foreach ($assignments as $item) {
                    if (isset($item['id'])) {
                        $assignment = TeachingAssignment::where('id', $item['id'])->where('teacher_id', $teacher->id)->first();
                        if ($assignment) {
                            $assignment->update([
                                'class_id' => (int)$item['class_id'],
                                'subject_id' => (int)$item['subject_id'],
                                'school_year' => (string)$item['school_year'],
                                'semester' => (int)$item['semester'],
                                'is_homeroom_teacher' => isset($item['is_homeroom_teacher']) ? (bool)$item['is_homeroom_teacher'] : false,
                                'weekly_periods' => isset($item['weekly_periods']) ? (int)$item['weekly_periods'] : null,
                                'notes' => $item['notes'] ?? null,
                            ]);
                        } else {
                            Log::warning("Teaching assignment ID " . $item['id'] . " not found for teacher ID " . $teacher->id . " during update.");
                        }
                    } else {
                        $existingAssignment = TeachingAssignment::where('teacher_id', $teacher->id)
                            ->where('class_id', (int)$item['class_id'])
                            ->where('subject_id', (int)$item['subject_id'])
                            ->where('school_year', (string)$item['school_year'])
                            ->where('semester', (int)$item['semester'])
                            ->first();

                        if (!$existingAssignment) {
                            TeachingAssignment::create([
                                'teacher_id' => $teacher->id,
                                'class_id' => (int)$item['class_id'],
                                'subject_id' => (int)$item['subject_id'],
                                'school_year' => (string)$item['school_year'],
                                'semester' => (int)$item['semester'],
                                'is_homeroom_teacher' => isset($item['is_homeroom_teacher']) ? (bool)$item['is_homeroom_teacher'] : false,
                                'weekly_periods' => isset($item['weekly_periods']) ? (int)$item['weekly_periods'] : null,
                                'notes' => $item['notes'] ?? null,
                            ]);
                        } else {
                            Log::warning("Attempted to create existing teaching assignment for teacher ID " . $teacher->id . " class " . $item['class_id'] . " subject " . $item['subject_id']);
                        }
                    }
                }
            }

            // Capture new values after update
            $teacher->load(['subjects', 'teachingAssignments.class', 'teachingAssignments.subject']);
            $newValues = $teacher->toArray();
            $newValues['subjects'] = $teacher->subjects->pluck('id')->toArray(); // Store subject IDs
            $newValues['teaching_assignments'] = $teacher->teachingAssignments->toArray(); // Store teaching assignments

            // Create explicit audit log entry
            AuditLog::create([
                'table_name' => 'teachers',
                'record_id' => $teacher->id,
                'action_type' => 'UPDATE',
                'user_id' => auth()->id(),
                'old_values' => $oldValues,
                'new_values' => $newValues,
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
            ]);

            DB::commit();

            $teacher->load(['user', 'subjects', 'teachingAssignments.class', 'teachingAssignments.subject']);

            return response()->json($teacher);

        } catch (ValidationException $e) {
            DB::rollBack();
            Log::error('Validation error updating teacher and user: ' . $e->getMessage());
            return response()->json(['message' => 'Dữ liệu nhập không hợp lệ.', 'errors' => $e->errors()], 422);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error("Error updating teacher and user ID {$id}: " . $e->getMessage() . " at " . $e->getFile() . ":" . $e->getLine());
            Log::error($e->getTraceAsString());
            return response()->json(['message' => 'Lỗi khi cập nhật thông tin giáo viên.', 'error' => $e->getMessage()], 500);
        }
    }

    public function destroy($id)
    {
        DB::beginTransaction();
        try {
            $teacher = Teacher::with('user')->findOrFail($id);

            DB::table('teaching_assignments')->where('teacher_id', $id)->delete();

             try {
                 $teacher->subjects()->detach();
             } catch (\Exception $e) {
                 Log::warning("Could not detach subjects for teacher ID {$id}: " . $e->getMessage());
             }


             DB::table('classes')->where('teacher_id', $id)->update(['teacher_id' => null]);

            $teacher->delete();

            if ($teacher->user) {
                 $teacher->user->delete();
            } else {
                 Log::warning("User not found for teacher ID: " . $id . " during deletion.");
            }


            DB::commit();
            return response()->json(['message' => 'Giáo viên và tài khoản liên kết đã được xóa thành công'], 200);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error("Error deleting teacher and associated user ID {$id}: " . $e->getMessage() . " at " . $e->getFile() . ":" . $e->getLine());
            Log::error($e->getTraceAsString());
            return response()->json(['message' => 'Lỗi khi xóa giáo viên', 'error' => $e->getMessage()], 500);
        }
    }

    public function getTeacherInfo()
    {
        $user = Auth::user();

        if (!$user || $user->role !== 'TEACHER') {
            return response()->json(['message' => 'Không có quyền truy cập hoặc không phải tài khoản giáo viên.'], 403);
        }
        $teacher = Teacher::where('user_id', $user->id)
                           ->with([
                               'user', 
                               'subjects:id,name', 
                               'teachingAssignments' => function ($query) {
                                     $query->with(['class:id,name,grade', 'subject:id,name']); 
                               }
                           ])
                           ->first();


        if (!$teacher) {
            Log::error("User with TEACHER role found but no linked Teacher record for user ID: " . $user->id);
            return response()->json(['message' => 'Không tìm thấy thông tin giáo viên liên kết.'], 404);
        }

        return response()->json($teacher);
    }


public function getHomeroomClasses()
{
    $user = Auth::user();

    $teacher = Teacher::where('user_id', $user->id)->first();
    if (!$teacher) {
         Log::error("User with TEACHER role found but no linked Teacher record when fetching homeroom classes for user ID: " . $user->id);
         return response()->json(['message' => 'Không tìm thấy thông tin giáo viên.'], 404);
    }

    $homeroomClasses = ClassModel::where('teacher_id', $teacher->id)
                                ->with(['students','teacher'])
                                ->get();

    return response()->json($homeroomClasses);
}

    public function getTeachingClasses()
    {
        $user = Auth::user();

        $teacher = Teacher::where('user_id', $user->id)->first();
        if (!$teacher) {
             Log::error("User with TEACHER role found but no linked Teacher record when fetching teaching classes for user ID: " . $user->id);
             return response()->json(['message' => 'Không tìm thấy thông tin giáo viên.'], 404);
        }

        $teachingClasses = TeachingAssignment::where('teacher_id', $teacher->id)
            ->with(['class', 'subject'])
            ->get()
            ->map(function($assignment) {
                return [
                    'assignment_id' => $assignment->id,
                    'class_id' => $assignment->class->id,
                    'class_name' => $assignment->class->name,
                    'grade' => $assignment->class->grade,
                    'school_year' => $assignment->class->school_year,
                    'subject_id' => $assignment->subject->id,
                    'subject_name' => $assignment->subject->name,
                    'semester' => $assignment->semester,
                    'school_year_assignment' => $assignment->school_year,
                ];
            })
            ->values();

        return response()->json($teachingClasses);
    }

    public function getStudentsInClass($classId)
    {
        $user = Auth::user();

        $teacher = Teacher::where('user_id', $user->id)->first();
        if (!$teacher) {
             Log::error("User with TEACHER role found but no linked Teacher record when fetching students for class ID: " . $classId . " user ID: " . $user->id);
             return response()->json(['message' => 'Không tìm thấy thông tin giáo viên.'], 404);
        }

        $isHomeroomTeacher = ClassModel::where('id', $classId)
                                       ->where('teacher_id', $teacher->id)
                                       ->exists();

        $isTeachingInClass = TeachingAssignment::where('teacher_id', $teacher->id)
                                               ->where('class_id', $classId)
                                               ->exists(); 

        if (!$isHomeroomTeacher && !$isTeachingInClass) {
            return response()->json(['message' => 'Bạn không có quyền truy cập thông tin học sinh của lớp này.'], 403);
        }

        $class = ClassModel::with('students')->find($classId);

        if (!$class) {
            return response()->json(['message' => 'Không tìm thấy lớp.'], 404);
        }

         $sortedStudents = $class->students->sortBy('name', SORT_LOCALE_STRING)->values()->all();


        return response()->json([
            'class_id' => $class->id,
            'class_name' => $class->name,
            'grade' => $class->grade,
            'school_year' => $class->school_year,
            'students' => $sortedStudents,
        ]);
    }

    public function getStudentScoresInSubject($studentId, $subjectId)
    {
         $user = Auth::user();

        $teacher = Teacher::where('user_id', $user->id)->first();
        if (!$teacher) {
             Log::error("User with TEACHER role found but no linked Teacher record when fetching student scores for student ID: " . $studentId . " subject ID: " . $subjectId . " user ID: " . $user->id);
             return response()->json(['message' => 'Không tìm thấy thông tin giáo viên.'], 404);
        }

        $student = Student::find($studentId);
        $subject = Subject::find($subjectId);

        if (!$student || !$subject) {
             return response()->json(['message' => 'Không tìm thấy học sinh hoặc môn học.'], 404);
        }

        $isTeachingThisSubjectInClass = TeachingAssignment::where('teacher_id', $teacher->id)
                                                          ->where('class_id', $student->class_id)
                                                          ->where('subject_id', $subjectId)
                                                          ->exists();

        if (!$isTeachingThisSubjectInClass) {
             return response()->json(['message' => 'Bạn không có quyền xem điểm môn này của học sinh này.'], 403);
        }

        $scores = Score::where('student_id', $studentId)
                       ->where('subject_id', $subjectId)
                       ->get();

        return response()->json([
            'student_id' => $student->id,
            'student_name' => $student->name,
            'subject_id' => $subject->id,
            'subject_name' => $subject->name,
            'scores' => $scores,
        ]);
    }

    public function updateStudentScore(Request $request, $studentId, $subjectId)
    {
        $user = Auth::user();

        $teacher = Teacher::where('user_id', $user->id)->first();
        if (!$teacher) {
             Log::error("User with TEACHER role found but no linked Teacher record when updating student score for student ID: " . $studentId . " subject ID: " . $subjectId . " user ID: " . $user->id);
             return response()->json(['message' => 'Không tìm thấy thông tin giáo viên.'], 404);
        }

        $student = Student::find($studentId);
        $subject = Subject::find($subjectId);

        if (!$student || !$subject) {
             return response()->json(['message' => 'Không tìm thấy học sinh hoặc môn học.'], 404);
        }

        $isTeachingThisSubjectInClass = TeachingAssignment::where('teacher_id', $teacher->id)
                                                          ->where('class_id', $student->class_id)
                                                          ->where('subject_id', $subjectId)
                                                          ->exists();

        if (!$isTeachingThisSubjectInClass) {
             return response()->json(['message' => 'Bạn không có quyền cập nhật điểm môn này của học sinh này.'], 403);
        }

        $validatedData = $request->validate([
            'score' => 'required|numeric|min:0|max:10',
            'type' => 'required|in:mid1,final1,mid2,final2', 
        ]);

        $score = Score::where('student_id', $studentId)
                     ->where('subject_id', $subjectId)
                     ->where('type', $validatedData['type'])
                     ->first();

        DB::beginTransaction();
        try {
            if ($score) {
                $score->score = $validatedData['score'];
                $score->save();
                $message = 'Cập nhật điểm thành công.';
            } else {
                 $score = Score::create([
                    'student_id' => $studentId,
                    'subject_id' => $subjectId,
                    'type' => $validatedData['type'],
                    'score' => $validatedData['score'],
                 ]);
                 $message = 'Thêm điểm thành công.';
            }
            DB::commit();
            return response()->json(['message' => $message, 'score' => $score]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error("Error updating/creating score for student ID {$studentId} subject ID {$subjectId}: " . $e->getMessage() . " at " . $e->getFile() . ":" . $e->getLine());
            return response()->json(['message' => 'Lỗi khi lưu điểm.', 'error' => $e->getMessage()], 500);
        }
    }
}