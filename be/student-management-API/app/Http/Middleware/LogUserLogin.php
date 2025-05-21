<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use App\Models\LoginHistory;
use Illuminate\Support\Facades\Auth;
use Jenssegers\Agent\Agent;

class LogUserLogin
{
    /**
     * Handle an incoming request.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \Closure  $next
     * @return mixed
     */
    public function handle(Request $request, Closure $next)
    {
        // Xử lý request
        $response = $next($request);

        // Nếu đăng nhập thành công (status code 200 và có token)
        if ($response->getStatusCode() == 200 && $request->is('api/login') && $request->isMethod('post')) {
            $responseData = json_decode($response->getContent(), true);
            
            // Nếu có access_token trong phản hồi, tức là đăng nhập thành công
            if (isset($responseData['access_token'])) {
                $user = Auth::user() ?: (isset($responseData['user']) ? $responseData['user'] : null);
                
                if ($user) {
                    $agent = new Agent();
                    $agent->setUserAgent($request->userAgent());
                    
                    // Tạo bản ghi lịch sử đăng nhập
                    LoginHistory::create([
                        'user_id' => $user->id,
                        'ip_address' => $request->ip(),
                        'user_agent' => $request->userAgent(),
                        'device' => $agent->device() ?: 'Unknown',
                        'platform' => $agent->platform() ?: 'Unknown',
                        'browser' => $agent->browser() ?: 'Unknown',
                        'login_at' => now(),
                        'status' => 'success',
                    ]);
                }
            }
        }

        return $response;
    }
}