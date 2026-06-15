"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import Link from "next/link";
import Image from "next/image";
import { useMemo, useState, useEffect, useCallback, useRef } from "react";

type Expense = {
  id: string;
  amount: number;
  category: string;
  note?: string | null;
  status: "Draft" | "Submitted" | "Approved" | "Rejected" | string;
  reviewedAtUtc?: string | null;
  reviewedByUserId?: string | null;
  reviewComment?: string | null;
  expenseDateUtc: string;
  createdAtUtc: string;
};

type TeamExpense = Expense & {
  userId: string;
  userEmail: string;
};

type AppTab = "home" | "admin";
type AdminSubTab = "users" | "roles";

type EmployeeUser = {
  id: string;
  email: string;
  role: "Employee" | "Manager" | "Hr" | "Finance" | "Admin" | string;
  createdAtUtc: string;
};

type AppRole = {
  id: number;
  name: string;
  description: string | null;
  canInviteUsers: boolean;
  canChangeRoles: boolean;
  createdAtUtc: string;
};

type ApiError = {
  message?: string;
  detail?: string;
};

type CreateExpensePayload = {
  amount: number;
  category: string;
  note: string;
  expenseDateUtc: string;
};

type UpdateExpensePayload = CreateExpensePayload;

type OcrExtractResponse = {
  merchant?: string | null;
  date?: string | null;
  total_amount?: number | null;
  currency?: string | null;
  category?: string | null;
  confidence?: number | null;
  raw_text?: string | null;
};

const defaultApiBaseUrl = "http://localhost:5000";
const defaultOcrApiBaseUrl = `${defaultApiBaseUrl}/api`;

export default function Home() {
  const apiBaseUrl = useMemo(
    () => process.env.NEXT_PUBLIC_API_BASE_URL ?? defaultApiBaseUrl,
    []
  );
  const ocrApiBaseUrl = useMemo(
    () => process.env.NEXT_PUBLIC_OCR_API_BASE_URL ?? defaultOcrApiBaseUrl,
    []
  );

  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState<string>("");
  const [role, setRole] = useState<string>("Employee");
  const [canInviteUsers, setCanInviteUsers] = useState(false);
  const [canChangeRoles, setCanChangeRoles] = useState(false);
  const [activeTab, setActiveTab] = useState<AppTab>("home");
  const [adminSubTab, setAdminSubTab] = useState<AdminSubTab>("users");
  const [authReady, setAuthReady] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loadingExpenses, setLoadingExpenses] = useState(false);
  const [expensesError, setExpensesError] = useState<string | null>(null);
  const [teamExpenses, setTeamExpenses] = useState<TeamExpense[]>([]);
  const [loadingTeamExpenses, setLoadingTeamExpenses] = useState(false);
  const [teamExpensesError, setTeamExpensesError] = useState<string | null>(null);
  const [reviewCommentDrafts, setReviewCommentDrafts] = useState<Record<string, string>>({});
  const [employees, setEmployees] = useState<EmployeeUser[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [employeesError, setEmployeesError] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<string>("Employee");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);
  const [userRoleDrafts, setUserRoleDrafts] = useState<Record<string, string>>({});
  const [updatingUserEmail, setUpdatingUserEmail] = useState<string | null>(null);

  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [rolesError, setRolesError] = useState<string | null>(null);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDescription, setNewRoleDescription] = useState("");
  const [newRoleCanInviteUsers, setNewRoleCanInviteUsers] = useState(false);
  const [newRoleCanChangeRoles, setNewRoleCanChangeRoles] = useState(false);
  const [roleFormLoading, setRoleFormLoading] = useState(false);
  const [roleFormError, setRoleFormError] = useState<string | null>(null);
  const [roleFormSuccess, setRoleFormSuccess] = useState<string | null>(null);
  const [editingRole, setEditingRole] = useState<AppRole | null>(null);
  const [deletingRoleId, setDeletingRoleId] = useState<number | null>(null);

  const [amount, setAmount] = useState("178.54");
  const [category, setCategory] = useState("Telecom");
  const [note, setNote] = useState("phone,internet");
  const [expenseDate, setExpenseDate] = useState(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  });
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [rowActionLoadingId, setRowActionLoadingId] = useState<string | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [ocrSuccess, setOcrSuccess] = useState<string | null>(null);
  const [receiptPreviewUrl, setReceiptPreviewUrl] = useState<string | null>(null);
  const receiptInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!receiptFile) {
      setReceiptPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(receiptFile);
    setReceiptPreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [receiptFile]);

  useEffect(() => {
    const storedToken = localStorage.getItem("expenseKubex.token");
    const storedEmail = localStorage.getItem("expenseKubex.email") ?? "";
    const storedRole = localStorage.getItem("expenseKubex.role") ?? "Employee";
    const storedCanInvite = localStorage.getItem("expenseKubex.canInviteUsers") === "true";
    const storedCanChangeRoles = localStorage.getItem("expenseKubex.canChangeRoles") === "true";
    setToken(storedToken);
    setEmail(storedEmail);
    setRole(storedRole);
    setCanInviteUsers(storedCanInvite);
    setCanChangeRoles(storedCanChangeRoles);
    setAuthReady(true);
  }, []);

  const canReviewTeamExpenses = role === "Manager" || role === "Hr" || role === "Finance" || role === "Admin";
  const canAdminManageUsers = canInviteUsers || canChangeRoles;

  useEffect(() => {
    if (!canAdminManageUsers && activeTab === "admin") {
      setActiveTab("home");
    }
  }, [activeTab, canAdminManageUsers]);

  const loadExpenses = useCallback(async () => {
    if (!token) {
      return;
    }

    setLoadingExpenses(true);
    setExpensesError(null);

    try {
      const response = await fetch(`${apiBaseUrl}/api/expenses`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        setExpensesError("Session expired. Please sign in again.");
        return;
      }

      if (!response.ok) {
        setExpensesError("Could not load expenses.");
        return;
      }

      const data = (await response.json()) as Expense[];
      setExpenses(data);
    } catch {
      setExpensesError("Could not reach API. Make sure backend is running.");
    } finally {
      setLoadingExpenses(false);
    }
  }, [apiBaseUrl, token]);

  useEffect(() => {
    if (!token) {
      return;
    }

    void loadExpenses();
  }, [token, loadExpenses]);

  const loadTeamSubmittedExpenses = useCallback(async () => {
    if (!token || !canReviewTeamExpenses) {
      setTeamExpenses([]);
      return;
    }

    setLoadingTeamExpenses(true);
    setTeamExpensesError(null);

    try {
      const response = await fetch(`${apiBaseUrl}/api/expenses/team/submitted`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 401 || response.status === 403) {
        setTeamExpensesError("You do not have permission to review team submissions.");
        return;
      }

      if (!response.ok) {
        setTeamExpensesError("Could not load team submitted expenses.");
        return;
      }

      const data = (await response.json()) as TeamExpense[];
      setTeamExpenses(data);
    } catch {
      setTeamExpensesError("Could not reach API for team submissions.");
    } finally {
      setLoadingTeamExpenses(false);
    }
  }, [apiBaseUrl, canReviewTeamExpenses, token]);

  useEffect(() => {
    if (!token || !canReviewTeamExpenses) {
      return;
    }

    void loadTeamSubmittedExpenses();
  }, [token, canReviewTeamExpenses, loadTeamSubmittedExpenses]);

  const loadEmployees = useCallback(async () => {
    if (!token || !canAdminManageUsers) {
      setEmployees([]);
      setUserRoleDrafts({});
      return;
    }

    setLoadingEmployees(true);
    setEmployeesError(null);

    try {
      const response = await fetch(`${apiBaseUrl}/api/auth/users`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 401 || response.status === 403) {
        setEmployeesError("You do not have permission to view users.");
        return;
      }

      if (!response.ok) {
        setEmployeesError("Could not load employees.");
        return;
      }

      const data = (await response.json()) as EmployeeUser[];
      setEmployees(data);
      setUserRoleDrafts(
        Object.fromEntries(data.map((user) => [user.email, user.role]))
      );
    } catch {
      setEmployeesError("Could not reach API for users.");
    } finally {
      setLoadingEmployees(false);
    }
  }, [apiBaseUrl, canAdminManageUsers, token]);

  useEffect(() => {
    if (!token || !canAdminManageUsers) {
      return;
    }

    void loadEmployees();
  }, [token, canAdminManageUsers, loadEmployees]);

  const loadRoles = useCallback(async () => {
    if (!token || !canAdminManageUsers) {
      setRoles([]);
      return;
    }

    setLoadingRoles(true);
    setRolesError(null);

    try {
      const response = await fetch(`${apiBaseUrl}/api/roles`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        setRolesError("Could not load roles.");
        return;
      }

      const data = (await response.json()) as AppRole[];
      setRoles(data);
    } catch {
      setRolesError("Could not reach API for roles.");
    } finally {
      setLoadingRoles(false);
    }
  }, [apiBaseUrl, canAdminManageUsers, token]);

  useEffect(() => {
    if (!token || !canAdminManageUsers) {
      return;
    }

    void loadRoles();
  }, [token, canAdminManageUsers, loadRoles]);

  async function onInviteUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token || !canAdminManageUsers) {
      setInviteError("Only admins can send invites.");
      return;
    }

    const normalizedEmail = inviteEmail.trim().toLowerCase();
    if (!normalizedEmail) {
      setInviteError("Email is required.");
      return;
    }

    setInviteLoading(true);
    setInviteError(null);
    setInviteSuccess(null);

    try {
      const response = await fetch(`${apiBaseUrl}/api/auth/admin/invite`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email: normalizedEmail, role: inviteRole }),
      });

      if (!response.ok) {
        let message = "Could not send invite.";
        try {
          const errorPayload = (await response.json()) as ApiError;
          message = errorPayload.message ?? errorPayload.detail ?? message;
        } catch {
          // Keep generic message.
        }
        setInviteError(message);
        return;
      }

      setInviteSuccess("Invite sent successfully.");
      setInviteEmail("");
      setInviteRole("Employee");
      await loadEmployees();
    } catch {
      setInviteError("Could not reach API. Make sure backend is running.");
    } finally {
      setInviteLoading(false);
    }
  }

  async function onUpdateUserRole(targetEmail: string) {
    if (!token || !canAdminManageUsers || updatingUserEmail) {
      return;
    }

    const selectedRole = userRoleDrafts[targetEmail] ?? "Employee";
    setUpdatingUserEmail(targetEmail);
    setInviteError(null);
    setInviteSuccess(null);

    try {
      const response = await fetch(`${apiBaseUrl}/api/auth/users/role`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email: targetEmail, role: selectedRole }),
      });

      if (!response.ok) {
        let message = "Could not update user role.";
        try {
          const errorPayload = (await response.json()) as ApiError;
          message = errorPayload.message ?? errorPayload.detail ?? message;
        } catch {
          // Keep generic message.
        }
        setInviteError(message);
        return;
      }

      setInviteSuccess(`Updated role for ${targetEmail}.`);
      await loadEmployees();

      if (targetEmail === email) {
        localStorage.setItem("expenseKubex.role", selectedRole);
        setRole(selectedRole);
      }
    } catch {
      setInviteError("Could not reach API. Make sure backend is running.");
    } finally {
      setUpdatingUserEmail(null);
    }
  }

  function signOut() {
    localStorage.removeItem("expenseKubex.token");
    localStorage.removeItem("expenseKubex.email");
    localStorage.removeItem("expenseKubex.role");
    localStorage.removeItem("expenseKubex.canInviteUsers");
    localStorage.removeItem("expenseKubex.canChangeRoles");
    setToken(null);
    setEmail("");
    setRole("Employee");
    setCanInviteUsers(false);
    setCanChangeRoles(false);
    setExpenses([]);
    setTeamExpenses([]);
    setEmployees([]);
    setUserRoleDrafts({});
    setRoles([]);
    setInviteEmail("");
    setInviteError(null);
    setInviteSuccess(null);
    setActiveTab("home");
    setAdminSubTab("users");
    setMenuOpen(false);
    setSubmitSuccess(null);
    setSubmitError(null);
  }

  async function onSaveRole(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token || !canAdminManageUsers) return;

    const name = newRoleName.trim();
    if (!name) {
      setRoleFormError("Role name is required.");
      return;
    }

    setRoleFormLoading(true);
    setRoleFormError(null);
    setRoleFormSuccess(null);

    try {
      const isEditing = editingRole !== null;
      const url = isEditing
        ? `${apiBaseUrl}/api/roles/${editingRole.id}`
        : `${apiBaseUrl}/api/roles`;
      const response = await fetch(url, {
        method: isEditing ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, description: newRoleDescription.trim() || null, canInviteUsers: newRoleCanInviteUsers, canChangeRoles: newRoleCanChangeRoles }),
      });

      if (!response.ok) {
        let message = isEditing ? "Could not update role." : "Could not create role.";
        try {
          const errorPayload = (await response.json()) as ApiError;
          message = errorPayload.message ?? errorPayload.detail ?? message;
        } catch { /* keep default */ }
        setRoleFormError(message);
        return;
      }

      setRoleFormSuccess(isEditing ? `Role '${name}' updated.` : `Role '${name}' created.`);
      setNewRoleName("");
      setNewRoleDescription("");
      setNewRoleCanInviteUsers(false);
      setNewRoleCanChangeRoles(false);
      setEditingRole(null);
      await loadRoles();
    } catch {
      setRoleFormError("Could not reach API.");
    } finally {
      setRoleFormLoading(false);
    }
  }

  async function onDeleteRole(roleId: number, roleName: string) {
    if (!token || !canAdminManageUsers || deletingRoleId) return;

    const confirmed = window.confirm(`Delete role '${roleName}'? This cannot be undone.`);
    if (!confirmed) return;

    setDeletingRoleId(roleId);
    setRoleFormError(null);
    setRoleFormSuccess(null);

    try {
      const response = await fetch(`${apiBaseUrl}/api/roles/${roleId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        let message = "Could not delete role.";
        try {
          const errorPayload = (await response.json()) as ApiError;
          message = errorPayload.message ?? errorPayload.detail ?? message;
        } catch { /* keep default */ }
        setRoleFormError(message);
        return;
      }

      setRoleFormSuccess(`Role '${roleName}' deleted.`);
      await loadRoles();
    } catch {
      setRoleFormError("Could not reach API.");
    } finally {
      setDeletingRoleId(null);
    }
  }

  function onEditRole(appRole: AppRole) {
    setEditingRole(appRole);
    setNewRoleName(appRole.name);
    setNewRoleDescription(appRole.description ?? "");
    setNewRoleCanInviteUsers(appRole.canInviteUsers);
    setNewRoleCanChangeRoles(appRole.canChangeRoles);
    setRoleFormError(null);
    setRoleFormSuccess(null);
  }

  function onCancelRoleEdit() {
    setEditingRole(null);
    setNewRoleName("");
    setNewRoleDescription("");
    setNewRoleCanInviteUsers(false);
    setNewRoleCanChangeRoles(false);
    setRoleFormError(null);
    setRoleFormSuccess(null);
  }

  async function onCreateExpense(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);
    setSubmitSuccess(null);

    if (!token) {
      setSubmitError("You need to sign in first.");
      return;
    }

    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setSubmitError("Enter a valid amount greater than 0.");
      return;
    }

    if (!category.trim()) {
      setSubmitError("Category is required.");
      return;
    }

    if (!expenseDate) {
      setSubmitError("Date is required.");
      return;
    }

    const payload: UpdateExpensePayload = {
      amount: parsedAmount,
      category: category.trim(),
      note: note.trim(),
      expenseDateUtc: `${expenseDate}T12:00:00Z`,
    };

    setSubmitLoading(true);

    try {
      const isEditing = Boolean(editingExpenseId);
      const response = await fetch(
        isEditing ? `${apiBaseUrl}/api/expenses/${editingExpenseId}` : `${apiBaseUrl}/api/expenses`,
        {
        method: isEditing ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorPayload = (await response.json()) as ApiError;
        setSubmitError(errorPayload.message ?? (isEditing ? "Could not update expense." : "Could not create expense."));
        return;
      }

      setSubmitSuccess(isEditing ? "Expense updated." : "Expense saved.");
      setEditingExpenseId(null);
      setAmount("");
      setCategory("");
      setNote("");
      setReceiptFile(null);
      setOcrError(null);
      setOcrSuccess(null);
      if (receiptInputRef.current) {
        receiptInputRef.current.value = "";
      }
      await loadExpenses();
    } catch {
      setSubmitError("Could not reach API. Make sure backend is running.");
    } finally {
      setSubmitLoading(false);
    }
  }

  function normalizeDate(input?: string | null): string | null {
    if (!input) {
      return null;
    }

    const trimmed = input.trim();
    if (!trimmed) {
      return null;
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return trimmed;
    }

    if (/^\d{4}\/\d{2}\/\d{2}$/.test(trimmed)) {
      return trimmed.replaceAll("/", "-");
    }

    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) {
      return null;
    }

    const year = parsed.getUTCFullYear();
    const month = String(parsed.getUTCMonth() + 1).padStart(2, "0");
    const day = String(parsed.getUTCDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  async function onScanReceipt() {
    
    setOcrError(null);
    setOcrSuccess(null);

    if (!token) {
      setOcrError("You need to sign in first.");
      return;
    }

    if (!receiptFile) {
      setOcrError("Please choose a receipt image first.");
      return;
    }

    setOcrLoading(true);

    try {
      const formData = new FormData();
      formData.append("file", receiptFile);

      const response = await fetch(`${ocrApiBaseUrl}/receipt/extract`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        let ocrMessage = "Could not read receipt. Check OCR service and try again.";
        try {
          const errorPayload = (await response.json()) as ApiError;
          ocrMessage =
            errorPayload.detail ??
            errorPayload.message ??
            ocrMessage;
        } catch {
          // Keep the default message when OCR/API doesn't return JSON.
        }
        setOcrError(ocrMessage);
        return;
      }

      const extracted = (await response.json()) as OcrExtractResponse;

      const extractedAmount = Number(extracted.total_amount);
      const hasAmount = Number.isFinite(extractedAmount) && extractedAmount > 0;
      if (hasAmount) {
        setAmount(extractedAmount.toFixed(2));
      }

      const extractedCategory = extracted.category?.trim();
      if (extractedCategory) {
        setCategory(extractedCategory);
      }

      const normalizedDate = normalizeDate(extracted.date);
      if (normalizedDate) {
        setExpenseDate(normalizedDate);
      }

      const noteParts = [
        extracted.merchant?.trim(),
        extracted.currency ? `Currency: ${extracted.currency}` : null,
      ].filter(Boolean);
      const nextNote = noteParts.length ? noteParts.join(" | ") : (note || "");
      setNote(nextNote);

      setOcrSuccess("Receipt scanned and form auto-filled. Review and click Save.");
    } catch {
      setOcrError("Could not connect to OCR/API service.");
    } finally {
      setOcrLoading(false);
    }
  }

  function onEditExpense(expense: Expense) {
    setEditingExpenseId(expense.id);
    setSubmitError(null);
    setSubmitSuccess(null);
    setAmount(expense.amount.toFixed(2));
    setCategory(expense.category);
    setNote(expense.note ?? "");
    setExpenseDate(new Date(expense.expenseDateUtc).toISOString().slice(0, 10));
  }

  function onCancelEdit() {
    setEditingExpenseId(null);
    setSubmitError(null);
    setSubmitSuccess(null);
    setAmount("");
    setCategory("");
    setNote("");
  }

  async function onDeleteExpense(expenseId: string) {
    if (!token || rowActionLoadingId) {
      return;
    }

    const confirmed = window.confirm("Delete this expense?");
    if (!confirmed) {
      return;
    }

    setRowActionLoadingId(expenseId);
    setSubmitError(null);
    setSubmitSuccess(null);

    try {
      const response = await fetch(`${apiBaseUrl}/api/expenses/${expenseId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        let message = "Could not delete expense.";
        try {
          const errorPayload = (await response.json()) as ApiError;
          message = errorPayload.message ?? message;
        } catch {
          // Keep generic message.
        }
        setSubmitError(message);
        return;
      }

      if (editingExpenseId === expenseId) {
        onCancelEdit();
      }

      setSubmitSuccess("Expense deleted.");
      await loadExpenses();
    } catch {
      setSubmitError("Could not reach API. Make sure backend is running.");
    } finally {
      setRowActionLoadingId(null);
    }
  }

  async function onSubmitExpense(expenseId: string) {
    if (!token || rowActionLoadingId) {
      return;
    }

    setRowActionLoadingId(expenseId);
    setSubmitError(null);
    setSubmitSuccess(null);

    try {
      const response = await fetch(`${apiBaseUrl}/api/expenses/${expenseId}/submit`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        let message = "Could not submit expense.";
        try {
          const errorPayload = (await response.json()) as ApiError;
          message = errorPayload.message ?? message;
        } catch {
          // Keep generic message.
        }
        setSubmitError(message);
        return;
      }

      setSubmitSuccess("Expense submitted and waiting for approval.");
      await loadExpenses();
    } catch {
      setSubmitError("Could not reach API. Make sure backend is running.");
    } finally {
      setRowActionLoadingId(null);
    }
  }

  async function onReviewExpense(expenseId: string, action: "approve" | "reject", comment: string) {
    if (!token || rowActionLoadingId) {
      return;
    }

    setRowActionLoadingId(expenseId);
    setSubmitError(null);
    setSubmitSuccess(null);

    try {
      const response = await fetch(`${apiBaseUrl}/api/expenses/${expenseId}/${action}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ comment }),
      });

      if (!response.ok) {
        let message = action === "approve" ? "Could not approve expense." : "Could not reject expense.";
        try {
          const errorPayload = (await response.json()) as ApiError;
          message = errorPayload.message ?? message;
        } catch {
          // Keep generic message.
        }
        setSubmitError(message);
        return;
      }

      setSubmitSuccess(action === "approve" ? "Expense approved." : "Expense rejected.");
      setReviewCommentDrafts((previous) => ({ ...previous, [expenseId]: "" }));
      await Promise.all([loadTeamSubmittedExpenses(), loadExpenses()]);
    } catch {
      setSubmitError("Could not reach API. Make sure backend is running.");
    } finally {
      setRowActionLoadingId(null);
    }
  }

  function renderStatusChip(expense: Expense) {
    if (expense.status === "Submitted") {
      return <span className="status-chip submitted">Waiting for review</span>;
    }

    if (expense.status === "Approved") {
      return (
        <span className="status-chip approved">
          <span className="status-dot" aria-hidden /> Approved
        </span>
      );
    }

    if (expense.status === "Rejected") {
      return (
        <span className="status-chip rejected">
          <span className="status-dot" aria-hidden /> Rejected
        </span>
      );
    }

    return <span className="status-chip draft">Draft</span>;
  }

  const total = expenses.reduce((sum, item) => sum + item.amount, 0);

  if (!authReady) {
    return <main className="page-shell"><div className="hero">Loading...</div></main>;
  }

  if (!token) {
    return (
      <main className="page-shell">
        <div className="hero">
          <h1 className="hero-title">Welcome to ExpenseKubex</h1>
          <p className="hero-subtitle">
            Sign in to manage expenses, or create an account to get started.
          </p>
          <div className="hero-actions">
            <Link className="hero-button primary" href="/login">
              Login
            </Link>
            <Link className="hero-button" href="/signup">
              Create Account
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="dashboard-layout">
      <aside className="sidebar">
        <div className="brand">expenseKubex</div>
        <nav className="side-nav">
          <button
            className={`side-link ${activeTab === "home" ? "active" : ""}`}
            type="button"
            onClick={() => setActiveTab("home")}
          >
            Home
          </button>
          {canAdminManageUsers ? (
            <button
              className={`side-link ${activeTab === "admin" ? "active" : ""}`}
              type="button"
              onClick={() => setActiveTab("admin")}
            >
              Admin Panel
            </button>
          ) : null}
        </nav>
      </aside>

      <section className="dashboard-main">
        <header className="topbar">
          <div>
            <h1 className="topbar-title">Expense Report</h1>
            <p className="topbar-subtitle">
              {activeTab === "admin"
                ? `Manage users and invites (${role})`
                : `Track and submit your expenses (${role})`}
            </p>
          </div>

          <div className="profile-wrap">
            <button
              className="profile-button"
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
            >
              {email || "profile"}
            </button>
            {menuOpen ? (
              <div className="profile-menu">
                <Link href="/settings" className="profile-menu-item" onClick={() => setMenuOpen(false)}>
                  Settings
                </Link>
                <button className="profile-menu-item" type="button" onClick={signOut}>
                  Sign out
                </button>
              </div>
            ) : null}
          </div>
        </header>

        {activeTab === "home" ? (
        <>
        <section className="panel">
          <div className="panel-header">
            <h2 className="panel-title">Expenses</h2>
            <p className="panel-subtitle">Total: {total.toFixed(2)} CAD</p>
          </div>

          {expensesError ? <p className="auth-banner error">{expensesError}</p> : null}
          {loadingExpenses ? <p className="panel-subtitle">Loading expenses...</p> : null}

          {!loadingExpenses && !expenses.length ? (
            <p className="panel-subtitle">No expenses yet. Add your first one below.</p>
          ) : null}

          {!!expenses.length ? (
            <div className="table-wrap">
              <table className="expense-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Category</th>
                    <th>Details</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((expense) => (
                    <tr key={expense.id}>
                      <td>{new Date(expense.expenseDateUtc).toISOString().slice(0, 10)}</td>
                      <td>{expense.category}</td>
                      <td>{expense.note || "-"}</td>
                      <td>{expense.amount.toFixed(2)}</td>
                      <td>{renderStatusChip(expense)}</td>
                      <td>
                        {expense.status === "Draft" ? (
                          <div className="table-actions">
                            <button
                              className="table-action-button"
                              type="button"
                              onClick={() => onSubmitExpense(expense.id)}
                              disabled={rowActionLoadingId === expense.id}
                            >
                              Submit
                            </button>
                            <button
                              className="table-action-button"
                              type="button"
                              onClick={() => onEditExpense(expense)}
                              disabled={rowActionLoadingId === expense.id}
                            >
                              Edit
                            </button>
                            <button
                              className="table-action-button danger"
                              type="button"
                              onClick={() => onDeleteExpense(expense.id)}
                              disabled={rowActionLoadingId === expense.id}
                            >
                              Delete
                            </button>
                          </div>
                        ) : expense.status === "Rejected" ? (
                          <span className="table-actions-muted">Rejected by reviewer</span>
                        ) : expense.status === "Approved" ? (
                          <span className="table-actions-muted">Approved</span>
                        ) : (
                          <span className="table-actions-muted">Awaiting manager approval</span>
                        )}
                        {expense.reviewComment ? (
                          <p className="review-comment">{expense.reviewComment}</p>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>

        {canReviewTeamExpenses ? (
          <section className="panel">
            <div className="panel-header">
              <h2 className="panel-title">Team Submitted Expenses</h2>
              <p className="panel-subtitle">Manager/HR/Finance review queue</p>
            </div>

            {teamExpensesError ? <p className="auth-banner error">{teamExpensesError}</p> : null}
            {loadingTeamExpenses ? <p className="panel-subtitle">Loading team submissions...</p> : null}

            {!loadingTeamExpenses && !teamExpenses.length ? (
              <p className="panel-subtitle">No submitted expenses waiting for review.</p>
            ) : null}

            {!!teamExpenses.length ? (
              <div className="table-wrap">
                <table className="expense-table">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Date</th>
                      <th>Category</th>
                      <th>Details</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teamExpenses.map((expense) => (
                      <tr key={expense.id}>
                        <td>{expense.userEmail}</td>
                        <td>{new Date(expense.expenseDateUtc).toISOString().slice(0, 10)}</td>
                        <td>{expense.category}</td>
                        <td>{expense.note || "-"}</td>
                        <td>{expense.amount.toFixed(2)}</td>
                        <td>{renderStatusChip(expense)}</td>
                        <td>
                          <input
                            className="dashboard-input"
                            type="text"
                            placeholder="Optional comment"
                            value={reviewCommentDrafts[expense.id] ?? ""}
                            onChange={(event) =>
                              setReviewCommentDrafts((previous) => ({
                                ...previous,
                                [expense.id]: event.target.value,
                              }))
                            }
                            maxLength={500}
                            style={{ marginBottom: 8, width: "100%" }}
                          />
                          <div className="table-actions">
                            <button
                              className="table-action-button"
                              type="button"
                              onClick={() => onReviewExpense(expense.id, "approve", reviewCommentDrafts[expense.id] ?? "")}
                              disabled={rowActionLoadingId === expense.id}
                            >
                              Approve
                            </button>
                            <button
                              className="table-action-button danger"
                              type="button"
                              onClick={() => onReviewExpense(expense.id, "reject", reviewCommentDrafts[expense.id] ?? "")}
                              disabled={rowActionLoadingId === expense.id}
                            >
                              Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </section>
        ) : null}

        <div
          className={`expense-entry-layout ${receiptPreviewUrl ? "expense-entry-layout-with-preview" : ""}`}
        >
          <section className="panel panel-form">
            <h2 className="panel-title">Add Expense</h2>

            <div className="expense-form-layout">
              <div className="receipt-upload-block">
                <label>
                  Receipt Image (OCR)
                  <input
                    ref={receiptInputRef}
                    className="dashboard-input"
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp,image/bmp,image/tiff"
                    onChange={(event) => setReceiptFile(event.target.files?.[0] ?? null)}
                  />
                </label>
                <button
                  className="auth-button"
                  type="button"
                  onClick={onScanReceipt}
                  disabled={ocrLoading}
                  style={{ marginTop: 10 }}
                >
                  {ocrLoading ? "Scanning receipt..." : "Scan Receipt and Autofill"}
                </button>
                {ocrError ? <p className="auth-banner error">{ocrError}</p> : null}
                {ocrSuccess ? <p className="auth-banner success">{ocrSuccess}</p> : null}
              </div>

              <form className="expense-form" onSubmit={onCreateExpense}>
                <label>
                  Date
                  <input
                    className="dashboard-input"
                    type="date"
                    value={expenseDate}
                    onChange={(event) => setExpenseDate(event.target.value)}
                    required
                  />
                </label>

                <label>
                  Category
                  <input
                    className="dashboard-input"
                    type="text"
                    value={category}
                    onChange={(event) => setCategory(event.target.value)}
                    required
                    maxLength={100}
                  />
                </label>

                <label>
                  Amount
                  <input
                    className="dashboard-input"
                    type="number"
                    step="0.01"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    required
                  />
                </label>

                <label>
                  Reason / Note
                  <textarea
                    className="dashboard-input dashboard-textarea"
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    maxLength={500}
                  />
                </label>

                {submitError ? <p className="auth-banner error">{submitError}</p> : null}
                {submitSuccess ? <p className="auth-banner success">{submitSuccess}</p> : null}

                <button className="auth-button" type="submit" disabled={submitLoading}>
                  {submitLoading ? (editingExpenseId ? "Updating..." : "Saving...") : (editingExpenseId ? "Update" : "Save")}
                </button>
                {editingExpenseId ? (
                  <button className="auth-button auth-button-secondary" type="button" onClick={onCancelEdit}>
                    Cancel Edit
                  </button>
                ) : null}
              </form>
            </div>
          </section>

          {receiptPreviewUrl ? (
            <aside className="panel receipt-preview-panel receipt-preview-card-uploaded" aria-live="polite">
              <h3 className="receipt-preview-title">Receipt Preview</h3>
              <div className="receipt-preview-image-wrap">
                <Image
                  className="receipt-preview-image"
                  src={receiptPreviewUrl}
                  alt={receiptFile?.name ? `Preview of ${receiptFile.name}` : "Receipt preview"}
                  fill
                  unoptimized
                  sizes="(max-width: 940px) 100vw, 360px"
                />
              </div>
            </aside>
          ) : null}
        </div>
        </>
        ) : null}

        {activeTab === "admin" && canAdminManageUsers ? (
          <section className="panel">
            <div className="panel-header">
              <h2 className="panel-title">Admin Panel</h2>
              <p className="panel-subtitle">Manage users, invites, and roles</p>
            </div>

            {/* Admin sub-tabs */}
            <div className="admin-subtabs">
              <button
                type="button"
                className={`admin-subtab${adminSubTab === "users" ? " active" : ""}`}
                onClick={() => setAdminSubTab("users")}
              >
                Users
              </button>
              <button
                type="button"
                className={`admin-subtab${adminSubTab === "roles" ? " active" : ""}`}
                onClick={() => setAdminSubTab("roles")}
              >
                Roles
              </button>
            </div>

            {/* Users sub-tab */}
            {adminSubTab === "users" ? (
              <>
                <form className="admin-invite-form" onSubmit={onInviteUser}>
                  <label>
                    Invite by email
                    <input
                      className="dashboard-input"
                      type="email"
                      value={inviteEmail}
                      onChange={(event) => setInviteEmail(event.target.value)}
                      placeholder="employee@company.com"
                      required
                    />
                  </label>

                  <label>
                    Role
                    <select
                      className="dashboard-input"
                      value={inviteRole}
                      onChange={(event) => setInviteRole(event.target.value)}
                    >
                      {roles.length > 0
                        ? roles.map((r) => (
                            <option key={r.id} value={r.name}>
                              {r.name}
                            </option>
                          ))
                        : <option value="Employee">Employee</option>}
                    </select>
                  </label>

                  <button
                    className="auth-button admin-invite-button"
                    type="submit"
                    disabled={inviteLoading || !canInviteUsers}
                    title={!canInviteUsers ? "Your role does not have permission to invite users" : undefined}
                  >
                    {inviteLoading ? "Sending invite..." : "Invite"}
                  </button>
                </form>

                {inviteError ? <p className="auth-banner error" style={{ marginBottom: 12 }}>{inviteError}</p> : null}
                {inviteSuccess ? <p className="auth-banner success" style={{ marginBottom: 12 }}>{inviteSuccess}</p> : null}
                {employeesError ? <p className="auth-banner error" style={{ marginBottom: 12 }}>{employeesError}</p> : null}
                {loadingEmployees ? <p className="panel-subtitle">Loading employees...</p> : null}

                {!loadingEmployees && !employees.length ? (
                  <p className="panel-subtitle">No employees found in the database.</p>
                ) : null}

                {!!employees.length ? (
                  <div className="table-wrap">
                    <table className="expense-table">
                      <thead>
                        <tr>
                          <th>Email</th>
                          <th>Role</th>
                          <th>Created</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {employees.map((user) => (
                          <tr key={user.id}>
                            <td>{user.email}</td>
                            <td>
                              <select
                                className="dashboard-input admin-role-select"
                                value={userRoleDrafts[user.email] ?? user.role}
                                onChange={(event) =>
                                  setUserRoleDrafts((previous) => ({
                                    ...previous,
                                    [user.email]: event.target.value,
                                  }))
                                }
                              >
                                {roles.length > 0
                                  ? roles.map((r) => (
                                      <option key={r.id} value={r.name}>
                                        {r.name}
                                      </option>
                                    ))
                                  : <option value={user.role}>{user.role}</option>}
                              </select>
                            </td>
                            <td>{new Date(user.createdAtUtc).toISOString().slice(0, 10)}</td>
                            <td>
                              <button
                                className="table-action-button"
                                type="button"
                                onClick={() => onUpdateUserRole(user.email)}
                                disabled={updatingUserEmail === user.email || userRoleDrafts[user.email] === user.role || !canChangeRoles}
                                title={!canChangeRoles ? "Your role does not have permission to change roles" : undefined}
                              >
                                {updatingUserEmail === user.email ? "Saving..." : "Update role"}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}
              </>
            ) : null}

            {/* Roles sub-tab */}
            {adminSubTab === "roles" ? (
              <>
                <form className="admin-invite-form" onSubmit={onSaveRole} style={{ marginBottom: 20, gridTemplateColumns: "1fr" }}>
                  <h3 className="panel-title" style={{ fontSize: "1rem", marginBottom: 8 }}>
                    {editingRole ? `Edit Role: ${editingRole.name}` : "Add New Role"}
                  </h3>

                  <div style={{ display: "grid", gridTemplateColumns: "minmax(200px, 1fr) minmax(200px, 1.5fr)", gap: "0.7rem", alignItems: "end" }}>
                    <label>
                      Name
                      <input
                        className="dashboard-input"
                        type="text"
                      value={newRoleName}
                        onChange={(event) => setNewRoleName(event.target.value)}
                        placeholder="e.g. Auditor"
                        required
                        maxLength={50}
                      />
                    </label>

                    <label>
                      Description <span style={{ fontWeight: 400, opacity: 0.7 }}>(optional)</span>
                      <input
                        className="dashboard-input"
                        type="text"
                        value={newRoleDescription}
                        onChange={(event) => setNewRoleDescription(event.target.value)}
                        placeholder="Brief description of this role"
                        maxLength={255}
                      />
                    </label>
                  </div>

                  <div style={{ display: "flex", gap: "1.5rem", marginTop: 4, flexWrap: "wrap" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontWeight: 500 }}>
                      <input
                        type="checkbox"
                        checked={newRoleCanInviteUsers}
                        onChange={(e) => setNewRoleCanInviteUsers(e.target.checked)}
                      />
                      Can invite users
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontWeight: 500 }}>
                      <input
                        type="checkbox"
                        checked={newRoleCanChangeRoles}
                        onChange={(e) => setNewRoleCanChangeRoles(e.target.checked)}
                      />
                      Can change roles
                    </label>
                  </div>

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                    <button
                      className="auth-button admin-invite-button"
                      type="submit"
                      disabled={roleFormLoading || !canChangeRoles}
                      title={!canChangeRoles ? "Your role does not have permission to manage roles" : undefined}
                    >
                      {roleFormLoading ? "Saving..." : editingRole ? "Update Role" : "Create Role"}
                    </button>
                    {editingRole ? (
                      <button
                        className="auth-button auth-button-secondary"
                        type="button"
                        onClick={onCancelRoleEdit}
                      >
                        Cancel
                      </button>
                    ) : null}
                  </div>
                </form>

                {roleFormError ? <p className="auth-banner error" style={{ marginBottom: 12 }}>{roleFormError}</p> : null}
                {roleFormSuccess ? <p className="auth-banner success" style={{ marginBottom: 12 }}>{roleFormSuccess}</p> : null}
                {rolesError ? <p className="auth-banner error" style={{ marginBottom: 12 }}>{rolesError}</p> : null}
                {loadingRoles ? <p className="panel-subtitle">Loading roles...</p> : null}

                {!loadingRoles && !roles.length ? (
                  <p className="panel-subtitle">No roles defined yet.</p>
                ) : null}

                {!!roles.length ? (
                  <div className="table-wrap">
                    <table className="expense-table">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Description</th>
                          <th>Can Invite</th>
                          <th>Can Change Roles</th>
                          <th>Created</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {roles.map((appRole) => (
                          <tr key={appRole.id}>
                            <td><strong>{appRole.name}</strong></td>
                            <td>{appRole.description ?? <span style={{ opacity: 0.5 }}>—</span>}</td>
                            <td style={{ textAlign: "center" }}>{appRole.canInviteUsers ? "✓" : <span style={{ opacity: 0.35 }}>—</span>}</td>
                            <td style={{ textAlign: "center" }}>{appRole.canChangeRoles ? "✓" : <span style={{ opacity: 0.35 }}>—</span>}</td>
                            <td>{new Date(appRole.createdAtUtc).toISOString().slice(0, 10)}</td>
                            <td>
                            <div className="table-actions">
                              <button
                                className="table-action-button"
                                type="button"
                                onClick={() => onEditRole(appRole)}
                                disabled={deletingRoleId === appRole.id || !canChangeRoles}
                                title={!canChangeRoles ? "Your role does not have permission to manage roles" : undefined}
                              >
                                Edit
                              </button>
                              <button
                                className="table-action-button danger"
                                type="button"
                                onClick={() => onDeleteRole(appRole.id, appRole.name)}
                                disabled={deletingRoleId === appRole.id || !canChangeRoles}
                                title={!canChangeRoles ? "Your role does not have permission to manage roles" : undefined}
                              >
                                {deletingRoleId === appRole.id ? "Deleting..." : "Delete"}
                              </button>
                            </div>
                          </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}
              </>
            ) : null}
          </section>
        ) : null}
      </section>
    </main>
  );
}
