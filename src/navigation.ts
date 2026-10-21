// أنواع التنقل

export type AuthStackParamList = {
  RoleSelect: undefined;
  EmployeeLogin: undefined;
  TaxpayerLogin: undefined;
  Complaint: undefined;
};

// مكدّس الموظفين الداخليين (المدير + المأمورون)
export type InternalStackParamList = {
  Home: undefined;
  ManageEmployees: undefined;
  DepartmentHome: { deptKey: string };
  TaxpayersList: { mode?: "view" | "modify" } | undefined;
  TaxpayerFile: { id: number };
  EnumerationForm: undefined;
  ModificationForm: { taxpayerId: number };
  DeptList: { deptKey: string };
  DeptForm: { deptKey: string; id?: number };
  DeptDetail: { deptKey: string; id: number };
  RequestsList: { department: string };
  RequestDetail: { id: number };
  ComplaintsList: undefined;
  ComplaintDetail: { id: number };
  Reports: undefined;
  NewsList: undefined;
  NewsForm: { id?: number } | undefined;
  OfficesAdmin: undefined;
  FileManagement: undefined;
  Jurisdictions: undefined;
  Profile: undefined;
  // إدارة الحصر
  CentralSearch: undefined;
  SurveyorWorks: undefined;
  OtherWorks: undefined;
  AddSubActivity: { taxpayerId: number };
  AddBranch: { taxpayerId: number };
  AddWarehouse: { taxpayerId: number };
  MyTasks: undefined;
  TaskDetail: { id: number };
  SurveyPlans: undefined;
  AssignTask: { taskType?: "survey" | "exam"; planType?: string } | undefined;
  MyAssignedTasks: undefined;
  // إدارة الفحص
  ExaminerWorks: undefined;
  InspectionForm: undefined;
  AttendanceRequestForm: undefined;
  AppointmentForm: undefined;
  PartialStopForm: undefined;
  FinalStopForm: undefined;
  ExamPlans: undefined;
  // الإشعارات والممول
  Notifications: undefined;
  TaxpayerMyFile: undefined;
  AuditLog: undefined;
  PasswordResets: undefined;
  Map: undefined;
  Conversations: undefined;
  Chat: { otherId: string; name: string };
  Placeholder: { title: string };
};

export type TaxpayerStackParamList = {
  TaxpayerHome: undefined;
  TaxpayerMyFile: undefined;
  Notifications: undefined;
  NewsList: undefined;
  DeptDetail: { deptKey: string; id: number };
  TaxpayerRequests: undefined;
  NewRequest: { department: string };
  Conversations: undefined;
  Chat: { otherId: string; name: string };
};
