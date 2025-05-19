<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SubjectController extends Controller
{
    // Lấy danh sách môn học
    public function index()
    {
        $subjects = DB::table('subjects')->select('id', 'name')->get();
        return response()->json($subjects);
    }

    // Lấy chi tiết một môn học theo ID
    public function show($id)
    {
        $subject = DB::table('subjects')->where('id', $id)->first();

        if (!$subject) {
            return response()->json(['message' => 'Subject not found'], 404);
        }

        return response()->json($subject);
    }

    // Tạo mới môn học
    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
        ]);

        $id = DB::table('subjects')->insertGetId([
            'name' => $request->name,
        ]);

        return response()->json(['message' => 'Subject created', 'id' => $id], 201);
    }

    // Cập nhật môn học theo ID
    public function update(Request $request, $id)
    {
        $request->validate([
            'name' => 'required|string|max:255',
        ]);

        $affected = DB::table('subjects')
            ->where('id', $id)
            ->update(['name' => $request->name]);

        if ($affected === 0) {
            return response()->json(['message' => 'Subject not found or no change'], 404);
        }

        return response()->json(['message' => 'Subject updated']);
    }

    // Xóa môn học theo ID
    public function destroy($id)
    {
        $deleted = DB::table('subjects')->where('id', $id)->delete();

        if ($deleted === 0) {
            return response()->json(['message' => 'Subject not found'], 404);
        }

        return response()->json(['message' => 'Subject deleted']);
    }
}
