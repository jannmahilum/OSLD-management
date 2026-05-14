import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Eye, EyeOff, Lock, Mail, Building2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Alert, AlertDescription } from "./ui/alert";
import { supabase } from "../lib/supabase";

const loginSchema = z.object({
  organization: z.string().min(1, "Please select an organization"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormData = z.infer<typeof loginSchema>;

const organizations = [
  { value: "osld", label: "OFFICE OF STUDENT LEADERSHIP AND DEVELOPMENT" },
  { value: "accredited", label: "ACCREDITED ORGANIZATIONS" },
  { value: "lsg", label: "LOCAL STUDENT GOVERNMENT" },
  { value: "gsc", label: "GRADUATING STUDENT COUNCIL" },
  {
    value: "used",
    label: "UNIVERSITY STUDENT ENTERPRISE DEVELOPMENT",
  },
  { value: "coa", label: "COMMISSION ON AUDIT" },
  { value: "usg", label: "UNIVERSITY STUDENT GOVERNMENT" },
  { value: "lco", label: "LEAGUE OF CAMPUS ORGANIZATION" },
  { value: "tgp", label: "THE GOLD PANICLES" },
];

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      organization: "",
      email: "",
      password: "",
    },
  });

  const selectedOrg = watch("organization");

  const onSubmit = async (data: LoginFormData) => {
    setAuthError(null);
    setIsLoading(true);

    try {
      // Check for OSLD account
      if (
        data.organization === "osld" &&
        data.email === "OSLD@carsu.edu.ph" &&
        data.password === "OSLDsite"
      ) {
        console.log("OSLD Login successful", data);
        localStorage.setItem("osld_userEmail", data.email);
        localStorage.setItem("osld_userPassword", data.password);
        localStorage.setItem(
          "userOrganization",
          "Office of Student Leadership and Development",
        );
        navigate("/dashboard");
        return;
      }

      // Map organization codes to full names
      const orgMap: { [key: string]: string } = {
        osld: "Office of Student Leadership and Development",
        accredited: "Accredited Organizations",
        lsg: "Local Student Government",
        gsc: "Graduating Student Council",
        used: "University Student Enterprise Development",
        coa: "Commission on Audit",
        usg: "University Student Government",
        lco: "League of Campus Organization",
        tgp: "The Gold Panicles",
      };

      const fullOrgName = orgMap[data.organization] || data.organization;

      // Check for organization accounts in database
      const { data: accounts, error } = await supabase
        .from("org_accounts")
        .select("*")
        .eq("email", data.email)
        .eq("organization", fullOrgName)
        .single();

      if (error || !accounts) {
        setAuthError(
          "Invalid credentials. Please check your email and password.",
        );
        setIsLoading(false);
        return;
      }

      // Check if account is active (allow login for all status types)
      // Removed login blocking for "On Hold" status

      // Verify password
      if (accounts.password !== data.password) {
        setAuthError(
          "Invalid credentials. Please check your email and password.",
        );
        setIsLoading(false);
        return;
      }

      // Login successful - store user data in localStorage with organization-specific keys
      console.log("Organization Login successful", data);

      // Map organization codes to shortnames used in dashboards
      const orgShortNameMap: { [key: string]: string } = {
        accredited: "ao",
        lsg: "lsg",
        gsc: "gsc",
        used: "used",
        coa: "coa",
        usg: "usg",
        lco: "lco",
        tgp: "tgp",
      };

      const orgKey =
        orgShortNameMap[data.organization] || data.organization.toLowerCase();
      localStorage.setItem(`${orgKey}_userEmail`, data.email);
      localStorage.setItem(`${orgKey}_userPassword`, data.password);
      localStorage.setItem("userOrganization", fullOrgName);

      const routeMap: { [key: string]: string } = {
        accredited: "/ao-dashboard",
        lsg: "/lsg-dashboard",
        gsc: "/gsc-dashboard",
        used: "/used-dashboard",
        coa: "/coa-dashboard",
        usg: "/usg-dashboard",
        lco: "/lco-dashboard",
        tgp: "/tgp-dashboard",
      };

      console.log("Organization value:", data.organization);
      console.log("Route mapping:", routeMap[data.organization]);
      const route = routeMap[data.organization] || "/ao-dashboard";
      navigate(route);
    } catch (err: unknown) {
      console.error("Login error:", err);
      setAuthError("An error occurred during login. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-6 overflow-hidden">
      <div className="w-full max-w-lg">
        <Card
          className="shadow-2xl border-t-4"
          style={{ borderTopColor: "#d4af37" }}
        >
          <CardHeader className="space-y-2 pb-6 pt-8">
            <div className="flex items-center justify-center mb-3">
              <div
                className="h-16 w-16 rounded-full flex items-center justify-center"
                style={{ backgroundColor: "#003b27" }}
              >
                <Lock className="h-8 w-8 text-white" />
              </div>
            </div>
            <CardTitle className="text-3xl font-bold text-center text-slate-800">
              OSLD
            </CardTitle>
            <CardDescription className="text-center text-slate-600 text-base pt-1">
              Office of Student Leadership and Development
            </CardDescription>
          </CardHeader>
          <CardContent className="px-8 pb-8">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {authError && (
                <Alert variant="destructive" className="animate-in fade-in-50">
                  <AlertDescription>{authError}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label
                  htmlFor="organization"
                  className="text-slate-700 font-medium text-base"
                >
                  Organization
                </Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Select
                    value={selectedOrg}
                    onValueChange={(value) =>
                      setValue("organization", value, { shouldValidate: true })
                    }
                  >
                    <SelectTrigger
                      className={`pl-10 h-12 text-base ${errors.organization ? "border-red-500" : "border-slate-300"}`}
                    >
                      <SelectValue placeholder="Select your organization" />
                    </SelectTrigger>
                    <SelectContent>
                      {organizations.map((org) => (
                        <SelectItem key={org.value} value={org.value}>
                          {org.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {errors.organization && (
                  <p className="text-sm text-red-600 mt-1">
                    {errors.organization.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="email"
                  className="text-slate-700 font-medium text-base"
                >
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-4 h-4 w-4 text-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    className={`pl-10 h-12 text-base ${errors.email ? "border-red-500" : "border-slate-300"}`}
                    {...register("email")}
                  />
                </div>
                {errors.email && (
                  <p className="text-sm text-red-600 mt-1">
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="password"
                  className="text-slate-700 font-medium text-base"
                >
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-4 h-4 w-4 text-slate-400" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    className={`pl-10 pr-10 h-12 text-base ${errors.password ? "border-red-500" : "border-slate-300"}`}
                    {...register("password")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-4 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-sm text-red-600 mt-1">
                    {errors.password.message}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full h-12 text-white font-medium transition-colors text-base"
                style={{ backgroundColor: "#003b27" }}
                disabled={isLoading}
              >
                {isLoading ? "Signing in..." : "Sign In"}
              </Button>

              <div className="text-center text-sm text-slate-600 mt-5">
                <a
                  href="#"
                  className="font-medium hover:underline"
                  style={{ color: "#003b27" }}
                >
                  Forgot your password?
                </a>
              </div>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-slate-500 mt-6">
          © 2025 OSLD Management System. All rights reserved.
        </p>
      </div>
    </div>
  );
}
