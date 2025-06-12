<?php

namespace App\Http\Controllers;

use App\Models\User; // Import model User
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use App\Models\AuditLog;

class UserController extends Controller
{
    /**
     * Display a listing of the users.
     * (ADMIN only)
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function index(Request $request)
    {
        $users = User::paginate(10);
        return response()->json($users);
    }

    /**
     * Store a newly created user in storage.
     * (ADMIN only)
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function store(Request $request)
    {
        try {
            Log::info('User creation request data:', $request->all());
            
            $request->validate([
                'name' => 'required|string|max:255',
                'email' => 'required|string|email|max:255|unique:users',
                'role' => 'required|string|in:ADMIN,USER,TEACHER',
            ]);

            $generatedPassword = Str::random(10);

            DB::beginTransaction();

            $user = User::create([
                'name' => $request->name,
                'email' => $request->email,
                'password' => Hash::make($generatedPassword),
                'role' => $request->role,
                'is_first_login' => true,
            ]);

            // Create audit log entry with generated password
            $auditLog = AuditLog::create([
                'table_name' => 'users',
                'record_id' => $user->id,
                'action_type' => 'CREATE',
                'user_id' => auth()->id(),
                'old_values' => null,
                'new_values' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $user->role,
                    'generated_password' => $generatedPassword,
                    'created_at' => $user->created_at,
                    'updated_at' => $user->updated_at,
                ],
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
            ]);

            DB::commit();

            $user->generated_password = $generatedPassword;

            return response()->json(['message' => 'User created successfully', 'user' => $user], 201);
        } catch (ValidationException $e) {
            DB::rollBack();
            Log::error('Validation error creating user: ' . $e->getMessage());
            return response()->json(['errors' => $e->errors()], 422);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error("Error creating user: " . $e->getMessage() . " at " . $e->getFile() . ":" . $e->getLine());
            Log::error("Stack trace: " . $e->getTraceAsString());
            return response()->json(['message' => 'Error creating user', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * Display the specified user.
     * (ADMIN only)
     *
     * @param  \App\Models\User  $user
     * @return \Illuminate\Http\JsonResponse
     */
    public function show(User $user)
    {
        return response()->json($user);
    }

    /**
     * Update the specified user in storage.
     * (ADMIN only)
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \App\Models\User  $user
     * @return \Illuminate\Http\JsonResponse
     */
    public function update(Request $request, User $user)
    {
        try {
            $request->validate([
                'name' => 'sometimes|required|string|max:255',
                'email' => 'sometimes|required|string|email|max:255|unique:users,email,' . $user->id,
                'password' => 'sometimes|nullable|string|min:8', // Mật khẩu có thể không bắt buộc khi update
                'role' => 'sometimes|required|string|in:ADMIN,USER,TEACHER',
            ]);

            $user->name = $request->input('name', $user->name);
            $user->email = $request->input('email', $user->email);
            $user->role = $request->input('role', $user->role);

            if ($request->filled('password')) {
                $user->password = Hash::make($request->password);
            }
            
            $user->save();

            return response()->json(['message' => 'User updated successfully', 'user' => $user]);
        } catch (ValidationException $e) {
            return response()->json(['errors' => $e->errors()], 422);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Error updating user', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * Remove the specified user from storage.
     * (ADMIN only)
     *
     * @param  \App\Models\User  $user
     * @return \Illuminate\Http\JsonResponse
     */
    public function destroy(User $user)
    {
        try {
            $user->delete();
            return response()->json(['message' => 'User deleted successfully'], 200);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Error deleting user', 'error' => $e->getMessage()], 500);
        }
    }
}