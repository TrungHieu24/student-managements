<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Score extends Model
{
    protected $fillable = ['student_id', 'subject_name', 'type', 'score'];

    public function student()
    {
        return $this->belongsTo(Student::class, 'student_id');
    }
}
