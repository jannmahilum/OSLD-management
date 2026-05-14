import { useState } from "react";
import { Menu, LogOut, Building2 } from "lucide-react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./ui/dialog";
import { supabase } from "../lib/supabase";

interface CreateAccountPageProps {
  activeNav: string;
  setActiveNav: (nav: string) => void;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
  sidebarTitle?: string;
  sidebarSubtitle?: string;
  orgLogo?: string;
}

interface OrgAccount {
  email: string;
  password: string;
  status: "Active" | "Inactive";
  organizationName?: string;
}

export default function CreateAccountPage({
  activeNav,
  setActiveNav,
  isMobileMenuOpen,
  setIsMobileMenuOpen,
  sidebarTitle = "OSLD",
  sidebarSubtitle = "Office of Student Leadership and Development",
  orgLogo = "",
}: CreateAccountPageProps) {
  const [selectedOrg, setSelectedOrg] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [lsgName, setLsgName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);

  const organizations = [
    "Office of Student Leadership and Development",
    "Accredited Organizations",
    "Local Student Government",
    "Graduating Student Council",
    "University Student Enterprise Development",
    "University Student Government",
    "Commission on Audit",
    "League of Campus Organization",
    "The Gold Panicles",
  ];

  const handleLogout = () => {
    window.location.href = "/";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedOrg || !email || !password) {
      alert("Please fill in all fields");
      return;
    }

    if (selectedOrg === "Accredited Organizations" && !organizationName.trim()) {
      alert("Please enter the organization name");
      return;
    }

    if (selectedOrg === "Local Student Government" && !lsgName.trim()) {
      alert("Please enter the LSG name");
      return;
    }

    // Save to Supabase
    const { error } = await supabase
      .from('org_accounts')
      .insert({
        organization: selectedOrg,
        organization_name: selectedOrg === "Local Student Government" ? lsgName : (organizationName || null),
        email,
        password,
        status: 'Not Active'
      });

    if (error) {
      console.error("Error creating account:", error);
      alert("Error creating account: " + error.message);
      return;
    }

    setSuccessMessage("✅ Account created successfully!");
    setSelectedOrg("");
    setOrganizationName("");
    setLsgName("");
    setEmail("");
    setPassword("");

    setTimeout(() => {
      setSuccessMessage("");
      setActiveNav("Accounts");
    }, 2000);
  };

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Mobile Menu Button */}
      <Button
        className="lg:hidden fixed top-4 left-4 z-50 rounded-full w-12 h-12 shadow-lg"
        style={{ backgroundColor: "#003b27" }}
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      >
        <Menu className="h-6 w-6" style={{ color: "#d4af37" }} />
      </Button>

      {/* Sidebar */}
      <div
        className={`${
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 fixed lg:relative w-72 h-full text-white flex flex-col shadow-xl transition-transform duration-300 z-40`}
        style={{ backgroundColor: "#003b27" }}
      >
        <div className="p-5 border-b border-white/10">
          <div className="flex items-center gap-4">
            <div
              className={`flex-shrink-0 ${orgLogo ? 'w-14 h-14' : 'w-12 h-12'} rounded-full overflow-hidden shadow-lg ring-2 ring-offset-1 ring-offset-[#003b27] flex items-center justify-center bg-white/10`}
              style={{ ringColor: "#d4af37" }}
            >
              {orgLogo ? (
                <img
                  src={orgLogo}
                  alt="Organization Logo"
                  className="w-full h-full object-cover"
                />
              ) : (
                <Building2 className="w-6 h-6" style={{ color: "#d4af37" }} />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold leading-tight" style={{ color: "#d4af37" }}>
                {sidebarTitle}
              </h1>
              <p className="text-xs text-white/60 mt-1">{sidebarSubtitle}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6">
          {[
            "Dashboard",
            "Accounts",
            "Submissions",
            "Form Templates",
            "Create Account",
            "Activity Logs",
            "Director & Staff",
            "Organizations",
          ].map((item) => (
            <Button
              key={item}
              onClick={() => {
                setActiveNav(item);
                setIsMobileMenuOpen(false);
              }}
              className={`w-full justify-start mb-2 text-left font-semibold transition-all ${
                activeNav === item
                  ? "text-[#003b27]"
                  : "text-white hover:bg-[#d4af37] hover:text-[#003b27]"
              }`}
              style={
                activeNav === item ? { backgroundColor: "#d4af37" } : undefined
              }
              variant={activeNav === item ? "default" : "ghost"}
            >
              {item}
            </Button>
          ))}
          <Button
            onClick={() => setIsLogoutDialogOpen(true)}
            className="w-full justify-start mb-2 text-left font-semibold transition-all text-white hover:bg-red-600"
            variant="ghost"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </nav>
      </div>

      {/* Overlay for mobile */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setIsMobileMenuOpen(false)}
        ></div>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-auto pt-16 lg:pt-0 bg-white">
        <div className="p-4 lg:p-8">
          <h2
            className="text-2xl lg:text-4xl font-bold mb-6 lg:mb-8"
            style={{ color: "#003b27" }}
          >
            Create Account
          </h2>

          <div className="max-w-2xl mx-auto">
            <Card className="p-8 shadow-xl rounded-lg">
              {successMessage && (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 font-semibold text-center">
                  {successMessage}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label
                    htmlFor="organization"
                    className="text-base font-medium"
                  >
                    Select Category
                  </Label>
                  <select
                    id="organization"
                    value={selectedOrg}
                    onChange={(e) => {
                      setSelectedOrg(e.target.value);
                      if (e.target.value !== "Accredited Organizations") {
                        setOrganizationName("");
                      }
                      if (e.target.value !== "Local Student Government") {
                        setLsgName("");
                      }
                    }}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003b27] transition-all"
                  >
                    <option value="">Select Category</option>
                    {organizations.map((org) => (
                      <option key={org} value={org}>
                        {org}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedOrg === "Accredited Organizations" && (
                  <div className="space-y-2">
                    <Label htmlFor="organizationName" className="text-base font-medium">
                      Name of the Organization
                    </Label>
                    <Input
                      id="organizationName"
                      type="text"
                      value={organizationName}
                      onChange={(e) => setOrganizationName(e.target.value)}
                      placeholder="Enter organization name"
                      required
                      className="text-base"
                    />
                  </div>
                )}

                {selectedOrg === "Local Student Government" && (
                  <div className="space-y-2">
                    <Label htmlFor="lsgName" className="text-base font-medium">
                      Name of LSG
                    </Label>
                    <Input
                      id="lsgName"
                      type="text"
                      value={lsgName}
                      onChange={(e) => setLsgName(e.target.value)}
                      placeholder="Enter LSG name"
                      required
                      className="text-base"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-base font-medium">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter email address"
                    required
                    className="text-base"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-base font-medium">
                    Password
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    required
                    className="text-base"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 text-lg font-semibold transition-all hover:scale-[1.02]"
                  style={{ backgroundColor: "#003b27" }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#d4af37";
                    e.currentTarget.style.color = "#003b27";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "#003b27";
                    e.currentTarget.style.color = "white";
                  }}
                >
                  Add Account
                </Button>
              </form>
            </Card>
          </div>
        </div>
      </div>

      {/* Logout Confirmation Dialog */}
      <Dialog open={isLogoutDialogOpen} onOpenChange={setIsLogoutDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl" style={{ color: "#003b27" }}>
              Confirm Logout
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-base text-gray-700">
              Are you sure you want to logout?
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setIsLogoutDialogOpen(false)}
              className="flex-1"
            >
              No
            </Button>
            <Button
              onClick={handleLogout}
              className="flex-1"
              style={{ backgroundColor: "#003b27" }}
            >
              Yes, Logout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}