<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use App\Models\User; 

class ProfileController extends Controller
{
    public function show(Request $request)
    {
        $user = $request->user();
        
        $avatarUrl = null;
        if ($user->avatar) {
            if (str_starts_with($user->avatar, 'http')) {
                $avatarUrl = $user->avatar;
            } else {
                $avatarUrl = asset('storage/' . $user->avatar);
            }
        }
        
        return response()->json([
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role,
            'avatar' => $avatarUrl,
        ]);
    }

    public function update(Request $request)
    {
        /** @var \App\Models\User $user */
        $user = Auth::user();

        $validated = $request->validate([
            'name' => 'required|string|max:255',
        ]);

        $user->name = $validated['name'];
        $user->save();

        $avatarUrl = null;
        if ($user->avatar) {
            if (str_starts_with($user->avatar, 'http')) {
                $avatarUrl = $user->avatar;
            } else {
                $avatarUrl = asset('storage/' . $user->avatar);
            }
        }

        return response()->json([
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role,
            'avatar' => $avatarUrl,
        ]);
    }

    public function uploadAvatar(Request $request)
    {
        $request->validate([
            'avatar' => 'required|image|mimes:jpeg,png,jpg,gif|max:2048',
        ]);

        /** @var \App\Models\User $user */
        $user = Auth::user();

        if ($user->avatar) {
            Storage::disk('public')->delete($user->avatar);
        }

        $path = $request->file('avatar')->store('avatars', 'public');
        $user->avatar = $path;
        $user->save();

        return response()->json([
            'message' => 'Tải ảnh lên thành công',
            'avatar' => asset('storage/' . $path),
        ]);
    }

    public function deleteAvatar(Request $request)
    {
        /** @var \App\Models\User $user */
        $user = Auth::user();

        if ($user->avatar) {
            // Delete the avatar file from storage
            Storage::disk('public')->delete($user->avatar);
            
            // Set the avatar field to null in the database
            $user->avatar = null;
            $user->save();

            return response()->json([
                'message' => 'Ảnh đại diện đã được xóa thành công.',
            ]);
        }

        return response()->json([
            'message' => 'Không có ảnh đại diện để xóa.',
        ], 404);
    }
}