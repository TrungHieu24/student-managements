<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Auth\Events\Login;
use Illuminate\Auth\Events\Logout;
use Illuminate\Auth\Events\Failed;
use Illuminate\Support\Facades\Event;
use App\Models\LoginHistory;
use Jenssegers\Agent\Agent;

class LoginHistoryServiceProvider extends ServiceProvider
{

    
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        Event::listen(Login::class, function ($event) {
            $this->recordLoginEvent($event->user, 'success');
        });

        Event::listen(Failed::class, function ($event) {
            if ($event->user) {
                $this->recordLoginEvent($event->user, 'failed');
            }
        });

        Event::listen(Logout::class, function ($event) {
            $this->recordLogoutEvent($event->user);
        });
    }

    /**
     * @param mixed 
     * @param string
     * @return void
     */
    private function recordLoginEvent($user, string $status): void
    {
        $request = request();
        $agent = new Agent();
        $agent->setUserAgent($request->userAgent());

        LoginHistory::create([
            'user_id' => $user->id,
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'device' => $agent->device() ?: 'Unknown',
            'platform' => $agent->platform() ?: 'Unknown',
            'browser' => $agent->browser() ?: 'Unknown',
            'login_at' => now(),
            'status' => $status,
            'additional_info' => json_encode([
                'request_method' => $request->method(),
                'request_url' => $request->fullUrl(),
            ])
        ]);
    }

    /**
     * @param mixed 
     * @return void
     */
    private function recordLogoutEvent($user): void
    {
        $latestLogin = LoginHistory::where('user_id', $user->id)
            ->whereNull('logout_at')
            ->latest('login_at')
            ->first();

        if ($latestLogin) {
            $latestLogin->logout_at = now();
            $latestLogin->save();
        }
    }
}