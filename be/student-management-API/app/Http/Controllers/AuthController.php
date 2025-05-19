<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException; // Import ValidationException
use Illuminate\Support\Str; // Import Str if needed for register, though not used in this version
use Illuminate\Support\Facades\DB; // Import DB if transactions are used elsewhere

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
            return response()->json(['message' => 'Email hoặc mật khẩu không đúng'], 401);
        }

        // Tạo token
        $token = $user->createToken('authToken')->plainTextToken;

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
        $request->user()->tokens()->delete();
        return response()->json(['message' => 'Đăng xuất thành công!']);
    }
}
