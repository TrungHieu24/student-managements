<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use App\Models\User; 

class ProfileController extends Controller
{
    /**
     * Lấy thông tin người dùng hiện tại
     */
    public function show(Request $request)
    {

        $user = $request->user();

        
        return response()->json([
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role,
            'avatar' => $user->avatar ? asset($user->avatar) : null,
        ], 200, [], JSON_UNESCAPED_SLASHES);
        
    }
    

    /**
     * Cập nhật thông tin người dùng (chỉ tên)
     */
    public function update(Request $request)
    {
        /** @var \App\Models\User $user */
        $user = Auth::user();

        $validated = $request->validate([
            'name' => 'required|string|max:255',
        ]);

        $user->name = $validated['name'];
        $user->save();

        return response()->json($user, 200);
    }

    /**
     * Tải ảnh đại diện (avatar) lên
     */
    public function uploadAvatar(Request $request)
    {
        $request->validate([
            'avatar' => 'required|image|mimes:jpeg,png,jpg,gif|max:2048',
        ]);

        /** @var \App\Models\User $user */
        $user = Auth::user();

        if (
            $user->avatar &&
            Storage::disk('public')->exists(str_replace('/storage/', '', $user->avatar))
        ) {
            Storage::disk('public')->delete(str_replace('/storage/', '', $user->avatar));
        }

        // Lưu ảnh mới
        $path = $request->file('avatar')->store('avatars', 'public');
        $user->avatar = '/storage/' . $path;
        $user->save();

        return response()->json([
            'message' => 'Tải ảnh lên thành công',
            'avatar' => $user->avatar,
        ]);
    }
}
