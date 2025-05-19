<?php

namespace App\Services;

use App\Models\Student;

class StudentService
{
    public function getAll()
    {
        return Student::with('class')->get();
    }

    public function getById($id)
    {
        return Student::with('class')->find($id);
    }

    public function create($data)
    {
        return Student::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'class_id' => $data['class_id'],
            'gender' => $data['gender'] ?? null,
            'birthday' => $data['birthday'] ?? null,
            'phone' => $data['phone'] ?? null,
            'address' => $data['address'] ?? null,
        ]);
    }

    public function update($id, $data)
    {
        $student = Student::find($id);
        if (!$student) {
            return null;
        }

        $student->name = $data['name'];
        $student->email = $data['email'];
        $student->class_id = $data['class_id'];
        $student->gender = $data['gender'] ?? null;
        $student->birthday = $data['birthday'] ?? null;
        $student->phone = $data['phone'] ?? null;
        $student->address = $data['address'] ?? null;
        $student->save();

        return $student;
    }

    public function delete($id)
    {
        return Student::destroy($id);
    }
}
