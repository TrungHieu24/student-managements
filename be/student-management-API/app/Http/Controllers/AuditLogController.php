<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\AuditLog;
use Illuminate\Support\Facades\Log;

class AuditLogController extends Controller
{
    public function index(Request $request)
    {
        try {
            $tableNameFilter = $request->input('table_name');
            $recordIdFilter = $request->input('record_id');
            $actionTypeFilter = $request->input('action_type');
            $userIdFilter = $request->input('user_id');
            $perPage = $request->input('per_page', 10);

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
                               ->orderBy('changed_at', 'desc')
                               ->paginate($perPage);

            // Simplified transformation
            $transformedItems = $auditLogs->getCollection()->map(function ($item) {
                return [
                    'id' => $item->id,
                    'table_name' => $item->table_name,
                    'record_id' => $item->record_id,
                    'action_type' => $item->action_type,
                    'user_id' => $item->user_id,
                    'old_values' => $this->parseJsonField($item->old_values),
                    'new_values' => $this->parseJsonField($item->new_values),
                    'ip_address' => $item->ip_address,
                    'user_agent' => $item->user_agent,
                    'changed_at' => $item->changed_at ? $item->changed_at->format('Y-m-d H:i:s') : null,
                    'user' => $item->user ? [
                        'id' => $item->user->id,
                        'name' => $item->user->name,
                        'email' => $item->user->email,
                        'role' => $item->user->role ?? null
                    ] : null
                ];
            });

            return response()->json([
                'data' => $transformedItems,
                'meta' => [
                    'current_page' => $auditLogs->currentPage(),
                    'last_page' => $auditLogs->lastPage(),
                    'per_page' => $auditLogs->perPage(),
                    'total' => $auditLogs->total(),
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Error in audit logs index: ' . $e->getMessage());
            Log::error($e->getTraceAsString());
            
            return response()->json([
                'message' => 'Có lỗi xảy ra khi tải lịch sử',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error'
            ], 500);
        }
    }

    public function getTeacherHistory(Request $request)
    {
        try {
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
                                   ->orderBy('changed_at', 'desc')
                                   ->paginate(10); 

            $transformedItems = $teacherHistory->getCollection()->map(function ($item) {
                return [
                    'id' => $item->id,
                    'table_name' => $item->table_name,
                    'record_id' => $item->record_id,
                    'action_type' => $item->action_type,
                    'user_id' => $item->user_id,
                    'old_values' => $this->parseJsonField($item->old_values),
                    'new_values' => $this->parseJsonField($item->new_values),
                    'ip_address' => $item->ip_address,
                    'user_agent' => $item->user_agent,
                    'changed_at' => $item->changed_at ? $item->changed_at->format('Y-m-d H:i:s') : null,
                    'user' => $item->user ? [
                        'id' => $item->user->id,
                        'name' => $item->user->name,
                        'email' => $item->user->email,
                        'role' => $item->user->role ?? null
                    ] : null
                ];
            });

            return response()->json([
                'data' => $transformedItems,
                'meta' => [
                    'current_page' => $teacherHistory->currentPage(),
                    'last_page' => $teacherHistory->lastPage(),
                    'per_page' => $teacherHistory->perPage(),
                    'total' => $teacherHistory->total(),
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Error in teacher history: ' . $e->getMessage());
            return response()->json([
                'message' => 'Có lỗi xảy ra khi tải lịch sử giáo viên',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error'
            ], 500);
        }
    }

    public function getUserHistory(Request $request)
    {
        try {
            $query = AuditLog::where('table_name', 'users');

            if ($request->filled('record_id')) {
                $query->where('record_id', $request->input('record_id'));
            }
            if ($request->filled('action_type')) {
                $query->where('action_type', $request->input('action_type'));
            }
            if ($request->filled('user_id')) {
                $query->where('user_id', $request->input('user_id'));
            }

            $perPage = $request->input('per_page', 10);
            $userHistory = $query->with('user')
                                ->orderBy('changed_at', 'desc')
                                ->paginate($perPage);

            $transformedItems = $userHistory->getCollection()->map(function ($item) {
                return [
                    'id' => $item->id,
                    'table_name' => $item->table_name,
                    'record_id' => $item->record_id,
                    'action_type' => $item->action_type,
                    'user_id' => $item->user_id,
                    'old_values' => $this->parseJsonField($item->old_values),
                    'new_values' => $this->parseJsonField($item->new_values),
                    'ip_address' => $item->ip_address,
                    'user_agent' => $item->user_agent,
                    'changed_at' => $item->changed_at ? $item->changed_at->format('Y-m-d H:i:s') : null,
                    'user' => $item->user ? [
                        'id' => $item->user->id,
                        'name' => $item->user->name,
                        'email' => $item->user->email,
                        'role' => $item->user->role ?? null
                    ] : null
                ];
            });

            return response()->json([
                'data' => $transformedItems,
                'meta' => [
                    'current_page' => $userHistory->currentPage(),
                    'last_page' => $userHistory->lastPage(),
                    'per_page' => $userHistory->perPage(),
                    'total' => $userHistory->total(),
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Error in user history: ' . $e->getMessage());
            return response()->json([
                'message' => 'Có lỗi xảy ra khi tải lịch sử người dùng',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error'
            ], 500);
        }
    }

    public function getClassHistory(Request $request)
    {
        try {
            $query = AuditLog::where('table_name', 'classes');

            if ($request->filled('record_id')) {
                $query->where('record_id', $request->input('record_id'));
            }
            if ($request->filled('action_type')) {
                $query->where('action_type', $request->input('action_type'));
            }
            if ($request->filled('user_id')) {
                $query->where('user_id', $request->input('user_id'));
            }

            $perPage = $request->input('per_page', 10);
            $classHistory = $query->with('user')
                                ->orderBy('changed_at', 'desc')
                                ->paginate($perPage);

            $transformedItems = $classHistory->getCollection()->map(function ($item) {
                $oldValues = $this->parseJsonField($item->old_values);
                $newValues = $this->parseJsonField($item->new_values);

                return [
                    'id' => $item->id,
                    'record_id' => $item->record_id,
                    'action_type' => $item->action_type,
                    'created_at' => $item->changed_at ? $item->changed_at->format('Y-m-d H:i:s') : null,
                    'user' => $item->user ? [
                        'id' => $item->user->id,
                        'name' => $item->user->name,
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
                    'current_page' => $classHistory->currentPage(),
                    'last_page' => $classHistory->lastPage(),
                    'per_page' => $classHistory->perPage(),
                    'total' => $classHistory->total(),
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Error in class history: ' . $e->getMessage());
            Log::error($e->getTraceAsString());
            return response()->json([
                'message' => 'Có lỗi xảy ra khi tải lịch sử lớp học',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error'
            ], 500);
        }
    }

    public function getSubjectHistory(Request $request)
    {
        try {
            $query = AuditLog::where('table_name', 'subjects');

            if ($request->filled('record_id')) {
                $query->where('record_id', $request->input('record_id'));
            }
            if ($request->filled('action_type')) {
                $query->where('action_type', $request->input('action_type'));
            }
            if ($request->filled('user_id')) {
                $query->where('user_id', $request->input('user_id'));
            }

            $perPage = $request->input('per_page', 10);
            $subjectHistory = $query->with('user')
                                ->orderBy('changed_at', 'desc')
                                ->paginate($perPage);

            $transformedItems = $subjectHistory->getCollection()->map(function ($item) {
                $oldValues = $this->parseJsonField($item->old_values);
                $newValues = $this->parseJsonField($item->new_values);

                return [
                    'id' => $item->id,
                    'record_id' => $item->record_id,
                    'action_type' => $item->action_type,
                    'created_at' => $item->changed_at ? $item->changed_at->format('Y-m-d H:i:s') : null,
                    'user' => $item->user ? [
                        'id' => $item->user->id,
                        'name' => $item->user->name,
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
            Log::error('Error in subject history: ' . $e->getMessage());
            Log::error($e->getTraceAsString());
            return response()->json([
                'message' => 'Có lỗi xảy ra khi tải lịch sử môn học',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error'
            ], 500);
        }
    }

    /**
     * Helper method to parse JSON fields safely
     */
    private function parseJsonField($value)
    {
        if (is_string($value)) {
            try {
                $decoded = json_decode($value, true);
                return $decoded === null ? $value : $decoded;
            } catch (\Exception $e) {
                Log::warning('Failed to decode JSON field: ' . $e->getMessage());
                return $value;
            }
        }
        return $value;
    }
}