// يوجّه إلى شاشة الدور الصحيحة
import React from "react";
import { useAuth } from "../../context/AuthContext";
import AdminHomeScreen from "./AdminHomeScreen";
import OfficeHeadHomeScreen from "./OfficeHeadHomeScreen";
import ITManagerHomeScreen from "./ITManagerHomeScreen";
import SurveyManagerHomeScreen from "./SurveyManagerHomeScreen";
import SurveyReviewerHomeScreen from "./SurveyReviewerHomeScreen";
import SurveyorHomeScreen from "./SurveyorHomeScreen";
import ExamManagerHomeScreen from "./ExamManagerHomeScreen";
import ExamReviewerHomeScreen from "./ExamReviewerHomeScreen";
import ExaminerHomeScreen from "./ExaminerHomeScreen";
import StaffHomeScreen from "./StaffHomeScreen";

export default function HomeRouter() {
  const { profile } = useAuth();
  switch (profile?.role) {
    case "admin":           return <AdminHomeScreen />;
    case "office_head":     return <OfficeHeadHomeScreen />;
    case "it_manager":      return <ITManagerHomeScreen />;
    case "survey_manager":  return <SurveyManagerHomeScreen />;
    case "survey_reviewer": return <SurveyReviewerHomeScreen />;
    case "surveyor":        return <SurveyorHomeScreen />;
    case "exam_manager":    return <ExamManagerHomeScreen />;
    case "exam_reviewer":   return <ExamReviewerHomeScreen />;
    case "examiner":        return <ExaminerHomeScreen />;
    default:                return <StaffHomeScreen />;
  }
}
