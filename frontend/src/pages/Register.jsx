import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import {
  GraduationCap,
  Lock,
  Mail,
  User,
  BookOpen,
  Loader2,
  ArrowRight,
  Users,
  Globe,
  Award,
  ContactRound,
  CheckCircle2,
  Clock3,
} from "lucide-react";

const personNamePattern = /^[\p{L}\p{M}]+(?:[ '\-][\p{L}\p{M}]+)*$/u;
const studentIdPattern = /^[A-Za-z0-9][A-Za-z0-9/-]{0,29}$/;

const Register = ({ onSwitchLogin }) => {
  const { register } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("student");
  const [studentId, setStudentId] = useState("");
  const [bio, setBio] = useState("");
  const [staffId, setStaffId] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [qualification, setQualification] = useState("");
  const [expertise, setExpertise] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");

  const [institutions, setInstitutions] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedInstitution, setSelectedInstitution] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("");

  const [loading, setLoading] = useState(false);
  const [loadingDepts, setLoadingDepts] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [mounted, setMounted] = useState(false);
  const [focusField, setFocusField] = useState(null);

  useEffect(() => {
    setMounted(true);
    const loadInstitutions = async () => {
      try {
        const res = await api.getInstitutions();
        setInstitutions(res.institutions || []);
      } catch (err) {
        console.error("Error fetching institutions:", err);
      }
    };
    loadInstitutions();
  }, []);

  useEffect(() => {
    if (!selectedInstitution) {
      setDepartments([]);
      setSelectedDepartment("");
      return;
    }
    const loadDepartments = async () => {
      setLoadingDepts(true);
      try {
        const res = await api.getDepartments(selectedInstitution);
        setDepartments(res.departments || []);
        setSelectedDepartment("");
      } catch (err) {
        console.error("Error fetching departments:", err);
      } finally {
        setLoadingDepts(false);
      }
    };
    loadDepartments();
  }, [selectedInstitution]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const needsProfessionalDetails = ["lecturer", "institution_admin"].includes(
      role,
    );
    if (
      !email ||
      !password ||
      !fullName ||
      !role ||
      (role === "student" && !studentId)
    ) {
      setErrorMsg("Please fill in all required fields.");
      return;
    }
    if (!personNamePattern.test(fullName.trim())) {
      setErrorMsg(
        "Full name must use letters, spaces, apostrophes, or hyphens only.",
      );
      return;
    }
    if (role === "student" && !studentIdPattern.test(studentId)) {
      setErrorMsg(
        "Student ID may contain letters, numbers, slashes, or hyphens, up to 30 characters.",
      );
      return;
    }
    if (
      needsProfessionalDetails &&
      (!selectedInstitution ||
        !staffId ||
        !jobTitle ||
        !qualification ||
        !expertise ||
        !phoneNumber)
    ) {
      setErrorMsg(
        "Complete the institution and professional verification fields for this role.",
      );
      return;
    }
    if (role === "lecturer" && !selectedDepartment) {
      setErrorMsg("Lecturers must select their department.");
      return;
    }
    setErrorMsg("");
    setSuccessMsg("");
    setLoading(true);
    try {
      const result = await register({
        email,
        password,
        fullName,
        role,
        studentId: role === "student" ? studentId : null,
        institutionId: selectedInstitution || null,
        departmentId: selectedDepartment || null,
        staffId: needsProfessionalDetails ? staffId : null,
        jobTitle: needsProfessionalDetails ? jobTitle : null,
        qualification: needsProfessionalDetails ? qualification : null,
        expertise: needsProfessionalDetails ? expertise : null,
        phoneNumber: needsProfessionalDetails ? phoneNumber : null,
        bio,
      });
      if (result.requiresApproval) setSuccessMsg(result.message);
    } catch (err) {
      setErrorMsg(err.message || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  const getInputStyle = (fieldName) => ({
    background: "#FFFFFF",
    border:
      focusField === fieldName ? "2px solid #2563EB" : "1.5px solid #E2E8F0",
    color: "#0F172A",
    outline: "none",
    boxShadow:
      focusField === fieldName ? "0 0 0 4px rgba(37,99,235,0.10)" : "none",
    transition: "border 0.2s, box-shadow 0.2s",
    fontFamily: "Inter, sans-serif",
  });

  const getIconColor = (fieldName) =>
    focusField === fieldName ? "#2563EB" : "#94A3B8";

  const selectStyle = (fieldName) => ({
    ...getInputStyle(fieldName),
    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%232563EB' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
    backgroundPosition: "right 0.75rem center",
    backgroundRepeat: "no-repeat",
    backgroundSize: "1.2em 1.2em",
    paddingRight: "2.5rem",
    appearance: "none",
    cursor: "pointer",
  });

  const features = [
    { icon: Users, label: "12,000+ academic members connected" },
    { icon: Globe, label: "280+ institutions worldwide" },
    { icon: Award, label: "3,400+ active projects" },
  ];
  const selectedInstitutionName = institutions.find(
    (institution) => String(institution.id) === String(selectedInstitution),
  )?.name;

  return (
    <div
      className="min-h-screen flex relative overflow-hidden"
      style={{ background: "#F8FAFC" }}
    >
      {/* ════════════════════════════════════════════════════════
          LEFT PANEL — Deep navy hero
          ════════════════════════════════════════════════════════ */}
      <div
        className="hidden lg:flex flex-col items-center justify-center p-16 relative overflow-hidden"
        style={{
          width: "42%",
          minWidth: "380px",
          background:
            "linear-gradient(145deg, #0F172A 0%, #1E3A8A 55%, #1D4ED8 100%)",
        }}
      >
        {/* Background decorations */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className="absolute -top-40 -left-40 w-96 h-96 rounded-full opacity-20"
            style={{
              background:
                "radial-gradient(circle, #60A5FA 0%, transparent 70%)",
            }}
          />
          <div
            className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full opacity-15"
            style={{
              background:
                "radial-gradient(circle, #3B82F6 0%, transparent 70%)",
            }}
          />
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full border border-dashed opacity-20 animate-spin-slow"
            style={{ borderColor: "rgba(147,197,253,0.5)" }}
          />
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full border opacity-15"
            style={{
              borderColor: "rgba(147,197,253,0.4)",
              animation: "spinSlow 18s linear infinite reverse",
            }}
          />
        </div>

        {/* Icon badge */}
        <div className="relative z-10 mb-8 animate-tilt-3d">
          <div
            className="w-24 h-24 rounded-3xl flex items-center justify-center shadow-2xl"
            style={{
              background:
                "linear-gradient(135deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.06) 100%)",
              border: "1px solid rgba(255,255,255,0.25)",
              backdropFilter: "blur(12px)",
            }}
          >
            <GraduationCap
              className="h-12 w-12"
              style={{ color: "#93C5FD" }}
              strokeWidth={1.5}
            />
          </div>
        </div>

        {/* Heading */}
        <div className="relative z-10 text-center mb-10">
          <h1
            className="text-3xl font-bold leading-tight mb-3"
            style={{
              color: "#FFFFFF",
              fontFamily: "Outfit, sans-serif",
              letterSpacing: "-0.02em",
            }}
          >
            Join the Network
          </h1>
          <p
            className="text-sm leading-relaxed"
            style={{ color: "rgba(186,230,253,0.85)" }}
          >
            Create an account to discover cross-institutional events, find
            collaboration partners, and join academic communities.
          </p>
        </div>

        {/* Feature list */}
        <div className="relative z-10 w-full max-w-xs space-y-3">
          {features.map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="flex items-center gap-3 px-4 py-3 rounded-xl"
              style={{
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.12)",
              }}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: "rgba(37,99,235,0.35)" }}
              >
                <Icon
                  className="h-4 w-4"
                  style={{ color: "#93C5FD" }}
                  strokeWidth={1.5}
                />
              </div>
              <span
                className="text-sm font-medium"
                style={{ color: "rgba(219,234,254,0.9)" }}
              >
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════
          RIGHT PANEL — Registration form
          ════════════════════════════════════════════════════════ */}
      <div
        className="flex-1 flex items-center justify-center p-6 relative overflow-y-auto"
        style={{ background: "#F8FAFC" }}
      >
        {/* Subtle orbs */}
        <div
          className="absolute top-0 right-0 w-80 h-80 rounded-full pointer-events-none"
          style={{
            background:
              "radial-gradient(circle, rgba(37,99,235,0.06) 0%, transparent 70%)",
            filter: "blur(40px)",
          }}
        />
        <div
          className="absolute bottom-0 left-0 w-64 h-64 rounded-full pointer-events-none"
          style={{
            background:
              "radial-gradient(circle, rgba(99,179,237,0.05) 0%, transparent 70%)",
            filter: "blur(40px)",
          }}
        />

        <div
          className={`w-full max-w-xl relative z-10 transition-all duration-700 ${mounted ? "animate-slide-up" : "opacity-0"}`}
        >
          <div
            className="rounded-3xl p-8"
            style={{
              background: "#FFFFFF",
              boxShadow:
                "0 4px 6px -1px rgba(0,0,0,0.07), 0 20px 50px -12px rgba(37,99,235,0.12)",
              border: "1px solid #E2E8F0",
            }}
          >
            {/* Top accent line */}
            <div
              className="absolute top-0 left-10 right-10 h-[3px] rounded-b-full"
              style={{
                background:
                  "linear-gradient(90deg, transparent, #2563EB, #60A5FA, transparent)",
              }}
            />

            {/* Header */}
            <div className="flex flex-col items-center mb-7">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mb-3"
                style={{
                  background: "linear-gradient(135deg, #EFF6FF, #DBEAFE)",
                }}
              >
                {successMsg ? (
                  <CheckCircle2
                    className="h-6 w-6 text-blue-700"
                    strokeWidth={1.7}
                  />
                ) : (
                  <User className="h-6 w-6 text-blue-600" strokeWidth={1.5} />
                )}
              </div>
              <h2
                className="text-2xl font-bold text-center mb-1"
                style={{
                  color: "#0F172A",
                  fontFamily: "Outfit, sans-serif",
                  letterSpacing: "-0.02em",
                }}
              >
                {successMsg ? "Registration successful" : "Create Account"}
              </h2>
              <p
                className="text-xs text-center font-semibold uppercase tracking-widest"
                style={{ color: "#64748B" }}
              >
                {successMsg
                  ? "Application pending approval"
                  : "Enter your details to get started"}
              </p>
            </div>

            {successMsg ? (
              <section
                role="status"
                aria-live="polite"
                aria-atomic="true"
                className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-center"
              >
                <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700">
                  <Clock3 className="h-5 w-5" aria-hidden="true" />
                </span>
                <h3 className="mt-4 text-base font-bold text-slate-950">
                  Waiting for System Administrator approval
                </h3>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
                  {successMsg}
                </p>
                <dl className="mt-5 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left text-xs sm:grid-cols-2">
                  <div>
                    <dt className="font-bold uppercase tracking-wider text-slate-500">
                      Applicant
                    </dt>
                    <dd className="mt-1 font-semibold text-slate-900">
                      {fullName}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-bold uppercase tracking-wider text-slate-500">
                      Institution
                    </dt>
                    <dd className="mt-1 font-semibold text-slate-900">
                      {selectedInstitutionName || "Selected institution"}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-bold uppercase tracking-wider text-slate-500">
                      Role
                    </dt>
                    <dd className="mt-1 font-semibold text-slate-900">
                      Institution Administrator
                    </dd>
                  </div>
                  <div>
                    <dt className="font-bold uppercase tracking-wider text-slate-500">
                      Status
                    </dt>
                    <dd className="mt-1 font-semibold text-slate-900">
                      Pending review
                    </dd>
                  </div>
                </dl>
                <p className="mt-4 text-xs leading-5 text-slate-500">
                  You will be able to sign in after a System Administrator
                  reviews and approves your professional information.
                </p>
              </section>
            ) : (
              <>
                {errorMsg && (
                  <div
                    role="alert"
                    className="mb-5 p-4 rounded-xl text-sm font-medium flex items-center gap-2 animate-scale-in"
                    style={{
                      background: "#FEF2F2",
                      border: "1px solid #FECACA",
                      color: "#DC2626",
                    }}
                  >
                    {errorMsg}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Row 1: Full Name + Email */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="register-full-name"
                        className="block text-xs font-semibold mb-1.5 uppercase tracking-wider"
                        style={{ color: "#475569" }}
                      >
                        Full Name *
                      </label>
                      <div className="relative">
                        <span
                          className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none"
                          style={{ color: getIconColor("name") }}
                        >
                          <User className="h-4 w-4" />
                        </span>
                        <input
                          id="register-full-name"
                          type="text"
                          placeholder="Divine Iradukunda"
                          value={fullName}
                          required
                          onChange={(e) => setFullName(e.target.value)}
                          onFocus={() => setFocusField("name")}
                          onBlur={() => setFocusField(null)}
                          className="w-full pl-10 pr-4 py-3 rounded-xl text-sm"
                          style={getInputStyle("name")}
                        />
                      </div>
                    </div>
                    <div>
                      <label
                        className="block text-xs font-semibold mb-1.5 uppercase tracking-wider"
                        style={{ color: "#475569" }}
                      >
                        Email Address *
                      </label>
                      <div className="relative">
                        <span
                          className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none"
                          style={{ color: getIconColor("email") }}
                        >
                          <Mail className="h-4 w-4" />
                        </span>
                        <input
                          type="email"
                          placeholder="john@university.edu"
                          value={email}
                          required
                          onChange={(e) => setEmail(e.target.value)}
                          onFocus={() => setFocusField("email")}
                          onBlur={() => setFocusField(null)}
                          className="w-full pl-10 pr-4 py-3 rounded-xl text-sm"
                          style={getInputStyle("email")}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Row 2: Password + Role */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label
                        className="block text-xs font-semibold mb-1.5 uppercase tracking-wider"
                        style={{ color: "#475569" }}
                      >
                        Password *
                      </label>
                      <div className="relative">
                        <span
                          className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none"
                          style={{ color: getIconColor("password") }}
                        >
                          <Lock className="h-4 w-4" />
                        </span>
                        <input
                          type="password"
                          placeholder="••••••••"
                          value={password}
                          required
                          onChange={(e) => setPassword(e.target.value)}
                          onFocus={() => setFocusField("password")}
                          onBlur={() => setFocusField(null)}
                          className="w-full pl-10 pr-4 py-3 rounded-xl text-sm"
                          style={getInputStyle("password")}
                        />
                      </div>
                    </div>
                    <div>
                      <label
                        htmlFor="register-role"
                        className="block text-xs font-semibold mb-1.5 uppercase tracking-wider"
                        style={{ color: "#475569" }}
                      >
                        Academic Role *
                      </label>
                      <select
                        id="register-role"
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        onFocus={() => setFocusField("role")}
                        onBlur={() => setFocusField(null)}
                        className="w-full px-4 py-3 rounded-xl text-sm"
                        style={selectStyle("role")}
                      >
                        <option value="student">Student</option>
                        <option value="lecturer">Lecturer</option>
                        <option value="institution_admin">
                          Institution Administrator
                        </option>
                      </select>
                    </div>
                  </div>

                  {role === "student" && (
                    <div>
                      <label
                        htmlFor="student-id"
                        className="block text-xs font-semibold mb-1.5 uppercase tracking-wider"
                        style={{ color: "#475569" }}
                      >
                        Student ID *
                      </label>
                      <div className="relative">
                        <span
                          className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none"
                          style={{ color: getIconColor("studentId") }}
                        >
                          <ContactRound className="h-4 w-4" />
                        </span>
                        <input
                          id="student-id"
                          type="text"
                          pattern="[A-Za-z0-9][A-Za-z0-9/-]{0,29}"
                          maxLength={30}
                          placeholder="Example: 20418 or BIT/20-IT"
                          value={studentId}
                          required
                          onChange={(e) =>
                            setStudentId(
                              e.target.value
                                .replace(/[^A-Za-z0-9/-]/g, "")
                                .slice(0, 30),
                            )
                          }
                          onFocus={() => setFocusField("studentId")}
                          onBlur={() => setFocusField(null)}
                          className="w-full pl-10 pr-4 py-3 rounded-xl text-sm"
                          style={getInputStyle("studentId")}
                          aria-describedby="student-id-help"
                        />
                      </div>
                      <p
                        id="student-id-help"
                        className="mt-1.5 text-[11px] text-slate-500"
                      >
                        Letters, numbers, slashes, and hyphens are accepted.
                      </p>
                    </div>
                  )}

                  {/* Row 3: Institution + Department */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="register-institution"
                        className="block text-xs font-semibold mb-1.5 uppercase tracking-wider"
                        style={{ color: "#475569" }}
                      >
                        Institution
                        {["lecturer", "institution_admin"].includes(role)
                          ? " *"
                          : ""}
                      </label>
                      <select
                        id="register-institution"
                        value={selectedInstitution}
                        onChange={(e) => setSelectedInstitution(e.target.value)}
                        onFocus={() => setFocusField("inst")}
                        onBlur={() => setFocusField(null)}
                        className="w-full px-4 py-3 rounded-xl text-sm"
                        style={selectStyle("inst")}
                      >
                        <option value="">Select Institution...</option>
                        {institutions.map((inst) => (
                          <option key={inst.id} value={inst.id}>
                            {inst.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label
                        htmlFor="register-department"
                        className="block text-xs font-semibold mb-1.5 uppercase tracking-wider"
                        style={{ color: "#475569" }}
                      >
                        Department{role === "lecturer" ? " *" : ""}
                        {loadingDepts && (
                          <span
                            className="ml-1.5 text-[10px] lowercase font-normal animate-pulse"
                            style={{ color: "#2563EB" }}
                          >
                            (loading...)
                          </span>
                        )}
                      </label>
                      <select
                        id="register-department"
                        value={selectedDepartment}
                        onChange={(e) => setSelectedDepartment(e.target.value)}
                        disabled={!selectedInstitution || loadingDepts}
                        onFocus={() => setFocusField("dept")}
                        onBlur={() => setFocusField(null)}
                        className="w-full px-4 py-3 rounded-xl text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        style={selectStyle("dept")}
                      >
                        <option value="">Select Department...</option>
                        {departments.map((dept) => (
                          <option key={dept.id} value={dept.id}>
                            {dept.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {["lecturer", "institution_admin"].includes(role) && (
                    <fieldset className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <legend className="px-1 text-xs font-semibold uppercase tracking-wider text-slate-700">
                        Professional verification
                      </legend>
                      <p className="text-xs leading-5 text-slate-600">
                        {role === "institution_admin"
                          ? "A System Administrator will review these details before activating your account."
                          : "These details help confirm your academic staff profile."}
                      </p>
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <label className="text-xs font-semibold text-slate-700">
                          Staff ID *
                          <input
                            required
                            maxLength={50}
                            value={staffId}
                            onChange={(e) => setStaffId(e.target.value)}
                            className="mt-1.5 w-full rounded-xl px-4 py-3 text-sm"
                            style={getInputStyle("staffId")}
                            placeholder="Institution staff number"
                          />
                        </label>
                        <label className="text-xs font-semibold text-slate-700">
                          Job title *
                          <input
                            required
                            maxLength={120}
                            value={jobTitle}
                            onChange={(e) => setJobTitle(e.target.value)}
                            className="mt-1.5 w-full rounded-xl px-4 py-3 text-sm"
                            style={getInputStyle("jobTitle")}
                            placeholder="Lecturer or Administrator"
                          />
                        </label>
                        <label className="text-xs font-semibold text-slate-700">
                          Highest qualification *
                          <input
                            required
                            maxLength={255}
                            value={qualification}
                            onChange={(e) => setQualification(e.target.value)}
                            className="mt-1.5 w-full rounded-xl px-4 py-3 text-sm"
                            style={getInputStyle("qualification")}
                            placeholder="Example: MSc Information Systems"
                          />
                        </label>
                        <label className="text-xs font-semibold text-slate-700">
                          Phone number *
                          <input
                            required
                            type="tel"
                            maxLength={26}
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            className="mt-1.5 w-full rounded-xl px-4 py-3 text-sm"
                            style={getInputStyle("phoneNumber")}
                            placeholder="+250 700 000 000"
                          />
                        </label>
                      </div>
                      <label className="block text-xs font-semibold text-slate-700">
                        Expertise or administrative area *
                        <textarea
                          required
                          rows={2}
                          value={expertise}
                          onChange={(e) => setExpertise(e.target.value)}
                          className="mt-1.5 w-full resize-none rounded-xl px-4 py-3 text-sm"
                          style={getInputStyle("expertise")}
                          placeholder="Primary teaching, academic, or administrative responsibilities"
                        />
                      </label>
                    </fieldset>
                  )}

                  {/* Bio */}
                  <div>
                    <label
                      className="block text-xs font-semibold mb-1.5 uppercase tracking-wider"
                      style={{ color: "#475569" }}
                    >
                      Academic Bio / Focus
                    </label>
                    <div className="relative">
                      <span
                        className="absolute top-3.5 left-3.5 pointer-events-none"
                        style={{ color: getIconColor("bio") }}
                      >
                        <BookOpen className="h-4 w-4" />
                      </span>
                      <textarea
                        placeholder="Share your fields of study or academic projects..."
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        onFocus={() => setFocusField("bio")}
                        onBlur={() => setFocusField(null)}
                        rows={3}
                        className="w-full pl-10 pr-4 py-3 rounded-xl text-sm resize-none"
                        style={getInputStyle("bio")}
                      />
                    </div>
                  </div>

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={loading || Boolean(successMsg)}
                    className="w-full py-3.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all duration-200 group"
                    style={{
                      background: loading
                        ? "#93C5FD"
                        : "linear-gradient(135deg, #1D4ED8, #2563EB)",
                      color: "#FFFFFF",
                      fontFamily: "Outfit, sans-serif",
                      cursor: loading ? "not-allowed" : "pointer",
                      boxShadow: loading
                        ? "none"
                        : "0 4px 14px rgba(37,99,235,0.35)",
                      letterSpacing: "0.01em",
                    }}
                    onMouseEnter={(e) => {
                      if (!loading) {
                        e.currentTarget.style.transform = "translateY(-2px)";
                        e.currentTarget.style.boxShadow =
                          "0 8px 20px rgba(37,99,235,0.45)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = loading
                        ? "none"
                        : "0 4px 14px rgba(37,99,235,0.35)";
                    }}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>Registering...</span>
                      </>
                    ) : (
                      <>
                        <span>Create Account</span>
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </>
                    )}
                  </button>
                </form>
              </>
            )}

            {/* Footer */}
            <div
              className="mt-7 pt-5 text-center"
              style={{ borderTop: "1px solid #E2E8F0" }}
            >
              <p className="text-sm" style={{ color: "#64748B" }}>
                Already have an account?{" "}
                <button
                  onClick={onSwitchLogin}
                  className="font-bold transition-colors duration-200"
                  style={{ color: "#2563EB" }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.color = "#1D4ED8")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.color = "#2563EB")
                  }
                >
                  Sign in instead
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
