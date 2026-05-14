import { Suspense, lazy } from "react";
import { Routes, Route } from "react-router-dom";
import Home from "./components/home";
import LoginPage from "./components/LoginPage";
import { Toaster } from "./components/ui/toaster";

const OSLDDashboard = lazy(() => import("./components/OSLDDashboard"));
const AODashboard = lazy(() => import("./components/AODashboard"));

function App() {
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