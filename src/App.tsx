import { Suspense, lazy, useEffect } from "react";
import { Routes, Route, useLocation, useNavigate } from "react-router-dom";
import Home from "./components/home";
import LoginPage from "./components/LoginPage";
import { Toaster } from "./components/ui/toaster";

const OSLDDashboard = lazy(() => import("./components/OSLDDashboard"));
const AODashboard = lazy(() => import("./components/AODashboard"));

function App() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (location.pathname !== "/") {
      localStorage.setItem("app_lastPath", `${location.pathname}${location.search}`);
    }
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (location.pathname !== "/") return;

    const defaultRoute =
      (localStorage.getItem("osld_userEmail") && "/dashboard") ||
      (localStorage.getItem("ao_userEmail") && "/ao-dashboard") ||
      (localStorage.getItem("lsg_userEmail") && "/lsg-dashboard") ||
      (localStorage.getItem("gsc_userEmail") && "/gsc-dashboard") ||
      (localStorage.getItem("used_userEmail") && "/used-dashboard") ||
      (localStorage.getItem("coa_userEmail") && "/coa-dashboard") ||
      (localStorage.getItem("usg_userEmail") && "/usg-dashboard") ||
      (localStorage.getItem("lco_userEmail") && "/lco-dashboard") ||
      (localStorage.getItem("tgp_userEmail") && "/tgp-dashboard") ||
      null;

    if (!defaultRoute) return;

    const lastPath = localStorage.getItem("app_lastPath");
    const target =
      lastPath && lastPath !== "/" && lastPath.startsWith("/") ? lastPath : defaultRoute;

    navigate(target, { replace: true });
  }, [location.pathname, navigate]);

  return (
    <Suspense fallback={<p>Loading...</p>}>
      <>
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/dashboard" element={<OSLDDashboard />} />
          <Route path="/ao-dashboard" element={<AODashboard orgName="Accredited Organization" orgShortName="AO" showDeadline={true} showAddButton={false} />} />
          <Route path="/lsg-dashboard" element={<AODashboard orgName="Local Student Government" orgShortName="LSG" showDeadline={true} showAddButton={false} />} />
          <Route path="/gsc-dashboard" element={<AODashboard orgName="Graduating Student Council" orgShortName="GSC" showDeadline={true} showAddButton={false} />} />
          <Route path="/used-dashboard" element={<AODashboard orgName="University Student Enterprise Development" orgShortName="USED" showDeadline={true} showAddButton={false} />} />
          <Route path="/coa-dashboard" element={<AODashboard orgName="Commission on Audit" orgShortName="COA" showDeadline={true} showAddButton={true} />} />
          <Route path="/usg-dashboard" element={<AODashboard orgName="University Student Government" orgShortName="USG" showDeadline={true} showAddButton={false} />} />
          <Route path="/lco-dashboard" element={<AODashboard orgName="League of Campus Organization" orgShortName="LCO" showDeadline={true} showAddButton={false} />} />
          <Route path="/tgp-dashboard" element={<AODashboard orgName="The Gold Panicles" orgShortName="TGP" showDeadline={true} showAddButton={false} />} />
          <Route path="/home" element={<Home />} />
        </Routes>
        <Toaster />
      </>
    </Suspense>
  );
}

export default App;
