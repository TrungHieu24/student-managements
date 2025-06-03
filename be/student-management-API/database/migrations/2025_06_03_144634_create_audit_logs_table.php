<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('audit_logs', function (Blueprint $table) {
            $table->bigIncrements('id'); // Tự động tăng, khóa chính
            $table->string('table_name')->comment('Tên bảng bị ảnh hưởng (e.g., students, classes)');
            $table->unsignedInteger('record_id')->comment('ID của bản ghi trong bảng bị ảnh hưởng');
            $table->enum('action_type', ['CREATE', 'UPDATE', 'DELETE'])->comment('Loại hành động');
            $table->foreignId('user_id')->nullable()->constrained('users')->onDelete('set null')->comment('ID của người dùng thực hiện hành động');
            $table->json('old_values')->nullable()->comment('Dữ liệu cũ trước khi thay đổi (JSON)');
            $table->json('new_values')->nullable()->comment('Dữ liệu mới sau khi thay đổi (JSON)');
            $table->timestamp('changed_at')->useCurrent()->comment('Thời điểm hành động xảy ra');
            $table->string('ip_address', 45)->nullable()->comment('Địa chỉ IP của người dùng');
            $table->text('user_agent')->nullable()->comment('Thông tin trình duyệt/ứng dụng');

            // Thêm các chỉ mục để tối ưu truy vấn
            $table->index(['table_name', 'record_id'], 'idx_table_record');
            $table->index('user_id', 'idx_user_id');
            $table->index('changed_at', 'idx_changed_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
    }
};