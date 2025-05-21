<?php

namespace App\Policies;

use App\Models\LoginHistory;
use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class LoginHistoryPolicy
{
    use HandlesAuthorization;

    /**
     * Xác định xem người dùng có thể xem danh sách lịch sử đăng nhập không.
     *
     * @param  \App\Models\User  $user
     * @return \Illuminate\Auth\Access\Response|bool
     */
    public function viewAny(User $user)
    {
        // Chỉ admin hoặc người dùng có quyền đặc biệt mới có thể xem tất cả lịch sử
        return true;
    }

    /**
     * Xác định xem người dùng có thể xem chi tiết lịch sử đăng nhập không.
     *
     * @param  \App\Models\User  $user
     * @param  \App\Models\LoginHistory  $loginHistory
     * @return \Illuminate\Auth\Access\Response|bool
     */
    public function view(User $user, LoginHistory $loginHistory)
    {
        // Người dùng chỉ có thể xem lịch sử đăng nhập của chính họ
        // hoặc là admin/người có quyền đặc biệt
        return $user->id === $loginHistory->user_id ||
               $user->isAdmin() || 
               $user->hasPermission('view_login_history');
    }

    /**
     * Xác định xem người dùng có thể xóa lịch sử đăng nhập không.
     *
     * @param  \App\Models\User  $user
     * @param  \App\Models\LoginHistory  $loginHistory
     * @return \Illuminate\Auth\Access\Response|bool
     */
    public function delete(User $user, LoginHistory $loginHistory)
    {
        // Chỉ admin mới có thể xóa lịch sử
        return $user->isAdmin() || $user->hasPermission('delete_login_history');
    }

    /**
     * Xác định xem người dùng có thể xuất dữ liệu lịch sử đăng nhập không.
     *
     * @param  \App\Models\User  $user
     * @return \Illuminate\Auth\Access\Response|bool
     */
    public function export(User $user)
    {
        // Chỉ admin hoặc người dùng có quyền đặc biệt mới có thể xuất dữ liệu
        return $user->isAdmin() || $user->hasPermission('export_login_history');
    }

    /**
     * Xác định xem người dùng có thể xóa nhiều bản ghi lịch sử đăng nhập cùng lúc không.
     *
     * @param  \App\Models\User  $user
     * @return \Illuminate\Auth\Access\Response|bool
     */
    public function bulkDelete(User $user)
    {
        // Chỉ admin mới có thể xóa nhiều bản ghi cùng lúc
        return $user->isAdmin() || $user->hasPermission('delete_login_history');
    }
}