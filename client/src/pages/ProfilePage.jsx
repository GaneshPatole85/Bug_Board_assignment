
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { Button } from '../components/ui/Button.jsx';
import { RoleBadge } from '../components/ui/Badge.jsx';
import { applyApiErrorsToForm } from '../utils/apiErrors.js';
import './ProfilePage.css';

export const ProfilePage = () => {
  const { user: authUser, updateUser, logout } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    avatarUrl: '',
  });
  const [errors, setErrors] = useState({});

  // Change Password state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: '',
  });
  const [passwordErrors, setPasswordErrors] = useState({});
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const res = await apiClient.get('/users/me');
        if (isMounted) {
          const userDoc = res.data?.user || res.data || {};
          setProfile(userDoc);
          setFormData({
            name: userDoc.name || '',
            email: userDoc.email || '',
            phone: userDoc.phone || '',
            avatarUrl: userDoc.avatarUrl || '',
          });
        }
      } catch (err) {
        if (isMounted) {
          addToast(err.message || 'Failed to load profile', 'error');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchProfile();
    return () => {
      isMounted = false;
    };
  }, [addToast]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.name || formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    } else if (formData.name.trim().length > 50) {
      newErrors.name = 'Name cannot exceed 50 characters';
    }

    if (!formData.email || !formData.email.trim()) {
      newErrors.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      newErrors.email = 'Please enter a valid email address (e.g. name@company.com).';
    }

    if (formData.phone && formData.phone.length > 20) {
      newErrors.phone = 'Phone number cannot exceed 20 characters';
    }

    if (formData.avatarUrl && !/^https?:\/\/.+$/.test(formData.avatarUrl.trim())) {
      newErrors.avatarUrl = 'Avatar URL must start with http:// or https://';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      setIsSaving(true);
      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim() || undefined,
        avatarUrl: formData.avatarUrl.trim() || undefined,
      };
      // Only send email if it changed (avoids a no-op conflict check)
      if (payload.email === profile?.email) delete payload.email;
      const res = await apiClient.patch('/users/me', payload);

      const updatedUser = res.data?.user || res.data;
      setProfile(updatedUser);
      // Keep formData.email in sync with saved value
      setFormData((prev) => ({ ...prev, email: updatedUser.email || prev.email }))
      if (updateUser) {
        updateUser(updatedUser);
      }
      addToast('Profile updated successfully', 'success');
    } catch (err) {
      // Map backend field errors to inline form errors; fall back to toast for general errors
      const fieldMap = {};
      const apiErrs = Array.isArray(err?.errors) ? err.errors : [];
      apiErrs.forEach((e) => { if (e.field) fieldMap[e.field] = e.message; });
      if (Object.keys(fieldMap).length > 0) {
        setErrors((prev) => ({ ...prev, ...fieldMap }));
      } else {
        addToast(err.message || 'Failed to update profile', 'error');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData((prev) => ({ ...prev, [name]: value }));
    if (passwordErrors[name]) {
      setPasswordErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordErrors({});

    const errs = {};
    if (!passwordData.currentPassword) {
      errs.currentPassword = 'Current password is required.';
    }
    if (!passwordData.newPassword) {
      errs.newPassword = 'New password is required.';
    } else if (passwordData.newPassword.length < 8) {
      errs.newPassword = 'Password must be at least 8 characters long.';
    }
    if (!passwordData.confirmNewPassword) {
      errs.confirmNewPassword = 'Please confirm your new password.';
    } else if (passwordData.newPassword !== passwordData.confirmNewPassword) {
      errs.confirmNewPassword = 'New passwords do not match.';
    }

    if (Object.keys(errs).length > 0) {
      setPasswordErrors(errs);
      return;
    }

    try {
      setIsChangingPassword(true);
      await apiClient.patch('/auth/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
        confirmNewPassword: passwordData.confirmNewPassword,
      });

      addToast('Password updated. Please sign in again for security.', 'success');
      if (logout) logout();
      navigate('/login', { replace: true });
    } catch (err) {
      const fieldMap = {};
      const apiErrs = Array.isArray(err?.errors) ? err.errors : [];
      apiErrs.forEach((item) => {
        if (item.field) fieldMap[item.field] = item.message;
      });

      if (Object.keys(fieldMap).length > 0) {
        setPasswordErrors(fieldMap);
      } else {
        addToast(err.message || 'Failed to update password', 'error');
      }
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="page-container" id="profile-page">
        <div className="profile-loading font-mono">Loading profile details...</div>
      </div>
    );
  }

  const initials = profile?.name
    ? profile.name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase()
    : 'U';

  return (
    <div className="page-container" id="profile-page">
      <div className="page-header">
        <div className="page-header-info">
          <h1 className="page-title">Personal Profile</h1>
          <p className="page-description">
            Manage your personal profile details and view organizational credentials assigned by your administrator.
          </p>
        </div>
      </div>

      <div className="profile-layout-grid">
        {/* Left Column: Avatar Card & Identity Preview */}
        <div className="profile-card profile-identity-card">
          <div className="profile-avatar-wrapper">
            {formData.avatarUrl ? (
              <img
                src={formData.avatarUrl}
                alt={profile?.name}
                className="profile-avatar-img"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
            ) : null}
            <div
              className="profile-avatar-initials"
              style={{ display: formData.avatarUrl ? 'none' : 'flex' }}
            >
              {initials}
            </div>
          </div>

          <h2 className="profile-name-title">{profile?.name}</h2>
          <span className="profile-email-text">{formData.email || profile?.email}</span>

          <div className="profile-role-badge-row">
            <RoleBadge role={profile?.role} />
            <span
              className={`profile-status-badge ${profile?.isActive !== false ? 'status-active' : 'status-inactive'
                }`}
            >
              {profile?.isActive !== false ? '● Active' : '● Inactive'}
            </span>
          </div>

          <div className="profile-quick-stats">
            <div className="stat-row">
              <span className="stat-label">Employee ID:</span>
              <span className="stat-value font-mono">
                {profile?.employeeId || 'Not assigned'}
              </span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Department:</span>
              <span className="stat-value">{profile?.department || profile?.designation || 'Not set'}</span>
            </div>
          </div>
        </div>

        {/* Right Column: Editable Information & Administrative Details */}
        <div className="profile-card profile-details-card">
          <h3 className="section-subtitle">Edit Personal Information</h3>
          <p className="section-note">
            These fields are self-editable by any authenticated team member.
          </p>

          <form onSubmit={handleSubmit} className="profile-form" id="profile-form">
            <div className="form-group">
              <label htmlFor="profile-name" className="form-label">
                Full Name <span className="field-required">*</span>
              </label>
              <input
                type="text"
                id="profile-name"
                name="name"
                className={`form-input ${errors.name ? 'form-input-error' : ''}`}
                value={formData.name}
                onChange={handleChange}
                placeholder="Your full name"
                autoComplete="name"
              />
              {errors.name && <span className="form-error-msg">{errors.name}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="profile-email" className="form-label">
                Email Address <span className="field-required">*</span>
              </label>
              <input
                type="email"
                id="profile-email"
                name="email"
                className={`form-input ${errors.email ? 'form-input-error' : ''}`}
                value={formData.email}
                onChange={handleChange}
                placeholder="name@company.com"
                autoComplete="email"
              />
              {errors.email && <span className="form-error-msg">{errors.email}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="profile-phone" className="form-label">
                Phone Number <span className="field-optional">(optional)</span>
              </label>
              <input
                type="text"
                id="profile-phone"
                name="phone"
                className={`form-input ${errors.phone ? 'form-input-error' : ''}`}
                value={formData.phone}
                onChange={handleChange}
                placeholder="+1 (555) 000-0000"
                autoComplete="tel"
              />
              {errors.phone && <span className="form-error-msg">{errors.phone}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="profile-avatarUrl" className="form-label">
                Avatar Image URL <span className="field-optional">(optional)</span>
              </label>
              <input
                type="url"
                id="profile-avatarUrl"
                name="avatarUrl"
                className={`form-input ${errors.avatarUrl ? 'form-input-error' : ''}`}
                value={formData.avatarUrl}
                onChange={handleChange}
                placeholder="https://example.com/avatar.jpg"
              />
              {errors.avatarUrl && (
                <span className="form-error-msg">{errors.avatarUrl}</span>
              )}
            </div>

            <div className="form-actions-row">
              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={isSaving}
                id="save-profile-btn"
              >
                Save Changes
              </Button>
            </div>
          </form>

          <hr className="profile-divider" />

          <h3 className="section-subtitle">Organizational Details</h3>
          <p className="section-note">
            These credentials are managed and assigned strictly by administrators.
          </p>

          <div className="readonly-grid">
            <div className="readonly-field">
              <span className="readonly-label">Assigned Role</span>
              <span className="readonly-value">{profile?.role}</span>
            </div>

            <div className="readonly-field">
              <span className="readonly-label">Employee ID</span>
              <span className="readonly-value font-mono">
                {profile?.employeeId || 'Assigned automatically when your account was created'}
              </span>
            </div>

            <div className="readonly-field">
              <span className="readonly-label">Department</span>
              <span className="readonly-value">
                {profile?.department || profile?.designation || 'Not assigned by administrator'}
              </span>
            </div>
          </div>
        </div>

        {/* Change Password Card: Independent block below personal details */}
        <div className="profile-card profile-details-card" style={{ marginTop: '1.5rem' }} id="change-password-card">
          <h3 className="section-subtitle">Change Password</h3>
          <p className="section-note">
            Update your account password. For security, all other active sessions will be invalidated.
          </p>

          <form onSubmit={handlePasswordSubmit} className="profile-form" id="change-password-form" noValidate>
            <div className="form-group">
              <label htmlFor="change-current-password" className="form-label">
                Current Password <span className="field-required">*</span>
              </label>
              <input
                type="password"
                id="change-current-password"
                name="currentPassword"
                className={`form-input ${passwordErrors.currentPassword ? 'form-input-error' : ''}`}
                value={passwordData.currentPassword}
                onChange={handlePasswordChange}
                placeholder="••••••••"
                autoComplete="current-password"
              />
              {passwordErrors.currentPassword && (
                <span className="form-error-msg" id="current-password-error">
                  ⚠ {passwordErrors.currentPassword}
                </span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="change-new-password" className="form-label">
                New Password <span className="field-required">*</span>
              </label>
              <input
                type="password"
                id="change-new-password"
                name="newPassword"
                className={`form-input ${passwordErrors.newPassword ? 'form-input-error' : ''}`}
                value={passwordData.newPassword}
                onChange={handlePasswordChange}
                placeholder="••••••••"
                autoComplete="new-password"
              />
              {passwordErrors.newPassword && (
                <span className="form-error-msg" id="new-password-error">
                  ⚠ {passwordErrors.newPassword}
                </span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="change-confirm-password" className="form-label">
                Confirm New Password <span className="field-required">*</span>
              </label>
              <input
                type="password"
                id="change-confirm-password"
                name="confirmNewPassword"
                className={`form-input ${passwordErrors.confirmNewPassword ? 'form-input-error' : ''}`}
                value={passwordData.confirmNewPassword}
                onChange={handlePasswordChange}
                placeholder="••••••••"
                autoComplete="new-password"
              />
              {passwordErrors.confirmNewPassword && (
                <span className="form-error-msg" id="confirm-password-error">
                  ⚠ {passwordErrors.confirmNewPassword}
                </span>
              )}
            </div>

            <div className="form-actions-row">
              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={isChangingPassword}
                id="update-password-btn"
              >
                Update Password
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
