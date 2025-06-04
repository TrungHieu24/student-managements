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
        'record_id' => 'integer',
        'user_id' => 'integer',
    ];

    protected $appends = ['formatted_changed_at'];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function getFormattedChangedAtAttribute()
    {
        return $this->changed_at ? $this->changed_at->format('Y-m-d H:i:s') : null;
    }

    protected function getOldValuesAttribute($value)
    {
        if (is_string($value)) {
            return json_decode($value, true);
        }
        return $value;
    }

    protected function getNewValuesAttribute($value)
    {
        if (is_string($value)) {
            return json_decode($value, true);
        }
        return $value;
    }

    protected function setOldValuesAttribute($value)
    {
        if (is_array($value)) {
            $this->attributes['old_values'] = json_encode($value, JSON_UNESCAPED_UNICODE);
        } else {
            $this->attributes['old_values'] = $value;
        }
    }

    protected function setNewValuesAttribute($value)
    {
        if (is_array($value)) {
            $this->attributes['new_values'] = json_encode($value, JSON_UNESCAPED_UNICODE);
        } else {
            $this->attributes['new_values'] = $value;
        }
    }
}