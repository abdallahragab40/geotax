// نقطة الدخول: المصادقة + التنقل حسب الدور (مدير / مأمور / ممول)
import React, { useEffect } from "react";
import { View, Text, ActivityIndicator, StyleSheet, I18nManager } from "react-native";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AuthProvider, useAuth } from "./src/context/AuthContext";
import ErrorBoundary from "./src/components/ErrorBoundary";
import { registerForPush } from "./src/data/notifications";
import { isSupabaseConfigured } from "./src/lib/config";
import { colors } from "./src/theme";
import { STAFF_ROLES } from "./src/types";
import type {
  AuthStackParamList,
  InternalStackParamList,
  TaxpayerStackParamList,
} from "./src/navigation";

import RoleSelectScreen from "./src/screens/auth/RoleSelectScreen";
import EmployeeLoginScreen from "./src/screens/auth/EmployeeLoginScreen";
import TaxpayerLoginScreen from "./src/screens/auth/TaxpayerLoginScreen";
import ChangePasswordScreen from "./src/screens/auth/ChangePasswordScreen";
import HomeRouter from "./src/screens/internal/HomeRouter";
import ManageEmployeesScreen from "./src/screens/internal/ManageEmployeesScreen";
import DepartmentHomeScreen from "./src/screens/internal/DepartmentHomeScreen";
import TaxpayersListScreen from "./src/screens/survey/TaxpayersListScreen";
import TaxpayerFileScreen from "./src/screens/survey/TaxpayerFileScreen";
import EnumerationFormScreen from "./src/screens/survey/EnumerationFormScreen";
import ModificationFormScreen from "./src/screens/survey/ModificationFormScreen";
import DepartmentListScreen from "./src/screens/department/DepartmentListScreen";
import DepartmentFormScreen from "./src/screens/department/DepartmentFormScreen";
import DepartmentDetailScreen from "./src/screens/department/DepartmentDetailScreen";
import RequestsListScreen from "./src/screens/requests/RequestsListScreen";
import RequestDetailScreen from "./src/screens/requests/RequestDetailScreen";
import TaxpayerRequestsScreen from "./src/screens/requests/TaxpayerRequestsScreen";
import NewRequestFormScreen from "./src/screens/requests/NewRequestFormScreen";
import ComplaintsListScreen from "./src/screens/complaints/ComplaintsListScreen";
import ComplaintDetailScreen from "./src/screens/complaints/ComplaintDetailScreen";
import ComplaintFormScreen from "./src/screens/complaints/ComplaintFormScreen";
import TrackScreen from "./src/screens/public/TrackScreen";
import AccountActivationsScreen from "./src/screens/survey/AccountActivationsScreen";
import ReportsScreen from "./src/screens/reports/ReportsScreen";
import NewsListScreen from "./src/screens/news/NewsListScreen";
import NewsFormScreen from "./src/screens/news/NewsFormScreen";
import OfficesAdminScreen from "./src/screens/admin/OfficesAdminScreen";
import FileManagementScreen from "./src/screens/internal/FileManagementScreen";
import JurisdictionsScreen from "./src/screens/internal/JurisdictionsScreen";
import ProfileScreen from "./src/screens/profile/ProfileScreen";
import CentralSearchScreen from "./src/screens/survey/CentralSearchScreen";
import SurveyorWorksScreen from "./src/screens/survey/SurveyorWorksScreen";
import OtherWorksScreen from "./src/screens/survey/OtherWorksScreen";
import AddSubActivityScreen from "./src/screens/survey/AddSubActivityScreen";
import AddBranchScreen from "./src/screens/survey/AddBranchScreen";
import AddWarehouseScreen from "./src/screens/survey/AddWarehouseScreen";
import MyTasksScreen from "./src/screens/survey/MyTasksScreen";
import TaskDetailScreen from "./src/screens/survey/TaskDetailScreen";
import SurveyPlansScreen from "./src/screens/survey/SurveyPlansScreen";
import AssignTaskScreen from "./src/screens/survey/AssignTaskScreen";
import MyAssignedTasksScreen from "./src/screens/survey/MyAssignedTasksScreen";
import ExaminerWorksScreen from "./src/screens/exam/ExaminerWorksScreen";
import InspectionFormScreen from "./src/screens/exam/InspectionFormScreen";
import AttendanceRequestFormScreen from "./src/screens/exam/AttendanceRequestFormScreen";
import AppointmentFormScreen from "./src/screens/exam/AppointmentFormScreen";
import PartialStopFormScreen from "./src/screens/exam/PartialStopFormScreen";
import FinalStopFormScreen from "./src/screens/exam/FinalStopFormScreen";
import ExamPlansScreen from "./src/screens/exam/ExamPlansScreen";
import NotificationsScreen from "./src/screens/notifications/NotificationsScreen";
import TaxpayerMyFileScreen from "./src/screens/taxpayer/TaxpayerMyFileScreen";
import AuditLogScreen from "./src/screens/audit/AuditLogScreen";
import PasswordResetsScreen from "./src/screens/admin/PasswordResetsScreen";
import MapScreen from "./src/screens/MapScreen";
import ConversationsScreen from "./src/screens/messages/ConversationsScreen";
import ChatScreen from "./src/screens/messages/ChatScreen";
import PlaceholderScreen from "./src/screens/PlaceholderScreen";
import TaxpayerHomeScreen from "./src/screens/taxpayer/TaxpayerHomeScreen";

I18nManager.allowRTL(true);

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const InternalStack = createNativeStackNavigator<InternalStackParamList>();
const TaxpayerStack = createNativeStackNavigator<TaxpayerStackParamList>();

const headerOpts = {
  headerStyle: { backgroundColor: colors.surface },
  headerTintColor: colors.primary,
  headerTitleStyle: { color: colors.text, fontWeight: "800" as const },
  headerTitleAlign: "center" as const,
};

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="RoleSelect" component={RoleSelectScreen} />
      <AuthStack.Screen name="EmployeeLogin" component={EmployeeLoginScreen} />
      <AuthStack.Screen name="TaxpayerLogin" component={TaxpayerLoginScreen} />
      <AuthStack.Screen name="Complaint" component={ComplaintFormScreen} />
      <AuthStack.Screen name="Track" component={TrackScreen} />
    </AuthStack.Navigator>
  );
}

function InternalNavigator() {
  return (
    <InternalStack.Navigator screenOptions={headerOpts}>
      <InternalStack.Screen name="Home" component={HomeRouter} options={{ headerShown: false }} />
      <InternalStack.Screen name="ManageEmployees" component={ManageEmployeesScreen} options={{ title: "الموظفون" }} />
      <InternalStack.Screen name="DepartmentHome" component={DepartmentHomeScreen} options={{ title: "" }} />
      <InternalStack.Screen name="TaxpayersList" component={TaxpayersListScreen} options={{ title: "الممولون" }} />
      <InternalStack.Screen name="TaxpayerFile" component={TaxpayerFileScreen} options={{ title: "ملف الممول" }} />
      <InternalStack.Screen name="EnumerationForm" component={EnumerationFormScreen} options={{ title: "حصر ميداني" }} />
      <InternalStack.Screen name="ModificationForm" component={ModificationFormScreen} options={{ title: "إضافة / تعديل" }} />
      <InternalStack.Screen name="DeptList" component={DepartmentListScreen} options={{ title: "" }} />
      <InternalStack.Screen name="DeptForm" component={DepartmentFormScreen} options={{ title: "" }} />
      <InternalStack.Screen name="DeptDetail" component={DepartmentDetailScreen} options={{ title: "" }} />
      <InternalStack.Screen name="RequestsList" component={RequestsListScreen} options={{ title: "الطلبات" }} />
      <InternalStack.Screen name="RequestDetail" component={RequestDetailScreen} options={{ title: "معالجة الطلب" }} />
      <InternalStack.Screen name="ComplaintsList" component={ComplaintsListScreen} options={{ title: "الشكاوى" }} />
      <InternalStack.Screen name="ComplaintDetail" component={ComplaintDetailScreen} options={{ title: "الشكوى" }} />
      <InternalStack.Screen name="Reports" component={ReportsScreen} options={{ title: "التقارير" }} />
      <InternalStack.Screen name="NewsList" component={NewsListScreen} options={{ title: "آخر الأخبار" }} />
      <InternalStack.Screen name="NewsForm" component={NewsFormScreen} options={{ title: "خبر" }} />
      <InternalStack.Screen name="OfficesAdmin" component={OfficesAdminScreen} options={{ title: "إدارة المأموريات" }} />
      <InternalStack.Screen name="FileManagement" component={FileManagementScreen} options={{ title: "إدارة الملفات" }} />
      <InternalStack.Screen name="Jurisdictions" component={JurisdictionsScreen} options={{ title: "توزيع الاختصاصات" }} />
      <InternalStack.Screen name="Profile" component={ProfileScreen} options={{ title: "الملف الشخصي" }} />
      <InternalStack.Screen name="CentralSearch" component={CentralSearchScreen} options={{ title: "البحث المركزي" }} />
      <InternalStack.Screen name="SurveyorWorks" component={SurveyorWorksScreen} options={{ title: "أعمال شعبة الحصر" }} />
      <InternalStack.Screen name="OtherWorks" component={OtherWorksScreen} options={{ title: "أعمال أخرى" }} />
      <InternalStack.Screen name="AddSubActivity" component={AddSubActivityScreen} options={{ title: "نشاط فرعي" }} />
      <InternalStack.Screen name="AddBranch" component={AddBranchScreen} options={{ title: "إضافة فرع" }} />
      <InternalStack.Screen name="AddWarehouse" component={AddWarehouseScreen} options={{ title: "إضافة مخزن" }} />
      <InternalStack.Screen name="MyTasks" component={MyTasksScreen} options={{ title: "المهام الواردة" }} />
      <InternalStack.Screen name="TaskDetail" component={TaskDetailScreen} options={{ title: "تفاصيل المهمة" }} />
      <InternalStack.Screen name="SurveyPlans" component={SurveyPlansScreen} options={{ title: "خطة الحصر" }} />
      <InternalStack.Screen name="AssignTask" component={AssignTaskScreen} options={{ title: "إسناد مهمة" }} />
      <InternalStack.Screen name="MyAssignedTasks" component={MyAssignedTasksScreen} options={{ title: "متابعة المهام" }} />
      <InternalStack.Screen name="ExaminerWorks" component={ExaminerWorksScreen} options={{ title: "أعمال الفحص" }} />
      <InternalStack.Screen name="InspectionForm" component={InspectionFormScreen} options={{ title: "معاينة فحص" }} />
      <InternalStack.Screen name="AttendanceRequestForm" component={AttendanceRequestFormScreen} options={{ title: "طلب حضور" }} />
      <InternalStack.Screen name="AppointmentForm" component={AppointmentFormScreen} options={{ title: "موعد معاينة" }} />
      <InternalStack.Screen name="PartialStopForm" component={PartialStopFormScreen} options={{ title: "توقف جزئي" }} />
      <InternalStack.Screen name="FinalStopForm" component={FinalStopFormScreen} options={{ title: "توقف نهائي" }} />
      <InternalStack.Screen name="ExamPlans" component={ExamPlansScreen} options={{ title: "خطة الفحص" }} />
      <InternalStack.Screen name="Notifications" component={NotificationsScreen} options={{ title: "الإشعارات" }} />
      <InternalStack.Screen name="TaxpayerMyFile" component={TaxpayerMyFileScreen} options={{ title: "ملف الممول" }} />
      <InternalStack.Screen name="AuditLog" component={AuditLogScreen} options={{ title: "سجل العمليات" }} />
      <InternalStack.Screen name="PasswordResets" component={PasswordResetsScreen} options={{ title: "استعادة كلمات المرور" }} />
      <InternalStack.Screen name="AccountActivations" component={AccountActivationsScreen} options={{ title: "تفعيل حسابات الممولين" }} />
      <InternalStack.Screen name="Map" component={MapScreen} options={{ title: "الخريطة" }} />
      <InternalStack.Screen name="Conversations" component={ConversationsScreen} options={{ title: "المراسلات" }} />
      <InternalStack.Screen name="Chat" component={ChatScreen} options={{ title: "محادثة" }} />
      <InternalStack.Screen name="Placeholder" component={PlaceholderScreen} options={{ title: "" }} />
    </InternalStack.Navigator>
  );
}

function TaxpayerNavigator() {
  return (
    <TaxpayerStack.Navigator screenOptions={headerOpts}>
      <TaxpayerStack.Screen name="TaxpayerHome" component={TaxpayerHomeScreen} options={{ headerShown: false }} />
      <TaxpayerStack.Screen name="TaxpayerMyFile" component={TaxpayerMyFileScreen} options={{ title: "ملفي" }} />
      <TaxpayerStack.Screen name="NewsList" component={NewsListScreen} options={{ title: "آخر الأخبار" }} />
      <TaxpayerStack.Screen name="Notifications" component={NotificationsScreen} options={{ title: "الإشعارات" }} />
      <TaxpayerStack.Screen name="DeptDetail" component={DepartmentDetailScreen} options={{ title: "" }} />
      <TaxpayerStack.Screen name="TaxpayerRequests" component={TaxpayerRequestsScreen} options={{ title: "الطلبات" }} />
      <TaxpayerStack.Screen name="NewRequest" component={NewRequestFormScreen} options={{ title: "طلب جديد" }} />
      <TaxpayerStack.Screen name="Conversations" component={ConversationsScreen} options={{ title: "المراسلات" }} />
      <TaxpayerStack.Screen name="Chat" component={ChatScreen} options={{ title: "محادثة" }} />
    </TaxpayerStack.Navigator>
  );
}

function IncompleteAccount() {
  const { signOut, session } = useAuth();
  return (
    <View style={styles.center}>
      <Text style={styles.error}>
        حسابك غير مكتمل التهيئة (لا يوجد ملف مرتبط به).{"\n"}
        تواصل مع مدير الحاسب الآلي بمأموريتك، أو سجّل الدخول بحساب آخر.
      </Text>
      <Text selectable style={styles.uid}>معرّف الحساب:{"\n"}{session?.user?.id}</Text>
      <Text style={styles.link} onPress={() => signOut()}>تسجيل الخروج</Text>
    </View>
  );
}

function SuspendedAccount() {
  const { signOut } = useAuth();
  return (
    <View style={styles.center}>
      <Text style={styles.error}>
        تم إيقاف حسابك.{"\n"}تواصل مع مدير الحاسب الآلي بمأموريتك لإعادة تفعيله.
      </Text>
      <Text style={styles.link} onPress={() => signOut()}>تسجيل الخروج</Text>
    </View>
  );
}

function Root() {
  const { session, profile, loading, profileLoaded } = useAuth();

  useEffect(() => {
    if (session?.user?.id && profile) registerForPush(session.user.id);
  }, [session?.user?.id, profile]);

  if (loading || (session && !profileLoaded)) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const isStaff = profile && STAFF_ROLES.includes(profile.role);

  return (
    <NavigationContainer>
      {!session ? (
        <AuthNavigator />
      ) : !profile ? (
        <IncompleteAccount />
      ) : profile.status === "suspended" ? (
        <SuspendedAccount />
      ) : profile.must_change_password ? (
        <ChangePasswordScreen />
      ) : profile.role === "taxpayer" ? (
        <TaxpayerNavigator />
      ) : isStaff || profile.role === "employee" ? (
        <InternalNavigator />
      ) : (
        <IncompleteAccount />
      )}
    </NavigationContainer>
  );
}

export default function App() {
  if (!isSupabaseConfigured) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>
          تعذّر تشغيل التطبيق: إعدادات الاتصال بالخادم غير مكتملة.{"\n"}يرجى تحديث التطبيق أو التواصل مع الدعم الفني.
        </Text>
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <AuthProvider>
          <Root />
        </AuthProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background },
  error: { color: colors.danger, textAlign: "center", padding: 24, fontSize: 15, lineHeight: 24 },
  uid: { color: colors.muted, textAlign: "center", fontSize: 12, paddingHorizontal: 24, marginBottom: 16 },
  link: { color: colors.primary, fontWeight: "800", fontSize: 16, padding: 12 },
});
