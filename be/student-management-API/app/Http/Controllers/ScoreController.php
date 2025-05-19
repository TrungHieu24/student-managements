<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class ScoreController extends Controller
{
    // 📋 Lấy tất cả điểm
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
                'scores.score'
            )
            ->orderBy('students.class')
            ->orderBy('students.id')
            ->orderBy('subjects.id')
            ->get();

        return response()->json($scores);
    }


    // 📊 Thống kê điểm trung bình toàn hệ thống
    public function getAverageScore()
    {
        $average = DB::table('scores')->avg('score');
    
        return response()->json([
            'average_score' => round($average, 2)
        ]);
    }


    // 📊 Thống kê phân loại học lực theo điểm trung bình
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



    // 📊 Thống kê điểm trung bình theo môn học
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


    // 🔍 Lấy điểm của 1 học sinh theo ID
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
                'subjects.name as subject_name',
                'scores.score',
                'scores.type'
            )
            ->orderBy('subjects.id')
            ->get();

        if ($scores->isEmpty()) {
            return response()->json(['message' => 'Không tìm thấy điểm cho học sinh này.'], 404);
        }

        return response()->json($scores);
    }


     // ➕ Thêm điểm mới
    public function store(Request $request)
    {
        $validated = Validator::make($request->all(), [
            'student_id' => 'required|exists:students,id',
            'subject_id' => 'required|exists:subjects,id',
            'score' => 'required|numeric|min:0|max:10',
            'type' => 'required|in:mid1,final1,mid2,final2',
        ]);

        if ($validated->fails()) {
            return response()->json(['errors' => $validated->errors()], 422);
        }

        $existingScore = DB::table('scores')
            ->where('student_id', $request->student_id)
            ->where('subject_id', $request->subject_id)
            ->where('type', $request->type)
            ->first();

        if ($existingScore) {
            return response()->json(['message' => 'Điểm này đã tồn tại cho học sinh với môn học và loại điểm này.'], 400);
        }
        $id = DB::table('scores')->insertGetId($request->only([
            'student_id', 'subject_id', 'score', 'type'
        ]));
        return response()->json(['message' => 'Đã thêm điểm thành công.', 'id' => $id], 201);
    }
 
     // ✏️ Sửa điểm
    public function update(Request $request, $id)
    {
        $score = DB::table('scores')
            ->where('id', $id)
            ->first();
    
        if (!$score) {
            return response()->json(['message' => 'Không tìm thấy điểm này.'], 404);
        }
    
        $validated = Validator::make($request->all(), [
            'score' => 'required|numeric|min:0|max:10',
            'subject_id' => 'required|exists:subjects,id',
            'type' => 'required|in:mid1,final1,mid2,final2',
        ]);
    
        if ($validated->fails()) {
            return response()->json(['errors' => $validated->errors()], 422);
        }
        $existingScore = DB::table('scores')
            ->where('student_id', $score->student_id)
            ->where('subject_id', $request->subject_id)
            ->where('type', $request->type)
            ->where('id', '!=', $id) 
            ->first();
    
        if ($existingScore) {
            return response()->json(['message' => 'Không thể cập nhật vì đã có bản ghi điểm khác cho học sinh này với cùng môn học và loại điểm.'], 400);
        }
    
        DB::table('scores')->where('id', $id)->update([
            'score' => $request->score,
            'subject_id' => $request->subject_id,
            'type' => $request->type,
            'updated_at' => now()
        ]);
    
        return response()->json(['message' => 'Cập nhật điểm thành công.']);
    }
     
     // ❌ Xoá điểm
     public function destroy($id)
     {
         $deleted = DB::table('scores')->where('id', $id)->delete();
 
         if ($deleted) {
             return response()->json(['message' => 'Đã xóa điểm thành công.']);
         }
 
         return response()->json(['message' => 'Không tìm thấy điểm để xóa.'], 404);
     }
}

