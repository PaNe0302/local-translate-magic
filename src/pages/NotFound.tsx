
import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="flex justify-center mb-6">
          <AlertTriangle className="h-16 w-16 text-yellow-500" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">404</h1>
        <p className="text-xl text-gray-700 mb-2">Trang không tìm thấy</p>
        <p className="text-gray-500 mb-6">
          Đường dẫn "{location.pathname}" không tồn tại trong ứng dụng.
        </p>
        <Button asChild className="w-full bg-blue-600 hover:bg-blue-700">
          <Link to="/">Quay lại trang chủ</Link>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
