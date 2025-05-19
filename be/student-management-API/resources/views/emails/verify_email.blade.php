<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <title>Xác nhận tài khoản</title>
</head>
<body>
    <h2>Xin chào {{ $user->name }},</h2>
    <p>Vui lòng bấm vào nút bên dưới để kích hoạt tài khoản của bạn:</p>
    <a href="{{ url('/api/verify-email/'.$token) }}" style="display: inline-block; padding: 10px 20px; background: #28a745; color: #fff; text-decoration: none; border-radius: 5px;">
        Xác nhận tài khoản
    </a>
    <p>Trân trọng,</p>
<p>Đội ngũ hỗ trợ</p>
</body>
</html>
