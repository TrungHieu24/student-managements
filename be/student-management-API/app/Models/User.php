<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Tymon\JWTAuth\Contracts\JWTSubject;

class User extends Authenticatable implements JWTSubject
{
    use HasApiTokens, HasFactory, Notifiable;   

    /**
     * Lấy định danh chính của người dùng cho JWT.
     */
    public function getJWTIdentifier()
    {
        return $this->getKey(); 
    }   

    /**
     * Trả về các thông tin bổ sung sẽ được nhúng vào JWT.
     */
    public function getJWTCustomClaims()
    {
        return [
            'role' => $this->role, // thêm role vào payload
        ];
    }

    /**
     * Các thuộc tính có thể gán hàng loạt.
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
    ];

    /**
     * Các thuộc tính ẩn khi chuyển về JSON.
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Các thuộc tính cần ép kiểu.
     */
    protected $casts = [
        'email_verified_at' => 'datetime',
        'password' => 'hashed',
    ];
}
