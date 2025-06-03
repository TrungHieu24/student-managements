<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AuditLog extends Model
{
    use HasFactory;
    public $timestamps = false; 

    const CREATED_AT = 'changed_at';
    protected $fillable = [
        'table_name',
        'record_id',
        'action_type',
        'user_id',
        'old_values',
        'new_values',
        'ip_address',
        'user_agent',
        'changed_at', 
    ];

    protected $casts = [
        'old_values' => 'array',
        'new_values' => 'array',
        'changed_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}