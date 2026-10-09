import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { api, apiErrorMessage } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { useBrand } from "../../context/BrandContext";
import { useSeo } from "../../lib/seo";
import { dashboardHome } from "../../routes/roleHome";
import { ErrorNote, SkeletonRows } from "../../components/ui/Common";

export default function VerifyEmail() {
  const brand = useBrand();
  const { user, refreshUser } = useAuth();
  const [params] = useSearchParams();
  const token = params.get("token");
  const [state, setState] = useState<"verifying" | "done" | "error">(token ? "verifying" : "error");
  const [error, setError] = useState<string | null>(token ? null : "This verification link is incomplete. Open the link from your email again.");
  const started = useRef(false);

  useSeo({ title: "Verify email" }, brand.name);

  useEffect(() => {
    // The token is single-use: guard against the effect running twice in development.
    if (!token || started.current) return;
    started.current = true;
    api
      .post("/api/auth/verify-email", { token })
      .then(() => {
        setState("done");
        if (localStorage.getItem("coffeehub_token")) refreshUser().catch(() => undefined);
      })
      .catch((err) => {
        setError(apiErrorMessage(err, "This verification link is invalid or has expired."));
        setState("error");
      });
  }, [token, refreshUser]);

  const next = user ? { to: dashboardHome(user.role), text: "Go to my dashboard" } : { to: "/login", text: "Log in" };

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col justify-center px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-bold text-coffee-900">Email verification</h1>
      <div className="mt-6">
        {state === "verifying" && <SkeletonRows count={1} />}
        {state === "done" && (
          <p className="flex items-start gap-2 rounded-lg bg-green-50 px-3 py-3 text-sm text-green-800">
            <CheckCircle2 size={18} className="mt-0.5 shrink-0" /> Your email address has been verified. Thank you!
          </p>
        )}
        {state === "error" && (
          <>
            <ErrorNote>{error}</ErrorNote>
            {user && !user.emailVerified && (
              <p className="mt-3 text-sm text-coffee-500">You can request a new verification email from your profile page.</p>
            )}
          </>
        )}
      </div>
      {state !== "verifying" && (
        <Link to={next.to} className="mt-6 inline-flex justify-center rounded-full bg-coffee-800 px-4 py-2 text-sm font-semibold text-cream-50 hover:bg-coffee-700">
          {next.text}
        </Link>
      )}
    </div>
  );
}
