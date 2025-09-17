import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';

const PrivateRoute = ({ adminOnly = false, children }) => {
  const { token, user, loading, isAdmin, isApproved } = useAuth();

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  // Not authenticated
  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  // User not approved
  if (!isApproved()) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100">
                <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.728-.833-2.498 0L3.316 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h2 className="mt-6 text-2xl font-bold text-gray-900">
                Account Pending Approval
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                Your account is currently pending admin approval. Please wait for an administrator to approve your account.
              </p>
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <div className="text-sm">
                  <p className="text-yellow-800">
                    <strong>Current Status:</strong> <span className="font-medium capitalize">{user.status}</span>
                  </p>
                  <p className="text-yellow-700 mt-1">
                    You will receive access once an admin approves your registration.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Admin-only route protection
  if (adminOnly && !isAdmin()) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
              </div>
              <h2 className="mt-6 text-2xl font-bold text-gray-900">
                Access Denied
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                You don't have permission to access this page.
              </p>
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-800">
                  Admin access required.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // All checks passed
  return children;
};

export default PrivateRoute;