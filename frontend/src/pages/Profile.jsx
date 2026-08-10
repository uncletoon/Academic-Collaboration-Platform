import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Camera, Check, AlertCircle, Loader2, LockKeyhole } from 'lucide-react';

const personNamePattern = /^[\p{L}\p{M}]+(?:[ '\-][\p{L}\p{M}]+)*$/u;

const Profile = () => {
  const { user, refreshUser } = useAuth();
  const canEditAffiliation = user?.role === 'admin';
  const needsProfessionalDetails = ['lecturer', 'institution_admin', 'admin'].includes(user?.role);
  
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [staffId, setStaffId] = useState(user?.staff_id || '');
  const [jobTitle, setJobTitle] = useState(user?.job_title || '');
  const [qualification, setQualification] = useState(user?.qualification || '');
  const [expertise, setExpertise] = useState(user?.expertise || '');
  const [phoneNumber, setPhoneNumber] = useState(user?.phone_number || '');
  const [selectedFile, setSelectedFile] = useState(null);
  
  // Metadata selection states
  const [institutions, setInstitutions] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedInstitution, setSelectedInstitution] = useState(user?.institution_id || '');
  const [selectedDepartment, setSelectedDepartment] = useState(user?.department_id || '');

  const [loading, setLoading] = useState(false);
  const [loadingDepts, setLoadingDepts] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Fetch institutions
  useEffect(() => {
    const loadInstitutions = async () => {
      try {
        const res = await api.getInstitutions();
        setInstitutions(res.institutions || []);
      } catch (err) {
        console.error('Error fetching institutions:', err);
      }
    };
    loadInstitutions();
  }, []);

  // Fetch departments when selected institution changes
  useEffect(() => {
    if (!selectedInstitution) {
      setDepartments([]);
      return;
    }

    const loadDepartments = async () => {
      setLoadingDepts(true);
      try {
        const res = await api.getDepartments(selectedInstitution);
        setDepartments(res.departments || []);
      } catch (err) {
        console.error('Error fetching departments:', err);
      } finally {
        setLoadingDepts(false);
      }
    };
    loadDepartments();
  }, [selectedInstitution]);

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    if (!personNamePattern.test(fullName.trim())) {
      setErrorMsg('Full name must use letters, spaces, apostrophes, or hyphens only.');
      return;
    }
    if (needsProfessionalDetails && (!staffId || !jobTitle || !qualification || !expertise || !phoneNumber)) {
      setErrorMsg('Complete every professional verification field before saving.');
      return;
    }
    setLoading(true);
    setSuccessMsg('');
    setErrorMsg('');

    const formData = new FormData();
    formData.append('fullName', fullName);
    formData.append('bio', bio);
    if (needsProfessionalDetails) {
      formData.append('staffId', staffId);
      formData.append('jobTitle', jobTitle);
      formData.append('qualification', qualification);
      formData.append('expertise', expertise);
      formData.append('phoneNumber', phoneNumber);
    }
    if (canEditAffiliation) {
      formData.append('institutionId', selectedInstitution || '');
      formData.append('departmentId', selectedDepartment || '');
    }
    if (selectedFile) {
      formData.append('avatar', selectedFile);
    }

    try {
      await api.updateProfile(formData);
      setSuccessMsg('Profile updated successfully.');
      setSelectedFile(null);
      await refreshUser();
    } catch (err) {
      setErrorMsg(err.message || 'Profile update failed.');
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadgeColor = () => {
    switch (user?.role) {
      case 'admin': return 'bg-red-100 text-red-700 border-red-200';
      case 'institution_admin': return 'bg-violet-100 text-violet-700 border-violet-200';
      case 'lecturer': return 'bg-amber-100 text-amber-700 border-amber-200';
      default: return 'bg-blue-100 text-blue-700 border-blue-200';
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div className="bg-canvas-50 border border-slate-300 rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-44 h-full bg-blue-900/5 rounded-full blur-[40px] pointer-events-none"></div>

        <div className="flex flex-col sm:flex-row items-center gap-6">
          {/* Avatar frame */}
          <div className="relative group shrink-0">
            <img
              src={user?.avatar_url ? api.getAssetUrl(user.avatar_url) : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'}
              alt={fullName}
              className="w-24 h-24 rounded-full border-2 border-slate-300 object-cover"
            />
            <label className="absolute inset-0 bg-canvas-100/60 rounded-full flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera className="h-6 w-6 text-canvas-900" />
              <input
                type="file"
                className="hidden"
                accept="image/*"
                onChange={(e) => setSelectedFile(e.target.files[0])}
              />
            </label>
          </div>

          <div className="text-center sm:text-left space-y-1">
            <div className="flex items-center gap-2.5 flex-col sm:flex-row justify-center sm:justify-start">
              <h3 className="text-lg font-bold text-canvas-900 leading-none">{user?.full_name}</h3>
              <span className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded border ${getRoleBadgeColor()}`}>
                {user?.role_name || user?.role}
              </span>
            </div>
            <p className="text-xs font-medium">{user?.email}</p>
            {selectedFile && (
              <span className="text-[10px] text-blue-600 font-semibold block">Pending picture save: {selectedFile.name}</span>
            )}
          </div>
        </div>
      </div>

      {successMsg && (
        <div role="status" className="p-3.5 bg-slate-50 border border-slate-300 text-slate-800 rounded-xl text-xs font-semibold flex items-center gap-2 animate-slide-up">
          <Check className="h-4 w-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div role="alert" className="p-3.5 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs font-semibold flex items-center gap-2 animate-slide-up">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Settings details Form */}
      <form onSubmit={handleProfileSubmit} className="bg-canvas-50 border border-slate-300 rounded-2xl p-6 space-y-5">
        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Profile Customization</h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase">Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-4 py-2.5 bg-canvas-100 border border-slate-300 rounded-xl text-xs text-canvas-900 placeholder-slate-500 focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase">Institution</label>
            <select
              value={selectedInstitution}
              onChange={(e) => { setSelectedInstitution(e.target.value); setSelectedDepartment(''); }}
              disabled={!canEditAffiliation}
              aria-describedby={!canEditAffiliation ? 'affiliation-lock-help' : undefined}
              className="w-full px-4 py-2.5 bg-canvas-100 border border-slate-300 rounded-xl text-xs text-canvas-900 focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
            >
              <option value="">No Institution Affiliation</option>
              {institutions.map((inst) => (
                <option key={inst.id} value={inst.id}>
                  {inst.name}
                </option>
              ))}
            </select>
          </div>

        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase">
              Department {loadingDepts && <span className="text-[10px] text-blue-600">(loading...)</span>}
            </label>
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              disabled={!canEditAffiliation || !selectedInstitution || loadingDepts}
              aria-describedby={!canEditAffiliation ? 'affiliation-lock-help' : undefined}
              className="w-full px-4 py-2.5 bg-canvas-100 border border-slate-300 rounded-xl text-xs text-canvas-900 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 focus:outline-none"
            >
              <option value="">No Department Selected</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>

          {user?.role === 'student' && (
            <div>
              <label htmlFor="profile-student-id" className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase">Student ID</label>
              <input
                id="profile-student-id"
                type="text"
                value={user?.student_id || 'Not assigned'}
                readOnly
                aria-readonly="true"
                className="w-full cursor-not-allowed rounded-xl border border-slate-300 bg-slate-100 px-4 py-2.5 text-xs text-slate-500 outline-none"
              />
            </div>
          )}
        </div>

        {!canEditAffiliation && (
          <p id="affiliation-lock-help" className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-[11px] font-medium text-slate-600">
            <LockKeyhole className="h-4 w-4 shrink-0 text-slate-500" />
            Institution and department are managed by the system administrator.
          </p>
        )}

        {needsProfessionalDetails && (
          <fieldset className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <legend className="px-1 text-xs font-bold uppercase tracking-wider text-slate-700">Professional verification</legend>
            <p className="text-[11px] leading-5 text-slate-600">Keep these institution-issued details accurate so your academic or administrative role can be verified.</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label><span className="mb-1.5 block text-xs font-semibold text-slate-700">Staff ID</span><input required maxLength="50" value={staffId} onChange={(e) => setStaffId(e.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" /></label>
              <label><span className="mb-1.5 block text-xs font-semibold text-slate-700">Job title</span><input required maxLength="120" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" /></label>
              <label><span className="mb-1.5 block text-xs font-semibold text-slate-700">Highest qualification</span><input required maxLength="255" value={qualification} onChange={(e) => setQualification(e.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" /></label>
              <label><span className="mb-1.5 block text-xs font-semibold text-slate-700">Phone number</span><input required type="tel" maxLength="26" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" /></label>
            </div>
            <label><span className="mb-1.5 block text-xs font-semibold text-slate-700">Expertise or administrative area</span><textarea required rows="3" value={expertise} onChange={(e) => setExpertise(e.target.value)} className="w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" /></label>
          </fieldset>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase">Biography / Academic Interests</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows="3"
            className="w-full px-4 py-2.5 bg-canvas-100 border border-slate-300 rounded-xl text-xs text-canvas-900 placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none"
          />
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-850 text-white text-xs font-semibold rounded-xl transition-colors shadow flex items-center gap-1.5"
          >
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            <span>Save Profile Modifications</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default Profile;
// 
