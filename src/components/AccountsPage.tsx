import { useState, useEffect } from "react";
import { Menu, LogOut, Edit, Trash2, PauseCircle, Save, PlayCircle, Building2, Search, Plus, XCircle } from "lucide-react";
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

interface OrgAccount {
  id?: string;
  email: string;
  password: string;
  status: "Active" | "Not Active" | "On Hold";
  organizationName?: string;
  isEditing?: boolean;
  isSaved?: boolean;
}

interface AccountsPageProps {
  activeNav: string;
  setActiveNav: (nav: string) => void;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
  sidebarTitle?: string;
  sidebarSubtitle?: string;
  orgLogo?: string;
}

export default function AccountsPage({
  activeNav,
  setActiveNav,
  isMobileMenuOpen,
  setIsMobileMenuOpen,
  sidebarTitle = "OSLD",
  sidebarSubtitle = "Office of Student Leadership and Development",
  orgLogo = "",
}: AccountsPageProps) {
  const [selectedOrganization, setSelectedOrganization] = useState(
    "Office of Student Leadership and Development"
  );
  const [orgAccounts, setOrgAccounts] = useState<Record<string, OrgAccount[]>>(
    {}
  );
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState<OrgAccount | null>(
    null
  );
  const [editEmail, setEditEmail] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddCategoryDialogOpen, setIsAddCategoryDialogOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [organizations, setOrganizations] = useState([
    "Office of Student Leadership and Development",
    "Accredited Organizations",
    "Local Student Government",
    "Graduating Student Council",
    "University Student Enterprise Development",
    "Commission on Audit",
    "University Student Government",
    "League of Campus Organization",
    "The Gold Panicles",
  ]);

  // Load accounts from Supabase
  useEffect(() => {
    const loadAccounts = async () => {
      const { data } = await supabase.from("org_accounts").select("*");

      if (data) {
        const accountsByOrg: Record<string, OrgAccount[]> = {};
        data.forEach((account) => {
          if (!accountsByOrg[account.organization]) {
            accountsByOrg[account.organization] = [];
          }
          accountsByOrg[account.organization].push({
            id: account.id,
            email: account.email,
            password: account.password,
            status: account.status,
            organizationName: account.organization_name,
            isEditing: false,
            isSaved: account.status === "Active"
          });
        });
        setOrgAccounts(accountsByOrg);
      }
    };

    loadAccounts();
  }, []);

  const handleLogout = () => {
    window.location.href = "/";
  };

  const handleEditClick = (account: OrgAccount) => {
    const updatedAccounts = { ...orgAccounts };
    const orgList = updatedAccounts[selectedOrganization] || [];
    const accountIndex = orgList.findIndex(a => a.id === account.id);
    
    if (accountIndex !== -1) {
      orgList[accountIndex] = { ...orgList[accountIndex], isEditing: true };
      setOrgAccounts(updatedAccounts);
      setEditEmail(account.email);
      setEditPassword(account.password);
    }
  };

  const handleSaveClick = async (account: OrgAccount) => {
    if (!account.id) return;

    await supabase
      .from("org_accounts")
      .update({
        email: editEmail,
        password: editPassword,
        status: "Active"
      })
      .eq("id", account.id);

    // Reload accounts
    const { data } = await supabase.from("org_accounts").select("*");
    if (data) {
      const accountsByOrg: Record<string, OrgAccount[]> = {};
      data.forEach((acc) => {
        if (!accountsByOrg[acc.organization]) {
          accountsByOrg[acc.organization] = [];
        }
        accountsByOrg[acc.organization].push({
          id: acc.id,
          email: acc.email,
          password: acc.password,
          status: acc.status,
          organizationName: acc.organization_name,
          isEditing: false,
          isSaved: acc.status === "Active"
        });
      });
      setOrgAccounts(accountsByOrg);
    }
  };

  const handleOnHoldClick = async (account: OrgAccount) => {
    if (!account.id) return;

    const newStatus = account.status === "Active" ? "On Hold" : "Active";

    await supabase
      .from("org_accounts")
      .update({ status: newStatus })
      .eq("id", account.id);

    // Reload accounts
    const { data } = await supabase.from("org_accounts").select("*");
    if (data) {
      const accountsByOrg: Record<string, OrgAccount[]> = {};
      data.forEach((acc) => {
        if (!accountsByOrg[acc.organization]) {
          accountsByOrg[acc.organization] = [];
        }
        accountsByOrg[acc.organization].push({
          id: acc.id,
          email: acc.email,
          password: acc.password,
          status: acc.status,
          organizationName: acc.organization_name,
          isEditing: false,
          isSaved: acc.status === "Active" || acc.status === "On Hold"
        });
      });
      setOrgAccounts(accountsByOrg);
    }
  };

  const handleDeleteClick = (account: OrgAccount) => {
    setDeletingAccount(account);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingAccount?.id) return;

    // Change status to "Not Active" instead of deleting
    await supabase
      .from("org_accounts")
      .update({ status: "Not Active" })
      .eq("id", deletingAccount.id);

    // Reload accounts
    const { data } = await supabase.from("org_accounts").select("*");
    if (data) {
      const accountsByOrg: Record<string, OrgAccount[]> = {};
      data.forEach((account) => {
        if (!accountsByOrg[account.organization]) {
          accountsByOrg[account.organization] = [];
        }
        accountsByOrg[account.organization].push({
          id: account.id,
          email: account.email,
          password: account.password,
          status: account.status,
          organizationName: account.organization_name,
          isEditing: false,
          isSaved: account.status === "Active" || account.status === "On Hold"
        });
      });
      setOrgAccounts(accountsByOrg);
    }

    setIsDeleteDialogOpen(false);
    setDeletingAccount(null);
  };

  const handleAddCategory = () => {
    if (newCategoryName.trim() && !organizations.includes(newCategoryName.trim())) {
      setOrganizations([...organizations, newCategoryName.trim()]);
      setNewCategoryName("");
      setIsAddCategoryDialogOpen(false);
    }
  };

  const getAccountsForOrg = (orgName: string): OrgAccount[] => {
    if (orgName === "Office of Student Leadership and Development") {
      const builtInAdmin: OrgAccount = {
        email: "OSLD@carsu.edu.ph",
        password: "OSLDsite",
        status: "Active",
      };
      const userAccounts = orgAccounts[orgName] || [];
      return [builtInAdmin, ...userAccounts];
    }
    return orgAccounts[orgName] || [];
  };

  const getFilteredAccounts = (orgName: string): OrgAccount[] => {
    const accounts = getAccountsForOrg(orgName);
    if (!searchQuery.trim()) return accounts;

    return accounts.filter((account) => {
      const query = searchQuery.toLowerCase();
      return (
        account.email.toLowerCase().includes(query) ||
        account.organizationName?.toLowerCase().includes(query) ||
        account.status.toLowerCase().includes(query)
      );
    });
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
      <div className="flex-1 overflow-auto pt-16 lg:pt-0">
        <div className="p-4 lg:p-8">
          <h2
            className="text-2xl lg:text-4xl font-bold mb-6 lg:mb-8"
            style={{ color: "#003b27" }}
          >
            Accounts
          </h2>

          <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
            {/* Left: Organization List */}
            <Card
              className="w-full lg:w-96 p-4 lg:p-6 shadow-xl border-t-4"
              style={{ borderTopColor: "#d4af37" }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3
                  className="text-lg lg:text-xl font-bold"
                  style={{ color: "#003b27" }}
                >
                  Categories
                </h3>
                <Button
                  onClick={() => setIsAddCategoryDialogOpen(true)}
                  className="h-8 w-8 p-0"
                  style={{ backgroundColor: "#003b27" }}
                  title="Add New Category"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-2">
                {organizations.map((org) => (
                  <Button
                    key={org}
                    onClick={() => {
                      setSelectedOrganization(org);
                      setSearchQuery("");
                    }}
                    className={`w-full justify-start text-left font-medium transition-all text-sm leading-snug py-4 h-auto whitespace-normal ${
                      selectedOrganization === org
                        ? "text-white"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                    style={
                      selectedOrganization === org
                        ? { backgroundColor: "#003b27" }
                        : undefined
                    }
                    variant={selectedOrganization === org ? "default" : "ghost"}
                  >
                    {org}
                  </Button>
                ))}
              </div>
            </Card>

            {/* Right: Account Details */}
            <Card
              className="flex-1 p-4 lg:p-8 shadow-xl border-t-4"
              style={{ borderTopColor: "#d4af37" }}
            >
              <h3
                className="text-xl lg:text-2xl font-bold mb-6"
                style={{ color: "#003b27" }}
              >
                {selectedOrganization}
              </h3>

              {/* Search Bar */}
              <div className="mb-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Search accounts..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 py-2"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <XCircle className="h-5 w-5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                {getFilteredAccounts(selectedOrganization).length > 0 ? (
                  getFilteredAccounts(selectedOrganization).map(
                    (account, index) => (
                      <div
                        key={index}
                        className="p-4 lg:p-6 rounded-lg border-l-4 bg-gradient-to-r from-[#003b27]/5 to-[#d4af37]/5"
                        style={{ borderLeftColor: "#003b27" }}
                      >
                        <div className="space-y-2">
                          {account.organizationName && (
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-gray-600">
                                Organization Name
                              </span>
                              <span className="font-semibold">
                                {account.organizationName}
                              </span>
                            </div>
                          )}
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-600">
                              Email
                            </span>
                            {account.isEditing ? (
                              <Input
                                type="email"
                                value={editEmail}
                                onChange={(e) => setEditEmail(e.target.value)}
                                className="w-64"
                              />
                            ) : (
                              <span className="font-semibold">
                                {account.email}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-600">
                              Password
                            </span>
                            {account.isEditing ? (
                              <Input
                                type="text"
                                value={editPassword}
                                onChange={(e) => setEditPassword(e.target.value)}
                                className="w-64"
                              />
                            ) : (
                              <span className="font-semibold">
                                {account.password}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-600">
                              Status
                            </span>
                            <span
                              className={`px-3 py-1 rounded-full text-sm font-semibold ${
                                account.status === "Active"
                                  ? "bg-green-100 text-green-700"
                                  : account.status === "On Hold"
                                    ? "bg-orange-100 text-orange-700"
                                    : "bg-gray-100 text-gray-700"
                              }`}
                            >
                              {account.status}
                            </span>
                          </div>
                          {account.id && (
                            <div className="flex gap-2 mt-4 pt-4 border-t border-gray-200">
                              {account.isSaved ? (
                                <>
                                  <Button
                                    onClick={() => handleOnHoldClick(account)}
                                    className={`flex-1 ${
                                      account.status === "Active"
                                        ? "bg-orange-600 hover:bg-orange-700"
                                        : "bg-green-600 hover:bg-green-700"
                                    }`}
                                  >
                                    {account.status === "Active" ? (
                                      <><PauseCircle className="h-4 w-4 mr-2" />On Hold</>
                                    ) : (
                                      <><PlayCircle className="h-4 w-4 mr-2" />Activate</>
                                    )}
                                  </Button>
                                  <Button
                                    onClick={() => handleDeleteClick(account)}
                                    className="flex-1 bg-red-600 hover:bg-red-700"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Deactivate
                                  </Button>
                                </>
                              ) : (
                                <>
                                  {account.isEditing ? (
                                    <Button
                                      onClick={() => handleSaveClick(account)}
                                      className="flex-1"
                                      style={{ backgroundColor: "#003b27" }}
                                    >
                                      <Save className="h-4 w-4 mr-2" />
                                      Save
                                    </Button>
                                  ) : (
                                    <Button
                                      onClick={() => handleEditClick(account)}
                                      className="flex-1"
                                      style={{ backgroundColor: "#003b27" }}
                                    >
                                      <Edit className="h-4 w-4 mr-2" />
                                      Edit
                                    </Button>
                                  )}
                                  <Button
                                    onClick={() => handleDeleteClick(account)}
                                    className="flex-1 bg-red-600 hover:bg-red-700"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Deactivate
                                  </Button>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  )
                ) : (
                  <div className="text-gray-400 text-center py-16 border-2 border-dashed border-gray-200 rounded-lg">
                    No accounts yet
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl" style={{ color: "#003b27" }}>
              Deactivate Account
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-base text-gray-700">
              Are you sure you want to deactivate the account for{" "}
              <strong>{deletingAccount?.email}</strong>?
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteConfirm}
              className="flex-1 bg-red-600 hover:bg-red-700"
            >
              Deactivate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Category Dialog */}
      <Dialog open={isAddCategoryDialogOpen} onOpenChange={setIsAddCategoryDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl" style={{ color: "#003b27" }}>
              Add New Category
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="categoryName" className="text-base font-medium">
              Category Name
            </Label>
            <Input
              id="categoryName"
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="e.g., COMELEC"
              className="mt-2"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsAddCategoryDialogOpen(false);
                setNewCategoryName("");
              }}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddCategory}
              className="flex-1"
              style={{ backgroundColor: "#003b27" }}
            >
              Add Category
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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