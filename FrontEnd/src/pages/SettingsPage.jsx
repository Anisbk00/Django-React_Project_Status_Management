/* eslint-disable no-unused-vars */
// src/pages/SettingsPage.jsx
import { useState, useEffect } from "react";
import { Switch } from "@headlessui/react";
import { useAuth } from "../context/AuthContext";
import { CheckCircleIcon, ExclamationCircleIcon } from "@heroicons/react/24/outline";

export default function SettingsPage() {
  const { user, updatePassword, deleteAccount } = useAuth();
  const [darkMode, setDarkMode] = useState(false);
  const [emailNotif, setEmailNotif] = useState(true);
  const [passwordModal, setPasswordModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState("");
  const [passwordData, setPasswordData] = useState({
    current: "",
    new: "",
    confirm: ""
  });
  const [status, setStatus] = useState({
    type: "", // "success" | "error"
    message: ""
  });
  const [saving, setSaving] = useState({
    darkMode: false,
    emailNotif: false
  });

  // Initialize with user preferences (would come from API in real app)
  useEffect(() => {
    if (user) {
      // In real app: fetch user preferences from API
      setDarkMode(localStorage.getItem('darkMode') === 'true');
      setEmailNotif(true);
    }
  }, [user]);

  // Handle theme change
  const handleThemeChange = (checked) => {
    setSaving(prev => ({ ...prev, darkMode: true }));
    setDarkMode(checked);
    
    // In real app: API call to save preference
    setTimeout(() => {
      localStorage.setItem('darkMode', checked);
      document.documentElement.classList.toggle('dark', checked);
      setSaving(prev => ({ ...prev, darkMode: false }));
      setStatus({ type: "success", message: "Theme preferences saved!" });
      
      setTimeout(() => setStatus({ type: "", message: "" }), 3000);
    }, 500);
  };

  // Handle notification change
  const handleNotificationChange = (checked) => {
    setSaving(prev => ({ ...prev, emailNotif: true }));
    setEmailNotif(checked);
    
    // In real app: API call to save preference
    setTimeout(() => {
      setSaving(prev => ({ ...prev, emailNotif: false }));
      setStatus({ type: "success", message: "Notification settings updated!" });
      
      setTimeout(() => setStatus({ type: "", message: "" }), 3000);
    }, 500);
  };

  // Handle password change
  const handleChangePassword = async (e) => {
    e.preventDefault();
    
    if (passwordData.new !== passwordData.confirm) {
      setStatus({ type: "error", message: "New passwords don't match" });
      return;
    }
    
    try {
      await updatePassword(passwordData.current, passwordData.new);
      setStatus({ type: "success", message: "Password updated successfully!" });
      setPasswordData({ current: "", new: "", confirm: "" });
      setPasswordModal(false);
      
      setTimeout(() => setStatus({ type: "", message: "" }), 3000);
    } catch (error) {
      setStatus({ type: "error", message: "Failed to update password. Please try again." });
    }
  };

  // Handle account deletion
  const handleDeleteAccount = async (e) => {
    e.preventDefault();
    
    if (confirmEmail !== user?.email) {
      setStatus({ type: "error", message: "Email address doesn't match" });
      return;
    }
    
    try {
      await deleteAccount();
      // In real app: redirect to login or home
    } catch (error) {
      setStatus({ type: "error", message: "Failed to delete account. Please try again." });
    }
  };

  // Render status message
  const renderStatus = () => {
    if (!status.message) return null;
    
    return (
      <div className={`mb-6 p-4 rounded-lg flex items-center ${
        status.type === 'success' 
          ? 'bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-200' 
          : 'bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-200'
      }`}>
        {status.type === 'success' ? (
          <CheckCircleIcon className="h-5 w-5 mr-2 flex-shrink-0" />
        ) : (
          <ExclamationCircleIcon className="h-5 w-5 mr-2 flex-shrink-0" />
        )}
        <p>{status.message}</p>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <p className="mt-1 text-gray-500 dark:text-gray-400">
          Manage your account settings and preferences
        </p>
      </div>

      {renderStatus()}

      {/* Account Settings */}
      <section className="bg-white dark:bg-gray-800 shadow rounded-2xl overflow-hidden mb-8">
        <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Account Settings</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage your personal information and security
          </p>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Full Name</h3>
              <p className="text-gray-900 dark:text-white font-medium">
                {user ? `${user.first_name} ${user.last_name}` : "N/A"}
                </p>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Email Address</h3>
              <p className="text-gray-900 dark:text-white font-medium break-all">{user?.email || 'N/A'}</p>
            </div>
            
            <div className="md:col-span-3 pt-4">
              <button
                onClick={() => setPasswordModal(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
              >
                Change Password
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Preferences */}
      <section className="bg-white dark:bg-gray-800 shadow rounded-2xl overflow-hidden mb-8">
        <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Preferences</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Customize your experience
          </p>
        </div>
        
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {/* Dark Mode */}
          <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between">
            <div className="sm:w-2/3 mb-3 sm:mb-0">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">Dark Mode</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Switch between light and dark themes for better visibility
              </p>
            </div>
            <div className="flex items-center">
              {saving.darkMode && (
                <span className="animate-spin rounded-full h-4 w-4 border-2 border-indigo-500 border-t-transparent mr-2"></span>
              )}
              <Switch
                checked={darkMode}
                onChange={handleThemeChange}
                className={`${darkMode ? "bg-indigo-600" : "bg-gray-200 dark:bg-gray-600"}
                  relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
                aria-label="Dark mode toggle"
              >
                <span
                  className={`${
                    darkMode ? "translate-x-6" : "translate-x-1"
                  } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                />
              </Switch>
            </div>
          </div>
          
          {/* Email Notifications */}
          <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between">
            <div className="sm:w-2/3 mb-3 sm:mb-0">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">Email Notifications</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Receive important updates and security notifications via email
              </p>
            </div>
            <div className="flex items-center">
              {saving.emailNotif && (
                <span className="animate-spin rounded-full h-4 w-4 border-2 border-indigo-500 border-t-transparent mr-2"></span>
              )}
              <Switch
                checked={emailNotif}
                onChange={handleNotificationChange}
                className={`${emailNotif ? "bg-indigo-600" : "bg-gray-200 dark:bg-gray-600"}
                  relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
                aria-label="Email notifications toggle"
              >
                <span
                  className={`${
                    emailNotif ? "translate-x-6" : "translate-x-1"
                  } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                />
              </Switch>
            </div>
          </div>
        </div>
      </section>

      {/* Danger Zone */}
      <section className="bg-white dark:bg-gray-800 shadow rounded-2xl overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-red-600">Danger Zone</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Irreversible actions that affect your account
          </p>
        </div>
        
        <div className="p-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between">
            <div className="md:w-2/3">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">Delete Account</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Permanently remove your account and all associated data. This action cannot be undone.
              </p>
            </div>
            <button
              onClick={() => setDeleteModal(true)}
              className="mt-4 md:mt-0 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
            >
              Delete Account
            </button>
          </div>
        </div>
      </section>

      {/* Password Change Modal */}
      {passwordModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="password-modal" role="dialog" aria-modal="true">
          <div className="flex items-end sm:items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true"></div>
            
            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-indigo-100 dark:bg-indigo-900 sm:mx-0 sm:h-10 sm:w-10">
                    <svg className="h-6 w-6 text-indigo-600 dark:text-indigo-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L21 17m-3-8V9m-3-3h.01M9 16a5 5 0 00-1 9.9M16 4.5a4 4 0 00-1 8.25" />
                    </svg>
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white" id="password-modal">
                      Change Password
                    </h3>
                    <div className="mt-4">
                      <form onSubmit={handleChangePassword}>
                        <div className="space-y-4">
                          <div>
                            <label htmlFor="current-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                              Current Password
                            </label>
                            <input
                              type="password"
                              id="current-password"
                              value={passwordData.current}
                              onChange={(e) => setPasswordData({...passwordData, current: e.target.value})}
                              className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                              required
                            />
                          </div>
                          <div>
                            <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                              New Password
                            </label>
                            <input
                              type="password"
                              id="new-password"
                              value={passwordData.new}
                              onChange={(e) => setPasswordData({...passwordData, new: e.target.value})}
                              className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                              required
                              minLength={8}
                            />
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Must be at least 8 characters</p>
                          </div>
                          <div>
                            <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                              Confirm New Password
                            </label>
                            <input
                              type="password"
                              id="confirm-password"
                              value={passwordData.confirm}
                              onChange={(e) => setPasswordData({...passwordData, confirm: e.target.value})}
                              className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                              required
                            />
                          </div>
                        </div>
                      </form>
                    </div>
                  </div>
                </div>
              </div>
              <div className="px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={handleChangePassword}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm transition-colors"
                >
                  Change Password
                </button>
                <button
                  type="button"
                  onClick={() => setPasswordModal(false)}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-700 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Account Modal */}
      {deleteModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="delete-modal" role="dialog" aria-modal="true">
          <div className="flex items-end sm:items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true"></div>
            
            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900 sm:mx-0 sm:h-10 sm:w-10">
                    <svg className="h-6 w-6 text-red-600 dark:text-red-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white" id="delete-modal">
                      Delete Account
                    </h3>
                    <div className="mt-4">
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Are you sure you want to delete your account? This action cannot be undone. All your data will be permanently removed.
                      </p>
                      <div className="mt-4">
                        <label htmlFor="confirm-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          To confirm, type your email address: <span className="font-semibold">{user?.email}</span>
                        </label>
                        <input
                          type="email"
                          id="confirm-email"
                          value={confirmEmail}
                          onChange={(e) => setConfirmEmail(e.target.value)}
                          className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
                          placeholder={user?.email}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={handleDeleteAccount}
                  disabled={confirmEmail !== user?.email}
                  className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm transition-colors ${
                    confirmEmail === user?.email 
                      ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500' 
                      : 'bg-gray-400 cursor-not-allowed'
                  }`}
                >
                  Delete Account
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDeleteModal(false);
                    setConfirmEmail("");
                  }}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-700 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}