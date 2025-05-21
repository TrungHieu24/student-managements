<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\LoginHistory;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;
use Jenssegers\Agent\Agent;

class AuthController extends Controller
{
    // Đăng ký
    public function register(Request $request)
    {
        $request->validate([
            'name' => 'required',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|min:6',
            'role' => 'required|in:ADMIN,TEACHER,USER', 
        ]);

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'role' => $request->role ?? 'USER',
            'is_first_login' => true, 
        ]);
         return response()->json(['message' => 'Đăng ký thành công! Bạn có thể đăng nhập ngay.']);
    }

    // Đăng nhập
    public function login(Request $request)
    {
        $credentials = $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        // Tìm người dùng
        $user = User::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            // Ghi lại lịch sử đăng nhập thất bại nếu người dùng tồn tại
            if ($user) {
                $this->recordLoginHistory($request, $user, 'failed');
            }
            return response()->json(['message' => 'Email hoặc mật khẩu không đúng'], 401);
        }

        // Tạo token
        $token = $user->createToken('authToken')->plainTextToken;

        // Ghi lại lịch sử đăng nhập thành công
        $this->recordLoginHistory($request, $user, 'success');

        // Lấy trạng thái đăng nhập lần đầu
        $isFirstLogin = (bool) $user->is_first_login; 

        return response()->json([
            'token' => $token,
            'user' => [
                'id'    => $user->id,
                'name'  => $user->name,
                'email' => $user->email,
                'role'  => $user->role,
                'is_first_login' => $isFirstLogin,
            ]
        ]);
    }

    // Đổi mật khẩu
    public function changePassword(Request $request)
    {
        $user = $request->user(); 

        $rules = [
            'new_password' => [
                'required',
                'string',
                'min:8', 
                'confirmed',
                'regex:/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/', 
            ],
        ];

        if (!$user->is_first_login) {
            $rules['current_password'] = 'required';
        }

        $request->validate($rules);

        if (!$user->is_first_login && !Hash::check($request->current_password, $user->password)) {
            return response()->json(['message' => 'Mật khẩu hiện tại không đúng'], 403);
        }
        if (!$user->is_first_login && Hash::check($request->new_password, $user->password)) {
             return response()->json(['message' => 'Mật khẩu mới không được trùng với mật khẩu hiện tại'], 422);
        }

        // Cập nhật mật khẩu mới
        $user->password = Hash::make($request->new_password);
        $user->is_first_login = false; 
        $user->save();

        return response()->json(['message' => 'Đổi mật khẩu thành công']);
    }

    // Đăng xuất
    public function logout(Request $request)
    {
        // Cập nhật thời gian đăng xuất cho bản ghi đăng nhập gần nhất
        $this->recordLogout($request->user());
        
        // Xóa tất cả token của người dùng
        $request->user()->tokens()->delete();
        
        return response()->json(['message' => 'Đăng xuất thành công!']);
    }

    /**
     * Ghi lại lịch sử đăng nhập của người dùng
     *
     * @param Request $request
     * @param User $user
     * @param string $status
     * @return void
     */
    private function recordLoginHistory(Request $request, User $user, string $status): void
    {
        try {
            // Sử dụng Agent để phân tích user-agent
            $agent = new Agent();
            $agent->setUserAgent($request->userAgent());

            // Lấy thông tin thiết bị và trình duyệt
            $device = $agent->device() ?: 'Unknown';
            $platform = $agent->platform() ?: 'Unknown';
            $browser = $agent->browser() ?: 'Unknown';

            // Lưu thông tin đăng nhập
            LoginHistory::create([
                'user_id' => $user->id,
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
                'device' => $device,
                'platform' => $platform,
                'browser' => $browser,
                'login_at' => now(),
                'status' => $status,
                'additional_info' => json_encode([
                    'request_method' => $request->method(),
                    'request_url' => $request->fullUrl(),
                ])
            ]);
        } catch (\Exception $e) {
            // Ghi log lỗi, nhưng không làm gián đoạn quá trình đăng nhập
            Log::error('Không thể ghi lịch sử đăng nhập: ' . $e->getMessage(), [
                'user_id' => $user->id,
                'trace' => $e->getTraceAsString()
            ]);
        }
    }

    /**
     * Cập nhật thời gian đăng xuất cho bản ghi đăng nhập gần nhất
     *
     * @param User $user
     * @return void
     */
    private function recordLogout(User $user): void
    {
        try {
            // Tìm bản ghi đăng nhập gần nhất chưa có thời gian đăng xuất
            $latestLogin = LoginHistory::where('user_id', $user->id)
                ->whereNull('logout_at')
                ->where('status', 'success')
                ->latest('login_at')
                ->first();

            if ($latestLogin) {
                $latestLogin->logout_at = now();
                $latestLogin->save();
            }
        } catch (\Exception $e) {
            // Ghi log lỗi, nhưng không làm gián đoạn quá trình đăng xuất
            Log::error('Không thể cập nhật thời gian đăng xuất: ' . $e->getMessage(), [
                'user_id' => $user->id,
                'trace' => $e->getTraceAsString()
            ]);
        }
    }
}