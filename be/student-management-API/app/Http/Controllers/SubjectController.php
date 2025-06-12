<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Models\AuditLog;
use Illuminate\Support\Facades\Auth;

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

        // Explicitly create audit log for CREATE operation
        AuditLog::create([
            'table_name' => 'subjects',
            'record_id' => $id,
            'action_type' => 'CREATE',
            'user_id' => Auth::id(), // Assuming user is authenticated
            'old_values' => null,
            'new_values' => ['id' => $id, 'name' => $request->name],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'changed_at' => now(),
        ]);

        return response()->json(['message' => 'Subject created', 'id' => $id], 201);
    }

    // Cập nhật môn học theo ID
    public function update(Request $request, $id)
    {
        $request->validate([
            'name' => 'required|string|max:255',
        ]);

        $oldSubject = DB::table('subjects')->where('id', $id)->first(); // Get old values

        $affected = DB::table('subjects')
            ->where('id', $id)
            ->update(['name' => $request->name]);

        if ($affected === 0) {
            return response()->json(['message' => 'Subject not found or no change'], 404);
        }

        $newSubject = DB::table('subjects')->where('id', $id)->first(); // Get new values

        // Explicitly create audit log for UPDATE operation
        AuditLog::create([
            'table_name' => 'subjects',
            'record_id' => $id,
            'action_type' => 'UPDATE',
            'user_id' => Auth::id(), // Assuming user is authenticated
            'old_values' => $oldSubject ? json_encode($oldSubject, JSON_UNESCAPED_UNICODE) : null,
            'new_values' => $newSubject ? json_encode($newSubject, JSON_UNESCAPED_UNICODE) : null,
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'changed_at' => now(),
        ]);

        return response()->json(['message' => 'Subject updated']);
    }

    // Xóa môn học theo ID
    public function destroy($id)
    {
        $subject = DB::table('subjects')->where('id', $id)->first(); // Get old values before deletion

        if (!$subject) {
            return response()->json(['message' => 'Subject not found'], 404);
        }

        $deleted = DB::table('subjects')->where('id', $id)->delete();

        if ($deleted === 0) {
            return response()->json(['message' => 'Subject not found'], 404); // Should ideally not hit here if $subject exists
        }

        // Explicitly create audit log for DELETE operation
        AuditLog::create([
            'table_name' => 'subjects',
            'record_id' => $id,
            'action_type' => 'DELETE',
            'user_id' => Auth::id(), // Assuming user is authenticated
            'old_values' => json_encode($subject, JSON_UNESCAPED_UNICODE),
            'new_values' => null,
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
            'changed_at' => now(),
        ]);

        return response()->json(['message' => 'Subject deleted']);
    }

    public function history(Request $request)
    {
        try {
            $query = DB::table('audit_logs')->where('table_name', 'subjects');

            if ($request->filled('record_id')) {
                $query->where('record_id', $request->input('record_id'));
            }
            if ($request->filled('user_id')) {
                $query->where('user_id', $request->input('user_id'));
            }
            if ($request->filled('action_type')) {
                $query->where('action_type', $request->input('action_type'));
            }

            $perPage = $request->input('per_page', 10);
            $subjectHistory = $query->orderBy('changed_at', 'desc')
                                   ->paginate($perPage);

            $transformedItems = collect($subjectHistory->items())->map(function ($item) {
                $oldValues = json_decode($item->old_values, true);
                $newValues = json_decode($item->new_values, true);

                return [
                    'id' => $item->id,
                    'record_id' => $item->record_id,
                    'action_type' => $item->action_type,
                    'changed_at' => $item->changed_at,
                    'user' => DB::table('users')->where('id', $item->user_id)->first() ? [
                        'id' => DB::table('users')->where('id', $item->user_id)->first()->id,
                        'name' => DB::table('users')->where('id', $item->user_id)->first()->name,
                    ] : null,
                    'old_values' => $oldValues,
                    'new_values' => $newValues,
                    'ip_address' => $item->ip_address,
                    'user_agent' => $item->user_agent,
                ];
            });

            return response()->json([
                'data' => $transformedItems,
                'meta' => [
                    'current_page' => $subjectHistory->currentPage(),
                    'last_page' => $subjectHistory->lastPage(),
                    'per_page' => $subjectHistory->perPage(),
                    'total' => $subjectHistory->total(),
                ]
            ]);

        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Error in subject history: ' . $e->getMessage());
            \Illuminate\Support\Facades\Log::error($e->getTraceAsString());
            return response()->json([
                'message' => 'Có lỗi xảy ra khi tải lịch sử môn học',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error'
            ], 500);
        }
    }
}
