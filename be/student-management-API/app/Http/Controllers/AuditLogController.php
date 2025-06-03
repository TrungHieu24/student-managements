<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\AuditLog;
use Illuminate\Support\Facades\Log;

class AuditLogController extends Controller
{
    public function index(Request $request)
    {
        $tableNameFilter = $request->input('table_name');
        $recordIdFilter = $request->input('record_id');
        $actionTypeFilter = $request->input('action_type');
        $userIdFilter = $request->input('user_id');

        $query = AuditLog::query();

        if ($tableNameFilter) {
            $query->where('table_name', $tableNameFilter);
        }
        if ($recordIdFilter) {
            $query->where('record_id', $recordIdFilter);
        }
        if ($actionTypeFilter) {
            $query->where('action_type', $actionTypeFilter);
        }
        if ($userIdFilter) {
            $query->where('user_id', $userIdFilter);
        }

        $auditLogs = $query->with('user')
                           ->orderByDesc('changed_at')
                           ->paginate(10); 

        return response()->json([
            'data' => $auditLogs->items(), 
            'meta' => [
                'current_page' => $auditLogs->currentPage(),
                'last_page' => $auditLogs->lastPage(),
                'per_page' => $auditLogs->perPage(),
                'total' => $auditLogs->total(),
            ]
        ]);
    }


    public function getTeacherHistory(Request $request)
    {

        $query = AuditLog::where('table_name', 'teachers'); 

        if ($request->filled('teacher_id')) {
            $query->where('record_id', $request->input('teacher_id'));
        }
        if ($request->filled('action_type')) {
            $query->where('action_type', $request->input('action_type'));
        }
        if ($request->filled('user_id')) {
            $query->where('user_id', $request->input('user_id'));
        }

        $teacherHistory = $query->with('user') 
                               ->orderByDesc('changed_at')
                               ->paginate(10); 

        return response()->json([
            'data' => $teacherHistory->items(),
            'meta' => [
                'current_page' => $teacherHistory->currentPage(),
                'last_page' => $teacherHistory->lastPage(),
                'per_page' => $teacherHistory->perPage(),
                'total' => $teacherHistory->total(),
            ]
        ]);
    }
}