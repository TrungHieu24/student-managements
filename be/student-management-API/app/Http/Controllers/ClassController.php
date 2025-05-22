<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\ClassModel;
use App\Models\Student;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use App\Models\Teacher;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Auth;

class ClassController extends Controller
{
    public function index()
    {
        try {
            $classes = ClassModel::select(
                'classes.id',
                'classes.name',
                'classes.grade',
                'classes.school_year',
                'teachers.name as teacher_name',
                'teachers.id as teacher_id'
            )
            ->leftJoin('teachers', 'classes.teacher_id', '=', 'teachers.id')
            ->get();

            return response()->json($classes);

        } catch (\Exception $e) {
            Log::error('Error fetching classes: ' . $e->getMessage());
            return response()->json(['message' => 'Không thể tải danh sách lớp.', 'error' => $e->getMessage()], 500);
        }
    }


    /**
     * Lấy thông tin lớp học của sinh viên đã đăng nhập.
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
 public function getStudentClass(Request $request)
    {
        try {
            $user = Auth::user(); // Lấy người dùng hiện tại

            if ($user->role !== 'USER') {
                return response()->json([
                    'message' => 'Truy cập bị từ chối. Chỉ sinh viên mới có thể xem lớp của mình.'
                ], 403);
            }

            $student = Student::where('user_id', $user->id)->first();

            if (!$student) {
                return response()->json([
                    'message' => 'Không tìm thấy thông tin sinh viên cho người dùng này.'
                ], 404);
            }

            // Tải thông tin lớp học, bao gồm danh sách học sinh và giáo viên chủ nhiệm
            $class = ClassModel::with(['students', 'teacher'])->find($student->class_id);

            if (!$class) {
                return response()->json([
                    'message' => 'Không tìm thấy lớp học của sinh viên này.'
                ], 404);
            }

            return response()->json([
                'message' => 'Lấy thông tin lớp học thành công.',
                'data' => $class
            ]);

        } catch (\Exception $e) {
            Log::error('Lỗi khi lấy thông tin lớp học của sinh viên: ' . $e->getMessage() . ' at ' . $e->getFile() . ':' . $e->getLine());
            return response()->json([
                'message' => 'Lỗi server khi lấy thông tin lớp học.',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function getPerformanceSummary($id)
    {
        try {
            $class = ClassModel::with(['students.scores'])->findOrFail($id);

            $performanceCounts = [
                'Giỏi' => 0,
                'Khá' => 0,
                'Trung bình' => 0,
                'Yếu' => 0,
                'Chưa xếp loại' => 0,
            ];

            foreach ($class->students as $student) {
                $studentScores = $student->scores;

                $validScores = $studentScores->filter(function($score) {
                    return !is_null($score->score) && is_numeric($score->score);
                })->map(function($score) {
                    return (float) $score->score;
                });


                if ($validScores->isEmpty()) {
                    $performanceCounts['Chưa xếp loại']++;
                } else {
                    $averageScore = $validScores->avg();

                    if ($averageScore >= 8) {
                        $performanceCounts['Giỏi']++;
                    } elseif ($averageScore >= 6.5) {
                        $performanceCounts['Khá']++;
                    } elseif ($averageScore >= 5) {
                        $performanceCounts['Trung bình']++;
                    } else {
                        $performanceCounts['Yếu']++;
                    }
                }
            }

            return response()->json([
                'class_id' => $class->id,
                'class_name' => $class->name,
                'performance_summary' => $performanceCounts,
            ]);

        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            Log::warning('Class not found for performance summary ID: ' . $id);
            return response()->json(['message' => 'Không tìm thấy lớp'], 404);
        } catch (\Exception $e) {
            Log::error('Error fetching performance summary for class ' . $id . ': ' . $e->getMessage());
            Log::error('Tại file: ' . $e->getFile() . ', dòng: ' . $e->getLine());
            return response()->json([
                'message' => 'Lỗi khi lấy thống kê học lực của lớp',
                'error' => $e->getMessage()
            ], 500);
        }
    }


   public function getAverageScorePerSubject($classId)
    {
        try {
            $class = ClassModel::findOrFail($classId);

            $averageScores = DB::table('scores')
                ->join('students', 'scores.student_id', '=', 'students.id')
                ->join('subjects', 'scores.subject_id', '=', 'subjects.id')
                ->where('students.class_id', $classId)
                ->select(
                    'subjects.name as subject_name',
                    DB::raw('ROUND(AVG(scores.score), 2) as average_score') 
                )
                ->groupBy('subjects.name')
                ->get();

            return response()->json([
                'message' => 'Thống kê điểm trung bình môn cho lớp ' . $class->name,
                'class_id' => $class->id,
                'class_name' => $class->name,
                'average_subject_scores' => $averageScores 
            ]);

        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json(['message' => 'Không tìm thấy lớp.'], 404);
        } catch (\Exception $e) {
            Log::error('Lỗi khi tính điểm trung bình môn của lớp ' . $classId . ': ' . $e->getMessage());
            return response()->json(['message' => 'Lỗi khi xử lý yêu cầu.', 'error' => $e->getMessage()], 500);
        }
    }

    public function store(Request $request)
    {
        try {
            $validatedData = $request->validate([
                'name' => [
                    'required',
                    'string',
                    'max:255',
                    'regex:/^\d+[A-Za-z]\d*$/',
                    Rule::unique('classes')->where(function ($query) use ($request) {
                        return $query->where('grade', $request->grade)
                                     ->where('school_year', $request->school_year);
                    }),
                ],
                'grade' => 'required|integer|min:1|max:12',
                'school_year' => 'required|string|max:20',
                'teacher_id' => 'nullable|exists:teachers,id',
            ]);

            $class = ClassModel::create([
                'name' => $validatedData['name'],
                'grade' => $validatedData['grade'],
                'school_year' => $validatedData['school_year'],
                'teacher_id' => $validatedData['teacher_id'] ?? null,
            ]);

            $newClassWithTeacherName = ClassModel::select(
                'classes.id',
                'classes.name',
                'classes.grade',
                'classes.school_year',
                'teachers.name as teacher_name',
                'teachers.id as teacher_id'
            )
            ->leftJoin('teachers', 'classes.teacher_id', '=', 'teachers.id')
            ->find($class->id);

            return response()->json(['message' => 'Thêm lớp mới thành công.', 'class' => $newClassWithTeacherName], 201);

        } catch (ValidationException $e) {
            Log::error('Validation error creating class: ' . $e->getMessage());
            return response()->json(['message' => 'Dữ liệu nhập không hợp lệ.', 'errors' => $e->errors()], 422);
        } catch (\Exception $e) {
            Log::error('Error creating class: ' . $e->getMessage());
            return response()->json(['message' => 'Không thể thêm lớp mới.', 'error' => $e->getMessage()], 500);
        }
    }

    public function update(Request $request, $id)
    {
        try {
            $class = ClassModel::findOrFail($id);

            $validatedData = $request->validate([
                'name' => [
                    'required',
                    'string',
                    'max:255',
                     'regex:/^\d+[A-Za-z]\d*$/',
                     Rule::unique('classes')->where(function ($query) use ($request, $class) {
                         return $query->where('grade', $class->grade)
                                      ->where('school_year', $request->school_year);
                     })->ignore($class->id),
                ],
                 'school_year' => 'required|string|max:20',
                'teacher_id' => 'nullable|exists:teachers,id',
            ]);

            $class->name = $validatedData['name'];
            $class->school_year = $validatedData['school_year'];
            $class->teacher_id = $validatedData['teacher_id'];

            $class->save();

            $updatedClass = ClassModel::select(
                'classes.id',
                'classes.name',
                'classes.grade',
                'classes.school_year',
                'teachers.name as teacher_name',
                'teachers.id as teacher_id'
            )
            ->leftJoin('teachers', 'classes.teacher_id', '=', 'teachers.id')
            ->find($class->id);

            return response()->json(['message' => 'Cập nhật thông tin lớp thành công.', 'class' => $updatedClass]);

        } catch (ValidationException $e) {
             Log::error('Validation error updating class ' . $id . ': ' . $e->getMessage());
             return response()->json(['message' => 'Dữ liệu nhập không hợp lệ.', 'errors' => $e->errors()], 422);

        } catch (\Exception $e) {
            Log::error('Error updating class ' . $id . ': ' . $e->getMessage());
            return response()->json(['message' => 'Không thể cập nhật thông tin lớp.', 'error' => $e->getMessage()], 500);
        }
    }

    public function destroy($id)
    {
        try {
            $class = ClassModel::findOrFail($id);
            $class->delete();

            return response()->json(['message' => 'Xóa lớp thành công.']);

        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            Log::warning('Class not found for deletion ID: ' . $id);
            return response()->json(['message' => 'Không tìm thấy lớp.'], 404);
        } catch (\Exception $e) {
            Log::error('Error deleting class ' . $id . ': ' . $e->getMessage());
            return response()->json(['message' => 'Không thể xóa lớp.', 'error' => $e->getMessage()], 500);
        }
    }

    public function showStudents($id)
    {
        try {
            $class = ClassModel::with(['students', 'teacher'])->findOrFail($id);

            return response()->json($class);

        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            Log::warning('Class not found for ID: ' . $id);
            return response()->json(['message' => 'Không tìm thấy lớp'], 404);
        } catch (\Exception $e) {
            Log::error('Error fetching details for class ' . $id . ': ' . $e->getMessage());
            return response()->json(['message' => 'Lỗi khi lấy thông tin chi tiết lớp', 'error' => $e->getMessage()], 500);
        }
    }
}       