import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, Redirect, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { GlobalBookingButton } from "./components/GlobalBookingButton";
import { PapaAiWidget } from "./components/PapaAiWidget";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import MemberLogin from "./pages/MemberLogin";
import MemberRegister from "./pages/MemberRegister";
import MemberActivate from "./pages/MemberActivate";
import MemberBilling from "./pages/MemberBilling";
import MemberPortal from "./pages/MemberPortal";
import Shop from "./pages/Shop";
import Join from "./pages/Join";
import PapaJourneyFunnel from "./pages/PapaJourneyFunnel";
import Strategist from "./pages/Strategist";
import ThemeMatrix from "./pages/ThemeMatrix";
import Operators from "./pages/Operators";
import Governance from "./pages/Governance";
import Booking from "./pages/Booking";
import ResearchLab from "./pages/ResearchLab";
import Courses from "./pages/Courses";
import CourseDetail from "./pages/CourseDetail";
import CrmIntake from "./pages/CrmIntake";
import PapaIntroVideo from "./pages/PapaIntroVideo";
import PapaJournal from "./pages/PapaJournal";
import PapaFirstLesson from "./pages/PapaFirstLesson";
import PapaDailyWorkReport from "./pages/PapaDailyWorkReport";
import RelationshipAssessment from "./pages/RelationshipAssessment";
import PapaAiExperience from "./pages/PapaAiExperience";
import MarleeAssessment from "./pages/MarleeAssessment";
import WelcomeToPapaLife from "./pages/WelcomeToPapaLife";
import PapaLifeOutreach from "./pages/PapaLifeOutreach";
import { PrivacyPage, TermsPage } from "./pages/LegalPages";
import {
  AboutBrianKeithHillPage,
  AdultDaughterRelationshipPage,
  AdultSonRelationshipPage,
  FatherChildEstrangementPage,
  PapaFrameworkPage,
  WhyAdultChildrenPullAwayPage,
} from "./pages/papa-seo-routes";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path="/courses/:id" component={CourseDetail} />
      <Route path="/courses" component={Courses} />
      <Route path={"/login"} component={Login} />
      <Route path="/dashboard">
        <Redirect to="/crm-console" />
      </Route>
      <Route path={"/crm"} component={CrmIntake} />
      <Route path={"/crm-console"} component={Dashboard} />
      <Route path="/papa-intro" component={PapaIntroVideo} />
      <Route path="/papa-journal" component={PapaJournal} />
      <Route path="/papa-first-lesson" component={PapaFirstLesson} />
      <Route path="/papa-daily-work-report" component={PapaDailyWorkReport} />
      <Route path="/ai-coach" component={PapaAiExperience} />
      <Route path="/resources" component={PapaAiExperience} />
      <Route path="/books" component={PapaAiExperience} />
      <Route path="/podcast" component={PapaAiExperience} />
      <Route path="/tuesday-live" component={PapaAiExperience} />
      <Route path="/membership" component={PapaAiExperience} />
      <Route path="/contact" component={PapaAiExperience} />
      <Route path="/privacy-policy" component={PrivacyPage} />
      <Route path="/terms-of-service" component={TermsPage} />
      <Route path="/privacy" component={PrivacyPage} />
      <Route path="/terms" component={TermsPage} />
      <Route path={"/member-login"} component={MemberLogin} />
      <Route path={"/member-register"} component={MemberRegister} />
      <Route path={"/member-activate"} component={MemberActivate} />
      <Route path={"/member-billing"} component={MemberBilling} />
      <Route path={"/portal"} component={MemberPortal} />
      <Route path={"/shop"} component={Shop} />
      <Route path={"/join"} component={Join} />
      <Route path={"/papa-journey"} component={PapaJourneyFunnel} />
      <Route path="/assessment" component={RelationshipAssessment} />
      <Route path="/relationship-assessment" component={RelationshipAssessment} />
      <Route path="/marlee-assessment" component={MarleeAssessment} />
      <Route path="/adult-son-relationship" component={AdultSonRelationshipPage} />
      <Route path="/adult-daughter-relationship" component={AdultDaughterRelationshipPage} />
      <Route path="/why-adult-children-pull-away" component={WhyAdultChildrenPullAwayPage} />
      <Route path="/father-child-estrangement" component={FatherChildEstrangementPage} />
      <Route path="/papa-framework" component={PapaFrameworkPage} />
      <Route path="/about-brian-keith-hill" component={AboutBrianKeithHillPage} />
      <Route path="/welcome-to-papa-life" component={WelcomeToPapaLife} />
      <Route path="/admin/papa-life-outreach" component={PapaLifeOutreach} />
      <Route path={"/strategist"} component={Strategist} />
      <Route path={"/theme-matrix"} component={ThemeMatrix} />
      <Route path={"/operators"} component={Operators} />
      <Route path={"/governance"} component={Governance} />
      <Route path={"/booking"} component={Booking} />
      <Route path={"/research-lab"} component={ResearchLab} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function GlobalPapaAiWidget() {
  const [location] = useLocation();
  const path = location.replace(/\/$/, "") || "/";
  const hiddenPrefixes = [
    "/ai-coach",
    "/resources",
    "/books",
    "/podcast",
    "/tuesday-live",
    "/membership",
    "/contact",
    "/crm",
    "/crm-console",
    "/dashboard",
    "/login",
    "/member-login",
    "/member-register",
    "/member-activate",
    "/member-billing",
    "/portal",
    "/join",
    "/research-lab",
  ];
  const shouldHide = hiddenPrefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));

  if (shouldHide) return null;
  return <PapaAiWidget autoOpen={path === "/"} />;
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
          <GlobalBookingButton />
          <GlobalPapaAiWidget />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
