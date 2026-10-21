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
import { unregisterPush } from "../data/notifications";

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
  // الدخول برقم التسجيل الضريبي، أو بالرقم القومي لمن لم يُعتمد ملفه بعد
  signInTaxpayer: (identifier: string, password: string) => Promise<void>;
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
  // حذف حساب الممول نهائيًا (متطلب متاجر التطبيقات)
  deleteAccount: () => Promise<void>;
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

  // دخول الممول: رقم تسجيل ضريبي + كلمة سر
  // (الممول الجديد الذي لم يُعتمد ملفه بعد يدخل برقمه القومي)
  const signInTaxpayer = useCallback(async (identifier: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: taxpayerEmail(identifier),
      password: password.trim(),
    });
    if (!error) return;
    const { error: e2 } = await supabase.auth.signInWithPassword({
      email: newTaxpayerEmail(identifier),
      password: password.trim(),
    });
    if (e2) throw error;
  }, []);

  // ممول مسجَّل مسبقًا بالنظام: ينشئ حسابه ويربطه بسجل taxpayers الموجود
  const signUpExistingTaxpayer = useCallback(
    async (d: { nationalId: string; phone: string; password: string; fullName: string; taxNumber: string }) => {
      // التحقق قبل إنشاء الحساب حتى لا يُحجز رقم الممول بحساب يتيم
      const { data: canRegister, error: cErr } = await supabase.rpc("taxpayer_can_register", {
        p_tax: d.taxNumber.trim(),
        p_national: d.nationalId.trim(),
      });
      if (cErr) throw cErr;
      if (!canRegister) {
        throw new Error(
          "لا يوجد ملف بهذا الرقم الضريبي والرقم القومي، أو أن الملف مرتبط بحساب بالفعل. إن كنت ممولًا جديدًا استخدم «ملف جديد»."
        );
      }

      const email = taxpayerEmail(d.taxNumber);
      let userId: string | undefined;
      const { data, error } = await supabase.auth.signUp({ email, password: d.password.trim() });
      if (error && /already registered|already exists/i.test(error.message)) {
        // حساب أُنشئ سابقًا ولم يكتمل ربطه — ندخل به ونكمل الربط
        const { data: si, error: siErr } = await supabase.auth.signInWithPassword({
          email,
          password: d.password.trim(),
        });
        if (siErr) throw new Error("يوجد حساب بهذا الرقم بالفعل. استخدم «دخول».");
        userId = si.user?.id;
      } else if (error) {
        throw error;
      } else {
        userId = data.user?.id;
      }
      if (!userId) throw new Error("تعذّر إنشاء الحساب");

      const { error: pErr } = await supabase.from("profiles").upsert(
        {
          id: userId,
          role: "taxpayer" as Role,
          full_name: d.fullName.trim(),
          national_id: d.nationalId.trim(),
          phone: d.phone.trim(),
        },
        { onConflict: "id", ignoreDuplicates: true }
      );
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
      if (error && /already registered|already exists/i.test(error.message)) {
        throw new Error("يوجد حساب مسجّل بهذا الرقم القومي. استخدم «دخول» بالرقم القومي وكلمة المرور.");
      }
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

      // إنشاء طلب فتح ملف معلّق يظهر لمأمور الحصر بالمأمورية المختارة
      const { error: rErr } = await supabase.rpc("request_taxpayer_file", { p_office: d.officeId });
      if (rErr) throw rErr;

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
    if (session?.user?.id) await unregisterPush(session.user.id);
    await supabase.auth.signOut();
    setProfile(null);
  }, [session?.user?.id]);

  const deleteAccount = useCallback(async () => {
    const { error } = await supabase.rpc("delete_my_account");
    if (error) throw error;
    await supabase.auth.signOut({ scope: "local" });
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
        signInTaxpayer,
        signUpExistingTaxpayer,
        signUpNewTaxpayer,
        signOut,
        deleteAccount,
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
