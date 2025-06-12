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
     * @var array<int, string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'avatar',
    ];

    /**
     * @var array<int, string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * @var array<string, string>
     */
    protected $casts = [
        'email_verified_at' => 'datetime',
        'password' => 'hashed',
    ];

    /**
     * @var array<int, string>
     */
    protected $appends = ['avatar_url'];

    /**
     * @return mixed
     */
    public function getJWTIdentifier()
    {
        return $this->getKey();
    }

    /**
     * @return array
     */
    public function getJWTCustomClaims()
    {
        return [
            'role' => $this->role, 
        ];
    }

    /**
     * @return \Illuminate\Database\Eloquent\Relations\HasMany
     */
    public function loginHistories()
    {
        return $this->hasMany(LoginHistory::class);
    }

    /**
     * @return bool
     */
    public function isAdmin(): bool
    {
        return $this->role === 'ADMIN';
    }

    /**
     * @param string $permission
     * @return bool
     */
    public function hasPermission(string $permission): bool
    {
        if ($this->isAdmin()) {
            return true;
        }
        switch ($this->role) {
            case 'TEACHER':
                if (in_array($permission, ['view_student_scores', 'update_student_score'])) {
                    return true;
                }
                break;
            case 'USER':
                break;
        }
        return false;
    }

    /**
     * Get the full URL for avatar
     * @return string|null
     */
    public function getAvatarUrlAttribute(): ?string
    {
        if (!$this->avatar) {
            return null;
        }
        
        // Nếu đã là URL đầy đủ thì return luôn
        if (str_starts_with($this->avatar, 'http')) {
            return $this->avatar;
        }
        
        // Tạo URL từ storage path
        return asset('storage/' . $this->avatar);
    }
}