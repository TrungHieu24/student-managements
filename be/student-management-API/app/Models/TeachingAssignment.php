<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

use App\Models\Teacher;
use App\Models\ClassModel; 
use App\Models\Subject;

class TeachingAssignment extends Model
{
    use HasFactory; 

    protected $fillable = [
        'teacher_id',
        'class_id',
        'subject_id',
        'school_year',
        'semester',
        'is_homeroom_teacher',
        'weekly_periods',
        'notes',
    ];

    public function teacher()
    {
        return $this->belongsTo(Teacher::class);
    }

    public function class() 
    {
        return $this->belongsTo(ClassModel::class, 'class_id');
        
    }

    public function subject()
    {
        return $this->belongsTo(Subject::class);
    }
}