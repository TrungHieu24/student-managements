<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
public function up()
{
    Schema::table('scores', function (Blueprint $table) {
        $table->integer('entry_sequence')->default(1)->after('type'); 
    });
}

public function down()
{
    Schema::table('scores', function (Blueprint $table) {
        $table->dropColumn('entry_sequence');
    });
}
};
