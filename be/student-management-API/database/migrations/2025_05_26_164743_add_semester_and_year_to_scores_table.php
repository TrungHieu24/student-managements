<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB; // Thêm dòng này

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('scores', function (Blueprint $table) {
            // Thêm cột semester
            $table->integer('semester')->nullable()->after('type'); 
        });

        DB::table('scores')->whereNull('semester')->update(['semester' => 1]);
    }

    public function down(): void
    {
        Schema::table('scores', function (Blueprint $table) {
            $table->dropColumn('semester');
        });
    }
};