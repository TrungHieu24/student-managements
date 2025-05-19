<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory; 
use Illuminate\Database\Eloquent\Model; 
use App\Models\Score;
use App\Models\User;

class Student extends BaseModel
{

    use HasFactory;

    protected $table = 'students';
    protected $fillable = [
        'name',
        'email',
        'class_id',
        'gender',   
        'birthday', 
        'phone',    
        'address', 
    ];
     protected $casts = [
         'birthday' => 'date',
     ];


    public function class()
    {
        return $this->belongsTo(\App\Models\ClassModel::class, 'class_id');
    }

    public function scores()
   {
    return $this->hasMany(Score::class, 'student_id');
   }

   public function user()
   {
       return $this->belongsTo(User::class);
   }

}