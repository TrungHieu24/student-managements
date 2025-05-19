<?php

namespace App\Http\Controllers;

use App\Services\StudentService;
use App\Models\Student;
use App\Models\User;
use App\Models\ClassModel;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str; 
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

class StudentController extends BaseController
{
    protected $studentService;

    public function __construct(StudentService $studentService)
    {
        $this->studentService = $studentService;
    }

    public function index()
    {
        return $this->sendResponse($this->studentService->getAll(), "Lấy danh sách sinh viên thành công.");
    }

    public function show($id)
    {
        $student = $this->studentService->getById($id);
        if (!$student) {
            return $this->sendError("Sinh viên không tồn tại.", 404);
        }
        return $this->sendResponse($student, "Lấy thông tin sinh viên thành công.");
    }

 public function store(Request $request)
    {
        $validatedData = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users,email',
            'phone' => 'nullable|string|max:20',
            'gender' => 'required|in:Nam,Nữ,Khác',
            'birthday' => 'nullable|date',
            'address' => 'nullable|string|max:255',
            'class_id' => 'required|exists:classes,id',
        ]);

        DB::beginTransaction();

        try {
            // Generate random password
            $generatedPassword = Str::random(10);

            // Create user account
            $user = User::create([
                'name' => $validatedData['name'],
                'email' => $validatedData['email'],
                'password' => Hash::make($generatedPassword),
                'role' => 'USER',
                'is_first_login' => true,
            ]);

            // Create student record
            $student = Student::create([
                'user_id' => $user->id,
                'name' => $validatedData['name'],
                'email' => $validatedData['email'],
                'phone' => $validatedData['phone'] ?? null,
                'gender' => $validatedData['gender'],
                'birthday' => $validatedData['birthday'] ?? null,
                'address' => $validatedData['address'] ?? null,
                'class_id' => $validatedData['class_id'],
            ]);

            DB::commit();

            // Load relationships
            $student->load(['user', 'class']);
            
            // Include the generated password in the response
            $student->generated_password = $generatedPassword;

            return response()->json($student, 201);

        } catch (ValidationException $e) {
            DB::rollBack();
            Log::error('Validation error creating student and user: ' . $e->getMessage());
            return response()->json([
                'message' => 'Dữ liệu nhập không hợp lệ.',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error("Error creating student and user: " . $e->getMessage() . " at " . $e->getFile() . ":" . $e->getLine());
            return response()->json([
                'message' => 'Không thể thêm học sinh và tài khoản.',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function update(Request $request, $id)
    {
        $request->validate([
            'name' => 'required|string',
            'email' => 'required|email|unique:students,email,' . $id,
            'class_id' => 'required|exists:classes,id',
            'gender' => 'nullable|string',
            'birthday' => 'nullable|date',
            'phone' => 'nullable|string',
            'address' => 'nullable|string',
        ]);

        $student = $this->studentService->update($id, $request->all());

        if (!$student) {
            return $this->sendError("Sinh viên không tồn tại.", 404);
        }

        return $this->sendResponse($student, "Cập nhật sinh viên thành công.");
    }

    public function destroy($id)
    {
        if (!$this->studentService->delete($id)) {
            return $this->sendError("Sinh viên không tồn tại.", 404);
        }

        return $this->sendResponse([], "Xóa sinh viên thành công.");
    }
}
