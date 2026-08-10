import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Activity,
  AlertCircle,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  GraduationCap,
  ContactRound,
  Eye,
  LayoutDashboard,
  Lock,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  Unlock,
  UserCog,
  Users,
  X,
} from "lucide-react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

const inputClass =
  "w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100";
const labelClass =
  "mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-600";

const tabs = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "people", label: "People", icon: Users },
  { id: "organizations", label: "Organizations", icon: Building2 },
  { id: "roles", label: "Roles", icon: UserCog },
  { id: "moderation", label: "Moderation", icon: ShieldCheck },
  { id: "activity", label: "Activity", icon: Activity },
];

const emptyCounts = { users: {}, entities: {} };

function Panel({ title, description, action, children, className = "" }) {
  return (
    <section
      className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`}
    >
      <header className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-bold text-slate-900">{title}</h2>
          {description && (
            <p className="mt-1 text-xs leading-5 text-slate-500">
              {description}
            </p>
          )}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

function Metric({ icon: Icon, label, value, detail, tone = "blue" }) {
  const tones = {
    blue: "bg-blue-50 text-blue-700 ring-blue-100",
    violet: "bg-violet-50 text-violet-700 ring-violet-100",
    amber: "bg-amber-50 text-amber-700 ring-amber-100",
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  };
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div
        className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl ring-1 ${tones[tone]}`}
      >
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950">
        {value ?? 0}
      </p>
      <p className="mt-1 text-xs text-slate-500">{detail}</p>
    </div>
  );
}

function EmptyState({ icon: Icon, title, detail }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
        <Icon className="h-5 w-5" />
      </span>
      <p className="text-sm font-bold text-slate-800">{title}</p>
      <p className="mt-1 max-w-sm text-xs leading-5 text-slate-500">{detail}</p>
    </div>
  );
}

function Dialog({
  title,
  description,
  error,
  onClose,
  children,
  wide = false,
}) {
  const closeButtonRef = useRef(null);
  useEffect(() => {
    const previousFocus = document.activeElement;
    const closeOnEscape = (event) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", closeOnEscape);
    closeButtonRef.current?.focus();
    return () => {
      window.removeEventListener("keydown", closeOnEscape);
      previousFocus?.focus?.();
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-sm"
      onMouseDown={onClose}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-dialog-title"
        className={`max-h-[90vh] w-full overflow-y-auto rounded-2xl border border-white/60 bg-white shadow-2xl ${wide ? "max-w-3xl" : "max-w-lg"}`}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
          <div>
            <h2
              id="admin-dialog-title"
              className="text-lg font-extrabold text-slate-950"
            >
              {title}
            </h2>
            {description && (
              <p className="mt-1 text-xs leading-5 text-slate-500">
                {description}
              </p>
            )}
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </header>
        {error && (
          <div
            role="alert"
            className="mx-6 mt-5 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs leading-5 text-red-800"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </div>
        )}
        {children}
      </section>
    </div>
  );
}

function FormActions({ saving, onCancel, submitLabel }) {
  return (
    <footer className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50/70 px-6 py-4 sm:flex-row sm:justify-end">
      <button
        type="button"
        onClick={onCancel}
        className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
      >
        Cancel
      </button>
      <button
        type="submit"
        disabled={saving}
        className="rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {saving ? "Saving…" : submitLabel}
      </button>
    </footer>
  );
}

function InstitutionForm({ item, saving, onCancel, onSave }) {
  const [form, setForm] = useState({
    name: item?.name || "",
    type: item?.type || "University",
    location: item?.location || "",
  });
  const set = (field) => (event) =>
    setForm((current) => ({ ...current, [field]: event.target.value }));
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSave(form);
      }}
    >
      <div className="space-y-4 px-6 py-5">
        <label>
          <span className={labelClass}>Institution name</span>
          <input
            autoFocus
            required
            value={form.name}
            onChange={set("name")}
            className={inputClass}
            placeholder="Example State University"
          />
        </label>
        <label>
          <span className={labelClass}>Type</span>
          <select
            required
            value={form.type}
            onChange={set("type")}
            className={inputClass}
          >
            <option>University</option>
            <option>College</option>
            <option>Research Institute</option>
            <option>Training Center</option>
            <option>Other</option>
          </select>
        </label>
        <label>
          <span className={labelClass}>Location</span>
          <input
            required
            value={form.location}
            onChange={set("location")}
            className={inputClass}
            placeholder="Kigali, Rwanda"
          />
        </label>
      </div>
      <FormActions
        saving={saving}
        onCancel={onCancel}
        submitLabel={item ? "Save changes" : "Create institution"}
      />
    </form>
  );
}

function DepartmentForm({ item, institutions, saving, onCancel, onSave }) {
  const [form, setForm] = useState({
    name: item?.name || "",
    institutionId: item?.institution_id || institutions[0]?.id || "",
  });
  const set = (field) => (event) =>
    setForm((current) => ({ ...current, [field]: event.target.value }));
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSave(form);
      }}
    >
      <div className="space-y-4 px-6 py-5">
        <label>
          <span className={labelClass}>Department name</span>
          <input
            autoFocus
            required
            value={form.name}
            onChange={set("name")}
            className={inputClass}
            placeholder="Computer Science"
          />
        </label>
        <label>
          <span className={labelClass}>Institution</span>
          <select
            required
            value={form.institutionId}
            onChange={set("institutionId")}
            className={inputClass}
          >
            <option value="">Select an institution</option>
            {institutions.map((institution) => (
              <option key={institution.id} value={institution.id}>
                {institution.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <FormActions
        saving={saving}
        onCancel={onCancel}
        submitLabel={item ? "Save changes" : "Create department"}
      />
    </form>
  );
}

function RoleForm({
  item,
  institutions,
  allowScope,
  saving,
  onCancel,
  onSave,
}) {
  const [form, setForm] = useState({
    name: item?.name || "",
    description: item?.description || "",
    baseRole: item?.base_role || "student",
    color: item?.color || "#2563EB",
    institutionId: item?.institution_id || "",
  });
  const set = (field) => (event) =>
    setForm((current) => ({ ...current, [field]: event.target.value }));
  const accessOptions = item?.is_system
    ? [
        { value: "student", label: "Student" },
        { value: "lecturer", label: "Lecturer" },
        { value: "institution_admin", label: "Institution Administrator" },
        { value: "admin", label: "System Administrator" },
      ]
    : [
        { value: "student", label: "Student" },
        { value: "lecturer", label: "Lecturer" },
      ];
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSave(form);
      }}
    >
      <div className="space-y-4 px-6 py-5">
        <label>
          <span className={labelClass}>Role name</span>
          <input
            autoFocus
            required
            value={form.name}
            onChange={set("name")}
            className={inputClass}
            placeholder="Department Coordinator"
          />
        </label>
        <label>
          <span className={labelClass}>Description</span>
          <textarea
            rows="3"
            value={form.description}
            onChange={set("description")}
            className={inputClass}
            placeholder="What is this role used for?"
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-[1fr_92px]">
          <label>
            <span className={labelClass}>Inherited access</span>
            <select
              disabled={item?.is_system}
              value={form.baseRole}
              onChange={set("baseRole")}
              className={`${inputClass} disabled:bg-slate-100`}
            >
              {accessOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className={labelClass}>Color</span>
            <input
              type="color"
              value={form.color}
              onChange={set("color")}
              className="h-[42px] w-full cursor-pointer rounded-xl border border-slate-300 bg-white p-1.5"
            />
          </label>
        </div>
        {allowScope && !item && (
          <label>
            <span className={labelClass}>Role scope</span>
            <select
              value={form.institutionId}
              onChange={set("institutionId")}
              className={inputClass}
            >
              <option value="">Available to every institution</option>
              {institutions.map((institution) => (
                <option key={institution.id} value={institution.id}>
                  {institution.name} only
                </option>
              ))}
            </select>
          </label>
        )}
        {!item?.is_system && (
          <div className="flex gap-2 rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs leading-5 text-blue-800">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
            Custom roles can inherit Student or Lecturer access only.
            Administrator access is assigned through protected system roles.
          </div>
        )}
      </div>
      <FormActions
        saving={saving}
        onCancel={onCancel}
        submitLabel={item ? "Save changes" : "Create role"}
      />
    </form>
  );
}

function UserForm({
  item,
  institutions,
  departments,
  roles,
  isSystemAdmin,
  saving,
  onCancel,
  onSave,
}) {
  const initialInstitution = item?.institution_id || institutions[0]?.id || "";
  const assignableRoles = roles.filter(
    (role) =>
      role.can_assign &&
      (!role.institution_id ||
        Number(role.institution_id) === Number(initialInstitution)),
  );
  const [form, setForm] = useState({
    fullName: item?.full_name || "",
    email: item?.email || "",
    password: "",
    institutionId: initialInstitution,
    departmentId: item?.department_id || "",
    studentId: item?.student_id || "",
    staffId: item?.staff_id || "",
    jobTitle: item?.job_title || "",
    qualification: item?.qualification || "",
    expertise: item?.expertise || "",
    phoneNumber: item?.phone_number || "",
    roleId: item?.role_id || assignableRoles[0]?.id || "",
    bio: item?.bio || "",
  });
  const set = (field) => (event) =>
    setForm((current) => ({ ...current, [field]: event.target.value }));
  const availableDepartments = departments.filter(
    (department) =>
      Number(department.institution_id) === Number(form.institutionId),
  );
  const availableRoles = roles.filter(
    (role) =>
      Number(role.id) === Number(item?.role_id) ||
      (role.can_assign &&
        (!role.institution_id ||
          Number(role.institution_id) === Number(form.institutionId))),
  );
  const selectedRole = roles.find(
    (role) => Number(role.id) === Number(form.roleId),
  );
  const isStudent = selectedRole?.base_role === "student";
  const isProfessional = ["lecturer", "institution_admin", "admin"].includes(
    selectedRole?.base_role,
  );
  const affiliationLocked = Boolean(item) && !isSystemAdmin;
  const changeInstitution = (event) => {
    const institutionId = event.target.value;
    const nextRoles = roles.filter(
      (role) =>
        role.can_assign &&
        (!role.institution_id ||
          Number(role.institution_id) === Number(institutionId)),
    );
    setForm((current) => ({
      ...current,
      institutionId,
      departmentId: "",
      roleId: nextRoles.some(
        (role) => Number(role.id) === Number(current.roleId),
      )
        ? current.roleId
        : nextRoles[0]?.id || "",
    }));
  };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSave(form);
      }}
    >
      <div className="space-y-4 px-6 py-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <label>
            <span className={labelClass}>Full name</span>
            <input
              autoFocus
              required
              value={form.fullName}
              onChange={set("fullName")}
              className={inputClass}
              placeholder="Full name"
            />
          </label>
          <label>
            <span className={labelClass}>Email address</span>
            <input
              type="email"
              required
              value={form.email}
              onChange={set("email")}
              className={inputClass}
              placeholder="name@institution.edu"
            />
          </label>
        </div>
        {!item && (
          <label>
            <span className={labelClass}>Temporary password</span>
            <input
              type="password"
              required
              minLength="8"
              value={form.password}
              onChange={set("password")}
              className={inputClass}
              placeholder="At least 8 characters"
            />
          </label>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <label>
            <span className={labelClass}>Institution</span>
            <select
              required={
                form.roleId &&
                roles.find((role) => Number(role.id) === Number(form.roleId))
                  ?.base_role === "institution_admin"
              }
              disabled={!isSystemAdmin}
              value={form.institutionId}
              onChange={changeInstitution}
              className={`${inputClass} disabled:cursor-not-allowed disabled:bg-slate-100`}
            >
              <option value="">No institution</option>
              {institutions.map((institution) => (
                <option key={institution.id} value={institution.id}>
                  {institution.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className={labelClass}>Department</span>
            <select
              disabled={affiliationLocked}
              value={form.departmentId}
              onChange={set("departmentId")}
              className={`${inputClass} disabled:cursor-not-allowed disabled:bg-slate-100`}
            >
              <option value="">No department</option>
              {availableDepartments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label>
          <span className={labelClass}>Role</span>
          <select
            required
            value={form.roleId}
            onChange={set("roleId")}
            className={inputClass}
          >
            {availableRoles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
                {role.institution_name ? ` · ${role.institution_name}` : ""}
              </option>
            ))}
          </select>
        </label>
        {isStudent && (
          <label>
            <span className={labelClass}>Student ID</span>
            <span className="relative block">
              <ContactRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                required
                pattern="[A-Za-z0-9][A-Za-z0-9/-]{0,29}"
                maxLength="30"
                value={form.studentId}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    studentId: event.target.value
                      .replace(/[^A-Za-z0-9/-]/g, "")
                      .slice(0, 30),
                  }))
                }
                className={`${inputClass} pl-10`}
                placeholder="Example: 20418 or BIT/20-IT"
              />
            </span>
          </label>
        )}
        {isProfessional && (
          <fieldset className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <legend className={`${labelClass} px-1`}>
              Professional verification
            </legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <label>
                <span className={labelClass}>Staff ID</span>
                <input
                  required
                  maxLength="50"
                  value={form.staffId}
                  onChange={set("staffId")}
                  className={inputClass}
                />
              </label>
              <label>
                <span className={labelClass}>Job title</span>
                <input
                  required
                  maxLength="120"
                  value={form.jobTitle}
                  onChange={set("jobTitle")}
                  className={inputClass}
                />
              </label>
              <label>
                <span className={labelClass}>Highest qualification</span>
                <input
                  required
                  maxLength="255"
                  value={form.qualification}
                  onChange={set("qualification")}
                  className={inputClass}
                />
              </label>
              <label>
                <span className={labelClass}>Phone number</span>
                <input
                  required
                  type="tel"
                  maxLength="26"
                  value={form.phoneNumber}
                  onChange={set("phoneNumber")}
                  className={inputClass}
                />
              </label>
            </div>
            <label>
              <span className={labelClass}>
                Expertise or administrative area
              </span>
              <textarea
                required
                rows="3"
                value={form.expertise}
                onChange={set("expertise")}
                className={inputClass}
              />
            </label>
          </fieldset>
        )}
        {affiliationLocked && (
          <p className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-[11px] font-medium text-slate-600">
            <Lock className="h-4 w-4 shrink-0" />
            Only a system administrator can change an existing user&apos;s
            institution or department.
          </p>
        )}
        <label>
          <span className={labelClass}>Biography or notes</span>
          <textarea
            rows="3"
            value={form.bio}
            onChange={set("bio")}
            className={inputClass}
            placeholder="Optional academic information"
          />
        </label>
      </div>
      <FormActions
        saving={saving}
        onCancel={onCancel}
        submitLabel={item ? "Save user" : "Create user"}
      />
    </form>
  );
}

function ReviewField({ label, value, wide = false }) {
  return (
    <div
      className={`rounded-xl border border-slate-200 bg-white p-3.5 ${wide ? "sm:col-span-2" : ""}`}
    >
      <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
        {label}
      </dt>
      <dd className="mt-1.5 whitespace-pre-wrap text-xs font-semibold leading-5 text-slate-900">
        {value || "Not provided"}
      </dd>
    </div>
  );
}

function ApplicationReviewCard({
  applicant,
  saving,
  onClose,
  onEdit,
  onDecision,
}) {
  const [notes, setNotes] = useState("");
  const complete = Boolean(
    applicant.institution_id &&
    applicant.staff_id &&
    applicant.job_title &&
    applicant.qualification &&
    applicant.expertise &&
    applicant.phone_number,
  );

  return (
    <div className="space-y-5 px-6 py-5">
      <section className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-extrabold text-slate-950">
            {applicant.full_name}
          </p>
          <p className="mt-1 text-xs text-slate-600">{applicant.email}</p>
        </div>
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-amber-200 bg-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-800">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
          Pending approval
        </span>
      </section>

      <section aria-labelledby="application-affiliation-title">
        <h3
          id="application-affiliation-title"
          className="text-xs font-extrabold uppercase tracking-wider text-slate-700"
        >
          Account and affiliation
        </h3>
        <dl className="mt-3 grid gap-3 sm:grid-cols-2">
          <ReviewField
            label="Requested role"
            value="Institution Administrator"
          />
          <ReviewField
            label="Submitted"
            value={new Date(applicant.created_at).toLocaleString()}
          />
          <ReviewField label="Institution" value={applicant.institution_name} />
          <ReviewField
            label="Department"
            value={applicant.department_name || "No department selected"}
          />
        </dl>
      </section>

      <section aria-labelledby="application-professional-title">
        <h3
          id="application-professional-title"
          className="text-xs font-extrabold uppercase tracking-wider text-slate-700"
        >
          Professional information
        </h3>
        <dl className="mt-3 grid gap-3 sm:grid-cols-2">
          <ReviewField label="Staff ID" value={applicant.staff_id} />
          <ReviewField label="Job title" value={applicant.job_title} />
          <ReviewField
            label="Highest qualification"
            value={applicant.qualification}
          />
          <ReviewField label="Phone number" value={applicant.phone_number} />
          <ReviewField
            label="Expertise or administrative area"
            value={applicant.expertise}
            wide
          />
          <ReviewField label="Biography or notes" value={applicant.bio} wide />
        </dl>
      </section>

      {!complete && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          This application is missing required information. Edit the applicant
          before approval.
        </div>
      )}

      <footer className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:items-center">
        <button
          type="button"
          onClick={onClose}
          disabled={saving}
          className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          Close
        </button>
        <button
          type="button"
          onClick={onEdit}
          disabled={saving}
          className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          Edit information
        </button>
        <div className="sm:ml-auto flex flex-col-reverse gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => onDecision("reject", notes)}
            disabled={saving || !notes.trim()}
            className="rounded-xl border border-red-200 bg-white px-4 py-2.5 text-xs font-bold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Reject
          </button>
          <button
            type="button"
            onClick={() => onDecision("approve", notes)}
            disabled={saving || !complete}
            className="rounded-xl bg-blue-700 px-4 py-2.5 text-xs font-bold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {saving ? "Saving…" : "Approve application"}
          </button>
        </div>
      </footer>
    </div>
  );
}

function Admin() {
  const { user: currentUser } = useAuth();
  const isSystemAdmin = currentUser?.role === "admin";
  const [activeTab, setActiveTab] = useState("overview");
  const [data, setData] = useState({
    stats: emptyCounts,
    users: [],
    institutions: [],
    departments: [],
    roles: [],
    communities: [],
    events: [],
    logs: [],
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [editor, setEditor] = useState(null);
  const [reviewing, setReviewing] = useState(null);

  const loadAdminData = useCallback(
    async (quiet = false) => {
      if (quiet) setRefreshing(true);
      else setLoading(true);
      setError("");
      try {
        const [
          stats,
          users,
          institutions,
          departments,
          roles,
          communities,
          events,
          audit,
        ] = await Promise.all([
          api.getAdminStats(),
          api.getAdminUsers(),
          api.getAdminInstitutions(),
          api.getAdminDepartments(),
          api.getAdminRoles(),
          api
            .getAdminCommunities()
            .catch((err) =>
              err.status === 404 ? api.getCommunities() : Promise.reject(err),
            ),
          api
            .getAdminEvents()
            .catch((err) =>
              err.status === 404 ? api.getEvents() : Promise.reject(err),
            ),
          api.getAdminAuditLogs(),
        ]);
        const roleRecords = (roles.roles || []).map((role) => ({
          ...role,
          can_assign: isSystemAdmin ? true : Boolean(role.can_assign),
          can_manage: isSystemAdmin ? true : Boolean(role.can_manage),
        }));
        setData({
          stats,
          users: users.users || [],
          institutions: institutions.institutions || [],
          departments: departments.departments || [],
          roles: roleRecords,
          communities: communities.communities || [],
          events: events.events || [],
          logs: audit.logs || [],
        });
      } catch (err) {
        setError(
          err.message || "The administrative workspace could not be loaded.",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [isSystemAdmin],
  );

  useEffect(() => {
    loadAdminData();
  }, [loadAdminData]);
  useEffect(() => {
    if (editor) setError("");
  }, [editor?.type, editor?.item?.id]);
  useEffect(() => {
    if (reviewing) setError("");
  }, [reviewing?.id]);

  const flash = (message) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 3500);
  };

  const runAndReload = async (operation) => {
    setSaving(true);
    setError("");
    try {
      const result = await operation();
      setEditor(null);
      flash(result.message || "Changes saved.");
      await loadAdminData(true);
    } catch (err) {
      setError(err.message || "The change could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  const saveEditor = (form) => {
    const { type, item } = editor;
    if (type === "user")
      return runAndReload(() =>
        item ? api.updateAdminUser(item.id, form) : api.createAdminUser(form),
      );
    if (type === "institution")
      return runAndReload(() =>
        item
          ? api.updateAdminInstitution(item.id, form)
          : api.createAdminInstitution(form),
      );
    if (type === "department")
      return runAndReload(() =>
        item
          ? api.updateAdminDepartment(item.id, form)
          : api.createAdminDepartment(form),
      );
    return runAndReload(() =>
      item ? api.updateAdminRole(item.id, form) : api.createAdminRole(form),
    );
  };

  const removeRecord = async (type, item) => {
    const warnings = {
      institution: `Delete ${item.name}? Its ${item.department_count || 0} department(s) will also be deleted and assigned users will become unaffiliated.`,
      department: `Delete ${item.name}? Assigned users will no longer have a department.`,
      role: `Delete the ${item.name} role? This is only allowed when no users are assigned.`,
      community: `Permanently delete the ${item.name} community and all of its discussions?`,
      event: `Cancel and permanently delete the ${item.title} event?`,
    };
    if (!window.confirm(warnings[type])) return;
    const operations = {
      institution: () => api.deleteAdminInstitution(item.id),
      department: () => api.deleteAdminDepartment(item.id),
      role: () => api.deleteAdminRole(item.id),
      community: () => api.adminDeleteCommunity(item.id),
      event: () => api.adminDeleteEvent(item.id),
    };
    await runAndReload(operations[type]);
  };

  const toggleStatus = async (user) => {
    setError("");
    try {
      const result = await api.toggleUserStatus(user.id);
      flash(result.message);
      await loadAdminData(true);
    } catch (err) {
      setError(err.message || "User status could not be changed.");
    }
  };

  const reviewApplication = async (decision, notes = "") => {
    if (!reviewing) return;
    if (decision === "reject" && !notes.trim()) {
      setError("Add review notes before rejecting this application.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const result = await api.reviewInstitutionAdministrator(
        reviewing.id,
        decision,
        notes.trim(),
      );
      setReviewing(null);
      flash(result.message);
      await loadAdminData(true);
    } catch (err) {
      setError(err.message || "The application could not be reviewed.");
    } finally {
      setSaving(false);
    }
  };

  const changeRole = async (user, roleId) => {
    setError("");
    try {
      const result = await api.changeUserRole(user.id, roleId);
      flash(result.message);
      await loadAdminData(true);
    } catch (err) {
      setError(err.message || "User role could not be changed.");
    }
  };

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase();
    return data.users.filter((user) => {
      const matchesText =
        !term ||
        [
          user.full_name,
          user.email,
          user.institution_name,
          user.department_name,
        ].some((value) => value?.toLowerCase().includes(term));
      return (
        matchesText &&
        (roleFilter === "all" || String(user.role_id) === roleFilter)
      );
    });
  }, [data.users, roleFilter, search]);

  const stats = data.stats || emptyCounts;
  const actionButton = (label, onClick) => (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-3.5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-blue-700"
    >
      <Plus className="h-4 w-4" />
      {label}
    </button>
  );
  const quickActions = [
    ...(isSystemAdmin
      ? [
          [
            "Add institution",
            Building2,
            "organizations",
            { type: "institution" },
          ],
        ]
      : []),
    ["Add department", GraduationCap, "organizations", { type: "department" }],
    ["Add user", Users, "people", { type: "user" }],
    ["Create custom role", UserCog, "roles", { type: "role" }],
    ["Review people", Users, "people", null],
  ];
  const canModifyUser = (managedUser) =>
    Number(managedUser.id) !== Number(currentUser?.id) &&
    (isSystemAdmin ||
      !["admin", "institution_admin"].includes(managedUser.role));
  const canToggleUserStatus = (managedUser) =>
    canModifyUser(managedUser) &&
    managedUser.role !== "admin" &&
    managedUser.approval_status === "approved";

  if (loading) {
    return (
      <div className="flex min-h-[55vh] items-center justify-center">
        <div className="flex items-center gap-3 text-sm font-semibold text-slate-600">
          <RefreshCw className="h-5 w-5 animate-spin text-blue-600" />
          Loading administration workspace…
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-blue-950 to-blue-800 px-6 py-7 text-white shadow-xl sm:px-8">
        <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-blue-400/20 blur-3xl" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-blue-100">
              <ShieldCheck className="h-3.5 w-3.5" />
              {isSystemAdmin
                ? "System administration"
                : "Institution administration"}
            </div>
            <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl text-blue-300">
              Control center
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-100/80">
              {isSystemAdmin
                ? "Manage every institution, person, access role, and moderation workflow across the system."
                : `Manage people, departments, roles, and content belonging to ${currentUser?.institution_name || "your institution"}.`}
            </p>
          </div>
          <button
            type="button"
            onClick={() => loadAdminData(true)}
            disabled={refreshing}
            className="inline-flex w-fit items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-xs font-bold text-white hover:bg-white/15 disabled:opacity-60"
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            />
            Refresh data
          </button>
        </div>
      </section>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
          <button
            className="ml-auto"
            onClick={() => setError("")}
            aria-label="Dismiss error"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      {notice && (
        <div
          role="status"
          className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {notice}
        </div>
      )}

      <nav
        className="flex gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm"
        aria-label="Admin sections"
      >
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            className={`flex min-w-fit flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-bold transition ${activeTab === id ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"}`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </nav>

      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Metric
              icon={Users}
              label="People"
              value={stats.users?.total_users}
              detail={`${stats.users?.pending_approvals || 0} pending approval(s)`}
            />
            <Metric
              icon={Building2}
              label="Institutions"
              value={stats.entities?.total_institutions}
              detail={`${stats.entities?.total_departments || 0} departments`}
              tone="violet"
            />
            <Metric
              icon={UserCog}
              label="Roles"
              value={stats.entities?.total_roles}
              detail="System and custom access roles"
              tone="amber"
            />
            <Metric
              icon={GraduationCap}
              label="Collaboration"
              value={
                (stats.entities?.total_communities || 0) +
                (stats.entities?.total_projects || 0)
              }
              detail="Communities and projects"
              tone="emerald"
            />
          </div>
          <div className="grid gap-6 lg:grid-cols-[1.15fr_.85fr]">
            <Panel
              title="Recent administrative activity"
              description="The latest sensitive changes made in the control center."
            >
              {data.logs.length ? (
                <div className="divide-y divide-slate-100">
                  {data.logs.slice(0, 6).map((log) => (
                    <div key={log.id} className="flex gap-3 px-5 py-4">
                      <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold leading-5 text-slate-800">
                          {log.summary}
                        </p>
                        <p className="mt-0.5 text-[11px] text-slate-500">
                          {log.actor_name} ·{" "}
                          {new Date(log.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={Activity}
                  title="No activity yet"
                  detail="Administrative actions will appear here as changes are made."
                />
              )}
            </Panel>
            <Panel
              title="Quick actions"
              description="Jump directly into common setup tasks."
            >
              <div className="space-y-2 p-4">
                {quickActions.map(([label, Icon, tab, nextEditor]) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => {
                      setActiveTab(tab);
                      if (nextEditor) setEditor(nextEditor);
                    }}
                    className="flex w-full items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-left text-xs font-bold text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-800"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                      <Icon className="h-4 w-4" />
                    </span>
                    {label}
                    <ChevronRight className="ml-auto h-4 w-4" />
                  </button>
                ))}
              </div>
            </Panel>
          </div>
        </div>
      )}

      {activeTab === "people" && (
        <Panel
          title="People directory"
          description="Create accounts, edit profiles, assign roles, and control account access."
          action={
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-600">
                {filteredUsers.length} users
              </span>
              {actionButton("Add user", () => setEditor({ type: "user" }))}
            </div>
          }
        >
          <div className="grid gap-3 border-b border-slate-100 p-4 sm:grid-cols-[1fr_220px]">
            <label className="relative">
              <span className="sr-only">Search users</span>
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className={`${inputClass} pl-10`}
                placeholder="Search name, email, or organization…"
              />
            </label>
            <select
              value={roleFilter}
              onChange={(event) => setRoleFilter(event.target.value)}
              className={inputClass}
            >
              <option value="all">All roles</option>
              {data.roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
          </div>
          {filteredUsers.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1020px] text-left text-xs">
                <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-3">Person</th>
                    <th className="px-5 py-3">Organization</th>
                    <th className="px-5 py-3">Role</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-50/70">
                      <td className="px-5 py-4">
                        <p className="font-bold text-slate-900">
                          {user.full_name}
                        </p>
                        <p className="mt-0.5 text-[11px] text-slate-500">
                          {user.email}
                        </p>
                        {user.staff_id && (
                          <p className="mt-1 text-[10px] font-semibold text-slate-400">
                            Staff ID: {user.staff_id} · {user.job_title}
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        <p>{user.institution_name || "Unaffiliated"}</p>
                        <p className="mt-0.5 text-[11px] text-slate-400">
                          {user.department_name || "No department"}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <select
                          disabled={!canModifyUser(user)}
                          value={user.role_id || ""}
                          onChange={(event) =>
                            changeRole(user, event.target.value)
                          }
                          className="min-w-40 rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-blue-500 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                        >
                          {data.roles.map((role) => (
                            <option
                              key={role.id}
                              value={role.id}
                              disabled={
                                Number(role.id) !== Number(user.role_id) &&
                                (!role.can_assign ||
                                  (role.institution_id &&
                                    Number(role.institution_id) !==
                                      Number(user.institution_id)))
                              }
                            >
                              {role.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold ${user.approval_status === "pending" ? "bg-amber-50 text-amber-800" : user.approval_status === "rejected" || user.status === "suspended" ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${user.approval_status === "pending" ? "bg-amber-500" : user.approval_status === "rejected" || user.status === "suspended" ? "bg-red-500" : "bg-emerald-500"}`}
                          />
                          {user.approval_status === "approved"
                            ? user.status
                            : user.approval_status}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-1">
                          {isSystemAdmin &&
                            user.role === "institution_admin" &&
                            user.approval_status === "pending" && (
                              <button
                                type="button"
                                onClick={() => setReviewing(user)}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-[10px] font-bold text-slate-800 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
                              >
                                <Eye className="h-3.5 w-3.5" />
                                View application
                              </button>
                            )}
                          <button
                            type="button"
                            disabled={!canToggleUserStatus(user)}
                            onClick={() => toggleStatus(user)}
                            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-[10px] font-bold disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400 ${user.status === "suspended" ? "border-emerald-200 text-emerald-700 hover:bg-emerald-50" : "border-red-200 text-red-700 hover:bg-red-50"}`}
                          >
                            {user.status === "suspended" ? (
                              <Unlock className="h-3.5 w-3.5" />
                            ) : (
                              <Lock className="h-3.5 w-3.5" />
                            )}
                            {user.status === "suspended"
                              ? "Activate"
                              : "Suspend"}
                          </button>
                          {canModifyUser(user) && (
                            <button
                              type="button"
                              onClick={() =>
                                setEditor({ type: "user", item: user })
                              }
                              className="rounded-lg p-2 text-slate-500 hover:bg-blue-50 hover:text-blue-700"
                              aria-label={`Edit ${user.full_name}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              icon={Users}
              title="No matching people"
              detail="Try changing the search or role filter."
            />
          )}
        </Panel>
      )}

      {activeTab === "organizations" && (
        <div className="grid gap-6 xl:grid-cols-2">
          <Panel
            title={isSystemAdmin ? "Institutions" : "Your institution"}
            description={
              isSystemAdmin
                ? "Universities, colleges, and research partners."
                : "Institution details are maintained by the system administrator."
            }
            action={
              isSystemAdmin ? (
                actionButton("Add institution", () =>
                  setEditor({ type: "institution" }),
                )
              ) : (
                <span className="rounded-full bg-violet-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-violet-700">
                  Scoped access
                </span>
              )
            }
          >
            {data.institutions.length ? (
              <div className="divide-y divide-slate-100">
                {data.institutions.map((institution) => (
                  <div
                    key={institution.id}
                    className="flex items-center gap-4 px-5 py-4"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                      <Building2 className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-slate-900">
                        {institution.name}
                      </p>
                      <p className="mt-1 truncate text-[11px] text-slate-500">
                        {institution.type} · {institution.location}
                      </p>
                      <p className="mt-1 text-[10px] font-semibold text-slate-400">
                        {institution.department_count} departments ·{" "}
                        {institution.user_count} users
                      </p>
                    </div>
                    {isSystemAdmin && (
                      <>
                        <button
                          onClick={() =>
                            setEditor({
                              type: "institution",
                              item: institution,
                            })
                          }
                          className="rounded-lg p-2 text-slate-500 hover:bg-blue-50 hover:text-blue-700"
                          aria-label={`Edit ${institution.name}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() =>
                            removeRecord("institution", institution)
                          }
                          className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-700"
                          aria-label={`Delete ${institution.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Building2}
                title="No institutions"
                detail="Add the first institution to start organizing departments and people."
              />
            )}
          </Panel>
          <Panel
            title="Departments"
            description="Academic units grouped under their institution."
            action={actionButton("Add department", () =>
              setEditor({ type: "department" }),
            )}
          >
            {data.departments.length ? (
              <div className="max-h-[620px] divide-y divide-slate-100 overflow-y-auto">
                {data.departments.map((department) => (
                  <div
                    key={department.id}
                    className="flex items-center gap-4 px-5 py-4"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
                      <GraduationCap className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-slate-900">
                        {department.name}
                      </p>
                      <p className="mt-1 truncate text-[11px] text-slate-500">
                        {department.institution_name}
                      </p>
                      <p className="mt-1 text-[10px] font-semibold text-slate-400">
                        {department.user_count} assigned users
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        setEditor({ type: "department", item: department })
                      }
                      className="rounded-lg p-2 text-slate-500 hover:bg-blue-50 hover:text-blue-700"
                      aria-label={`Edit ${department.name}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => removeRecord("department", department)}
                      className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-700"
                      aria-label={`Delete ${department.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={GraduationCap}
                title="No departments"
                detail="Create departments after adding an institution."
              />
            )}
          </Panel>
        </div>
      )}

      {activeTab === "roles" && (
        <Panel
          title="User roles"
          description="Create clear role labels while inheriting the platform's proven access levels."
          action={actionButton("Create role", () =>
            setEditor({ type: "role" }),
          )}
        >
          <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
            {data.roles.map((role) => (
              <article
                key={role.id}
                className="rounded-2xl border border-slate-200 p-4 transition hover:border-slate-300 hover:shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-sm"
                    style={{ backgroundColor: role.color }}
                  >
                    <UserCog className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate text-sm font-bold text-slate-900">
                        {role.name}
                      </h3>
                      {role.is_system && (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-500">
                          Base role
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {role.base_role.replace("_", " ")} access ·{" "}
                      {role.institution_name || "All institutions"}
                    </p>
                  </div>
                </div>
                <p className="mt-4 min-h-10 text-xs leading-5 text-slate-600">
                  {role.description || "No description provided."}
                </p>
                <div className="mt-4 flex items-center border-t border-slate-100 pt-3">
                  <span className="text-[11px] font-semibold text-slate-500">
                    {role.user_count} assigned user(s)
                  </span>
                  {role.can_manage && (
                    <div className="ml-auto flex gap-1">
                      <button
                        onClick={() => setEditor({ type: "role", item: role })}
                        className="rounded-lg p-2 text-slate-500 hover:bg-blue-50 hover:text-blue-700"
                        aria-label={`Edit ${role.name}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      {!role.is_system && (
                        <button
                          onClick={() => removeRecord("role", role)}
                          className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-700"
                          aria-label={`Delete ${role.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        </Panel>
      )}

      {activeTab === "moderation" && (
        <div className="grid gap-6 xl:grid-cols-2">
          <Panel
            title="Community moderation"
            description="Remove communities that violate platform standards."
          >
            {data.communities.length ? (
              <div className="max-h-[600px] divide-y divide-slate-100 overflow-y-auto">
                {data.communities.map((community) => (
                  <div
                    key={community.id}
                    className="flex items-center gap-4 px-5 py-4"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                      <Users className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-slate-900">
                        {community.name}
                      </p>
                      <p className="mt-1 text-[11px] text-slate-500">
                        {community.category || "General"} community
                      </p>
                    </div>
                    <button
                      onClick={() => removeRecord("community", community)}
                      className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-700"
                      aria-label={`Delete ${community.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Users}
                title="No communities"
                detail="There is no community content to moderate."
              />
            )}
          </Panel>
          <Panel
            title="Event moderation"
            description="Review or cancel events across the platform."
          >
            {data.events.length ? (
              <div className="max-h-[600px] divide-y divide-slate-100 overflow-y-auto">
                {data.events.map((event) => (
                  <div
                    key={event.id}
                    className="flex items-center gap-4 px-5 py-4"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                      <CalendarDays className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-slate-900">
                        {event.title}
                      </p>
                      <p className="mt-1 truncate text-[11px] text-slate-500">
                        {new Date(event.event_date).toLocaleDateString()} ·{" "}
                        {event.location}
                      </p>
                    </div>
                    <button
                      onClick={() => removeRecord("event", event)}
                      className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-700"
                      aria-label={`Delete ${event.title}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={CalendarDays}
                title="No events"
                detail="There are no scheduled events to moderate."
              />
            )}
          </Panel>
        </div>
      )}

      {activeTab === "activity" && (
        <Panel
          title="Administrative audit trail"
          description="A read-only record of role changes, account controls, directory edits, and moderation actions."
          action={
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
              <ShieldCheck className="h-3.5 w-3.5" />
              Protected log
            </span>
          }
        >
          {data.logs.length ? (
            <div className="divide-y divide-slate-100">
              {data.logs.map((log) => (
                <div
                  key={log.id}
                  className="grid gap-2 px-5 py-4 sm:grid-cols-[150px_1fr_auto] sm:items-center"
                >
                  <div>
                    <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-blue-700">
                      {log.action.replace("_", " ")}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs font-semibold leading-5 text-slate-800">
                      {log.summary}
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      {log.actor_name} · {log.entity_type}
                    </p>
                  </div>
                  <time
                    className="text-[10px] font-semibold text-slate-400"
                    dateTime={log.created_at}
                  >
                    {new Date(log.created_at).toLocaleString()}
                  </time>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Activity}
              title="No activity recorded"
              detail="New administrative changes will be listed here."
            />
          )}
        </Panel>
      )}

      {reviewing && (
        <Dialog
          wide
          title="Review Institution Administrator application"
          description="Read the applicant’s affiliation and professional information before making an approval decision."
          error={error}
          onClose={() => !saving && setReviewing(null)}
        >
          <ApplicationReviewCard
            applicant={reviewing}
            saving={saving}
            onClose={() => setReviewing(null)}
            onEdit={() => {
              setReviewing(null);
              setEditor({ type: "user", item: reviewing });
            }}
            onDecision={reviewApplication}
          />
        </Dialog>
      )}

      {editor && (
        <Dialog
          title={`${editor.item ? "Edit" : "Create"} ${editor.type}`}
          description={
            editor.type === "role"
              ? "Custom roles inherit a base access level used throughout the platform."
              : "Changes are available immediately throughout the platform."
          }
          error={error}
          onClose={() => !saving && setEditor(null)}
        >
          {editor.type === "user" && (
            <UserForm
              item={editor.item}
              institutions={data.institutions}
              departments={data.departments}
              roles={data.roles}
              isSystemAdmin={isSystemAdmin}
              saving={saving}
              onCancel={() => setEditor(null)}
              onSave={saveEditor}
            />
          )}
          {editor.type === "institution" && (
            <InstitutionForm
              item={editor.item}
              saving={saving}
              onCancel={() => setEditor(null)}
              onSave={saveEditor}
            />
          )}
          {editor.type === "department" && (
            <DepartmentForm
              item={editor.item}
              institutions={data.institutions}
              saving={saving}
              onCancel={() => setEditor(null)}
              onSave={saveEditor}
            />
          )}
          {editor.type === "role" && (
            <RoleForm
              item={editor.item}
              institutions={data.institutions}
              allowScope={isSystemAdmin}
              saving={saving}
              onCancel={() => setEditor(null)}
              onSave={saveEditor}
            />
          )}
        </Dialog>
      )}
    </div>
  );
}

export default Admin;
