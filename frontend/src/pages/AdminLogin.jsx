import React from 'react';
import { SignIn, useUser } from '@clerk/clerk-react';
import { Navigate } from 'react-router-dom';
import { GraduationCap, ShieldCheck } from 'lucide-react';

export const AdminLogin = () => {
  const { isSignedIn, isLoaded } = useUser();

  if (isLoaded && isSignedIn) {
    return <Navigate to="/admin" replace />;
  }
  return (
    <div className="min-h-[75vh] flex items-center justify-center py-10 px-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header Branding */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-college-navy text-college-gold rounded-2xl shadow-md mb-3 border border-college-gold/40">
            <GraduationCap className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-heading font-extrabold text-college-navy dark:text-white">
            HOD Portal Login
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Ghanshyamdas Saraf College of Arts & Commerce
          </p>
        </div>

        {/* Clerk Prebuilt SignIn Component */}
        <div className="flex justify-center">
          <SignIn
            path="/admin/login"
            routing="path"
            signUpUrl="/admin/sign-up"
            forceRedirectUrl="/admin"
          />
        </div>

        <div className="text-center text-xs text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Server-gated HOD verification enforced</span>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
