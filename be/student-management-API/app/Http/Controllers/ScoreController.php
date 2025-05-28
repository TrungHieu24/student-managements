<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class ScoreController extends Controller
{
    // Lấy tất cả điểm
    public function index()
    {
        $scores = DB::table('scores')
            ->join('students', 'scores.student_id', '=', 'students.id')
            ->join('subjects', 'scores.subject_id', '=', 'subjects.id')
            ->leftJoin('classes', 'students.class_id', '=', 'classes.id')
            ->select(
                'students.id as student_id',
                'students.name as student_name',
                'classes.name as class_name',
                'subjects.name as subject_name',
                'scores.score',
                'scores.type',
                'scores.semester',
                'scores.year'
            )
            ->orderBy('students.class_id')
            ->orderBy('students.id')
            ->orderBy('subjects.id')
            ->orderBy('scores.semester') // Order by semester
            ->get();

        return response()->json($scores);
    }

    // Thống kê điểm trung bình toàn hệ thống
    public function getAverageScore()
    {
        $average = DB::table('scores')->avg('score');

        return response()->json([
            'average_score' => round($average, 2)
        ]);
    }

    // Thống kê phân loại học lực theo điểm trung bình
    public function getStudentRanking()
    {
        $ranking = DB::table('scores')
            ->select(
                'student_id',
                DB::raw('AVG(score) as average_score')
            )
            ->groupBy('student_id')
            ->get()
            ->map(function ($student) {
                // Phân loại học lực
                if ($student->average_score >= 8) {
                    $student->rank = 'Giỏi';
                } elseif ($student->average_score >= 6.5) {
                    $student->rank = 'Khá';
                } elseif ($student->average_score >= 5.0) {
                    $student->rank = 'Trung bình';
                } else {
                    $student->rank = 'Yếu';
                }

                return $student;
            });

        // Đếm số lượng học sinh trong mỗi nhóm học lực
        $rankCounts = $ranking->groupBy('rank')->map(function ($group) {
            return count($group);
        });

        return response()->json([
            'Giỏi' => $rankCounts['Giỏi'] ?? 0,
            'Khá' => $rankCounts['Khá'] ?? 0,
            'Trung bình' => $rankCounts['Trung bình'] ?? 0,
            'Yếu' => $rankCounts['Yếu'] ?? 0,
        ]);
    }

    // Thống kê điểm trung bình theo môn học
    public function getAverageScoreBySubject()
    {
        $averageBySubject = DB::table('scores')
            ->join('subjects', 'scores.subject_id', '=', 'subjects.id')
            ->select(
                'subjects.name as subject_name',
                DB::raw('AVG(scores.score) as average_score')
            )
            ->groupBy('subjects.name')
            ->get();

        return response()->json($averageBySubject);
    }

    // Lấy điểm của 1 học sinh theo ID
    public function getScoresByStudent($id)
    {
        $scores = DB::table('scores')
            ->join('students', 'scores.student_id', '=', 'students.id')
            ->join('subjects', 'scores.subject_id', '=', 'subjects.id')
            ->leftJoin('classes', 'students.class_id', '=', 'classes.id')
            ->where('students.id', $id)
            ->select(
                'scores.id',
                'scores.subject_id',
                'students.id as student_id',
                'students.name as student_name',
                'classes.name as class_name',
                'subjects.id as subject_id_raw', // Thêm để dễ dàng mapping trong frontend nếu cần
                'subjects.name as subject_name',
                'scores.score',
                'scores.type',
                'scores.semester' // Đảm bảo lấy semester
            )
            ->orderBy('subjects.id')
            ->orderBy('scores.semester') // Order by semester
            ->orderBy('scores.type')
            ->get();

        if ($scores->isEmpty()) {
            return response()->json(['message' => 'Không tìm thấy điểm cho học sinh này.'], 404);
        }

        return response()->json($scores);
    }

    // Thêm điểm mới
    public function store(Request $request)
    {
        $rules = [
            'student_id' => 'required|exists:students,id',
            'subject_id' => 'required|exists:subjects,id',
            'score' => 'required|numeric|min:0|max:10',
            'type' => 'required|in:oral,15min,45min,mid1,final1,mid2,final2',
            // 'year' => 'sometimes|integer|min:2000|max:2100' // Chỉ khi bạn thực sự muốn thêm trường year
        ];

        // Thêm rule cho semester dựa vào loại điểm
        if (in_array($request->type, ['oral', '15min', '45min'])) {
            $rules['semester'] = 'required|integer|in:1,2';
        }

        $validated = Validator::make($request->all(), $rules);

        if ($validated->fails()) {
            return response()->json(['errors' => $validated->errors()], 422);
        }

        // Xác định semester để lưu
        $semesterToStore = null;
        if (in_array($request->type, ['mid1', 'final1'])) {
            $semesterToStore = 1;
        } elseif (in_array($request->type, ['mid2', 'final2'])) {
            $semesterToStore = 2;
        } else { // oral, 15min, 45min - semester phải được gửi từ frontend
            $semesterToStore = $request->semester;
        }

        // Kiểm tra tính nhất quán nếu semester được cung cấp cho mid/final types
        if (in_array($request->type, ['mid1', 'final1']) && $semesterToStore != 1) {
            return response()->json(['message' => 'Điểm giữa kỳ 1 hoặc cuối kỳ 1 phải thuộc học kỳ 1.'], 422);
        }
        if (in_array($request->type, ['mid2', 'final2']) && $semesterToStore != 2) {
            return response()->json(['message' => 'Điểm giữa kỳ 2 hoặc cuối kỳ 2 phải thuộc học kỳ 2.'], 422);
        }

        // Kiểm tra điểm duy nhất cho các loại điểm đặc biệt (midterm/final)
        $restrictedTypes = ['mid1', 'final1', 'mid2', 'final2'];
        if (in_array($request->type, $restrictedTypes)) {
            $existingScore = DB::table('scores')
                ->where('student_id', $request->student_id)
                ->where('subject_id', $request->subject_id)
                ->where('type', $request->type)
                ->where('semester', $semesterToStore) // Quan trọng: kiểm tra cả semester
                ->first();

            if ($existingScore) {
                return response()->json(['message' => 'Điểm loại ' . $request->type . ' đã tồn tại cho học sinh này, môn học này và học kỳ này.'], 400);
            }
        }

        $dataToInsert = [
            'student_id' => $request->student_id,
            'subject_id' => $request->subject_id,
            'score' => $request->score,
            'type' => $request->type,
            'semester' => $semesterToStore, // Lưu semester đã xác định
            // 'year' => $request->year, // Uncomment if you add year handling
            'created_at' => now(),
            'updated_at' => now()
        ];

        $id = DB::table('scores')->insertGetId($dataToInsert);
        return response()->json(['message' => 'Đã thêm điểm thành công.', 'id' => $id, 'data' => $dataToInsert], 201);
    }

    // Sửa điểm
    public function update(Request $request, $id)
    {
        $score = DB::table('scores')->where('id', $id)->first();

        if (!$score) {
            return response()->json(['message' => 'Không tìm thấy điểm này.'], 404);
        }

        $rules = [
            'score' => 'required|numeric|min:0|max:10',
            'subject_id' => 'required|exists:subjects,id',
            'type' => 'required|in:oral,15min,45min,mid1,final1,mid2,final2',
            // 'year' => 'sometimes|integer|min:2000|max:2100'
        ];

        // Semester là tùy chọn cho update, nếu có thì validate
        // Nếu không có, sẽ cố gắng giữ lại semester cũ nếu có thể
        if ($request->has('semester')) {
            $rules['semester'] = 'integer|in:1,2';
        }

        $validated = Validator::make($request->all(), $rules);

        if ($validated->fails()) {
            return response()->json(['errors' => $validated->errors()], 422);
        }

        // Xác định semester để lưu (ưu tiên request, nếu không có thì giữ lại cái cũ)
        $semesterToStore = $score->semester; // Mặc định giữ lại semester cũ
        if (in_array($request->type, ['mid1', 'final1'])) {
            $semesterToStore = 1;
        } elseif (in_array($request->type, ['mid2', 'final2'])) {
            $semesterToStore = 2;
        } elseif ($request->has('semester')) { // Nếu là oral, 15min, 45min và có semester trong request
            $semesterToStore = $request->semester;
        }
        // else: Nếu type là oral/15min/45min nhưng request không gửi semester, và score->semester đã có
        // thì $semesterToStore vẫn là $score->semester.

        // Kiểm tra tính nhất quán nếu semester được cung cấp cho mid/final types
        if (in_array($request->type, ['mid1', 'final1']) && $semesterToStore != 1) {
            return response()->json(['message' => 'Điểm giữa kỳ 1 hoặc cuối kỳ 1 phải thuộc học kỳ 1.'], 422);
        }
        if (in_array($request->type, ['mid2', 'final2']) && $semesterToStore != 2) {
            return response()->json(['message' => 'Điểm giữa kỳ 2 hoặc cuối kỳ 2 phải thuộc học kỳ 2.'], 422);
        }

        // Kiểm tra điểm duy nhất cho các loại điểm đặc biệt nếu có thay đổi
        $restrictedTypes = ['mid1', 'final1', 'mid2', 'final2'];

        if (in_array($request->type, $restrictedTypes)) {
            $existingScore = DB::table('scores')
                ->where('student_id', $score->student_id) // Student ID của điểm đang được sửa
                ->where('subject_id', $request->subject_id)
                ->where('type', $request->type)
                ->where('semester', $semesterToStore) // Quan trọng: kiểm tra cả semester
                ->where('id', '!=', $id) // Loại trừ chính bản ghi đang được cập nhật
                ->first();

            if ($existingScore) {
                return response()->json(['message' => 'Không thể cập nhật vì đã có bản ghi điểm loại ' . $request->type . ' khác cho học sinh này, môn học này và học kỳ này.'], 400);
            }
        }

        $dataToUpdate = [
            'score' => $request->score,
            'subject_id' => $request->subject_id,
            'type' => $request->type,
            'semester' => $semesterToStore, // Lưu semester đã xác định
            // 'year' => $request->filled('year') ? $request->year : $score->year,
            'updated_at' => now()
        ];

        DB::table('scores')->where('id', $id)->update($dataToUpdate);

        return response()->json(['message' => 'Cập nhật điểm thành công.', 'data' => $dataToUpdate]);
    }

    // Xoá điểm
    public function destroy($id)
    {
        $deleted = DB::table('scores')->where('id', $id)->delete();

        if ($deleted) {
            return response()->json(['message' => 'Đã xóa điểm thành công.']);
        }

        return response()->json(['message' => 'Không tìm thấy điểm để xóa.'], 404);
    }
}