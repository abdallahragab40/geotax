// سياق المصادقة: الجلسة + الملف الشخصي + الدور + دوال الدخول/الخروج
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { Session, createClient } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "../lib/config";
import { Profile, Role } from "../types";

// بريد وهمي للممول المسجَّل (له رقم ضريبي)
const taxpayerEmail = (taxNumber: string) =>
  `tax${taxNumber.trim()}@taxpayer.tax`;
// بريد وهمي للممول الجديد (لا يملك رقم ضريبي بعد)
const newTaxpayerEmail = (nationalId: string) =>
  `new${nationalId.trim()}@taxpayer.tax`;

interface AuthState {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  profileLoaded: boolean;
  signInEmployee: (email: string, password: string) => Promise<void>;
  signUpEmployee: (data: {
    email: string;
    password: string;
    fullName: string;
    code: string;
  }) => Promise<void>;
  signInTaxpayer: (taxNumber: string, password: string) => Promise<void>;
  // ممول موجود بالبيانات: تحقّق واربط (يرفض لو غير موجود)
  signUpExistingTaxpayer: (data: {
    nationalId: string;
    phone: string;
    password: string;
    fullName: string;
    taxNumber: string;
  }) => Promise<void>;
  // ممول جديد (طلب فتح ملف): بدون رقم ضريبي + اختيار مأمورية
  signUpNewTaxpayer: (data: {
    nationalId: string;
    phone: string;
    fullName: string;
    password: string;
    officeId: number;
  }) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  adminCreateEmployee: (data: {
    email: string;
    password: string;
    fullName: string;
    role: Role;
    officeId?: number | null;
    employeeNumber?: string;
  }) => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoaded, setProfileLoaded] = useState(false);

  const loadProfile = useCallback(async (userId: string) => {
    try {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();
      setProfile((data as Profile) ?? null);
    } catch {
      setProfile(null);
    } finally {
      setProfileLoaded(true);
    }
  }, []);

  useEffect(() => {
    let done = false;
    // حماية: لا يبقى التطبيق عالقًا على التحميل أكثر من 8 ثوانٍ
    const safety = setTimeout(() => {
      if (!done) {
        setProfileLoaded(true);
        setLoading(false);
      }
    }, 8000);

    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        setSession(data.session);
        if (data.session) await loadProfile(data.session.user.id);
        else setProfileLoaded(true);
      } catch {
        setProfileLoaded(true);
      } finally {
        done = true;
        clearTimeout(safety);
        setLoading(false);
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange(async (_e, s) => {
      setSession(s);
      if (s) {
        setProfileLoaded(false);
        await loadProfile(s.user.id);
      } else {
        setProfile(null);
        setProfileLoaded(true);
      }
    });
    return () => {
      clearTimeout(safety);
      sub.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signInEmployee = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) throw error;
  }, []);

  const signUpEmployee = useCallback(
    async (d: { email: string; password: string; fullName: string; code: string }) => {
      const { data, error } = await supabase.auth.signUp({
        email: d.email.trim(),
        password: d.password,
      });
      if (error) throw error;
      const userId = data.user?.id;
      if (!userId) throw new Error("تعذّر إنشاء الحساب");
      // التحقق من الرمز وتعيين الدور موظف (عبر دالة الخادم)
      const { error: rpcErr } = await supabase.rpc("register_as_employee", {
        code: d.code.trim(),
        full_name: d.fullName.trim(),
      });
      if (rpcErr) {
        // فشل التحقق من الرمز — نخرج لتجنّب حساب بدون دور
        await supabase.auth.signOut();
        throw rpcErr;
      }
      await loadProfile(userId);
    },
    [loadProfile]
  );

  // دخول الممول: رقم تسجيل ضريبي + كلمة سر
  const signInTaxpayer = useCallback(async (taxNumber: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: taxpayerEmail(taxNumber),
      password: password.trim(),
    });
    if (error) throw error;
  }, []);

  // ممول مسجَّل مسبقًا بالنظام: ينشئ حسابه ويربطه بسجل taxpayers الموجود
  const signUpExistingTaxpayer = useCallback(
    async (d: { nationalId: string; phone: string; password: string; fullName: string; taxNumber: string }) => {
      const { data, error } = await supabase.auth.signUp({
        email: taxpayerEmail(d.taxNumber),
        password: d.password.trim(),
      });
      if (error) throw error;
      const userId = data.user?.id;
      if (!userId) throw new Error("تعذّر إنشاء الحساب");

      const { error: pErr } = await supabase.from("profiles").insert({
        id: userId,
        role: "taxpayer" as Role,
        full_name: d.fullName.trim(),
        national_id: d.nationalId.trim(),
        phone: d.phone.trim(),
        tax_number: d.taxNumber.trim(),
      });
      if (pErr) throw pErr;

      const { data: matched, error: lErr } = await supabase.rpc("link_taxpayer", {
        p_tax: d.taxNumber.trim(),
        p_national: d.nationalId.trim(),
      });
      if (lErr) {
        await supabase.auth.signOut();
        throw lErr;
      }
      if (!matched) {
        await supabase.auth.signOut();
        throw new Error(
          "بياناتك غير موجودة في المأموريات. إن كنت ممولًا جديدًا استخدم «طلب فتح ملف جديد»."
        );
      }
      await loadProfile(userId);
    },
    [loadProfile]
  );

  // ممول جديد (طلب فتح ملف): اختيار مأمورية + كلمة سر، يُسجَّل بحالة pending
  const signUpNewTaxpayer = useCallback(
    async (d: { nationalId: string; phone: string; fullName: string; password: string; officeId: number }) => {
      const { data, error } = await supabase.auth.signUp({
        email: newTaxpayerEmail(d.nationalId),
        password: d.password.trim(),
      });
      if (error) throw error;
      const userId = data.user?.id;
      if (!userId) throw new Error("تعذّر إنشاء الحساب");

      const { error: pErr } = await supabase.from("profiles").insert({
        id: userId,
        role: "taxpayer" as Role,
        full_name: d.fullName.trim(),
        national_id: d.nationalId.trim(),
        phone: d.phone.trim(),
        office_id: d.officeId,
      });
      if (pErr) throw pErr;

      // إنشاء سطر pending في جدول الممولين لتظهر للمأمور الحصر بالمأمورية
      await supabase.from("taxpayers").insert({
        name: d.fullName.trim(),
        national_id: d.nationalId.trim(),
        office_id: d.officeId,
        user_id: userId,
        source: "self_signup",
        status: "طلب فتح ملف",
        registered: false,
      });

      await loadProfile(userId);
    },
    [loadProfile]
  );

  // المدير/رئيس المأمورية/مدير الحاسب ينشئ موظفًا — يفرض الهرم عبر RPC
  const adminCreateEmployee = useCallback(
    async (d: {
      email: string;
      password: string;
      fullName: string;
      role: Role;
      officeId?: number | null;   // مطلوب فقط للأدمن
      employeeNumber?: string;
    }) => {
      const tmp = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data, error } = await tmp.auth.signUp({
        email: d.email.trim(),
        password: d.password,
      });
      if (error) throw error;
      const newId = data.user?.id;
      if (!newId) throw new Error("تعذّر إنشاء الحساب");
      const { error: pErr } = await tmp.from("profiles").insert({
        id: newId,
        role: "taxpayer" as Role,
        full_name: d.fullName.trim(),
      });
      if (pErr) throw pErr;
      const { error: rErr } = await supabase.rpc("admin_create_employee", {
        p_target: newId,
        p_role: d.role,
        p_office_id: d.officeId ?? null,
        p_emp_number: d.employeeNumber ?? null,
      });
      if (rErr) throw rErr;
    },
    []
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (session) await loadProfile(session.user.id);
  }, [session, loadProfile]);

  return (
    <AuthContext.Provider
      value={{
        session,
        profile,
        loading,
        profileLoaded,
        signInEmployee,
        signUpEmployee,
        signInTaxpayer,
        signUpExistingTaxpayer,
        signUpNewTaxpayer,
        signOut,
        refreshProfile,
        adminCreateEmployee,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
