import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { Button } from '../components/ui/Button.jsx';
import { RoleBadge } from '../components/ui/Badge.jsx';
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
  const [touched, setTouched] = useState({});

  // Change Password state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: '',
  });
  const [passwordErrors, setPasswordErrors] = useState({});
  const [passwordTouched, setPasswordTouched] = useState({});
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Real-time password strength calculation
  const getPasswordStrength = (pwd) => {
    if (!pwd) return { score: 0, label: '', color: '', percent: 0 };
    let score = 0;
    if (pwd.length >= 8) score++;
    if (pwd.length >= 12) score++;
    if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;

    if (score <= 1) return { score: 1, label: 'Weak', percent: 33, color: 'var(--priority-urgent)' };
    if (score <= 3) return { score: 2, label: 'Fair', percent: 66, color: 'var(--priority-medium)' };
    return { score: 3, label: 'Strong', percent: 100, color: 'var(--status-resolved)' };
  };

  const passwordStrength = getPasswordStrength(passwordData.newPassword);

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

  // Validation rule engine for personal profile fields
  const validateField = (name, value) => {
    switch (name) {
      case 'name':
        if (!value || !value.trim()) {
          return 'Full name is required.';
        }
        if (value.trim().length < 2) {
          return 'Name must be at least 2 characters.';
        }
        if (value.trim().length > 50) {
          return 'Name cannot exceed 50 characters.';
        }
        return '';

      case 'email':
        if (!value || !value.trim()) {
          return 'Email address is required.';
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) {
          return 'Please enter a valid email address (e.g. name@company.com).';
        }
        if (value.trim().length > 100) {
          return 'Email address cannot exceed 100 characters.';
        }
        return '';

      case 'phone':
        if (value && value.trim()) {
          const trimmed = value.trim();
          if (trimmed.length > 20) {
            return 'Phone number cannot exceed 20 characters.';
          }
          if (!/^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]*$/.test(trimmed)) {
            return 'Please enter a valid phone number format.';
          }
          const digitsOnly = trimmed.replace(/\D/g, '');
          if (digitsOnly.length < 7) {
            return 'Phone number must contain at least 7 digits.';
          }
        }
        return '';

      case 'avatarUrl':
        if (value && value.trim()) {
          const trimmed = value.trim();
          if (!/^https?:\/\/.+$/i.test(trimmed)) {
            return 'Avatar URL must start with http:// or https://';
          }
          if (/^(javascript|data|file|ftp):/i.test(trimmed)) {
            return 'Dangerous protocol schemes are not allowed.';
          }
        }
        return '';

      default:
        return '';
    }
  };

  // Validation rule engine for password change fields
  const validatePasswordField = (name, value, allValues) => {
    switch (name) {
      case 'currentPassword':
        if (!value) {
          return 'Current password is required.';
        }
        return '';

      case 'newPassword':
        if (!value) {
          return 'New password is required.';
        }
        if (value.length < 8) {
          return 'Password must be at least 8 characters long.';
        }
        if (allValues.currentPassword && value === allValues.currentPassword) {
          return 'New password must be different from current password.';
        }
        return '';

      case 'confirmNewPassword':
        if (!value) {
          return 'Please confirm your new password.';
        }
        if (allValues.newPassword && value !== allValues.newPassword) {
          return 'Passwords do not match.';
        }
        return '';

      default:
        return '';
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Real-time validation if the field was previously touched or has an error
    if (touched[name] || errors[name]) {
      const fieldError = validateField(name, value);
      setErrors((prev) => ({ ...prev, [name]: fieldError }));
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    const fieldError = validateField(name, value);
    setErrors((prev) => ({ ...prev, [name]: fieldError }));
  };

  const validateAllProfile = () => {
    const newErrors = {};
    Object.keys(formData).forEach((field) => {
      const err = validateField(field, formData[field]);
      if (err) newErrors[field] = err;
    });
    setErrors(newErrors);
    setTouched({
      name: true,
      email: true,
      phone: true,
      avatarUrl: true,
    });
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateAllProfile()) {
      addToast('Please correct the errors in the profile form before saving.', 'error');
      return;
    }

    try {
      setIsSaving(true);
      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim() || null,
        avatarUrl: formData.avatarUrl.trim() || null,
      };

      // Only send email if it changed (avoids no-op uniqueness conflict check)
      if (payload.email === profile?.email) {
        delete payload.email;
      }

      const res = await apiClient.patch('/users/me', payload);
      const updatedUser = res.data?.user || res.data;
      setProfile(updatedUser);
      setFormData((prev) => ({
        ...prev,
        email: updatedUser.email || prev.email,
      }));

      if (updateUser) {
        updateUser(updatedUser);
      }
      addToast('Profile updated successfully', 'success');
    } catch (err) {
      // Map backend field errors (e.g. 409 Conflict, 422 Unprocessable Entity) to inline inputs
      const fieldMap = {};
      const apiErrs = Array.isArray(err?.errors) ? err.errors : [];
      apiErrs.forEach((e) => {
        if (e.field) fieldMap[e.field] = e.message;
      });

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
    const updated = { ...passwordData, [name]: value };
    setPasswordData(updated);

    // If field is touched, validate in real time
    if (passwordTouched[name] || passwordErrors[name]) {
      const err = validatePasswordField(name, value, updated);
      setPasswordErrors((prev) => ({ ...prev, [name]: err }));
    }

    // Also re-validate confirmNewPassword if newPassword changes
    if (name === 'newPassword' && passwordTouched.confirmNewPassword) {
      const matchErr = validatePasswordField('confirmNewPassword', updated.confirmNewPassword, updated);
      setPasswordErrors((prev) => ({ ...prev, confirmNewPassword: matchErr }));
    }
  };

  const handlePasswordBlur = (e) => {
    const { name, value } = e.target;
    setPasswordTouched((prev) => ({ ...prev, [name]: true }));
    const err = validatePasswordField(name, value, passwordData);
    setPasswordErrors((prev) => ({ ...prev, [name]: err }));
  };

  const validateAllPassword = () => {
    const newErrs = {};
    Object.keys(passwordData).forEach((field) => {
      const err = validatePasswordField(field, passwordData[field], passwordData);
      if (err) newErrs[field] = err;
    });
    setPasswordErrors(newErrs);
    setPasswordTouched({
      currentPassword: true,
      newPassword: true,
      confirmNewPassword: true,
    });
    return Object.keys(newErrs).length === 0;
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!validateAllPassword()) {
      addToast('Please fix password errors before submitting.', 'error');
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

  const passwordsMatch =
    passwordData.newPassword &&
    passwordData.confirmNewPassword &&
    passwordData.newPassword === passwordData.confirmNewPassword;

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
        <aside className="profile-sidebar-column">
          <div className="profile-card profile-identity-card">
            <div className="profile-avatar-wrapper">
              {formData.avatarUrl ? (
                <img
                  src={formData.avatarUrl}
                  alt={profile?.name}
                  className="profile-avatar-img"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
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

            <h2 className="profile-name-title">{formData.name || profile?.name}</h2>
            <span className="profile-email-text">{formData.email || profile?.email}</span>

            <div className="profile-role-badge-row">
              <RoleBadge role={profile?.role} />
              <span
                className={`profile-status-badge ${
                  profile?.isActive !== false ? 'status-active' : 'status-inactive'
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
              <div className="stat-row">
                <span className="stat-label">Account Status:</span>
                <span className="stat-value" style={{ color: 'var(--status-resolved)' }}>Verified</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Right Column: Main Profile Sections */}
        <main className="profile-main-column">
          {/* Card 1: Editable Personal Information */}
          <div className="profile-card profile-details-card" id="personal-info-card">
            <div className="card-title-row">
              <div>
                <h3 className="section-subtitle">Edit Personal Information</h3>
                <p className="section-note">
                  These fields are self-editable with real-time input verification.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="profile-form" id="profile-form" noValidate>
              <div className="form-group">
                <div className="form-label-row">
                  <label htmlFor="profile-name" className="form-label">
                    Full Name <span className="field-required">*</span>
                  </label>
                  <span
                    className={`form-char-count ${
                      formData.name.length >= 45 ? 'limit-near' : ''
                    } ${formData.name.length >= 50 ? 'limit-reached' : ''}`}
                  >
                    {formData.name.length}/50
                  </span>
                </div>
                <input
                  type="text"
                  id="profile-name"
                  name="name"
                  className={`form-input ${errors.name ? 'form-input-error' : ''}`}
                  value={formData.name}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="Your full name (min 2 characters)"
                  autoComplete="name"
                  aria-invalid={Boolean(errors.name)}
                  aria-describedby={errors.name ? 'profile-name-error' : undefined}
                />
                {errors.name && (
                  <span className="form-error-msg" id="profile-name-error" role="alert">
                    ⚠ {errors.name}
                  </span>
                )}
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
                  onBlur={handleBlur}
                  placeholder="name@company.com"
                  autoComplete="email"
                  aria-invalid={Boolean(errors.email)}
                  aria-describedby={errors.email ? 'profile-email-error' : undefined}
                />
                {errors.email && (
                  <span className="form-error-msg" id="profile-email-error" role="alert">
                    ⚠ {errors.email}
                  </span>
                )}
              </div>

              <div className="form-row-2col">
                <div className="form-group">
                  <label htmlFor="profile-phone" className="form-label">
                    Phone Number <span className="field-optional">(optional)</span>
                  </label>
                  <input
                    type="tel"
                    id="profile-phone"
                    name="phone"
                    className={`form-input ${errors.phone ? 'form-input-error' : ''}`}
                    value={formData.phone}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder="+1 (555) 000-0000"
                    autoComplete="tel"
                    aria-invalid={Boolean(errors.phone)}
                    aria-describedby={errors.phone ? 'profile-phone-error' : undefined}
                  />
                  {errors.phone && (
                    <span className="form-error-msg" id="profile-phone-error" role="alert">
                      ⚠ {errors.phone}
                    </span>
                  )}
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
                    onBlur={handleBlur}
                    placeholder="https://example.com/avatar.jpg"
                    aria-invalid={Boolean(errors.avatarUrl)}
                    aria-describedby={errors.avatarUrl ? 'profile-avatar-error' : undefined}
                  />
                  {errors.avatarUrl && (
                    <span className="form-error-msg" id="profile-avatar-error" role="alert">
                      ⚠ {errors.avatarUrl}
                    </span>
                  )}
                </div>
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
          </div>

          {/* Card 2: Organizational Details (Read-only) */}
          <div className="profile-card profile-details-card" id="organizational-details-card">
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
                  {profile?.employeeId || 'Assigned automatically upon account creation'}
                </span>
              </div>

              <div className="readonly-field" style={{ gridColumn: 'span 2' }}>
                <span className="readonly-label">Department</span>
                <span className="readonly-value">
                  {profile?.department || profile?.designation || 'Not assigned by administrator'}
                </span>
              </div>
            </div>
          </div>

          {/* Card 3: Security & Change Password Card */}
          <div className="profile-card profile-details-card profile-security-card" id="change-password-card">
            <div className="security-card-header">
              <div className="security-badge-icon">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
              <div>
                <h3 className="section-subtitle" style={{ margin: 0 }}>Change Password</h3>
                <p className="section-note" style={{ margin: 0 }}>
                  Update your account password with instant strength analysis.
                </p>
              </div>
            </div>

            <div className="security-alert-box">
              <span className="security-alert-icon">ℹ️</span>
              <div className="security-alert-content">
                <strong>Session Invalidation Notice:</strong> Changing your password will immediately terminate all other active browser sessions for this account.
              </div>
            </div>

            <form onSubmit={handlePasswordSubmit} className="profile-form" id="change-password-form" noValidate>
              <div className="form-group">
                <label htmlFor="change-current-password" className="form-label">
                  Current Password <span className="field-required">*</span>
                </label>
                <div className="input-with-action">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    id="change-current-password"
                    name="currentPassword"
                    className={`form-input ${passwordErrors.currentPassword ? 'form-input-error' : ''}`}
                    value={passwordData.currentPassword}
                    onChange={handlePasswordChange}
                    onBlur={handlePasswordBlur}
                    placeholder="Enter your current password"
                    autoComplete="current-password"
                    aria-invalid={Boolean(passwordErrors.currentPassword)}
                    aria-describedby={passwordErrors.currentPassword ? 'current-password-error' : undefined}
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    aria-label={showCurrentPassword ? 'Hide current password' : 'Show current password'}
                  >
                    {showCurrentPassword ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    )}
                  </button>
                </div>
                {passwordErrors.currentPassword && (
                  <span className="form-error-msg" id="current-password-error" role="alert">
                    ⚠ {passwordErrors.currentPassword}
                  </span>
                )}
              </div>

              <div className="form-row-2col">
                <div className="form-group">
                  <label htmlFor="change-new-password" className="form-label">
                    New Password <span className="field-required">*</span>
                  </label>
                  <div className="input-with-action">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      id="change-new-password"
                      name="newPassword"
                      className={`form-input ${passwordErrors.newPassword ? 'form-input-error' : ''}`}
                      value={passwordData.newPassword}
                      onChange={handlePasswordChange}
                      onBlur={handlePasswordBlur}
                      placeholder="At least 8 characters"
                      autoComplete="new-password"
                      aria-invalid={Boolean(passwordErrors.newPassword)}
                      aria-describedby={passwordErrors.newPassword ? 'new-password-error' : undefined}
                    />
                    <button
                      type="button"
                      className="password-toggle-btn"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      aria-label={showNewPassword ? 'Hide new password' : 'Show new password'}
                    >
                      {showNewPassword ? (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                      ) : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      )}
                    </button>
                  </div>
                  {passwordErrors.newPassword && (
                    <span className="form-error-msg" id="new-password-error" role="alert">
                      ⚠ {passwordErrors.newPassword}
                    </span>
                  )}

                  {/* Password Strength Meter */}
                  {passwordData.newPassword && (
                    <div className="password-strength-container">
                      <div className="password-strength-track">
                        <div
                          className="password-strength-bar"
                          style={{
                            width: `${passwordStrength.percent}%`,
                            backgroundColor: passwordStrength.color,
                          }}
                        />
                      </div>
                      <span className="password-strength-label" style={{ color: passwordStrength.color }}>
                        Strength: {passwordStrength.label}
                      </span>
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="change-confirm-password" className="form-label">
                    Confirm New Password <span className="field-required">*</span>
                  </label>
                  <div className="input-with-action">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      id="change-confirm-password"
                      name="confirmNewPassword"
                      className={`form-input ${
                        passwordErrors.confirmNewPassword ? 'form-input-error' : ''
                      }`}
                      value={passwordData.confirmNewPassword}
                      onChange={handlePasswordChange}
                      onBlur={handlePasswordBlur}
                      placeholder="Repeat new password"
                      autoComplete="new-password"
                      aria-invalid={Boolean(passwordErrors.confirmNewPassword)}
                      aria-describedby={passwordErrors.confirmNewPassword ? 'confirm-password-error' : undefined}
                    />
                    <button
                      type="button"
                      className="password-toggle-btn"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                    >
                      {showConfirmPassword ? (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                      ) : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      )}
                    </button>
                  </div>
                  {passwordErrors.confirmNewPassword && (
                    <span className="form-error-msg" id="confirm-password-error" role="alert">
                      ⚠ {passwordErrors.confirmNewPassword}
                    </span>
                  )}
                  {passwordsMatch && (
                    <span className="form-success-hint" id="password-match-hint">
                      ✓ Passwords match
                    </span>
                  )}
                </div>
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
        </main>
      </div>
    </div>
  );
};

export default ProfilePage;
