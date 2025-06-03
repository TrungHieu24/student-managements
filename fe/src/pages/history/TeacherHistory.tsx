import React, { useState, useEffect } from 'react';
import axios from 'axios';

// Add axios interceptor to include auth token
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

interface AuditLogEntry {
  id: number;
  table_name: string;
  record_id: number;
  action_type: 'CREATE' | 'UPDATE' | 'DELETE';
  user_id: number | null;
  old_values: any | null;
  new_values: any | null;
  changed_at: string;
  ip_address: string | null;
  user_agent: string | null;
  user?: {
    id: number;
    name: string;
  };
}

interface Meta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

const API_BASE_URL = 'http://localhost:8000/api';

const TeacherHistory: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [lastPage, setLastPage] = useState<number>(1);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');
  const [selectedActionType, setSelectedActionType] = useState<string>('');
  const [subjects, setSubjects] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);

  const parseJsonData = (data: any) => {
    if (!data) return null;
    if (typeof data === 'object') return data;
    try {
      return JSON.parse(data);
    } catch (e) {
      console.error('Error parsing JSON:', e);
      return data;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  const formatJsonWithDates = (data: any) => {
    if (!data) return null;
    const parsedData = parseJsonData(data);
    if (!parsedData) return null;

    const formattedData = { ...parsedData };

    // Format dates
    if (formattedData.created_at) {
      formattedData.created_at = formatDate(formattedData.created_at);
    }
    if (formattedData.updated_at) {
      formattedData.updated_at = formatDate(formattedData.updated_at);
    }
    if (formattedData.birthday) {
      formattedData.birthday = new Date(formattedData.birthday).toLocaleDateString('vi-VN');
    }

    // Format subjects if they exist
    if (formattedData.subjects) {
      formattedData.subjects = formattedData.subjects.map((subjectId: number) => {
        const subject = subjects.find(s => s.id === subjectId);
        return subject ? subject.name : subjectId;
      });
    }

    // Format teaching assignments if they exist
    if (formattedData.teaching_assignments) {
      formattedData.teaching_assignments = formattedData.teaching_assignments.map((assignment: any) => {
        const formattedAssignment = { ...assignment };
        const classObj = classes.find(c => c.id === assignment.class_id);
        const subjectObj = subjects.find(s => s.id === assignment.subject_id);
        
        if (classObj) {
          formattedAssignment.class_name = classObj.name;
        }
        if (subjectObj) {
          formattedAssignment.subject_name = subjectObj.name;
        }
        
        return formattedAssignment;
      });
    }

    const jsonString = JSON.stringify(formattedData, null, 2);
    return jsonString.replace(/\\u[\dA-F]{4}/gi, (match) => {
      return String.fromCharCode(parseInt(match.replace(/\\u/g, ''), 16));
    });
  };

  const fetchTeacherHistory = async (page: number = 1) => {
    console.log('Fetching history with params:', { page, teacher_id: selectedTeacherId, action_type: selectedActionType }); // Debug log
    setLoading(true);
    setError(null);
    try {
      const params = {
        page: page,
        teacher_id: selectedTeacherId || undefined,
        action_type: selectedActionType || undefined,
      };

      const response = await axios.get(`${API_BASE_URL}/teacher-history`, { params });
      console.log('API Response:', response.data); // Debug log
      setLogs(response.data.data);
      setLastPage(response.data.meta.last_page);
      setCurrentPage(response.data.meta.current_page);
    } catch (err: any) {
      console.error("Error fetching teacher history:", err); // Debug log
      let errorMessage = "Không thể tải lịch sử giáo viên. Vui lòng thử lại.";
      if (err.response) {
        if (err.response.status === 401) {
          errorMessage = "Bạn không có quyền truy cập. Vui lòng đăng nhập.";
        } else if (err.response.data && err.response.data.message) {
          errorMessage = `Lỗi từ server: ${err.response.data.message}`;
        } else {
          errorMessage = `Lỗi API: Mã trạng thái ${err.response.status}`;
        }
      } else if (err.request) {
        errorMessage = "Không nhận được phản hồi từ server. Vui lòng kiểm tra kết nối mạng hoặc URL API.";
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
      console.log('Current logs state:', logs); // Debug log
    }
  };

  useEffect(() => {
    console.log('useEffect triggered, current page:', currentPage); // Debug log
    fetchTeacherHistory(currentPage);
  }, [currentPage]); // Remove filter dependencies, only depend on currentPage

  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && newPage <= lastPage) {
      setCurrentPage(newPage);
    }
  };

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1); // Reset to first page when applying new filters
    fetchTeacherHistory(1); // Fetch immediately with new filters
  };

  const clearFilters = () => {
    setSelectedTeacherId('');
    setSelectedActionType('');
    setCurrentPage(1); // Reset to first page when clearing filters
    fetchTeacherHistory(1); // Fetch immediately after clearing filters
  };

  // Styles
  const containerStyle: React.CSSProperties = {
    padding: '20px',
    minHeight: '100vh',
    fontFamily: 'Inter, sans-serif',
    WebkitFontSmoothing: 'antialiased',
    MozOsxFontSmoothing: 'grayscale',
    backgroundColor: '#171821', // Dark background as requested
    color: '#ffffff', // Default text color for the whole container
  };

  const headingStyle: React.CSSProperties = {
    fontSize: '2rem',
    fontWeight: 'bold',
    marginBottom: '20px',
    textAlign: 'center',
    color: '#ffffff', // White heading color
  };

  const formStyle: React.CSSProperties = {
    padding: '15px',
    borderRadius: '8px',
    marginBottom: '20px',
    border: '1px solid #333', // Darker border
    backgroundColor: '#22232b', // Darker form background
    boxShadow: '0 2px 4px rgba(0,0,0,0.5)', // Darker shadow
  };

  const formGridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '15px',
    alignItems: 'flex-end',
  };

  const formFieldStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '0.9rem',
    fontWeight: 'normal',
    marginBottom: '5px',
    color: '#ffffff', // White label color
  };

  const inputStyle: React.CSSProperties = {
    display: 'block',
    width: '100%',
    padding: '8px',
    border: '1px solid #555', // Darker border
    borderRadius: '4px',
    boxShadow: 'none',
    outline: 'none',
    fontSize: '0.9rem',
    backgroundColor: '#2a2b34', // Dark input background
    color: '#ffffff', // White text
  };

  const selectStyle: React.CSSProperties = {
    ...inputStyle,
    backgroundColor: '#2a2b34', // Dark select background
    color: '#ffffff', // White text
  };

  const buttonGroupStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'row',
    gap: '10px',
    marginTop: '0',
    justifyContent: 'flex-end',
  };

  const buttonBaseStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '8px 15px',
    border: '1px solid #555', // Darker border
    fontSize: '0.9rem',
    fontWeight: 'normal',
    borderRadius: '4px',
    boxShadow: 'none',
    cursor: 'pointer',
    transition: 'background-color 0.15s ease-in-out, border-color 0.15s ease-in-out',
    color: '#ffffff', // White text
  };

  const primaryButtonStyle: React.CSSProperties = {
    ...buttonBaseStyle,
    backgroundColor: '#1a73e8', // Blue for primary
    borderColor: '#1a73e8',
  };

  const secondaryButtonStyle: React.CSSProperties = {
    ...buttonBaseStyle,
    backgroundColor: '#2a2b34', // Dark background for secondary
    borderColor: '#555', // Darker border
  };

  const tableContainerStyle: React.CSSProperties = {
    overflowX: 'auto',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.5)', // Darker shadow
    border: '1px solid #333', // Darker border
    backgroundColor: '#22232b', // Darker table background
  };

  const tableStyle: React.CSSProperties = {
    width: '100%',
    borderCollapse: 'collapse',
    tableLayout: 'auto',
  };

  const thStyle: React.CSSProperties = {
    padding: '10px 15px',
    textAlign: 'left',
    fontSize: '0.75rem',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    backgroundColor: '#33343d', // Darker header background
    borderBottom: '1px solid #555', // Darker border
    color: '#ffffff', // White header text
  };

  const tdStyle: React.CSSProperties = {
    padding: '10px 15px',
    fontSize: '0.85rem',
    borderBottom: '1px solid #4a4a4a', // Darker border between rows
    color: '#ffffff', // White cell text
  };

  const preStyle: React.CSSProperties = {
    backgroundColor: '#33343d', // Dark background for pre
    padding: '5px',
    borderRadius: '3px',
    overflow: 'auto',
    maxHeight: '100px',
    fontSize: '0.7rem',
    fontFamily: 'monospace',
    border: '1px solid #666', // Darker border
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    margin: 0,
    color: '#ffffff', // White text for JSON
    minWidth: '250px', // Increased min-width for JSON content
  };

  const userAgentTdStyle: React.CSSProperties = {
    ...tdStyle,
    maxWidth: '150px',
    whiteSpace: 'normal',
    wordBreak: 'break-word',
  };

  const paginationContainerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: '20px',
    gap: '10px',
  };

  const paginationButtonStyle: React.CSSProperties = {
    padding: '8px 12px',
    border: '1px solid #555', // Darker border
    borderRadius: '4px',
    boxShadow: 'none',
    fontSize: '0.85rem',
    fontWeight: 'normal',
    backgroundColor: '#2a2b34', // Dark background for pagination buttons
    cursor: 'pointer',
    transition: 'background-color 0.15s ease-in-out',
    color: '#ffffff', // White text
  };

  const paginationSpanStyle: React.CSSProperties = {
    fontWeight: 'normal',
    margin: '0 5px',
    color: '#ffffff', // White text
  };


  if (loading) return <div style={{ ...containerStyle, textAlign: 'center', fontSize: '1.125rem', color: '#ffffff' }}>Đang tải lịch sử...</div>;
  if (error) return <div style={{ ...containerStyle, textAlign: 'center', fontSize: '1.125rem', color: '#dc3545' }}>Lỗi: {error}</div>;

  return (
    <div style={containerStyle}>
      <h1 style={headingStyle}>Lịch sử thay đổi Giáo viên</h1>

      {/* Filter Form */}
      <form onSubmit={handleFilterSubmit} style={formStyle}>
        <div style={formGridStyle}>
          {/* Teacher ID Filter */}
          <div style={formFieldStyle}>
            <label htmlFor="teacherId" style={labelStyle}>ID Giáo viên:</label>
            <input
              type="number"
              id="teacherId"
              value={selectedTeacherId}
              onChange={(e) => setSelectedTeacherId(e.target.value)}
              style={inputStyle}
              placeholder="Nhập ID"
            />
          </div>

          {/* Action Type Filter */}
          <div style={formFieldStyle}>
            <label htmlFor="actionType" style={labelStyle}>Loại hành động:</label>
            <select
              id="actionType"
              value={selectedActionType}
              onChange={(e) => setSelectedActionType(e.target.value)}
              style={selectStyle}
            >
              <option value="">Tất cả</option>
              <option value="CREATE">CREATE</option>
              <option value="UPDATE">UPDATE</option>
              <option value="DELETE">DELETE</option>
            </select>
          </div>

          {/* Action Buttons */}
          <div style={{ ...formFieldStyle, ...buttonGroupStyle }}>
            <button
              type="submit"
              style={primaryButtonStyle}
              onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#145cb3'; e.currentTarget.style.borderColor = '#145cb3'; }}
              onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#1a73e8'; e.currentTarget.style.borderColor = '#1a73e8'; }}
            >
              Lọc
            </button>
            <button
              type="button"
              onClick={clearFilters}
              style={secondaryButtonStyle}
              onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#3a3b44'; e.currentTarget.style.borderColor = '#666'; }}
              onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#2a2b34'; e.currentTarget.style.borderColor = '#555'; }}
            >
              Xóa lọc
            </button>
          </div>
        </div>
      </form>

      {error ? (
        <p style={{ textAlign: 'center', fontSize: '1.125rem', padding: '16px', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)', backgroundColor: '#dc3545', color: '#ffffff' }}>{error}</p>
      ) : logs.length === 0 ? (
        <p style={{ textAlign: 'center', fontSize: '1.125rem', padding: '16px', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)', backgroundColor: '#22232b', color: '#ffffff' }}>Không tìm thấy lịch sử thay đổi nào cho giáo viên.</p>
      ) : (
        <>
          {/* Logs Table */}
          <div style={tableContainerStyle}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th scope="col" style={{ ...thStyle, borderTopLeftRadius: '8px' }}>ID Log</th>
                  <th scope="col" style={thStyle}>Thời gian</th>
                  <th scope="col" style={thStyle}>ID Giáo viên</th>
                  <th scope="col" style={thStyle}>Hành động</th>
                  <th scope="col" style={thStyle}>Người dùng</th>
                  <th scope="col" style={{ ...thStyle, minWidth: '300px' }}>Dữ liệu cũ</th>
                  <th scope="col" style={{ ...thStyle, minWidth: '300px' }}>Dữ liệu mới</th>
                  <th scope="col" style={thStyle}>IP</th>
                  <th scope="col" style={{ ...thStyle, borderTopRightRadius: '8px', width: '180px' }}>User Agent</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log, index) => (
                  <tr key={log.id} style={{ backgroundColor: index % 2 === 0 ? '#22232b' : '#2a2b34' }}>
                    <td style={tdStyle}>{log.id}</td>
                    <td style={tdStyle}>{new Date(log.changed_at).toLocaleString('vi-VN')}</td>
                    <td style={tdStyle}>{log.record_id}</td>
                    <td style={tdStyle}>{log.action_type}</td>
                    <td style={tdStyle}>{log.user?.name || log.user_id || 'N/A'}</td>
                    <td style={tdStyle}>
                      {log.old_values ? (
                        <pre style={preStyle}>
                          {formatJsonWithDates(log.old_values)}
                        </pre>
                      ) : 'N/A'}
                    </td>
                    <td style={tdStyle}>
                      {log.new_values ? (
                        <pre style={preStyle}>
                          {formatJsonWithDates(log.new_values)}
                        </pre>
                      ) : 'N/A'}
                    </td>
                    <td style={tdStyle}>{log.ip_address || 'N/A'}</td>
                    <td style={userAgentTdStyle}>
                      {log.user_agent || 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div style={paginationContainerStyle}>
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              style={paginationButtonStyle}
              onMouseOver={(e) => { if (currentPage !== 1) e.currentTarget.style.backgroundColor = '#3a3b44'; }}
              onMouseOut={(e) => { if (currentPage !== 1) e.currentTarget.style.backgroundColor = '#2a2b34'; }}
            >
              Trang trước
            </button>
            <span style={paginationSpanStyle}>Trang {currentPage} / {lastPage}</span>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === lastPage}
              style={paginationButtonStyle}
              onMouseOver={(e) => { if (currentPage !== lastPage) e.currentTarget.style.backgroundColor = '#3a3b44'; }}
              onMouseOut={(e) => { if (currentPage !== lastPage) e.currentTarget.style.backgroundColor = '#2a2b34'; }}
            >
              Trang sau
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default TeacherHistory;
