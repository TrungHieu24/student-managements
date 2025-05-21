<?php

namespace App\Providers;

use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;

class AuthServiceProvider extends ServiceProvider
{
    /**
     * @var array<class-string
     */
    protected $policies = [
        \App\Models\LoginHistory::class => \App\Policies\LoginHistoryPolicy::class,

    ];


    public function boot(): void
    {
        //
    }
}
