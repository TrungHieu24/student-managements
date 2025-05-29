<?php

namespace App\Http\Controllers;

use App\Models\LoginHistory;
use App\Models\User; // Vẫn cần cái này nếu bạn định dùng để lọc/hiển thị người dùng
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Response;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class LoginHistoryController extends Controller
{
    /**
     * @param Request
     * @return \Illuminate\Http\JsonResponse
     */
    public function index(Request $request)
    {
        // Đã xóa: $this->authorize('viewAny', LoginHistory::class);

        $query = LoginHistory::query()
            ->with('user')
            ->orderBy('login_at', 'desc');

        if ($request->has('user_id') && $request->user_id) {
            $query->where('user_id', $request->user_id);
        }

        if ($request->has('ip_address') && $request->ip_address) {
            $query->where('ip_address', 'LIKE', '%' . $request->ip_address . '%');
        }

        if ($request->has('status') && $request->status) {
            $query->where('status', $request->status);
        }

        if ($request->has('date_from') && $request->date_from) {
            $query->whereDate('login_at', '>=', $request->date_from);
        }

        if ($request->has('date_to') && $request->date_to) {
            $query->whereDate('login_at', '<=', $request->date_to);
        }

        $perPage = $request->input('per_page', 20);
        $histories = $query->paginate($perPage);

        return response()->json([
            'data' => $histories->items(),
            'current_page' => $histories->currentPage(),
            'per_page' => $histories->perPage(),
            'total' => $histories->total(),
            'last_page' => $histories->lastPage(),
        ]);
    }

    /**
     * @param LoginHistory
     * @return \Illuminate\Http\JsonResponse
     */
    public function show(LoginHistory $loginHistory)
    {

        $loginHistory->load('user');

        return response()->json($loginHistory);
    }

    /**
     * @param LoginHistory
     * @return \Illuminate\Http\JsonResponse
     */
    public function destroy(LoginHistory $loginHistory)
    {
        $this->authorize('delete', $loginHistory);

        $loginHistory->delete();

        return response()->json(['message' => 'Bản ghi lịch sử đăng nhập đã được xóa thành công.']);
    }

    /**
     * @param Request
     * @return \Symfony\Component\HttpFoundation\BinaryFileResponse
     */
    public function export(Request $request)
    {
        $this->authorize('export', LoginHistory::class);

        $query = LoginHistory::query()
            ->with('user')
            ->orderBy('login_at', 'desc');

        if ($request->has('user_id') && $request->user_id) {
            $query->where('user_id', $request->user_id);
        }

        if ($request->has('ip_address') && $request->ip_address) {
            $query->where('ip_address', 'LIKE', '%' . $request->ip_address . '%');
        }

        if ($request->has('status') && $request->status) {
            $query->where('status', $request->status);
        }

        if ($request->has('date_from') && $request->date_from) {
            $query->whereDate('login_at', '>=', $request->date_from);
        }

        if ($request->has('date_to') && $request->date_to) {
            $query->whereDate('login_at', '<=', $request->date_to);
        }

        $histories = $query->get();

        $filename = 'login_history_' . date('Y-m-d_His') . '.csv';

        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
        ];

        $callback = function () use ($histories) {
            $file = fopen('php://output', 'w');

            fputcsv($file, [
                'ID',
                'Người dùng',
                'Email',
                'Địa chỉ IP',
                'Thiết bị',
                'Trình duyệt',
                'Thời gian đăng nhập',
                'Thời gian đăng xuất',
                'Trạng thái'
            ]);

            foreach ($histories as $history) {
                fputcsv($file, [
                    $history->id,
                    $history->user->name ?? 'N/A',
                    $history->user->email ?? 'N/A',
                    $history->ip_address,
                    $history->device,
                    $history->browser,
                    $history->login_at->format('Y-m-d H:i:s'),
                    $history->logout_at ? $history->logout_at->format('Y-m-d H:i:s') : 'N/A',
                    $history->status
                ]);
            }

            fclose($file);
        };

        return Response::stream($callback, 200, $headers);
    }

    /**
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function bulkDelete(Request $request)
    {
        $this->authorize('bulkDelete', LoginHistory::class);

        $validated = $request->validate([
            'selected' => 'required|array',
            'selected.*' => 'exists:login_history,id',
        ]);

        LoginHistory::whereIn('id', $validated['selected'])->delete();

        return response()->json(['message' => 'Các bản ghi đã chọn đã được xóa thành công.']);
    }
}